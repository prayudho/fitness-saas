// ============================================================
// FitnessPlace SaaS — Auto-Renew Memberships
// Edge Function: Automatically renews memberships that have
// auto_renew=true and are expiring within 24 hours. Creates a
// pending invoice and extends the expiry date. Designed to run
// daily via cron, shortly before the expiry checker.
//
// Required env vars:
//   CRON_SECRET               — bearer token for cron auth
//   SUPABASE_URL              — project URL
//   SUPABASE_SERVICE_ROLE_KEY  — service role key (bypasses RLS)
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MembershipPackageRow {
  id: string
  duration_days: number | null
  price: number
  currency: string
  brand_id: string
}

interface MembershipRow {
  id: string
  brand_id: string
  member_id: string
  package_id: string
  expires_at: string
  membership_packages: MembershipPackageRow | null
}

interface RenewalSuccess {
  membership_id: string
  new_expires_at: string
  invoice_id: string
}

interface RenewalError {
  membership_id: string
  reason: string
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

serve(async (req: Request): Promise<Response> => {
  // ── Auth check ──────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== 'Bearer ' + Deno.env.get('CRON_SECRET')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const now        = new Date()
  const cutoff     = new Date(now.getTime() + 24 * 60 * 60 * 1000) // NOW + 1 day

  // ── Fetch memberships due for auto-renewal ───────────────────────────────
  // Conditions:
  //   status = 'active'
  //   auto_renew = true
  //   expires_at <= NOW + 1 day (i.e., expiring within 24 h or already expired)
  //   expires_at IS NOT NULL (session-only memberships have no expiry)
  const { data: memberships, error: fetchError } = await supabase
    .from('memberships')
    .select(`
      id,
      brand_id,
      member_id,
      package_id,
      expires_at,
      membership_packages:package_id (
        id,
        duration_days,
        price,
        currency,
        brand_id
      )
    `)
    .eq('status', 'active')
    .eq('auto_renew', true)
    .not('expires_at', 'is', null)
    .lte('expires_at', cutoff.toISOString())

  if (fetchError) {
    console.error('Failed to fetch memberships for renewal:', fetchError.message)
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const rows = memberships as unknown as MembershipRow[]

  const renewed: RenewalSuccess[] = []
  const failed:  RenewalError[]   = []

  for (const membership of rows ?? []) {
    // ── Guard: package must exist and have a duration ────────────────────
    const pkg = membership.membership_packages
    if (!pkg) {
      failed.push({ membership_id: membership.id, reason: 'Package record not found' })
      continue
    }

    if (!pkg.duration_days || pkg.duration_days <= 0) {
      failed.push({
        membership_id: membership.id,
        reason: `Package ${pkg.id} has no duration_days — skipping auto-renew`,
      })
      continue
    }

    // ── Deduplication: skip if already renewed today ─────────────────────
    // Check renewal_log for an entry on today's date for this membership.
    const todayStart = new Date(now)
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    const { data: existingRenewal } = await supabase
      .from('renewal_log')
      .select('id')
      .eq('membership_id', membership.id)
      .gte('renewed_at', todayStart.toISOString())
      .lt('renewed_at', todayEnd.toISOString())
      .maybeSingle()

    if (existingRenewal) {
      // Already renewed today — do not process again
      continue
    }

    // ── Calculate new expiry date ─────────────────────────────────────────
    // Extend from the current expiry date (not from now) to preserve alignment.
    const currentExpiry   = new Date(membership.expires_at)
    const baseDate        = currentExpiry > now ? currentExpiry : now
    const newExpiresAt    = new Date(baseDate.getTime() + pkg.duration_days * 24 * 60 * 60 * 1000)
    const newExpiresAtIso = newExpiresAt.toISOString()

    // ── Step 1: Create pending invoice ───────────────────────────────────
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        brand_id:      membership.brand_id,
        member_id:     membership.member_id,
        membership_id: membership.id,
        amount:        pkg.price,
        currency:      pkg.currency,
        status:        'pending',
        notes:         `Auto-renewal — ${pkg.duration_days} day(s) extension`,
        created_at:    now.toISOString(),
      })
      .select('id')
      .single()

    if (invoiceError || !invoiceData) {
      const reason = invoiceError?.message ?? 'Invoice insert returned no data'
      failed.push({ membership_id: membership.id, reason: `Invoice creation failed: ${reason}` })
      continue
    }

    const invoiceId = invoiceData.id

    // ── Step 2: Extend membership expiry ─────────────────────────────────
    const { error: updateError } = await supabase
      .from('memberships')
      .update({ expires_at: newExpiresAtIso })
      .eq('id', membership.id)

    if (updateError) {
      // Rollback is not available — log the inconsistency so ops can fix it
      failed.push({
        membership_id: membership.id,
        reason: `Membership update failed (invoice ${invoiceId} created but expiry not extended): ${updateError.message}`,
      })
      continue
    }

    // ── Step 3: Write renewal log entry ──────────────────────────────────
    const { error: logError } = await supabase
      .from('renewal_log')
      .insert({
        membership_id:   membership.id,
        invoice_id:      invoiceId,
        renewed_at:      now.toISOString(),
        previous_expiry: membership.expires_at,
        new_expiry_date: newExpiresAtIso,
      })

    if (logError) {
      // Non-fatal: the renewal itself succeeded; log the error for visibility
      console.error(
        `Failed to write renewal_log for membership ${membership.id}:`,
        logError.message
      )
    }

    renewed.push({
      membership_id:   membership.id,
      new_expires_at:  newExpiresAtIso,
      invoice_id:      invoiceId,
    })
  }

  const result = {
    processed: rows?.length ?? 0,
    renewed:   renewed.length,
    failed:    failed.length,
    details: {
      renewed,
      failed,
    },
    run_at: now.toISOString(),
  }

  console.log('auto-renew-memberships result:', JSON.stringify(result))

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
