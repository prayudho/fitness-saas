'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAuthedProfile } from '@/lib/actions/utils'
import type { Database } from '@/types/database'

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

export type MembershipPackageRow = Row<'membership_packages'>
export type MembershipRow = Row<'memberships'>
export type InvoiceRow = Row<'invoices'>
export type CheckinRow = Row<'checkins'>
export type TrainerSessionRow = Row<'trainer_sessions'>
export type ProfileRow = Row<'profiles'>

export type MembershipWithPackage = MembershipRow & {
  membership_packages: MembershipPackageRow | null
}

export type ProfileWithMembership = ProfileRow & {
  memberships: MembershipWithPackage[]
}

export type TrainerSessionWithTrainer = TrainerSessionRow & {
  trainer: {
    id: string
    profiles: Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url'> | null
  } | null
}

export type MemberDetail = ProfileRow & {
  memberships: MembershipWithPackage[]
  checkins: CheckinRow[]
  invoices: InvoiceRow[]
  trainer_sessions: TrainerSessionWithTrainer[]
}

export async function getMembers(filters?: {
  search?: string
  status?: string
  page?: number
  limit?: number
}): Promise<{ data: ProfileWithMembership[]; count: number; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: [], count: 0, error: 'No brand context' }

    const limit = filters?.limit ?? 25
    const page = filters?.page ?? 1
    const offset = (page - 1) * limit

    let query = supabase
      .from('profiles')
      .select(
        `*, memberships(*, membership_packages(*))`,
        { count: 'exact' }
      )
      .eq('brand_id', profile.brand_id)
      .eq('role', 'member')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (filters?.search) {
      query = query.or(
        `full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
      )
    }

    const { data, error, count } = await query

    if (error) return { data: [], count: 0, error: error.message }

    let result = (data ?? []) as ProfileWithMembership[]

    // Filter by membership status if needed
    if (filters?.status && filters.status !== 'all') {
      result = result.filter((member) =>
        member.memberships.some((m) => m.status === filters.status)
      )
    }

    return { data: result, count: count ?? 0 }
  } catch (e) {
    return { data: [], count: 0, error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function getMember(id: string): Promise<{ data?: MemberDetail; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { data: memberProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('brand_id', profile.brand_id)
      .single()

    if (profileError || !memberProfile) return { error: profileError?.message ?? 'Member not found' }

    const [membershipsRes, checkinsRes, invoicesRes, sessionsRes] = await Promise.all([
      supabase
        .from('memberships')
        .select('*, membership_packages(*)')
        .eq('member_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('checkins')
        .select('*')
        .eq('member_id', id)
        .order('checked_in_at', { ascending: false })
        .limit(20),
      supabase
        .from('invoices')
        .select('*')
        .eq('member_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('trainer_sessions')
        .select('*, trainer:trainers!trainer_id(id, profiles!trainers_id_brand_fkey(id, full_name, avatar_url))')
        .eq('member_id', id)
        .order('scheduled_at', { ascending: false })
        .limit(20),
    ])

    const memberDetail: MemberDetail = {
      ...memberProfile,
      memberships: (membershipsRes.data ?? []) as MembershipWithPackage[],
      checkins: checkinsRes.data ?? [],
      invoices: invoicesRes.data ?? [],
      trainer_sessions: (sessionsRes.data ?? []) as TrainerSessionWithTrainer[],
    }

    return { data: memberDetail }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function updateMember(
  id: string,
  input: {
    full_name?: string
    phone?: string
    gender?: string
    date_of_birth?: string
    emergency_contact_name?: string
    emergency_contact_phone?: string
  }
): Promise<{ data?: ProfileRow; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...(input.full_name !== undefined && { full_name: input.full_name }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.gender !== undefined && {
          gender: input.gender as ProfileRow['gender'],
        }),
        ...(input.date_of_birth !== undefined && { date_of_birth: input.date_of_birth }),
        ...(input.emergency_contact_name !== undefined && {
          emergency_contact_name: input.emergency_contact_name,
        }),
        ...(input.emergency_contact_phone !== undefined && {
          emergency_contact_phone: input.emergency_contact_phone,
        }),
      })
      .eq('id', id)
      .eq('brand_id', profile.brand_id)
      .select()
      .single()

    if (error) return { error: error.message }

    revalidatePath('/admin/members')
    revalidatePath(`/admin/members/${id}`)
    return { data: data ?? undefined }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function freezeMembership(
  membershipId: string,
  input: { frozen_from: string; frozen_until: string; reason?: string }
): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { user, profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { error: freezeError } = await supabase.from('membership_freezes').insert({
      membership_id: membershipId,
      frozen_from: input.frozen_from,
      frozen_until: input.frozen_until,
      reason: input.reason ?? null,
      created_by: user.id,
    })

    if (freezeError) return { error: freezeError.message }

    const { error: updateError } = await supabase
      .from('memberships')
      .update({ status: 'frozen' })
      .eq('id', membershipId)

    if (updateError) return { error: updateError.message }

    revalidatePath('/admin/members')
    return {}
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function unfreezeMembership(membershipId: string): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const today = new Date().toISOString().split('T')[0]

    const { error: updateMembershipError } = await supabase
      .from('memberships')
      .update({ status: 'active' })
      .eq('id', membershipId)

    if (updateMembershipError) return { error: updateMembershipError.message }

    await supabase
      .from('membership_freezes')
      .update({ frozen_until: today })
      .eq('membership_id', membershipId)
      .gt('frozen_until', today)

    revalidatePath('/admin/members')
    return {}
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function cancelMembership(membershipId: string): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { data: mem } = await supabase
      .from('memberships')
      .select('id, status')
      .eq('id', membershipId)
      .eq('brand_id', profile.brand_id)
      .single()

    if (!mem) return { error: 'Membership not found' }
    if ((mem.status as string) !== 'pending_payment') {
      return { error: 'Only unpaid memberships can be cancelled from here' }
    }

    // Hard-delete all pending invoices linked to this membership
    const { error: invErr } = await supabase
      .from('invoices')
      .delete()
      .eq('membership_id', membershipId)
      .eq('brand_id', profile.brand_id)
      .eq('status', 'pending')

    if (invErr) return { error: invErr.message }

    // Hard-delete the membership
    const { error: memErr } = await supabase
      .from('memberships')
      .delete()
      .eq('id', membershipId)
      .eq('brand_id', profile.brand_id)

    if (memErr) return { error: memErr.message }

    revalidatePath('/admin/members')
    revalidatePath('/admin/billing')
    return {}
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function assignPackage(input: {
  member_id: string
  package_id: string
  starts_at: string
  promo_code?: string
}): Promise<{
  data?: { membership: MembershipRow; invoice: InvoiceRow }
  error?: string
}> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    // Fetch the package
    const { data: pkg, error: pkgError } = await supabase
      .from('membership_packages')
      .select('*')
      .eq('id', input.package_id)
      .eq('brand_id', profile.brand_id)
      .single()

    if (pkgError || !pkg) return { error: pkgError?.message ?? 'Package not found' }

    // Calculate expiry dates per package category
    const category = (pkg.package_category as string) ?? 'gym_access'
    const startMs = new Date(input.starts_at).getTime()

    const gymDays = pkg.gym_access_days ?? pkg.duration_days ?? 0
    const gymAccessExpiresAt =
      category === 'pt_sessions' ? null
        : gymDays > 0 ? new Date(startMs + gymDays * 86400000).toISOString()
        : null

    const ptDays = pkg.pt_session_expiry_days
    const ptSessionsExpiresAt =
      category === 'gym_access' ? null
        : ptDays && ptDays > 0 ? new Date(startMs + ptDays * 86400000).toISOString()
        : null

    const ptSessionsRemaining =
      category === 'gym_access' ? null : (pkg.pt_session_credits ?? null)

    const expiresAt =
      category === 'pt_sessions' ? ptSessionsExpiresAt : gymAccessExpiresAt

    // Handle promo code
    let finalAmount = pkg.price
    let promoCodeId: string | null = null

    if (input.promo_code) {
      const now = new Date().toISOString()
      const { data: promo, error: promoError } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', input.promo_code)
        .eq('brand_id', profile.brand_id)
        .eq('is_active', true)
        .single()

      if (promoError || !promo) return { error: 'Invalid or inactive promo code' }

      // Check validity dates
      if (promo.valid_from && promo.valid_from > now) {
        return { error: 'Promo code is not yet valid' }
      }
      if (promo.valid_until && promo.valid_until < now) {
        return { error: 'Promo code has expired' }
      }
      if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
        return { error: 'Promo code has reached its maximum usage' }
      }

      if (promo.discount_type === 'percent') {
        finalAmount = pkg.price * (1 - promo.discount_value / 100)
      } else {
        finalAmount = Math.max(0, pkg.price - promo.discount_value)
      }

      promoCodeId = promo.id
    }

    // ── Normal flow: create a new membership ─────────────────────────────────
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .insert({
        brand_id:              profile.brand_id,
        member_id:             input.member_id,
        package_id:            input.package_id,
        status:                'pending_payment' as never,
        starts_at:             input.starts_at,
        expires_at:            expiresAt,
        sessions_remaining:    pkg.session_credits ?? ptSessionsRemaining,
        auto_renew:            false,
        package_category:      category,
        gym_access_expires_at: gymAccessExpiresAt,
        pt_sessions_expires_at: ptSessionsExpiresAt,
        pt_sessions_remaining: ptSessionsRemaining,
        gym_access_status:     'active',
        pt_sessions_status:    'active',
      })
      .select()
      .single()

    if (membershipError || !membership) return { error: membershipError?.message ?? 'Failed to create membership' }

    // Insert invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        brand_id: profile.brand_id,
        member_id: input.member_id,
        membership_id: membership.id,
        amount: finalAmount,
        currency: pkg.currency,
        status: 'pending',
        notes: promoCodeId ? `Promo code applied` : null,
      })
      .select()
      .single()

    if (invoiceError || !invoice) return { error: invoiceError?.message ?? 'Failed to create invoice' }

    // Increment promo code usage
    if (promoCodeId) {
      const { data: currentPromo } = await supabase
        .from('promo_codes')
        .select('used_count')
        .eq('id', promoCodeId)
        .single()

      if (currentPromo) {
        await supabase
          .from('promo_codes')
          .update({ used_count: currentPromo.used_count + 1 })
          .eq('id', promoCodeId)
      }
    }

    revalidatePath('/admin/members')
    revalidatePath(`/admin/members/${input.member_id}`)

    return { data: { membership, invoice } }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}
