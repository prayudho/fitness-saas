// ============================================================
// FitnessPlace SaaS — Membership Expiry Checker
// Edge Function: Sends reminder emails 7, 3, and 1 day(s) before
// membership expiry. Designed to run daily via cron.
//
// Required env vars:
//   CRON_SECRET              — bearer token for cron auth
//   SUPABASE_URL             — project URL
//   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS)
//   RESEND_API_KEY            — Resend.com API key for email delivery
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MemberProfile {
  full_name: string
  email: string | null
  brand_id: string | null
  brands: { name: string } | null
}

interface MembershipRow {
  id: string
  expires_at: string
  member_id: string
  profiles: MemberProfile | null
}

interface NotificationRow {
  id: string
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
  const resendApiKey = Deno.env.get('RESEND_API_KEY')

  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const now          = new Date()
  const windowEnd    = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // ── Fetch memberships expiring within the next 7 days ───────────────────
  // We join profiles → brands to get the member email + brand name.
  // Service role key is used so RLS is bypassed for background processing.
  const { data: memberships, error: fetchError } = await supabase
    .from('memberships')
    .select(`
      id,
      expires_at,
      member_id,
      profiles:member_id (
        full_name,
        email:id,
        brand_id,
        brands:brand_id ( name )
      )
    `)
    .eq('status', 'active')
    .not('expires_at', 'is', null)
    .gte('expires_at', now.toISOString())
    .lte('expires_at', windowEnd.toISOString())

  if (fetchError) {
    console.error('Failed to fetch memberships:', fetchError.message)
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const rows = memberships as unknown as MembershipRow[]

  let emailsSent = 0
  const errors: string[] = []

  for (const membership of rows ?? []) {
    // ── Calculate days until expiry ──────────────────────────────────────
    const expiresAt   = new Date(membership.expires_at)
    const msRemaining = expiresAt.getTime() - now.getTime()
    const daysUntil   = Math.ceil(msRemaining / (1000 * 60 * 60 * 24))

    // Only notify on exactly 1, 3, or 7 days remaining
    if (![1, 3, 7].includes(daysUntil)) continue

    // ── Deduplication: skip if notification already sent ─────────────────
    const { data: existing } = await supabase
      .from('membership_notifications')
      .select('id')
      .eq('membership_id', membership.id)
      .eq('days_before', daysUntil)
      .maybeSingle() as { data: NotificationRow | null }

    if (existing) continue

    // ── Resolve member & brand details ───────────────────────────────────
    const profile   = membership.profiles
    const memberEmail = profile?.email ?? null
    const memberName  = profile?.full_name ?? 'Member'
    const brandName   = profile?.brands?.name ?? 'FitnessPlace'

    // ── Build subject line ───────────────────────────────────────────────
    const subject =
      daysUntil === 1
        ? 'Your membership expires tomorrow!'
        : daysUntil === 3
        ? 'Your membership expires in 3 days'
        : 'Your membership expires in 7 days'

    // ── Send email via Resend ────────────────────────────────────────────
    if (resendApiKey && memberEmail) {
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + resendApiKey,
          },
          body: JSON.stringify({
            from: 'noreply@fitnessplace.com',
            to: [memberEmail],
            subject: subject + ' — ' + brandName,
            html: buildEmailHtml(memberName, subject, brandName, daysUntil),
          }),
        })

        if (!emailRes.ok) {
          const errText = await emailRes.text()
          errors.push(`Email to ${memberEmail} failed: ${errText}`)
        } else {
          emailsSent++
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        errors.push(`Email exception for membership ${membership.id}: ${msg}`)
      }
    }

    // ── Record notification so it is not resent ──────────────────────────
    const { error: insertError } = await supabase
      .from('membership_notifications')
      .insert({
        membership_id: membership.id,
        days_before:   daysUntil,
        sent_at:       new Date().toISOString(),
      })

    if (insertError) {
      errors.push(`Failed to record notification for membership ${membership.id}: ${insertError.message}`)
    }
  }

  const result = {
    processed:   rows?.length ?? 0,
    emails_sent: emailsSent,
    errors,
    run_at:      now.toISOString(),
  }

  console.log('membership-expiry-checker result:', JSON.stringify(result))

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

// ---------------------------------------------------------------------------
// Email template helper
// ---------------------------------------------------------------------------

function buildEmailHtml(
  memberName: string,
  subject: string,
  brandName: string,
  daysUntil: number
): string {
  const urgencyNote =
    daysUntil === 1
      ? 'Act now — your access will expire at the end of today.'
      : `You have ${daysUntil} days left to renew before losing access.`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#3B82F6;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${brandName}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${memberName},</p>
              <p style="margin:0 0 16px;font-size:16px;color:#374151;font-weight:600;">${subject}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#6B7280;">${urgencyNote}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#6B7280;">
                Renew your membership to keep your access to classes, personal training sessions,
                and all the benefits you enjoy at ${brandName}.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#3B82F6;border-radius:6px;padding:14px 28px;">
                    <a href="#" style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Renew Membership
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #E5E7EB;">
              <p style="margin:0;font-size:13px;color:#9CA3AF;">
                You are receiving this email because you have an active membership at ${brandName}.
                If you believe this was sent in error, please contact your gym directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
