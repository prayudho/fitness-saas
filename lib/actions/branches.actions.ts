'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAuthedProfile } from '@/lib/actions/utils'
import { z } from 'zod'

export type BranchRow = {
  id: string
  brand_id: string
  name: string
  address: string | null
  phone: string | null
  timezone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type BranchWithStats = BranchRow & {
  active_members: number
  checkins_today: number
  revenue_this_month: number
}

const branchSchema = z.object({
  name: z.string().min(1, 'Branch name is required').max(100),
  address: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  timezone: z.string().optional(),
  is_active: z.boolean().optional(),
})

export type BranchInput = z.infer<typeof branchSchema>

export async function getBranches(): Promise<{
  data: BranchWithStats[]
  isMultiBranch: boolean
  error: string | null
}> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: [], isMultiBranch: false, error: 'No brand context' }

    const [branchesResult, brandResult] = await Promise.all([
      supabase
        .from('branches' as never)
        .select('*')
        .eq('brand_id', profile.brand_id)
        .order('created_at', { ascending: true }),
      supabase
        .from('brands')
        .select('is_multi_branch')
        .eq('id', profile.brand_id)
        .single(),
    ])

    if (branchesResult.error) throw branchesResult.error

    const branches = (branchesResult.data ?? []) as BranchRow[]
    const branchIds = branches.map((b) => b.id)

    if (branchIds.length === 0) {
      return {
        data: [],
        isMultiBranch: (brandResult.data as { is_multi_branch: boolean } | null)?.is_multi_branch ?? false,
        error: null,
      }
    }

    // Batch stats queries
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const [checkinsToday, activeMemberships, revenueResult] = await Promise.all([
      supabase
        .from('checkins')
        .select('branch_id' as never)
        .in('branch_id' as never, branchIds)
        .gte('checked_in_at', todayStart.toISOString()),
      supabase
        .from('memberships')
        .select('branch_id' as never)
        .eq('brand_id', profile.brand_id)
        .eq('gym_access_status', 'active'),
      supabase
        .from('invoices')
        .select('branch_id, amount' as never)
        .in('branch_id' as never, branchIds)
        .eq('status', 'paid')
        .gte('created_at', monthStart.toISOString()),
    ])

    // Aggregate per branch
    const checkinsMap = new Map<string, number>()
    for (const row of (checkinsToday.data ?? []) as { branch_id: string }[]) {
      checkinsMap.set(row.branch_id, (checkinsMap.get(row.branch_id) ?? 0) + 1)
    }

    const activeMembersMap = new Map<string, number>()
    for (const row of (activeMemberships.data ?? []) as { branch_id: string | null }[]) {
      if (row.branch_id) {
        activeMembersMap.set(row.branch_id, (activeMembersMap.get(row.branch_id) ?? 0) + 1)
      }
    }

    const revenueMap = new Map<string, number>()
    for (const row of (revenueResult.data ?? []) as { branch_id: string; amount: number }[]) {
      revenueMap.set(row.branch_id, (revenueMap.get(row.branch_id) ?? 0) + (row.amount ?? 0))
    }

    const data: BranchWithStats[] = branches.map((b) => ({
      ...b,
      active_members: activeMembersMap.get(b.id) ?? 0,
      checkins_today: checkinsMap.get(b.id) ?? 0,
      revenue_this_month: revenueMap.get(b.id) ?? 0,
    }))

    return {
      data,
      isMultiBranch: (brandResult.data as { is_multi_branch: boolean } | null)?.is_multi_branch ?? false,
      error: null,
    }
  } catch (err) {
    return {
      data: [],
      isMultiBranch: false,
      error: err instanceof Error ? err.message : 'An error occurred',
    }
  }
}

export async function getBranchList(): Promise<{ data: BranchRow[]; isMultiBranch: boolean }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: [], isMultiBranch: false }

    const [branchesResult, brandResult] = await Promise.all([
      supabase
        .from('branches' as never)
        .select('id, name, is_active')
        .eq('brand_id', profile.brand_id)
        .eq('is_active', true)
        .order('name', { ascending: true }),
      supabase
        .from('brands')
        .select('is_multi_branch')
        .eq('id', profile.brand_id)
        .single(),
    ])

    return {
      data: (branchesResult.data ?? []) as BranchRow[],
      isMultiBranch: (brandResult.data as { is_multi_branch: boolean } | null)?.is_multi_branch ?? false,
    }
  } catch {
    return { data: [], isMultiBranch: false }
  }
}

export async function createBranch(
  input: BranchInput
): Promise<{ data: BranchRow | null; error: string | null }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: null, error: 'No brand context' }
    if (profile.role !== 'admin') return { data: null, error: 'Unauthorized' }

    const parsed = branchSchema.safeParse(input)
    if (!parsed.success) {
      return { data: null, error: parsed.error.errors[0]?.message ?? 'Validation error' }
    }

    const { data, error } = await (supabase.from('branches' as never) as ReturnType<typeof supabase.from>)
      .insert({
        brand_id: profile.brand_id,
        name: parsed.data.name,
        address: parsed.data.address || null,
        phone: parsed.data.phone || null,
        timezone: parsed.data.timezone || null,
        is_active: parsed.data.is_active ?? true,
      })
      .select()
      .single()

    if (error) throw error

    // Auto-enable is_multi_branch on the brand when a second branch is created
    const { count } = await (supabase.from('branches' as never) as ReturnType<typeof supabase.from>)
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', profile.brand_id)

    if ((count ?? 0) >= 2) {
      await (supabase.from('brands') as ReturnType<typeof supabase.from>)
        .update({ is_multi_branch: true } as never)
        .eq('id', profile.brand_id)
    }

    revalidatePath('/admin/branches')
    return { data: data as BranchRow, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An error occurred' }
  }
}

export type BranchManagerDashboard = {
  branch: BranchRow
  stats: {
    active_members: number
    checkins_today: number
    checkins_this_week: number
    checkins_this_month: number
    revenue_this_month: number
    sessions_this_month: number
    expiring_soon: number
  }
  recent_checkins: {
    id: string
    checked_in_at: string
    member_name: string | null
    method: string
  }[]
}

export async function getBranchManagerDashboard(): Promise<{
  data: BranchManagerDashboard | null
  error: string | null
}> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)

    if ((profile.role as string) !== 'branch_manager') return { data: null, error: 'Not a branch manager' }
    if (!profile.brand_id) return { data: null, error: 'No brand context' }

    const branchId = (profile as typeof profile & { branch_id: string | null }).branch_id
    if (!branchId) return { data: null, error: 'No branch assigned to this account' }

    // Fetch branch info
    const { data: branchData, error: branchError } = await (
      supabase.from('branches' as never) as ReturnType<typeof supabase.from>
    )
      .select('*')
      .eq('id', branchId)
      .single()

    if (branchError || !branchData) return { data: null, error: 'Branch not found' }
    const branch = branchData as BranchRow

    const now = new Date()
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
    const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 7)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const soon       = new Date(now); soon.setDate(now.getDate() + 7)

    // Run all stats queries in parallel
    const [checkinsAll, activeMemberships, revenueResult, sessionsResult, expiringResult, recentCheckinsResult] =
      await Promise.all([
        // All checkins this month (for today/week/month slices)
        supabase
          .from('checkins')
          .select('checked_in_at, branch_id' as never)
          .eq('branch_id' as never, branchId)
          .gte('checked_in_at', monthStart.toISOString()),

        // Active members (home_branch_id = this branch)
        supabase
          .from('memberships')
          .select('member_id' as never)
          .eq('brand_id', profile.brand_id)
          .eq('gym_access_status', 'active')
          .not('member_id', 'is', null),

        // Revenue this month (invoices attributed to this branch)
        supabase
          .from('invoices')
          .select('amount, branch_id' as never)
          .eq('branch_id' as never, branchId)
          .eq('status', 'paid')
          .gte('created_at', monthStart.toISOString()),

        // Completed sessions this month
        supabase
          .from('trainer_sessions')
          .select('id, branch_id' as never)
          .eq('branch_id' as never, branchId)
          .eq('status', 'completed')
          .gte('created_at', monthStart.toISOString()),

        // Memberships expiring in next 7 days (gym_access)
        supabase
          .from('memberships')
          .select('id, gym_access_expires_at' as never)
          .eq('brand_id', profile.brand_id)
          .eq('gym_access_status', 'active')
          .lte('gym_access_expires_at', soon.toISOString())
          .gte('gym_access_expires_at', now.toISOString()),

        // Recent 6 check-ins with member name
        supabase
          .from('checkins')
          .select('id, checked_in_at, method, branch_id, profiles!checkins_member_brand_fkey(full_name)' as never)
          .eq('branch_id' as never, branchId)
          .order('checked_in_at', { ascending: false })
          .limit(6),
      ])

    const allCheckins = (checkinsAll.data ?? []) as { checked_in_at: string }[]
    const checkins_today = allCheckins.filter(
      (c) => new Date(c.checked_in_at) >= todayStart
    ).length
    const checkins_this_week = allCheckins.filter(
      (c) => new Date(c.checked_in_at) >= weekStart
    ).length
    const checkins_this_month = allCheckins.length

    // Count active members by home_branch_id
    // We can't join directly, so count members from profiles
    const { data: branchMemberProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('brand_id', profile.brand_id)
      .eq('home_branch_id' as never, branchId)
      .eq('role', 'member')

    // Cross-reference with active memberships
    const activeMemberIds = new Set(
      ((activeMemberships.data ?? []) as { member_id: string }[]).map((m) => m.member_id)
    )
    const active_members = ((branchMemberProfiles ?? []) as { id: string }[]).filter((p) =>
      activeMemberIds.has(p.id)
    ).length

    const revenue_this_month = ((revenueResult.data ?? []) as { amount: number }[]).reduce(
      (sum, r) => sum + (r.amount ?? 0), 0
    )

    type RecentCheckin = {
      id: string
      checked_in_at: string
      method: string
      profiles: { full_name: string | null } | null
    }

    const recent_checkins = ((recentCheckinsResult.data ?? []) as RecentCheckin[]).map((c) => ({
      id: c.id,
      checked_in_at: c.checked_in_at,
      method: c.method,
      member_name: c.profiles?.full_name ?? null,
    }))

    return {
      data: {
        branch,
        stats: {
          active_members,
          checkins_today,
          checkins_this_week,
          checkins_this_month,
          revenue_this_month,
          sessions_this_month: (sessionsResult.data ?? []).length,
          expiring_soon: (expiringResult.data ?? []).length,
        },
        recent_checkins,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An error occurred' }
  }
}

export async function updateBranch(
  id: string,
  input: Partial<BranchInput>
): Promise<{ data: BranchRow | null; error: string | null }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: null, error: 'No brand context' }
    if (profile.role !== 'admin') return { data: null, error: 'Unauthorized' }

    const patch: Record<string, unknown> = {}
    if (input.name !== undefined)     patch.name     = input.name
    if (input.address !== undefined)  patch.address  = input.address || null
    if (input.phone !== undefined)    patch.phone    = input.phone || null
    if (input.timezone !== undefined) patch.timezone = input.timezone || null
    if (input.is_active !== undefined) patch.is_active = input.is_active

    const { data, error } = await (supabase.from('branches' as never) as ReturnType<typeof supabase.from>)
      .update(patch)
      .eq('id', id)
      .eq('brand_id', profile.brand_id)
      .select()
      .single()

    if (error) throw error
    revalidatePath('/admin/branches')
    return { data: data as BranchRow, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An error occurred' }
  }
}
