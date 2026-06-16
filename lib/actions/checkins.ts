'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAuthedProfile, getBranchContext } from '@/lib/actions/utils'
import { checkMemberAccessStatus, type MemberAccessStatus } from '@/lib/actions/membership.actions'
import type { Database } from '@/types/database'

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
type CheckinRow = Row<'checkins'>
type MembershipPackageRow = Row<'membership_packages'>
type MembershipRow = Row<'memberships'>
type InvoiceRow = Row<'invoices'>
type ProfileRow = Row<'profiles'>

export type CheckinResult = {
  success: boolean
  // 'override_required' = gym expired but PT still active; staff must decide
  status: 'success' | 'warning' | 'denied' | 'override_required'
  message: string
  member: { full_name: string | null; avatar_url: string | null }
  membership?: {
    id?: string
    expires_at: string | null
    membership_packages: { name: string } | null
  } | null
  accessStatus?: MemberAccessStatus | null
}

export type CheckinWithProfile = CheckinRow & {
  profiles: Pick<ProfileRow, 'full_name' | 'avatar_url'> | null
}

export type MemberSearchResult = ProfileRow & {
  memberships: (MembershipRow & {
    membership_packages: MembershipPackageRow | null
  })[]
}

export { MemberAccessStatus }

export async function processCheckin(input: {
  member_id: string
  method: 'qr' | 'staff' | 'gate'
  branchId?: string
}): Promise<CheckinResult> {
  try {
    const supabase = createClient()
    const { profile: staffProfile } = await getAuthedProfile(supabase)
    if (!staffProfile.brand_id) {
      return {
        success: false,
        status: 'denied',
        message: 'No brand context',
        member: { full_name: null, avatar_url: null },
      }
    }
    const brandId = staffProfile.brand_id

    // Resolve branch context: explicit override > staff primary branch
    let branchId = input.branchId ?? null
    if (!branchId) {
      const ctx = await getBranchContext(supabase)
      branchId = ctx.branchId
    }

    // Fetch member profile
    const { data: rawMemberProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, brand_id, role')
      .eq('id', input.member_id)
      .eq('brand_id', brandId)
      .single()

    type ProfileResult = { id: string; full_name: string | null; avatar_url: string | null; brand_id: string | null; role: string | null }
    const memberProfile = rawMemberProfile as ProfileResult | null

    if (profileError || !memberProfile) {
      return {
        success: false,
        status: 'denied',
        message: 'Member not found',
        member: { full_name: null, avatar_url: null },
      }
    }

    // Fetch most recent active membership
    const { data: rawMembership, error: membershipError } = await supabase
      .from('memberships')
      .select('*, membership_packages(name)')
      .eq('member_id', input.member_id)
      .eq('brand_id', brandId)
      .in('status', ['active', 'frozen'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    type MembershipResult = MembershipRow & { membership_packages: { name: string } | null }
    const membership = rawMembership as MembershipResult | null

    if (membershipError || !membership) {
      return {
        success: false,
        status: 'denied',
        message: 'No active membership',
        member: { full_name: memberProfile.full_name, avatar_url: memberProfile.avatar_url },
      }
    }

    // Check access status using the new logic
    const { data: accessStatus } = await checkMemberAccessStatus(membership.id)

    if (!accessStatus) {
      return {
        success: false,
        status: 'denied',
        message: 'Unable to verify access status',
        member: { full_name: memberProfile.full_name, avatar_url: memberProfile.avatar_url },
      }
    }

    const memberInfo = {
      full_name: memberProfile.full_name,
      avatar_url: memberProfile.avatar_url,
    }

    const membershipInfo = {
      id:                  membership.id,
      expires_at:          membership.expires_at,
      membership_packages: membership.membership_packages as { name: string } | null,
    }

    // Case: all access denied (gym expired, no PT sessions either)
    if (!accessStatus.canEnterGym && !accessStatus.hasPTSessions) {
      return {
        success: false,
        status: 'denied',
        message: 'Access denied — membership expired',
        member: memberInfo,
        membership: membershipInfo,
        accessStatus,
      }
    }

    // Case: gym expired but PT sessions still active — staff must decide
    if (!accessStatus.canEnterGym && accessStatus.hasPTSessions) {
      return {
        success: false,
        status: 'override_required',
        message: accessStatus.warningMessage ?? 'Gym access expired. PT Sessions still active.',
        member: memberInfo,
        membership: membershipInfo,
        accessStatus,
      }
    }

    // Insert checkin for normal/warning cases
    const warningMessage =
      accessStatus.warningMessage && !accessStatus.warningMessage.includes('expired')
        ? accessStatus.warningMessage
        : null

    await supabase.from('checkins').insert({
      brand_id:        brandId,
      member_id:       input.member_id,
      membership_id:   membership.id,
      method:          input.method,
      checked_in_at:   new Date().toISOString(),
      staff_override:  null,
      warning_message: warningMessage,
      ...(branchId ? { branch_id: branchId } : {}),
    } as never)

    revalidatePath('/staff/checkin')

    // Case: expiring soon (7 days or less)
    if (accessStatus.warningMessage) {
      return {
        success: true,
        status: 'warning',
        message: accessStatus.warningMessage,
        member: memberInfo,
        membership: membershipInfo,
        accessStatus,
      }
    }

    return {
      success: true,
      status: 'success',
      message: 'Welcome back!',
      member: memberInfo,
      membership: membershipInfo,
      accessStatus,
    }
  } catch (e) {
    return {
      success: false,
      status: 'denied',
      message: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred',
      member: { full_name: null, avatar_url: null },
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// recordCheckinWithOverride
// Called when staff clicks "Allow Entry" or "Deny Entry" after an
// override_required result. Creates the checkin row with staff_override set.
// ──────────────────────────────────────────────────────────────────────────

export async function recordCheckinWithOverride(input: {
  member_id: string
  membership_id: string
  method: 'qr' | 'staff' | 'gate'
  allowed: boolean
  warning_message: string | null
  branchId?: string
}): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { profile: staffProfile } = await getAuthedProfile(supabase)
    if (!staffProfile.brand_id) return { error: 'No brand context' }
    const brandId2 = staffProfile.brand_id

    let branchId = input.branchId ?? null
    if (!branchId) {
      const ctx = await getBranchContext(supabase)
      branchId = ctx.branchId
    }

    await supabase.from('checkins').insert({
      brand_id:        brandId2,
      member_id:       input.member_id,
      membership_id:   input.membership_id,
      method:          input.method,
      checked_in_at:   new Date().toISOString(),
      staff_override:  input.allowed,
      warning_message: input.warning_message,
      ...(branchId ? { branch_id: branchId } : {}),
    } as never)

    revalidatePath('/staff/checkin')
    return {}
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function searchMemberForCheckin(
  query: string
): Promise<{ data: MemberSearchResult[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: [], error: 'No brand context' }

    const { data, error } = await supabase
      .from('profiles')
      .select('*, memberships(*, membership_packages(*))')
      .eq('brand_id', profile.brand_id)
      .eq('role', 'member')
      .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
      .order('full_name', { ascending: true })
      .limit(10)

    if (error) return { data: [], error: error.message }

    return { data: (data ?? []) as MemberSearchResult[] }
  } catch (e) {
    return { data: [], error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function getCheckinLog(
  limit = 50,
  filters?: { dateFilter?: 'today' | 'week' | 'all'; branchId?: string }
): Promise<{ data: CheckinWithProfile[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: [], error: 'No brand context' }

    let query = supabase
      .from('checkins')
      .select('*, profiles!checkins_member_brand_fkey(full_name, avatar_url)')
      .eq('brand_id', profile.brand_id)
      .order('checked_in_at', { ascending: false })
      .limit(limit)

    if (filters?.branchId) {
      query = query.eq('branch_id' as never, filters.branchId)
    }

    if (filters?.dateFilter === 'today') {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
      query = query.gte('checked_in_at', todayStart.toISOString())
    } else if (filters?.dateFilter === 'week') {
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7)
      query = query.gte('checked_in_at', weekStart.toISOString())
    }

    const { data, error } = await query

    if (error) return { data: [], error: error.message }

    return { data: (data ?? []) as CheckinWithProfile[] }
  } catch (e) {
    return { data: [], error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function getOccupancyCount(): Promise<{ count: number; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { count: 0, error: 'No brand context' }

    const today = new Date().toISOString().split('T')[0]

    const { count, error } = await supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', profile.brand_id)
      .gte('checked_in_at', `${today}T00:00:00.000Z`)
      .lt('checked_in_at', `${today}T23:59:59.999Z`)

    if (error) return { count: 0, error: error.message }

    return { count: count ?? 0 }
  } catch (e) {
    return { count: 0, error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function createWalkinPass(
  memberId: string,
  packageId: string
): Promise<{
  data?: { membership: MembershipRow; invoice: InvoiceRow }
  error?: string
}> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }
    const brandId = profile.brand_id

    const { branchId } = await getBranchContext(supabase)

    const { data: rawPkg, error: pkgError } = await supabase
      .from('membership_packages')
      .select('*')
      .eq('id', packageId)
      .eq('brand_id', brandId)
      .eq('type', 'day_pass')
      .single()

    type PkgResult = MembershipPackageRow
    const pkg = rawPkg as PkgResult | null

    if (pkgError || !pkg) return { error: pkgError?.message ?? 'Day pass package not found' }

    const today = new Date().toISOString().split('T')[0]

    const { data: rawMembership, error: membershipError } = await supabase
      .from('memberships')
      .insert({
        brand_id:              brandId,
        member_id:             memberId,
        package_id:            packageId,
        status:                'active',
        starts_at:             today,
        expires_at:            `${today}T23:59:59.999Z`,
        sessions_remaining:    pkg.session_credits ?? null,
        auto_renew:            false,
        package_category:      'gym_access',
        gym_access_expires_at: `${today}T23:59:59.999Z`,
        gym_access_status:     'active',
        pt_sessions_status:    'active',
        ...(branchId ? { branch_id: branchId } : {}),
      } as never)
      .select()
      .single()

    const membership = rawMembership as MembershipRow | null

    if (membershipError || !membership) {
      return { error: membershipError?.message ?? 'Failed to create membership' }
    }

    const { data: rawInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        brand_id:      brandId,
        member_id:     memberId,
        membership_id: membership.id,
        amount:        pkg.price,
        currency:      pkg.currency,
        status:        'pending',
        notes:         'Walk-in day pass',
        ...(branchId ? { branch_id: branchId } : {}),
      } as never)
      .select()
      .single()

    const invoice = rawInvoice as InvoiceRow | null

    if (invoiceError || !invoice) {
      return { error: invoiceError?.message ?? 'Failed to create invoice' }
    }

    await supabase.from('checkins').insert({
      brand_id:       brandId,
      member_id:      memberId,
      membership_id:  membership.id,
      method:         'staff',
      checked_in_at:  new Date().toISOString(),
      ...(branchId ? { branch_id: branchId } : {}),
    } as never)

    revalidatePath('/staff/checkin')
    revalidatePath('/staff/walkin')

    return { data: { membership, invoice } }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}
