/**
 * Shared billing helpers — no 'use server' so this module can be imported
 * by both server actions (billing.ts) and API route handlers (webhooks).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Supabase = SupabaseClient<Database>

export type InvoiceActivationInput = {
  id: string
  membership_id: string | null
  member_id: string
  brand_id: string
}

/**
 * Activate the membership linked to a freshly-paid invoice.
 *
 * For gym_access / bundled packages → set membership.status = 'active'.
 * For pt_sessions packages:
 *   - If an active PT membership already exists for the member, stack credits onto it,
 *     cancel the pending membership, re-link the invoice, and record pt_credits_applied.
 *   - Otherwise activate the pending membership directly.
 *
 * Called from:
 *   - recordPayment (manual cash/transfer confirmation)
 *   - Midtrans webhook (gateway payment confirmation)
 *
 * NOTE (H2): These are sequential DB writes — not wrapped in a Postgres transaction.
 * A crash between steps leaves a paid invoice with a pending_payment membership.
 * Mitigation: the webhook/recordPayment guard on status='pending' means replaying
 * the notification/button press re-enters this function safely. A full fix requires
 * moving activation logic into a Postgres stored procedure (RPC).
 *
 * NOTE (H3): The PT stacking select→update is not atomic. Concurrent payments for
 * the same member could double-credit. Fix: use SELECT FOR UPDATE via a raw RPC.
 */
export async function activateMembershipForInvoice(
  supabase: Supabase,
  invoice: InvoiceActivationInput,
): Promise<void> {
  if (!invoice.membership_id) return

  const { data: memRaw } = await supabase
    .from('memberships')
    .select('id, status, package_id, member_id')
    .eq('id', invoice.membership_id)
    .eq('brand_id', invoice.brand_id)
    .single()

  if (!memRaw || (memRaw.status as string) !== 'pending_payment') return

  const { data: pkgRaw } = await supabase
    .from('membership_packages')
    .select('package_category, pt_session_credits, pt_session_expiry_days')
    .eq('id', memRaw.package_id)
    .single()

  const category = (pkgRaw as { package_category?: string } | null)?.package_category

  if (category === 'pt_sessions' && pkgRaw) {
    const pkg = pkgRaw as {
      pt_session_credits: number | null
      pt_session_expiry_days: number | null
    }

    const { data: existingPT } = await supabase
      .from('memberships')
      .select('id, pt_sessions_remaining, pt_sessions_expires_at')
      .eq('brand_id', invoice.brand_id)
      .eq('member_id', memRaw.member_id)
      .eq('pt_sessions_status', 'active' as never)
      .eq('status', 'active' as never)
      .neq('id', memRaw.id)
      .not('pt_sessions_remaining', 'is', null)
      .order('pt_sessions_expires_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingPT) {
      const addedCredits = pkg.pt_session_credits ?? 0
      const newCredits = (existingPT.pt_sessions_remaining ?? 0) + addedCredits

      const existingExpMs = existingPT.pt_sessions_expires_at
        ? new Date(existingPT.pt_sessions_expires_at).getTime()
        : 0
      const newExpMs = pkg.pt_session_expiry_days
        ? Date.now() + pkg.pt_session_expiry_days * 86_400_000
        : 0
      const extendedExpiry =
        newExpMs > existingExpMs
          ? new Date(newExpMs).toISOString()
          : existingPT.pt_sessions_expires_at

      await supabase
        .from('memberships')
        .update({
          pt_sessions_remaining:  newCredits,
          pt_sessions_expires_at: extendedExpiry,
          expires_at:             extendedExpiry,
        } as never)
        .eq('id', existingPT.id)

      await supabase
        .from('memberships')
        .update({ status: 'cancelled' as never })
        .eq('id', memRaw.id)

      // Re-link invoice to the stacked-onto membership and record how many
      // credits were added so processRefund can reverse the correct amount (H6).
      await supabase
        .from('invoices')
        .update({
          membership_id:       existingPT.id,
          pt_credits_applied:  addedCredits,
        } as never)
        .eq('id', invoice.id)

      // Re-link any active/grace_period PT assignments that still point to the
      // now-cancelled membership so downstream credit reads/writes use the correct row.
      await supabase
        .from('pt_assignments')
        .update({ membership_id: existingPT.id } as never)
        .eq('brand_id', invoice.brand_id)
        .eq('member_id', memRaw.member_id)
        .eq('membership_id', memRaw.id)
        .in('status', ['active', 'grace_period'])

      return
    }
  }

  // Normal activation (gym_access, bundled, or pt_sessions with no existing PT membership)
  await supabase
    .from('memberships')
    .update({ status: 'active' as never })
    .eq('id', memRaw.id)
    .eq('brand_id', invoice.brand_id)
}
