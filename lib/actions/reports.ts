'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthedProfile } from '@/lib/actions/utils'
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, addDays } from 'date-fns'
import type { Database } from '@/types/database'

type MembershipRow = Database['public']['Tables']['memberships']['Row']
type InvoiceRow = Database['public']['Tables']['invoices']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ClassRow = Database['public']['Tables']['classes']['Row']
type ClassTypeRow = Database['public']['Tables']['class_types']['Row']
type ClassBookingRow = Database['public']['Tables']['class_bookings']['Row']
type TrainerSessionRow = Database['public']['Tables']['trainer_sessions']['Row']
type CheckinRow = Database['public']['Tables']['checkins']['Row']
type MembershipPackageRow = Database['public']['Tables']['membership_packages']['Row']

export type DashboardStats = {
  activeMembersCount: number
  mrr: number
  classesThisWeek: number
  ptSessionsThisWeek: number
  newMembersThisMonth: number
  expiringThisWeek: number
}

export type RevenueByMonthItem = {
  month: string
  revenue: number
}

export type PackageBreakdownItem = {
  name: string
  value: number
}

export type PaymentMethodBreakdownItem = {
  name: string
  value: number
}

export type MemberGrowthItem = {
  month: string
  new_members: number
  churn: number
}

export type ClassPerformanceItem = {
  class_name: string
  type_name: string
  instructor_name: string | null
  booked_count: number
  capacity: number
  fill_rate: number
}

export type TrainerPerformanceItem = {
  trainer_name: string | null
  session_count: number
  total_revenue: number
  total_commission: number
}

export async function getDashboardStats(): Promise<{ data?: DashboardStats; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const now = new Date()
    const monthStart = startOfMonth(now).toISOString()
    const monthEnd = endOfMonth(now).toISOString()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString()
    const sevenDaysLater = addDays(now, 7).toISOString()
    const brandId = profile.brand_id

    const [
      activeMembershipsResult,
      mrrResult,
      classesThisWeekResult,
      ptSessionsThisWeekResult,
      newMembersResult,
      expiringResult,
    ] = await Promise.all([
      supabase
        .from('memberships')
        .select('member_id')
        .eq('brand_id', brandId)
        .eq('status', 'active'),
      supabase
        .from('invoices')
        .select('amount')
        .eq('brand_id', brandId)
        .eq('status', 'paid')
        .gte('paid_at', monthStart)
        .lte('paid_at', monthEnd),
      supabase
        .from('classes')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', brandId)
        .eq('status', 'scheduled')
        .gte('scheduled_at', weekStart)
        .lte('scheduled_at', weekEnd),
      supabase
        .from('trainer_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', brandId)
        .gte('scheduled_at', weekStart)
        .lte('scheduled_at', weekEnd),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', brandId)
        .eq('role', 'member')
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd),
      supabase
        .from('memberships')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', brandId)
        .eq('status', 'active')
        .gte('expires_at', now.toISOString())
        .lte('expires_at', sevenDaysLater),
    ])

    // Get unique active member count
    const activeMemberships = (activeMembershipsResult.data ?? []) as Pick<MembershipRow, 'member_id'>[]
    const uniqueActiveMembers = new Set(activeMemberships.map((m) => m.member_id)).size

    const invoices = (mrrResult.data ?? []) as Pick<InvoiceRow, 'amount'>[]
    const mrr = invoices.reduce((sum, inv) => sum + (inv.amount ?? 0), 0)

    return {
      data: {
        activeMembersCount: uniqueActiveMembers,
        mrr,
        classesThisWeek: classesThisWeekResult.count ?? 0,
        ptSessionsThisWeek: ptSessionsThisWeekResult.count ?? 0,
        newMembersThisMonth: newMembersResult.count ?? 0,
        expiringThisWeek: expiringResult.count ?? 0,
      },
    }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function getRevenueByMonth(
  months = 6
): Promise<{ data?: RevenueByMonthItem[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const since = subMonths(startOfMonth(new Date()), months - 1).toISOString()

    const { data, error } = await supabase
      .from('invoices')
      .select('amount, paid_at')
      .eq('brand_id', profile.brand_id)
      .eq('status', 'paid')
      .gte('paid_at', since)
      .order('paid_at', { ascending: true })

    if (error) return { error: error.message }

    const invoices = (data ?? []) as Pick<InvoiceRow, 'amount' | 'paid_at'>[]
    const grouped: Record<string, number> = {}
    for (const inv of invoices) {
      if (!inv.paid_at) continue
      const key = format(parseISO(inv.paid_at), 'MMM yyyy')
      grouped[key] = (grouped[key] ?? 0) + (inv.amount ?? 0)
    }

    // Ensure all months in range are present
    const result: RevenueByMonthItem[] = []
    for (let i = months - 1; i >= 0; i--) {
      const month = format(subMonths(new Date(), i), 'MMM yyyy')
      result.push({ month, revenue: grouped[month] ?? 0 })
    }

    return { data: result }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function getPackageBreakdown(): Promise<{ data?: PackageBreakdownItem[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { data, error } = await supabase
      .from('memberships')
      .select('membership_packages(type)')
      .eq('brand_id', profile.brand_id)
      .eq('status', 'active')

    if (error) return { error: error.message }

    const rows = (data ?? []) as { membership_packages: Pick<MembershipPackageRow, 'type'> | null }[]
    const grouped: Record<string, number> = {}
    for (const row of rows) {
      const pkg = row.membership_packages
      const type = pkg?.type ?? 'unknown'
      grouped[type] = (grouped[type] ?? 0) + 1
    }

    const labelMap: Record<string, string> = {
      monthly: 'Monthly',
      annual: 'Annual',
      sessions: 'Sessions',
      day_pass: 'Day Pass',
    }

    const result: PackageBreakdownItem[] = Object.entries(grouped).map(([name, value]) => ({
      name: labelMap[name] ?? name,
      value,
    }))

    return { data: result }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function getPaymentMethodBreakdown(): Promise<{ data?: PaymentMethodBreakdownItem[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { data, error } = await supabase
      .from('invoices')
      .select('payment_method')
      .eq('brand_id', profile.brand_id)
      .eq('status', 'paid')

    if (error) return { error: error.message }

    const invoices = (data ?? []) as Pick<InvoiceRow, 'payment_method'>[]
    const grouped: Record<string, number> = {}
    for (const inv of invoices) {
      const method = inv.payment_method ?? 'unknown'
      grouped[method] = (grouped[method] ?? 0) + 1
    }

    const labelMap: Record<string, string> = {
      gateway: 'Payment Gateway',
      cash: 'Cash',
      transfer: 'Bank Transfer',
    }

    const result: PaymentMethodBreakdownItem[] = Object.entries(grouped).map(([name, value]) => ({
      name: labelMap[name] ?? name,
      value,
    }))

    return { data: result }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function getMemberGrowth(
  months = 6
): Promise<{ data?: MemberGrowthItem[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const since = subMonths(startOfMonth(new Date()), months - 1).toISOString()

    const [newMembersResult, churnResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('created_at')
        .eq('brand_id', profile.brand_id)
        .eq('role', 'member')
        .gte('created_at', since)
        .order('created_at', { ascending: true }),
      supabase
        .from('memberships')
        .select('expires_at, status')
        .eq('brand_id', profile.brand_id)
        .in('status', ['expired', 'cancelled'])
        .gte('expires_at', since)
        .order('expires_at', { ascending: true }),
    ])

    if (newMembersResult.error) return { error: newMembersResult.error.message }
    if (churnResult.error) return { error: churnResult.error.message }

    const newMembersData = (newMembersResult.data ?? []) as Pick<ProfileRow, 'created_at'>[]
    const churnData = (churnResult.data ?? []) as Pick<MembershipRow, 'expires_at' | 'status'>[]

    const newByMonth: Record<string, number> = {}
    for (const row of newMembersData) {
      if (!row.created_at) continue
      const key = format(parseISO(row.created_at), 'MMM yyyy')
      newByMonth[key] = (newByMonth[key] ?? 0) + 1
    }

    const churnByMonth: Record<string, number> = {}
    for (const row of churnData) {
      if (!row.expires_at) continue
      const key = format(parseISO(row.expires_at), 'MMM yyyy')
      churnByMonth[key] = (churnByMonth[key] ?? 0) + 1
    }

    const result: MemberGrowthItem[] = []
    for (let i = months - 1; i >= 0; i--) {
      const month = format(subMonths(new Date(), i), 'MMM yyyy')
      result.push({
        month,
        new_members: newByMonth[month] ?? 0,
        churn: churnByMonth[month] ?? 0,
      })
    }

    return { data: result }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

type ClassWithRelations = ClassRow & {
  class_types: Pick<ClassTypeRow, 'name'> | null
  instructor: Pick<ProfileRow, 'full_name'> | null
  class_bookings: Pick<ClassBookingRow, 'id' | 'status'>[]
}

export async function getClassPerformance(): Promise<{ data?: ClassPerformanceItem[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const monthStart = startOfMonth(new Date()).toISOString()
    const monthEnd = endOfMonth(new Date()).toISOString()

    const { data, error } = await supabase
      .from('classes')
      .select(`
        id,
        capacity,
        class_types(name),
        instructor:profiles!classes_instructor_brand_fkey(full_name),
        class_bookings(id, status)
      `)
      .eq('brand_id', profile.brand_id)
      .gte('scheduled_at', monthStart)
      .lte('scheduled_at', monthEnd)
      .order('scheduled_at', { ascending: false })

    if (error) return { error: error.message }

    const rows = (data ?? []) as ClassWithRelations[]
    const items: ClassPerformanceItem[] = rows.map((cls) => {
      const classType = cls.class_types
      const instructor = cls.instructor
      const bookings = cls.class_bookings ?? []
      const bookedCount = bookings.filter((b: Pick<ClassBookingRow, 'id' | 'status'>) => ['booked', 'attended'].includes(b.status)).length
      const capacity = cls.capacity ?? 1
      const fillRate = capacity > 0 ? Math.round((bookedCount / capacity) * 100) : 0

      return {
        class_name: classType?.name ?? 'Unknown Class',
        type_name: classType?.name ?? 'Unknown',
        instructor_name: instructor?.full_name ?? null,
        booked_count: bookedCount,
        capacity,
        fill_rate: fillRate,
      }
    })

    // Return top 10 by fill rate
    items.sort((a, b) => b.fill_rate - a.fill_rate)
    return { data: items.slice(0, 10) }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

type TrainerSessionWithTrainer = Pick<TrainerSessionRow, 'trainer_id' | 'session_fee' | 'commission_earned'> & {
  trainer: {
    profiles: Pick<ProfileRow, 'full_name'> | null
  } | null
}

export async function getTrainerPerformance(): Promise<{ data?: TrainerPerformanceItem[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const monthStart = startOfMonth(new Date()).toISOString()
    const monthEnd = endOfMonth(new Date()).toISOString()

    const { data, error } = await supabase
      .from('trainer_sessions')
      .select(`
        trainer_id,
        session_fee,
        commission_earned,
        trainer:trainers!trainer_sessions_trainer_id_fkey(
          profiles(full_name)
        )
      `)
      .eq('brand_id', profile.brand_id)
      .eq('status', 'completed')
      .gte('scheduled_at', monthStart)
      .lte('scheduled_at', monthEnd)

    if (error) return { error: error.message }

    const sessions = (data ?? []) as TrainerSessionWithTrainer[]
    const byTrainer: Record<
      string,
      { trainer_name: string | null; session_count: number; total_revenue: number; total_commission: number }
    > = {}

    for (const session of sessions) {
      const trainerId = session.trainer_id
      const name = session.trainer?.profiles?.full_name ?? null

      if (!byTrainer[trainerId]) {
        byTrainer[trainerId] = {
          trainer_name: name,
          session_count: 0,
          total_revenue: 0,
          total_commission: 0,
        }
      }

      byTrainer[trainerId].session_count += 1
      byTrainer[trainerId].total_revenue += session.session_fee ?? 0
      byTrainer[trainerId].total_commission += session.commission_earned ?? 0
    }

    const result = Object.values(byTrainer).sort((a, b) => b.session_count - a.session_count)
    return { data: result }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

type CheckinWithMember = Pick<CheckinRow, 'id' | 'method' | 'checked_in_at'> & {
  member: Pick<ProfileRow, 'full_name'> | null
}

export async function getRecentCheckins(limit = 5): Promise<{
  data?: { id: string; member_name: string | null; method: string; checked_in_at: string }[]
  error?: string
}> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { data, error } = await supabase
      .from('checkins')
      .select(`
        id,
        method,
        checked_in_at,
        member:profiles!checkins_member_brand_fkey(full_name)
      `)
      .eq('brand_id', profile.brand_id)
      .order('checked_in_at', { ascending: false })
      .limit(limit)

    if (error) return { error: error.message }

    const checkins = (data ?? []) as CheckinWithMember[]
    const result = checkins.map((c) => ({
      id: c.id,
      member_name: c.member?.full_name ?? null,
      method: c.method ?? 'staff',
      checked_in_at: c.checked_in_at,
    }))

    return { data: result }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}
