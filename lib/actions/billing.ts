'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAuthedProfile } from '@/lib/actions/utils'
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

export async function getInvoices(filters?: {
  status?: string
  page?: number
  limit?: number
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

    const { data: rawData, error, count } = await query

    if (error) return { data: [], count: 0, error: error.message }

    return { data: (rawData ?? []) as unknown as InvoiceWithDetails[], count: count ?? 0 }
  } catch (e) {
    return { data: [], count: 0, error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

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
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function createInvoice(input: {
  member_id: string
  membership_id?: string
  amount: number
  currency?: string
  notes?: string
}): Promise<{ data?: InvoiceRow; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        brand_id: profile.brand_id,
        member_id: input.member_id,
        membership_id: input.membership_id ?? null,
        amount: input.amount,
        currency: input.currency ?? 'IDR',
        status: 'pending',
        notes: input.notes ?? null,
      })
      .select()
      .single()

    if (error) return { error: error.message }

    revalidatePath('/admin/billing')
    return { data: data ?? undefined }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

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

    // Fetch invoice + linked membership in one query
    const { data: invoiceRaw, error: fetchErr } = await supabase
      .from('invoices')
      .select('id, status, membership_id, member_id')
      .eq('id', invoiceId)
      .eq('brand_id', profile.brand_id)
      .single()

    if (fetchErr || !invoiceRaw) return { error: fetchErr?.message ?? 'Invoice not found' }
    if (invoiceRaw.status !== 'pending') return { error: 'Only pending invoices can be confirmed' }

    // Mark invoice paid
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
      .eq('brand_id', profile.brand_id)

    if (payErr) return { error: payErr.message }

    // Activate the linked membership (if it exists and is pending payment)
    if (invoiceRaw.membership_id) {
      const { data: memRaw } = await supabase
        .from('memberships')
        .select('id, status, package_id, member_id')
        .eq('id', invoiceRaw.membership_id)
        .eq('brand_id', profile.brand_id)
        .single()

      const mem = memRaw as (typeof memRaw & { package_category?: string }) | null

      if (mem && (mem.status as string) === 'pending_payment') {
        // For pt_sessions packages: check if an active PT membership already exists → stack onto it
        const { data: pkgRaw } = await supabase
          .from('membership_packages')
          .select('package_category, pt_session_credits, pt_session_expiry_days')
          .eq('id', mem.package_id)
          .single()

        const category = (pkgRaw as { package_category?: string } | null)?.package_category

        if (category === 'pt_sessions' && pkgRaw) {
          const pkg = pkgRaw as { pt_session_credits: number | null; pt_session_expiry_days: number | null }

          const { data: existingPT } = await supabase
            .from('memberships')
            .select('id, pt_sessions_remaining, pt_sessions_expires_at')
            .eq('brand_id', profile.brand_id)
            .eq('member_id', mem.member_id)
            .eq('pt_sessions_status', 'active')
            .eq('status', 'active')
            .neq('id', mem.id)
            .not('pt_sessions_remaining', 'is', null)
            .order('pt_sessions_expires_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (existingPT) {
            // Stack credits onto existing membership
            const addedCredits = pkg.pt_session_credits ?? 0
            const newCredits   = (existingPT.pt_sessions_remaining ?? 0) + addedCredits

            const existingExpMs  = existingPT.pt_sessions_expires_at ? new Date(existingPT.pt_sessions_expires_at).getTime() : 0
            const newExpMs       = pkg.pt_session_expiry_days ? new Date().getTime() + pkg.pt_session_expiry_days * 86400000 : 0
            const extendedExpiry = newExpMs > existingExpMs
              ? new Date(newExpMs).toISOString()
              : existingPT.pt_sessions_expires_at

            await supabase.from('memberships').update({
              pt_sessions_remaining:  newCredits,
              pt_sessions_expires_at: extendedExpiry,
              expires_at:             extendedExpiry,
            } as never).eq('id', existingPT.id)

            // Cancel the now-absorbed pending membership
            await supabase.from('memberships')
              .update({ status: 'cancelled' as never })
              .eq('id', mem.id)

            // Re-link the invoice to the existing (stacked-onto) membership
            await supabase.from('invoices')
              .update({ membership_id: existingPT.id } as never)
              .eq('id', invoiceId)

            revalidatePath('/admin/billing')
            revalidatePath('/admin/members')
            revalidatePath(`/admin/members/${mem.member_id}`)
            return {}
          }
        }

        // Normal activation
        await supabase.from('memberships')
          .update({ status: 'active' as never })
          .eq('id', mem.id)
          .eq('brand_id', profile.brand_id)
      }
    }

    revalidatePath('/admin/billing')
    revalidatePath('/admin/members')
    revalidatePath('/member/billing')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

export async function getMidtransSnapToken(
  invoiceId: string
): Promise<{ data?: { snap_token: string; redirect_url: string }; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const serverKey = process.env.MIDTRANS_SERVER_KEY
    if (!serverKey) {
      return { error: 'Midtrans not configured. Set MIDTRANS_SERVER_KEY in environment variables.' }
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`*, profiles!invoices_member_brand_fkey(id, full_name, avatar_url)`)
      .eq('id', invoiceId)
      .eq('brand_id', profile.brand_id)
      .single()

    if (invoiceError || !invoice) return { error: invoiceError?.message ?? 'Invoice not found' }

    const memberProfile = invoice.profiles as Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url'> | null

    const auth = Buffer.from(serverKey + ':').toString('base64')

    const response = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: invoiceId,
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
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function processRefund(
  invoiceId: string,
  reason: string
): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { data: existing, error: fetchError } = await supabase
      .from('invoices')
      .select('notes, status, membership_id, paid_at')
      .eq('id', invoiceId)
      .eq('brand_id', profile.brand_id)
      .single()

    if (fetchError || !existing) return { error: fetchError?.message ?? 'Invoice not found' }
    if (existing.status !== 'paid') return { error: 'Only paid invoices can be refunded' }

    // Enforce per-brand refund window
    const { data: brand } = await supabase
      .from('brands')
      .select('refund_window_days')
      .eq('id', profile.brand_id)
      .single()

    const windowDays = (brand as { refund_window_days?: number } | null)?.refund_window_days ?? 1
    const paidAt = existing.paid_at ? new Date(existing.paid_at).getTime() : 0
    const windowMs = windowDays * 24 * 60 * 60 * 1000
    if (Date.now() - paidAt > windowMs) {
      return { error: `Refund window has expired (${windowDays} day${windowDays !== 1 ? 's' : ''} after payment)` }
    }

    const updatedNotes = existing.notes
      ? `${existing.notes}\nRefund reason: ${reason}`
      : `Refund reason: ${reason}`

    const { error } = await supabase
      .from('invoices')
      .update({ status: 'refunded', notes: updatedNotes })
      .eq('id', invoiceId)
      .eq('brand_id', profile.brand_id)

    if (error) return { error: error.message }

    // Auto-cancel linked membership
    if ((existing as { membership_id?: string | null }).membership_id) {
      await supabase
        .from('memberships')
        .update({ status: 'cancelled' as never })
        .eq('id', (existing as { membership_id: string }).membership_id)
        .eq('brand_id', profile.brand_id)
    }

    revalidatePath('/admin/billing')
    revalidatePath('/admin/members')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

export async function cancelPendingPackage(
  invoiceId: string
): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    // Fetch the invoice and verify it is still pending
    const { data: inv } = await supabase
      .from('invoices')
      .select('id, status, membership_id')
      .eq('id', invoiceId)
      .eq('brand_id', profile.brand_id)
      .single()

    if (!inv) return { error: 'Invoice not found' }
    if (inv.status !== 'pending') return { error: 'Only pending invoices can be cancelled' }

    // Hard-delete the invoice
    const { error: invErr } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId)
      .eq('brand_id', profile.brand_id)

    if (invErr) return { error: invErr.message }

    // If the linked membership is pending_payment, delete it + any remaining pending invoices
    if (inv.membership_id) {
      const { data: mem } = await supabase
        .from('memberships')
        .select('id, status')
        .eq('id', inv.membership_id)
        .eq('brand_id', profile.brand_id)
        .maybeSingle()

      if (mem && (mem.status as string) === 'pending_payment') {
        // Delete any other pending invoices linked to the same membership
        await supabase
          .from('invoices')
          .delete()
          .eq('membership_id', mem.id)
          .eq('brand_id', profile.brand_id)
          .eq('status', 'pending')

        await supabase
          .from('memberships')
          .delete()
          .eq('id', mem.id)
          .eq('brand_id', profile.brand_id)
      }
    }

    revalidatePath('/admin/billing')
    revalidatePath('/admin/members')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

export async function getRevenueSummary(): Promise<{
  data?: { month: string; amount: number }[]
  error?: string
}> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('invoices')
      .select('amount, paid_at')
      .eq('brand_id', profile.brand_id)
      .eq('status', 'paid')
      .gte('paid_at', sixMonthsAgo.toISOString())
      .not('paid_at', 'is', null)

    if (error) return { error: error.message }

    const grouped: Record<string, number> = {}

    for (const invoice of data ?? []) {
      if (!invoice.paid_at) continue
      const date = new Date(invoice.paid_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      grouped[key] = (grouped[key] ?? 0) + invoice.amount
    }

    const result = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }))

    return { data: result }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function getMemberInvoices(): Promise<{
  data: InvoiceWithDetails[]
  error?: string
}> {
  try {
    const supabase = createClient()
    const { user } = await getAuthedProfile(supabase)

    const { data: rawData, error } = await supabase
      .from('invoices')
      .select(
        `*, profiles!invoices_member_brand_fkey(id, full_name, avatar_url), memberships:membership_id(id, package_id, membership_packages:package_id(id, name))`
      )
      .eq('member_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return { data: [], error: error.message }

    return { data: (rawData ?? []) as unknown as InvoiceWithDetails[] }
  } catch (e) {
    return { data: [], error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}
