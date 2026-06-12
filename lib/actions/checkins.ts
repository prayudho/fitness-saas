'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAuthedProfile } from '@/lib/actions/utils'
import type { Database } from '@/types/database'

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
type CheckinRow = Row<'checkins'>
type MembershipPackageRow = Row<'membership_packages'>
type MembershipRow = Row<'memberships'>
type InvoiceRow = Row<'invoices'>
type ProfileRow = Row<'profiles'>

export type CheckinResult = {
  success: boolean
  status: 'success' | 'warning' | 'denied'
  message: string
  member: { full_name: string | null; avatar_url: string | null }
  membership?: {
    expires_at: string | null
    membership_packages: { name: string } | null
  } | null
}

export type CheckinWithProfile = CheckinRow & {
  profiles: Pick<ProfileRow, 'full_name' | 'avatar_url'> | null
}

export type MemberSearchResult = ProfileRow & {
  memberships: (MembershipRow & {
    membership_packages: MembershipPackageRow | null
  })[]
}

export async function processCheckin(input: {
  member_id: string
  method: 'qr' | 'staff' | 'gate'
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

    // Fetch member profile
    const { data: memberProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, brand_id, role')
      .eq('id', input.member_id)
      .eq('brand_id', staffProfile.brand_id)
      .single()

    if (profileError || !memberProfile) {
      return {
        success: false,
        status: 'denied',
        message: 'Member not found',
        member: { full_name: null, avatar_url: null },
      }
    }

    // Fetch most recent active membership
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('*, membership_packages(name)')
      .eq('member_id', input.member_id)
      .eq('brand_id', staffProfile.brand_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (membershipError || !membership) {
      return {
        success: false,
        status: 'denied',
        message: 'No active membership',
        member: { full_name: memberProfile.full_name, avatar_url: memberProfile.avatar_url },
      }
    }

    // Insert checkin
    await supabase.from('checkins').insert({
      brand_id: staffProfile.brand_id,
      member_id: input.member_id,
      membership_id: membership.id,
      method: input.method,
      checked_in_at: new Date().toISOString(),
    })

    revalidatePath('/staff/checkin')

    // Check if expiring within 7 days
    if (membership.expires_at) {
      const expiresAt = new Date(membership.expires_at)
      const now = new Date()
      const diffMs = expiresAt.getTime() - now.getTime()
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays <= 7 && diffDays >= 0) {
        return {
          success: true,
          status: 'warning',
          message: `Membership expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
          member: { full_name: memberProfile.full_name, avatar_url: memberProfile.avatar_url },
          membership: {
            expires_at: membership.expires_at,
            membership_packages: membership.membership_packages as { name: string } | null,
          },
        }
      }
    }

    return {
      success: true,
      status: 'success',
      message: 'Welcome back!',
      member: { full_name: memberProfile.full_name, avatar_url: memberProfile.avatar_url },
      membership: {
        expires_at: membership.expires_at,
        membership_packages: membership.membership_packages as { name: string } | null,
      },
    }
  } catch (e) {
    return {
      success: false,
      status: 'denied',
      message: e instanceof Error ? e.message : 'An error occurred',
      member: { full_name: null, avatar_url: null },
    }
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
    return { data: [], error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

export async function getCheckinLog(
  limit = 50
): Promise<{ data: CheckinWithProfile[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: [], error: 'No brand context' }

    const { data, error } = await supabase
      .from('checkins')
      .select('*, profiles!member_id(full_name, avatar_url)')
      .eq('brand_id', profile.brand_id)
      .order('checked_in_at', { ascending: false })
      .limit(limit)

    if (error) return { data: [], error: error.message }

    return { data: (data ?? []) as CheckinWithProfile[] }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : 'An error occurred' }
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
    return { count: 0, error: e instanceof Error ? e.message : 'An error occurred' }
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

    // Fetch the day_pass package
    const { data: pkg, error: pkgError } = await supabase
      .from('membership_packages')
      .select('*')
      .eq('id', packageId)
      .eq('brand_id', profile.brand_id)
      .eq('type', 'day_pass')
      .single()

    if (pkgError || !pkg) return { error: pkgError?.message ?? 'Day pass package not found' }

    const today = new Date().toISOString().split('T')[0]

    // Insert membership valid only for today
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .insert({
        brand_id: profile.brand_id,
        member_id: memberId,
        package_id: packageId,
        status: 'active',
        starts_at: today,
        expires_at: `${today}T23:59:59.999Z`,
        sessions_remaining: pkg.session_credits ?? null,
        auto_renew: false,
      })
      .select()
      .single()

    if (membershipError || !membership) {
      return { error: membershipError?.message ?? 'Failed to create membership' }
    }

    // Insert invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        brand_id: profile.brand_id,
        member_id: memberId,
        membership_id: membership.id,
        amount: pkg.price,
        currency: pkg.currency,
        status: 'pending',
        notes: 'Walk-in day pass',
      })
      .select()
      .single()

    if (invoiceError || !invoice) {
      return { error: invoiceError?.message ?? 'Failed to create invoice' }
    }

    // Insert check-in
    await supabase.from('checkins').insert({
      brand_id: profile.brand_id,
      member_id: memberId,
      membership_id: membership.id,
      method: 'staff',
      checked_in_at: new Date().toISOString(),
    })

    revalidatePath('/staff/checkin')
    revalidatePath('/staff/walkin')

    return { data: { membership, invoice } }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}
