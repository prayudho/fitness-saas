'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAuthedProfile } from '@/lib/actions/utils'
import { activateMembershipForInvoice } from '@/lib/billing/shared'
import type { Database } from '@/types/database'

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

export type InvoiceRow = Row<'invoices'>
export type ProfileRow = Row<'profiles'>
export type MembershipRow = Row<'memberships'>
export type MembershipPackageRow = Row<'membership_packages'>

export type InvoiceWithDetails = InvoiceRow & {
  profiles: Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url'> | null
  memberships:
    | (Pick<MembershipRow, 'id' | 'package_id'> & {
        membership_packages: Pick<MembershipPackageRow, 'id' | 'name'> | null
      })
    | null
}

export type InvoiceStats = {
  revenueThisMonth: number
  pendingCount: number
  paidCount: number
  currency: string
}

// ── getInvoices ──────────────────────────────────────────────────────────────

export async function getInvoices(filters?: {
  status?: string
  page?: number
  limit?: number
  branchId?: string
}): Promise<{ data: InvoiceWithDetails[]; count: number; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: [], count: 0, error: 'No brand context' }

    const limit = filters?.limit ?? 25
    const page = filters?.page ?? 1
    const offset = (page - 1) * limit

    let query = supabase
      .from('invoices')
      .select(
        `*, profiles!invoices_member_brand_fkey(id, full_name, avatar_url), memberships:membership_id(id, package_id, membership_packages:package_id(id, name))`,
        { count: 'exact' }
      )
      .eq('brand_id', profile.brand_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters?.branchId) {
      query = query.eq('branch_id', filters.branchId)
    }

    const { data: rawData, error, count } = await query
    if (error) return { data: [], count: 0, error: error.message }

    return { data: (rawData ?? []) as unknown as InvoiceWithDetails[], count: count ?? 0 }
  } catch (e) {
    return { data: [], count: 0, error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

// M1: separate, full-dataset stats query (not limited to current page)
export async function getInvoiceStats(filters?: { branchId?: string }): Promise<{ data?: InvoiceStats; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }
    const brandId = profile.brand_id

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    let statsQuery = supabase
      .from('invoices')
      .select('status, amount, paid_at, currency')
      .eq('brand_id', brandId)

    if (filters?.branchId) {
      statsQuery = statsQuery.eq('branch_id', filters.branchId)
    }

    const { data: rawRows, error } = await statsQuery

    if (error) return { error: error.message }

    const rows = (rawRows ?? []) as { status: string; amount: number; paid_at: string | null; currency: string }[]
    const currency = rows.find((r) => r.currency)?.currency ?? 'IDR'
    const revenueThisMonth = rows
      .filter((r) => r.status === 'paid' && r.paid_at && r.paid_at >= monthStart)
      .reduce((sum, r) => sum + r.amount, 0)
    const pendingCount = rows.filter((r) => r.status === 'pending').length
    const paidCount    = rows.filter((r) => r.status === 'paid').length

    return { data: { revenueThisMonth, pendingCount, paidCount, currency } }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

// ── getInvoice ───────────────────────────────────────────────────────────────

export async function getInvoice(id: string): Promise<{ data?: InvoiceWithDetails; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { data: rawData, error } = await supabase
      .from('invoices')
      .select(
        `*, profiles!invoices_member_brand_fkey(id, full_name, avatar_url), memberships:membership_id(id, package_id, membership_packages:package_id(id, name))`
      )
      .eq('id', id)
      .eq('brand_id', profile.brand_id)
      .single()

    if (error) return { error: error.message }
    return { data: rawData as unknown as InvoiceWithDetails }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

// ── createInvoice ────────────────────────────────────────────────────────────

export async function createInvoice(input: {
  member_id: string
  membership_id?: string
  amount: number
  currency?: string
  notes?: string
}): Promise<{ data?: InvoiceRow; error?: string }> {
  try {
    const supabase = createServiceClient()
    const authClient = createClient()
    const { profile } = await getAuthedProfile(authClient)
    if (!profile.brand_id) return { error: 'No brand context' }
    const brandId = profile.brand_id

    // L5: guard against duplicate pending invoices for the same membership
    if (input.membership_id) {
      const { data: existing } = await supabase
        .from('invoices')
        .select('id')
        .eq('membership_id', input.membership_id)
        .eq('brand_id', brandId)
        .eq('status', 'pending')
        .maybeSingle()

      if (existing) {
        return { error: 'A pending invoice already exists for this membership. Confirm or cancel it first.' }
      }
    }

    // Resolve the member's home branch so the invoice is visible to their BM
    const { data: rawMemberProfile } = await supabase
      .from('profiles')
      .select('home_branch_id')
      .eq('id', input.member_id)
      .eq('brand_id', brandId)
      .single()
    const memberBranchId = (rawMemberProfile as { home_branch_id: string | null } | null)?.home_branch_id ?? null

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        brand_id:      brandId,
        branch_id:     memberBranchId,
        member_id:     input.member_id,
        membership_id: input.membership_id ?? null,
        amount:        input.amount,
        currency:      input.currency ?? 'IDR',
        status:        'pending' as Database['public']['Enums']['invoice_status'],
        notes:         input.notes ?? null,
      } as never)
      .select()
      .single()

    if (error) return { error: error.message }

    revalidatePath('/admin/billing')
    revalidatePath('/branch-manager/billing')
    return { data: data ?? undefined }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

// ── recordPayment ────────────────────────────────────────────────────────────

export async function recordPayment(
  invoiceId: string,
  input: {
    payment_method: 'cash' | 'transfer'
    reference_number?: string
    notes?: string
  }
): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }
    const brandId = profile.brand_id

    const { data: invoiceRaw, error: fetchErr } = await supabase
      .from('invoices')
      .select('id, status, membership_id, member_id')
      .eq('id', invoiceId)
      .eq('brand_id', brandId)
      .single()

    if (fetchErr || !invoiceRaw) return { error: fetchErr?.message ?? 'Invoice not found' }
    if ((invoiceRaw as { status?: string }).status !== 'pending') return { error: 'Only pending invoices can be confirmed' }

    const { error: payErr } = await supabase
      .from('invoices')
      .update({
        status:           'paid',
        paid_at:          new Date().toISOString(),
        payment_method:   input.payment_method,
        reference_number: input.reference_number ?? null,
        ...(input.notes !== undefined && { notes: input.notes }),
      } as never)
      .eq('id', invoiceId)
      .eq('brand_id', brandId)

    if (payErr) return { error: payErr.message }

    // Activate the linked membership via shared helper (also used by Midtrans webhook)
    const inv = invoiceRaw as { id: string; status: string; membership_id: string | null; member_id: string }
    if (inv.membership_id) {
      await activateMembershipForInvoice(
        supabase as unknown as Parameters<typeof activateMembershipForInvoice>[0],
        {
          id:            inv.id,
          membership_id: inv.membership_id,
          member_id:     inv.member_id,
          brand_id:      brandId,
        }
      )
    }

    revalidatePath('/admin/billing')
    revalidatePath('/admin/members')
    revalidatePath('/member/billing')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

// ── getMidtransSnapToken ─────────────────────────────────────────────────────

export async function getMidtransSnapToken(
  invoiceId: string
): Promise<{ data?: { snap_token: string; redirect_url: string }; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }
    const brandId = profile.brand_id

    const serverKey = process.env.MIDTRANS_SERVER_KEY
    if (!serverKey) {
      return { error: 'Midtrans not configured. Set MIDTRANS_SERVER_KEY in environment variables.' }
    }

    const { data: invoiceRaw, error: invoiceError } = await supabase
      .from('invoices')
      .select(`*, profiles!invoices_member_brand_fkey(id, full_name, avatar_url)`)
      .eq('id', invoiceId)
      .eq('brand_id', brandId)
      .single()

    if (invoiceError || !invoiceRaw) return { error: invoiceError?.message ?? 'Invoice not found' }

    const invoice = invoiceRaw as InvoiceWithDetails & { amount: number }

    // H5: only create a Snap token for invoices that still need payment
    if ((invoice.status as string) !== 'pending') {
      return { error: `Invoice is already ${invoice.status as string} — no payment needed.` }
    }

    const memberProfile = invoice.profiles as Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url'> | null
    const auth = Buffer.from(serverKey + ':').toString('base64')

    // H7: use production or sandbox endpoint based on env var
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true'
    const snapUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

    const response = await fetch(snapUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction_details: {
          order_id:     invoiceId,
          gross_amount: Math.round(invoice.amount),
        },
        customer_details: {
          first_name: memberProfile?.full_name ?? 'Customer',
        },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      return { error: `Midtrans error: ${response.status} ${errorBody}` }
    }

    const result = await response.json() as { token: string; redirect_url: string }
    return { data: { snap_token: result.token, redirect_url: result.redirect_url } }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

// ── processRefund ────────────────────────────────────────────────────────────

export async function processRefund(
  invoiceId: string,
  reason: string
): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }
    const brandId = profile.brand_id

    // M9: refunds are admin-only
    if (profile.role !== 'admin') return { error: 'Admin access required to process refunds' }

    // M3: cap reason length
    const trimmedReason = reason.trim().slice(0, 500)
    if (!trimmedReason) return { error: 'Refund reason is required' }

    const { data: existingRaw, error: fetchError } = await supabase
      .from('invoices')
      .select('notes, status, membership_id, member_id, paid_at, pt_credits_applied')
      .eq('id', invoiceId)
      .eq('brand_id', brandId)
      .single()

    if (fetchError || !existingRaw) return { error: fetchError?.message ?? 'Invoice not found' }
    const existing = existingRaw as {
      notes: string | null
      status: string
      membership_id: string | null
      member_id: string
      paid_at: string | null
      pt_credits_applied: number | null
    }
    if (existing.status !== 'paid') return { error: 'Only paid invoices can be refunded' }

    // Enforce per-brand refund window
    const { data: brand } = await supabase
      .from('brands')
      .select('refund_window_days')
      .eq('id', brandId)
      .single()

    const windowDays = (brand as { refund_window_days?: number } | null)?.refund_window_days ?? 1

    // M5: if paid_at is null, refund is always allowed (data integrity gap — don't block the operation)
    if (existing.paid_at) {
      const windowMs = windowDays * 24 * 60 * 60 * 1000
      if (Date.now() - new Date(existing.paid_at).getTime() > windowMs) {
        return { error: `Refund window has expired (${windowDays} day${windowDays !== 1 ? 's' : ''} after payment)` }
      }
    }

    const updatedNotes = existing.notes
      ? `${existing.notes}\nRefund reason: ${trimmedReason}`
      : `Refund reason: ${trimmedReason}`

    const { error } = await supabase
      .from('invoices')
      .update({
        status:      'refunded',
        refunded_at: new Date().toISOString(),
        notes:       updatedNotes,
      } as never)
      .eq('id', invoiceId)
      .eq('brand_id', brandId)

    if (error) return { error: error.message }

    // H6: reverse the linked membership correctly
    if (existing.membership_id) {
      const memId = existing.membership_id  // narrow to string for Supabase TS
      const { data: memRaw } = await supabase
        .from('memberships')
        .select('id, status, package_id, pt_sessions_remaining')
        .eq('id', memId)
        .eq('brand_id', brandId)
        .maybeSingle()

      const mem = memRaw as { id: string; status: string; package_id: string | null; pt_sessions_remaining: number | null } | null

      if (mem && mem.status === 'active') {
        const pkgId = mem.package_id
        if (pkgId) {
          const { data: pkgRaw } = await supabase
            .from('membership_packages')
            .select('package_category')
            .eq('id', pkgId)
            .single()

          const category = (pkgRaw as { package_category?: string } | null)?.package_category

          if (category === 'pt_sessions' || category === 'bundled') {
            // Subtract only the credits this invoice added (stored in pt_credits_applied).
            // Fall back to the package's full credit count for non-stacked invoices.
            const { data: fullPkgRaw } = await supabase
              .from('membership_packages')
              .select('pt_session_credits')
              .eq('id', pkgId)
              .single()

            const creditsToReverse =
              existing.pt_credits_applied ??
              (fullPkgRaw as { pt_session_credits?: number | null } | null)?.pt_session_credits ??
              0

            const newRemaining = Math.max(0, (mem.pt_sessions_remaining ?? 0) - creditsToReverse)

            if (newRemaining <= 0) {
              await supabase
                .from('memberships')
                .update({ status: 'cancelled' as never, pt_sessions_remaining: 0 } as never)
                .eq('id', mem.id)
                .eq('brand_id', brandId)
            } else {
              await supabase
                .from('memberships')
                .update({ pt_sessions_remaining: newRemaining } as never)
                .eq('id', mem.id)
                .eq('brand_id', brandId)
            }
          } else {
            // Gym access / non-PT membership: cancel it
            await supabase
              .from('memberships')
              .update({ status: 'cancelled' } as never)
              .eq('id', mem.id)
              .eq('brand_id', brandId)
          }
        } else {
          // No package linked — just cancel the membership
          await supabase
            .from('memberships')
            .update({ status: 'cancelled' } as never)
            .eq('id', mem.id)
            .eq('brand_id', brandId)
        }
      }
    }

    revalidatePath('/admin/billing')
    revalidatePath('/admin/members')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

// ── cancelPendingPackage ─────────────────────────────────────────────────────

export async function cancelPendingPackage(
  invoiceId: string
): Promise<{ error?: string }> {
  try {
    const supabase = createServiceClient()
    const authClient = createClient()
    const { profile } = await getAuthedProfile(authClient)
    if (!profile.brand_id) return { error: 'No brand context' }
    const brandId = profile.brand_id

    if (profile.role !== 'admin' && profile.role !== 'branch_manager') {
      return { error: 'Access denied' }
    }

    const { data: invRaw } = await supabase
      .from('invoices')
      .select('id, status, membership_id')
      .eq('id', invoiceId)
      .eq('brand_id', brandId)
      .single()

    if (!invRaw) return { error: 'Invoice not found' }
    const inv = invRaw as { id: string; status: string; membership_id: string | null }
    if (inv.status !== 'pending') return { error: 'Only pending invoices can be cancelled' }

    if (inv.membership_id) {
      const memId = inv.membership_id
      const { data: memRaw } = await supabase
        .from('memberships')
        .select('id, status')
        .eq('id', memId)
        .eq('brand_id', brandId)
        .maybeSingle()

      const mem = memRaw as { id: string; status: string } | null

      if (mem && mem.status === 'pending_payment') {
        // Hard-delete all pending invoices linked to this membership
        const { error: invErr } = await supabase
          .from('invoices')
          .delete()
          .eq('membership_id', mem.id)
          .eq('brand_id', brandId)
          .eq('status', 'pending')

        if (invErr) return { error: invErr.message }

        // Hard-delete the membership
        const { error: memErr } = await supabase
          .from('memberships')
          .delete()
          .eq('id', mem.id)
          .eq('brand_id', brandId)

        if (memErr) return { error: memErr.message }
      } else {
        // Membership is active/paid — only delete this specific invoice
        const { error: invErr } = await supabase
          .from('invoices')
          .delete()
          .eq('id', invoiceId)
          .eq('brand_id', brandId)

        if (invErr) return { error: invErr.message }
      }
    } else {
      // No linked membership — just delete the invoice
      const { error: invErr } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('brand_id', brandId)

      if (invErr) return { error: invErr.message }
    }

    revalidatePath('/admin/billing')
    revalidatePath('/admin/members')
    revalidatePath('/branch-manager/billing')
    revalidatePath('/branch-manager/members')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

// ── getRevenueSummary ────────────────────────────────────────────────────────

export async function getRevenueSummary(): Promise<{
  data?: { month: string; amount: number }[]
  error?: string
}> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }
    const brandId = profile.brand_id

    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    // Fetch brand timezone for correct month bucketing (L4)
    const { data: brand } = await supabase
      .from('brands')
      .select('timezone')
      .eq('id', brandId)
      .single()
    const tz = (brand as { timezone?: string | null } | null)?.timezone ?? 'Asia/Jakarta'

    const { data: rawData, error } = await supabase
      .from('invoices')
      .select('amount, paid_at')
      .eq('brand_id', brandId)
      .eq('status', 'paid')
      .gte('paid_at', sixMonthsAgo.toISOString())
      .not('paid_at', 'is', null)

    if (error) return { error: error.message }

    const data = (rawData ?? []) as { amount: number; paid_at: string | null }[]
    const grouped: Record<string, number> = {}

    for (const invoice of data) {
      if (!invoice.paid_at) continue
      const localStr = new Date(invoice.paid_at).toLocaleDateString('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
      })
      // en-CA locale gives "YYYY-MM" when requesting year+month
      const key = localStr.slice(0, 7)
      grouped[key] = (grouped[key] ?? 0) + invoice.amount
    }

    const result = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }))

    return { data: result }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

// ── getMemberInvoices ────────────────────────────────────────────────────────

export async function getMemberInvoices(): Promise<{
  data: InvoiceWithDetails[]
  error?: string
}> {
  try {
    const supabase = createClient()
    const { user, profile } = await getAuthedProfile(supabase)

    // L1: scope to the member's current brand so multi-brand members don't see
    // invoices from other gyms they belong to
    let query = supabase
      .from('invoices')
      .select(
        `*, profiles!invoices_member_brand_fkey(id, full_name, avatar_url), memberships:membership_id(id, package_id, membership_packages:package_id(id, name))`
      )
      .eq('member_id', user.id)
      .order('created_at', { ascending: false })

    if (profile.brand_id) {
      query = query.eq('brand_id', profile.brand_id)
    }

    const { data: rawData, error } = await query
    if (error) return { data: [], error: error.message }

    return { data: (rawData ?? []) as unknown as InvoiceWithDetails[] }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : 'An error occurred' }
  }
}
