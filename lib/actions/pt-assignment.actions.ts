'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAuthedProfile } from '@/lib/actions/utils'
import type { Database } from '@/types/database'

// Typed Supabase helper for tables not yet in generated types (migration-013)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromNew(supabase: ReturnType<typeof createClient>, table: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as unknown as any).from(table)
}

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type ProfileRow = Row<'profiles'>
export type TrainerRow = Row<'trainers'>
export type MembershipRow = Row<'memberships'>

// Manual types for migration-013 tables (not yet in generated database.ts)
export interface PTAssignmentRow {
  id: string
  brand_id: string
  member_id: string
  trainer_id: string
  membership_id: string
  status: 'active' | 'grace_period' | 'released' | 'reassigned'
  assigned_at: string
  assigned_by: string | null
  grace_started_at: string | null
  released_at: string | null
  sales_commission_claimed: boolean
  sales_commission_percent: number | null
  sales_commission_amount: number | null
  notes: string | null
  created_at: string
}

export interface PTCommissionPayoutRow {
  id: string
  brand_id: string
  trainer_id: string
  payout_type: 'session' | 'sales'
  pt_assignment_id: string | null
  trainer_session_id: string | null
  amount: number
  status: 'pending' | 'approved' | 'paid'
  period_start: string | null
  period_end: string | null
  approved_by: string | null
  approved_at: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
}

export type PTAssignmentWithDetails = PTAssignmentRow & {
  member_profile: Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url' | 'phone'> | null
  trainer_profile: Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url'> | null
  membership: (MembershipRow & {
    membership_packages: { name: string; package_category: string } | null
  }) | null
}

export type TrainerActiveMember = {
  assignment_id: string
  member_id: string
  member_name: string
  member_avatar_url: string | null
  membership_id: string
  package_name: string
  package_category: string
  pt_sessions_remaining: number | null
  pt_sessions_expires_at: string | null
  assigned_at: string
  status: string
}

// ─── Get Assignment ─────────────────────────────────────────────────────────

export async function getPTAssignment(input: {
  member_id: string
  membership_id: string
}): Promise<{ data?: PTAssignmentWithDetails; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { data, error } = await supabase
// @ts-ignore — pt_assignments not yet in generated types
      .from('pt_assignments')
      .select(`
        *,
        member_profile:profiles!pt_assignments_member_id_fkey (id, full_name, avatar_url, phone),
        trainer_profile:profiles!pt_assignments_trainer_id_fkey (id, full_name, avatar_url),
        membership:memberships!pt_assignments_membership_id_fkey (
          *,
          membership_packages (name, package_category)
        )
      `)
      .eq('brand_id', profile.brand_id)
      .eq('member_id', input.member_id)
      .eq('membership_id', input.membership_id)
      .in('status', ['active', 'grace_period'])
      .maybeSingle()

    if (error) return { error: error.message }
    return { data: data as PTAssignmentWithDetails | undefined }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

export async function getTrainerActiveMembers(
  trainerId: string
): Promise<{ data: TrainerActiveMember[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: [], error: 'No brand context' }

    const { data, error } = await supabase
// @ts-ignore — pt_assignments not yet in generated types
      .from('pt_assignments')
      .select(`
        id,
        member_id,
        membership_id,
        assigned_at,
        status,
        member_profile:profiles!pt_assignments_member_id_fkey (id, full_name, avatar_url),
        membership:memberships!pt_assignments_membership_id_fkey (
          pt_sessions_remaining,
          pt_sessions_expires_at,
          membership_packages (name, package_category)
        )
      `)
      .eq('brand_id', profile.brand_id)
      .eq('trainer_id', trainerId)
      .in('status', ['active', 'grace_period'])
      .order('assigned_at', { ascending: false })

    if (error) return { data: [], error: error.message }

    const result: TrainerActiveMember[] = (data ?? []).map((row) => {
      const mp = row.member_profile as { id: string; full_name: string; avatar_url: string | null } | null
      const mem = row.membership as {
        pt_sessions_remaining: number | null
        pt_sessions_expires_at: string | null
        membership_packages: { name: string; package_category: string } | null
      } | null
      return {
        assignment_id: row.id,
        member_id: row.member_id,
        member_name: mp?.full_name ?? 'Unknown',
        member_avatar_url: mp?.avatar_url ?? null,
        membership_id: row.membership_id,
        package_name: mem?.membership_packages?.name ?? '',
        package_category: mem?.membership_packages?.package_category ?? '',
        pt_sessions_remaining: mem?.pt_sessions_remaining ?? null,
        pt_sessions_expires_at: mem?.pt_sessions_expires_at ?? null,
        assigned_at: row.assigned_at,
        status: row.status,
      }
    })

    return { data: result }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

// ─── Assign PT ──────────────────────────────────────────────────────────────

export async function assignPT(input: {
  member_id: string
  trainer_id: string
  membership_id: string
  notes?: string
}): Promise<{ data?: PTAssignmentRow; error?: string }> {
  try {
    const supabase = createClient()
    const { user, profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    // Check if member already has an active assignment for this membership
    const { data: existing } = await supabase
// @ts-ignore — pt_assignments not yet in generated types
      .from('pt_assignments')
      .select('id')
      .eq('brand_id', profile.brand_id)
      .eq('member_id', input.member_id)
      .eq('membership_id', input.membership_id)
      .in('status', ['active', 'grace_period'])
      .maybeSingle()

    if (existing) return { error: 'Member already has an active PT assignment for this membership' }

    // Validate trainer belongs to this brand
    const { data: trainer, error: tErr } = await supabase
      .from('trainers')
      .select('id')
      .eq('id', input.trainer_id)
      .eq('brand_id', profile.brand_id)
      .single()

    if (tErr || !trainer) return { error: 'Trainer not found' }

    // Fetch package to determine sales commission amount
    const { data: membership } = await supabase
      .from('memberships')
      .select(`
        *,
        membership_packages (price, sales_commission_override_percent)
      `)
      .eq('id', input.membership_id)
      .single()

    const { data: brand } = await supabase
      .from('brands')
      .select('pt_sales_commission_enabled, pt_sales_commission_percent')
      .eq('id', profile.brand_id)
      .single()

    const pkg = (membership as { membership_packages: { price: number; sales_commission_override_percent: number | null } | null } | null)?.membership_packages
    const salesEnabled = brand?.pt_sales_commission_enabled ?? true
    const salesPercent = pkg?.sales_commission_override_percent ?? brand?.pt_sales_commission_percent ?? 10
    const salesAmount = salesEnabled && pkg ? (pkg.price * salesPercent) / 100 : null

    const { data: assignment, error } = await supabase
// @ts-ignore — pt_assignments not yet in generated types
      .from('pt_assignments')
      .insert({
        brand_id: profile.brand_id,
        member_id: input.member_id,
        trainer_id: input.trainer_id,
        membership_id: input.membership_id,
        status: 'active',
        assigned_by: user.id,
        notes: input.notes ?? null,
        sales_commission_percent: salesEnabled ? salesPercent : null,
        sales_commission_amount: salesAmount,
      })
      .select()
      .single()

    if (error) return { error: error.message }

    // Create sales commission payout if applicable
    if (salesAmount && assignment) {
      await supabase.from('pt_commission_payouts').insert({
        brand_id: profile.brand_id,
        trainer_id: input.trainer_id,
        payout_type: 'sales',
        pt_assignment_id: assignment.id,
        amount: salesAmount,
        status: 'pending',
      })

      await supabase
  // @ts-ignore — pt_assignments not yet in generated types
      .from('pt_assignments')
        .update({ sales_commission_claimed: true })
        .eq('id', assignment.id)
    }

    revalidatePath(`/admin/members/${input.member_id}`)
    revalidatePath(`/admin/trainers/${input.trainer_id}`)
    return { data: assignment }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

// ─── Reassign PT ─────────────────────────────────────────────────────────────

export async function reassignPT(input: {
  assignment_id: string
  new_trainer_id: string
  notes?: string
}): Promise<{ data?: PTAssignmentRow; error?: string }> {
  try {
    const supabase = createClient()
    const { user, profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { data: old, error: oldErr } = await supabase
// @ts-ignore — pt_assignments not yet in generated types
      .from('pt_assignments')
      .select('*')
      .eq('id', input.assignment_id)
      .eq('brand_id', profile.brand_id)
      .single()

    if (oldErr || !old) return { error: 'Assignment not found' }

    // Mark old as reassigned
    await supabase
// @ts-ignore — pt_assignments not yet in generated types
      .from('pt_assignments')
      .update({ status: 'reassigned', released_at: new Date().toISOString() })
      .eq('id', input.assignment_id)

    // Create new assignment
    const { data: newAssignment, error: newErr } = await supabase
// @ts-ignore — pt_assignments not yet in generated types
      .from('pt_assignments')
      .insert({
        brand_id: profile.brand_id,
        member_id: old.member_id,
        trainer_id: input.new_trainer_id,
        membership_id: old.membership_id,
        status: 'active',
        assigned_by: user.id,
        notes: input.notes ?? null,
      })
      .select()
      .single()

    if (newErr) return { error: newErr.message }

    revalidatePath(`/admin/members/${old.member_id}`)
    revalidatePath(`/admin/trainers/${old.trainer_id}`)
    revalidatePath(`/admin/trainers/${input.new_trainer_id}`)
    return { data: newAssignment }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

// ─── Release PT ──────────────────────────────────────────────────────────────

export async function releasePT(
  assignmentId: string
): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { data: existing } = await supabase
// @ts-ignore — pt_assignments not yet in generated types
      .from('pt_assignments')
      .select('*')
      .eq('id', assignmentId)
      .eq('brand_id', profile.brand_id)
      .single()

    if (!existing) return { error: 'Assignment not found' }

    const { error } = await supabase
// @ts-ignore — pt_assignments not yet in generated types
      .from('pt_assignments')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('id', assignmentId)

    if (error) return { error: error.message }

    revalidatePath(`/admin/members/${existing.member_id}`)
    revalidatePath(`/admin/trainers/${existing.trainer_id}`)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

// ─── Start Grace Period ──────────────────────────────────────────────────────

export async function startGracePeriod(
  assignmentId: string
): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { error } = await supabase
// @ts-ignore — pt_assignments not yet in generated types
      .from('pt_assignments')
      .update({ status: 'grace_period', grace_started_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .eq('brand_id', profile.brand_id)
      .eq('status', 'active')

    if (error) return { error: error.message }
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

// ─── Auto-release PT (called by edge function) ───────────────────────────────

export async function autoReleasePT(
  assignmentId: string
): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { error } = await supabase
// @ts-ignore — pt_assignments not yet in generated types
      .from('pt_assignments')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .eq('brand_id', profile.brand_id)
      .eq('status', 'grace_period')

    if (error) return { error: error.message }
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

// ─── Commission Approval ─────────────────────────────────────────────────────

export async function approveCommission(
  payoutId: string
): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { user, profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { error } = await supabase
// @ts-ignore — pt_commission_payouts not yet in generated types
      .from('pt_commission_payouts')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', payoutId)
      .eq('brand_id', profile.brand_id)
      .eq('status', 'pending')

    if (error) return { error: error.message }

    revalidatePath('/admin/trainers')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

export async function markCommissionPaid(
  payoutId: string
): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { error } = await supabase
// @ts-ignore — pt_commission_payouts not yet in generated types
      .from('pt_commission_payouts')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', payoutId)
      .eq('brand_id', profile.brand_id)
      .eq('status', 'approved')

    if (error) return { error: error.message }

    revalidatePath('/admin/trainers')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

// ─── Get Commission Payouts ──────────────────────────────────────────────────

export async function getTrainerPayouts(
  trainerId: string,
  filters?: { status?: string; type?: string; month?: string }
): Promise<{ data: PTCommissionPayoutRow[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: [], error: 'No brand context' }

    let query = supabase
// @ts-ignore — pt_commission_payouts not yet in generated types
      .from('pt_commission_payouts')
      .select('*')
      .eq('brand_id', profile.brand_id)
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false })

    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.type)   query = query.eq('payout_type', filters.type)
    if (filters?.month) {
      const d = new Date(filters.month)
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString()
      query = query.gte('created_at', start).lte('created_at', end)
    }

    const { data, error } = await query
    if (error) return { data: [], error: error.message }
    return { data: data ?? [] }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

export async function getBrandPayouts(filters?: {
  status?: string
  trainerId?: string
}): Promise<{ data: (PTCommissionPayoutRow & { trainer_name: string })[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: [], error: 'No brand context' }

    let query = supabase
// @ts-ignore — pt_commission_payouts not yet in generated types
      .from('pt_commission_payouts')
      .select(`
        *,
        trainer:profiles!pt_commission_payouts_trainer_id_fkey (full_name)
      `)
      .eq('brand_id', profile.brand_id)
      .order('created_at', { ascending: false })

    if (filters?.status)    query = query.eq('status', filters.status)
    if (filters?.trainerId) query = query.eq('trainer_id', filters.trainerId)

    const { data, error } = await query
    if (error) return { data: [], error: error.message }

    const result = (data ?? []).map((row) => ({
      ...(row as PTCommissionPayoutRow),
      trainer_name: (row as { trainer: { full_name: string } | null }).trainer?.full_name ?? '',
    }))

    return { data: result }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : 'An error occurred' }
  }
}
