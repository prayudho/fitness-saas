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
        `*, profiles:member_id(id, full_name, avatar_url), memberships:membership_id(id, package_id, membership_packages:package_id(id, name))`,
        { count: 'exact' }
      )
      .eq('brand_id', profile.brand_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    const { data, error, count } = await query

    if (error) return { data: [], count: 0, error: error.message }

    return { data: (data ?? []) as InvoiceWithDetails[], count: count ?? 0 }
  } catch (e) {
    return { data: [], count: 0, error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function getInvoice(id: string): Promise<{ data?: InvoiceWithDetails; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { data, error } = await supabase
      .from('invoices')
      .select(
        `*, profiles:member_id(id, full_name, avatar_url), memberships:membership_id(id, package_id, membership_packages:package_id(id, name))`
      )
      .eq('id', id)
      .eq('brand_id', profile.brand_id)
      .single()

    if (error) return { error: error.message }

    return { data: data as InvoiceWithDetails }
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
  input: { payment_method: 'cash' | 'transfer'; notes?: string }
): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: input.payment_method,
        ...(input.notes !== undefined && { notes: input.notes }),
      })
      .eq('id', invoiceId)
      .eq('brand_id', profile.brand_id)

    if (error) return { error: error.message }

    revalidatePath('/admin/billing')
    revalidatePath('/member/billing')
    return {}
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
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
      .select(`*, profiles:member_id(id, full_name, avatar_url)`)
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
      .select('notes')
      .eq('id', invoiceId)
      .eq('brand_id', profile.brand_id)
      .single()

    if (fetchError || !existing) return { error: fetchError?.message ?? 'Invoice not found' }

    const updatedNotes = existing.notes
      ? `${existing.notes}\nRefund reason: ${reason}`
      : `Refund reason: ${reason}`

    const { error } = await supabase
      .from('invoices')
      .update({ status: 'refunded', notes: updatedNotes })
      .eq('id', invoiceId)
      .eq('brand_id', profile.brand_id)

    if (error) return { error: error.message }

    revalidatePath('/admin/billing')
    return {}
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
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

    const { data, error } = await supabase
      .from('invoices')
      .select(
        `*, profiles:member_id(id, full_name, avatar_url), memberships:membership_id(id, package_id, membership_packages:package_id(id, name))`
      )
      .eq('member_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return { data: [], error: error.message }

    return { data: (data ?? []) as InvoiceWithDetails[] }
  } catch (e) {
    return { data: [], error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}
