// ============================================================
// FitnessPlace SaaS — Membership Expiry Checker
// Edge Function: Sends reminder emails before gym access and
// PT session credit expiry. Also alerts on low PT credits.
// Designed to run daily via Supabase cron.
//
// Required env vars:
//   CRON_SECRET               — bearer token for cron auth
//   SUPABASE_URL              — project URL
//   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS)
//   RESEND_API_KEY            — Resend.com API key
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BrandRow {
  id: string
  name: string
  slug: string
  expiry_reminder_days: number[] | null
}

interface MemberProfile {
  full_name: string
  email: string | null
  brand_id: string | null
}

interface MembershipRow {
  id: string
  member_id: string
  package_category: string | null
  gym_access_expires_at: string | null
  pt_sessions_expires_at: string | null
  pt_sessions_remaining: number | null
  pt_sessions_status: string | null
  profiles: MemberProfile | null
}

type ReminderType = 'gym_expiry' | 'pt_expiry' | 'pt_low_sessions'

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

serve(async (req: Request): Promise<Response> => {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== 'Bearer ' + Deno.env.get('CRON_SECRET')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseUrl  = Deno.env.get('SUPABASE_URL')
  const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')

  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: 'Missing env vars' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const now = new Date()

  // Fetch all brands with their reminder schedules
  const { data: brands, error: brandError } = await supabase
    .from('brands')
    .select('id, name, slug, expiry_reminder_days')
    .eq('is_active', true)

  if (brandError) {
    return new Response(
      JSON.stringify({ error: brandError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  let emailsSent = 0
  const errors: string[] = []

  for (const brand of (brands ?? []) as BrandRow[]) {
    const reminderDays = brand.expiry_reminder_days ?? [7, 3]

    // Fetch active memberships for this brand
    const { data: memberships } = await supabase
      .from('memberships')
      .select(`
        id, member_id, package_category,
        gym_access_expires_at, pt_sessions_expires_at,
        pt_sessions_remaining, pt_sessions_status,
        profiles:member_id ( full_name, brand_id )
      `)
      .eq('brand_id', brand.id)
      .eq('status', 'active')

    for (const m of (memberships ?? []) as unknown as MembershipRow[]) {
      const profile = m.profiles
      if (!profile) continue

      // Resolve email from auth.users via admin API
      const { data: authUser } = await supabase.auth.admin.getUserById(m.member_id)
      const memberEmail = authUser?.user?.email ?? null
      if (!memberEmail) continue

      const memberName = profile.full_name
      const category   = m.package_category ?? 'gym_access'

      // ── Gym access expiry reminders ───────────────────────
      if (category === 'gym_access' || category === 'bundled') {
        if (m.gym_access_expires_at) {
          const gymExpiry = new Date(m.gym_access_expires_at)
          const daysUntil = Math.ceil((gymExpiry.getTime() - now.getTime()) / 86400000)

          if (reminderDays.includes(daysUntil)) {
            const sent = await sendReminderIfNeeded(supabase, {
              membershipId: m.id,
              type:         'gym_expiry',
              reminderDay:  daysUntil,
              memberEmail,
              memberName,
              brandName:    brand.name,
              brandSlug:    brand.slug,
              daysUntil,
              resendApiKey,
            })
            if (sent === true) emailsSent++
            if (typeof sent === 'string') errors.push(sent)
          }
        }
      }

      // ── PT session expiry reminders ───────────────────────
      if (category === 'pt_sessions' || category === 'bundled') {
        if (m.pt_sessions_expires_at && m.pt_sessions_status !== 'exhausted') {
          const ptExpiry  = new Date(m.pt_sessions_expires_at)
          const daysUntil = Math.ceil((ptExpiry.getTime() - now.getTime()) / 86400000)

          if (reminderDays.includes(daysUntil)) {
            const sent = await sendReminderIfNeeded(supabase, {
              membershipId: m.id,
              type:         'pt_expiry',
              reminderDay:  daysUntil,
              memberEmail,
              memberName,
              brandName:    brand.name,
              brandSlug:    brand.slug,
              daysUntil,
              resendApiKey,
            })
            if (sent === true) emailsSent++
            if (typeof sent === 'string') errors.push(sent)
          }
        }

        // ── Low PT sessions reminder (≤3, only once) ─────────
        if (
          m.pt_sessions_remaining !== null &&
          m.pt_sessions_remaining <= 3 &&
          m.pt_sessions_status === 'active'
        ) {
          const sent = await sendReminderIfNeeded(supabase, {
            membershipId:  m.id,
            type:          'pt_low_sessions',
            reminderDay:   m.pt_sessions_remaining,
            memberEmail,
            memberName,
            brandName:     brand.name,
            brandSlug:     brand.slug,
            ptRemaining:   m.pt_sessions_remaining,
            resendApiKey,
          })
          if (sent === true) emailsSent++
          if (typeof sent === 'string') errors.push(sent)
        }
      }
    }
  }

  const result = { emails_sent: emailsSent, errors, run_at: now.toISOString() }
  console.log('membership-expiry-checker result:', JSON.stringify(result))

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

// ---------------------------------------------------------------------------
// sendReminderIfNeeded — deduplication via membership_reminders_sent
// Returns true on send, string on error, false if already sent
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendReminderIfNeeded(supabase: any, opts: {
  membershipId: string
  type: ReminderType
  reminderDay: number
  memberEmail: string
  memberName: string
  brandName: string
  brandSlug: string
  daysUntil?: number
  ptRemaining?: number
  resendApiKey: string | undefined
}): Promise<boolean | string> {
  const { membershipId, type, reminderDay, memberEmail, memberName, brandName, brandSlug } = opts

  // Check deduplication (new table from migration 006)
  const { data: existing } = await supabase
    .from('membership_reminders_sent')
    .select('id')
    .eq('membership_id', membershipId)
    .eq('reminder_type', type)
    .eq('reminder_day', reminderDay)
    .maybeSingle()

  if (existing) return false

  const subject = buildSubject(type, brandName, opts.daysUntil, opts.ptRemaining)
  const html    = buildHtml(type, memberName, brandName, brandSlug, opts.daysUntil, opts.ptRemaining)

  if (opts.resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  'Bearer ' + opts.resendApiKey,
        },
        body: JSON.stringify({
          from:    'noreply@gerak.online',
          to:      [memberEmail],
          subject: subject + ' — ' + brandName,
          html,
        }),
      })
      if (!res.ok) {
        const txt = await res.text()
        return `Email to ${memberEmail} failed: ${txt}`
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return `Email exception for membership ${membershipId}: ${msg}`
    }
  }

  // Record so it won't be sent again
  await supabase.from('membership_reminders_sent').insert({
    membership_id: membershipId,
    reminder_type: type,
    reminder_day:  reminderDay,
    sent_at:       new Date().toISOString(),
  })

  return true
}

function buildSubject(
  type: ReminderType,
  brandName: string,
  daysUntil?: number,
  ptRemaining?: number
): string {
  if (type === 'gym_expiry') {
    return daysUntil === 1
      ? `Your gym access at ${brandName} expires tomorrow!`
      : `Your gym access at ${brandName} expires in ${daysUntil} days`
  }
  if (type === 'pt_expiry') {
    return daysUntil === 1
      ? `Your PT session credits at ${brandName} expire tomorrow!`
      : `Your PT session credits at ${brandName} expire in ${daysUntil} days`
  }
  return `You have ${ptRemaining} PT session${ptRemaining === 1 ? '' : 's'} remaining at ${brandName}`
}

function buildHtml(
  type: ReminderType,
  memberName: string,
  brandName: string,
  brandSlug: string,
  daysUntil?: number,
  ptRemaining?: number
): string {
  let heading = ''
  let body = ''

  if (type === 'gym_expiry') {
    heading = daysUntil === 1 ? 'Your gym access expires tomorrow!' : `Your gym access expires in ${daysUntil} days`
    body = `Renew your membership to keep your access to classes and facilities at ${brandName}.`
  } else if (type === 'pt_expiry') {
    heading = daysUntil === 1 ? 'Your PT session credits expire tomorrow!' : `Your PT session credits expire in ${daysUntil} days`
    body = `Book your remaining PT sessions before they expire at ${brandName}.`
  } else {
    heading = `You have ${ptRemaining} PT session${ptRemaining === 1 ? '' : 's'} remaining`
    body = `Don't let your PT sessions go to waste. Book them now at ${brandName}.`
  }

  const loginUrl = `https://${brandSlug}.gerak.online/login`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#3B82F6;padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${brandName}</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${memberName},</p>
          <p style="margin:0 0 16px;font-size:16px;color:#374151;font-weight:600;">${heading}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#6B7280;">${body}</p>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background:#3B82F6;border-radius:6px;padding:14px 28px;">
              <a href="${loginUrl}" style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                Open My Account
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #E5E7EB;">
          <p style="margin:0;font-size:13px;color:#9CA3AF;">
            You are receiving this email because you have an active membership at ${brandName}.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
