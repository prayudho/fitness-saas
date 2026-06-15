'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAuthedProfile } from '@/lib/actions/utils'
import type { Database } from '@/types/database'

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
type Insert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']

export type PTAssignmentRow    = Row<'pt_assignments'>
export type PTCommissionPayoutRow = Row<'pt_commission_payouts'>
export type ProfileRow         = Row<'profiles'>
export type MembershipRow      = Row<'memberships'>

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

    const { data: rawData, error } = await supabase
      .from('pt_assignments')
      .select(`
        *,
        member_profile:profiles!pt_assignments_member_brand_fkey(id, full_name, avatar_url, phone),
        membership:memberships!pt_assignments_membership_id_fkey(
          *,
          membership_packages(name, package_category)
        )
      `)
      .eq('brand_id', profile.brand_id)
      .eq('member_id', input.member_id)
      .eq('membership_id', input.membership_id)
      .in('status', ['active', 'grace_period'])
      .maybeSingle()

    if (error) return { error: error.message }

    const data = rawData as unknown as (PTAssignmentRow & {
      member_profile: PTAssignmentWithDetails['member_profile']
      membership: PTAssignmentWithDetails['membership']
    }) | null

    if (!data) return { data: undefined }

    // Fetch trainer profile separately (trainer_id → trainers.id → profiles.id)
    const { data: trainerProfile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', data.trainer_id)
      .eq('brand_id', profile.brand_id)
      .maybeSingle()

    return {
      data: {
        ...data,
        member_profile: data.member_profile,
        trainer_profile: trainerProfile ?? null,
        membership: data.membership,
      },
    }
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

    const { data: rawRows, error } = await supabase
      .from('pt_assignments')
      .select(`
        id,
        member_id,
        membership_id,
        assigned_at,
        status,
        membership:memberships!pt_assignments_membership_id_fkey(
          pt_sessions_remaining,
          pt_sessions_expires_at,
          membership_packages(name, package_category)
        )
      `)
      .eq('brand_id', profile.brand_id)
      .eq('trainer_id', trainerId)
      .in('status', ['active', 'grace_period'])
      .order('assigned_at', { ascending: false })

    if (error) return { data: [], error: error.message }

    // Fetch member profiles separately — the composite FK join hint is unreliable
    const rows = rawRows ?? []
    const memberIds = [...new Set(rows.map((r) => (r as { member_id: string }).member_id))]
    const { data: memberProfiles } = memberIds.length > 0
      ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', memberIds)
      : { data: [] as { id: string; full_name: string | null; avatar_url: string | null }[] }

    const profileMap: Record<string, { full_name: string | null; avatar_url: string | null }> = Object.fromEntries(
      (memberProfiles ?? []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }])
    )

    type AssignmentSelectRow = Pick<PTAssignmentRow, 'id' | 'member_id' | 'membership_id' | 'assigned_at' | 'status'> & {
      membership: { pt_sessions_remaining: number | null; pt_sessions_expires_at: string | null; membership_packages: { name: string; package_category: string } | null } | null
    }
    const data = rows as unknown as AssignmentSelectRow[]

    const result: TrainerActiveMember[] = data.map((row) => {
      const mp  = profileMap[row.member_id]
      const mem = row.membership
      return {
        assignment_id:          row.id,
        member_id:              row.member_id,
        member_name:            mp?.full_name ?? 'Unknown',
        member_avatar_url:      mp?.avatar_url ?? null,
        membership_id:          row.membership_id,
        package_name:           mem?.membership_packages?.name ?? '',
        package_category:       mem?.membership_packages?.package_category ?? '',
        pt_sessions_remaining:  mem?.pt_sessions_remaining ?? null,
        pt_sessions_expires_at: mem?.pt_sessions_expires_at ?? null,
        assigned_at:            row.assigned_at,
        status:                 row.status,
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
  sales_person_id?: string
}): Promise<{ data?: PTAssignmentRow; error?: string }> {
  try {
    const supabase = createClient()
    const { user, profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { data: existing } = await supabase
      .from('pt_assignments')
      .select('id')
      .eq('brand_id', profile.brand_id)
      .eq('member_id', input.member_id)
      .eq('membership_id', input.membership_id)
      .in('status', ['active', 'grace_period'])
      .maybeSingle()

    if (existing) return { error: 'Member already has an active PT assignment for this membership' }

    const { data: trainer, error: tErr } = await supabase
      .from('trainers')
      .select('id')
      .eq('id', input.trainer_id)
      .eq('brand_id', profile.brand_id)
      .single()

    if (tErr || !trainer) return { error: 'Trainer not found' }

    const { data: membership } = await supabase
      .from('memberships')
      .select('*, membership_packages(price, sales_commission_override_percent)')
      .eq('id', input.membership_id)
      .single()

    const { data: brandRaw } = await supabase
      .from('brands')
      .select('pt_sales_commission_enabled, pt_sales_commission_percent')
      .eq('id', profile.brand_id)
      .single()
    const brand = brandRaw as unknown as { pt_sales_commission_enabled: boolean; pt_sales_commission_percent: number } | null

    const pkg = (membership as { membership_packages: { price: number; sales_commission_override_percent: number | null } | null } | null)?.membership_packages
    const salesEnabled = brand?.pt_sales_commission_enabled ?? true
    const salesPercent = pkg?.sales_commission_override_percent ?? brand?.pt_sales_commission_percent ?? 10
    const salesAmount  = salesEnabled && pkg ? (pkg.price * salesPercent) / 100 : null

    const assignmentInsert: Insert<'pt_assignments'> = {
      brand_id:                 profile.brand_id,
      member_id:                input.member_id,
      trainer_id:               input.trainer_id,
      membership_id:            input.membership_id,
      status:                   'active',
      assigned_by:              user.id,
      notes:                    input.notes ?? null,
      sales_commission_percent: salesEnabled ? salesPercent : null,
      sales_commission_amount:  salesAmount,
      sales_person_id:          input.sales_person_id ?? null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assignment, error } = await (supabase as any)
      .from('pt_assignments')
      .insert(assignmentInsert)
      .select()
      .single() as { data: PTAssignmentRow | null; error: { message: string } | null }

    if (error) return { error: error.message }

    if (salesAmount && assignment) {
      const payoutInsert = {
        brand_id:         profile.brand_id,
        trainer_id:       input.trainer_id,
        sales_person_id:  input.sales_person_id ?? input.trainer_id,
        payout_type:      'sales',
        pt_assignment_id: assignment.id,
        amount:           salesAmount,
        status:           'pending',
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('pt_commission_payouts').insert(payoutInsert)

      await supabase
        .from('pt_assignments')
        .update({ sales_commission_claimed: true } as never)
        .eq('id', assignment.id)
    }

    revalidatePath(`/admin/members/${input.member_id}`)
    revalidatePath(`/admin/trainers/${input.trainer_id}`)
    return { data: assignment ?? undefined }
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

    const { data: oldRaw, error: oldErr } = await supabase
      .from('pt_assignments')
      .select('*')
      .eq('id', input.assignment_id)
      .eq('brand_id', profile.brand_id)
      .single()
    const old = oldRaw as unknown as PTAssignmentRow | null

    if (oldErr || !old) return { error: 'Assignment not found' }

    await supabase
      .from('pt_assignments')
      .update({ status: 'reassigned', released_at: new Date().toISOString() } as never)
      .eq('id', input.assignment_id)

    const newInsert: Insert<'pt_assignments'> = {
      brand_id:     profile.brand_id,
      member_id:    old.member_id,
      trainer_id:   input.new_trainer_id,
      membership_id: old.membership_id,
      status:       'active',
      assigned_by:  user.id,
      notes:        input.notes ?? null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newAssignment, error: newErr } = await (supabase as any)
      .from('pt_assignments')
      .insert(newInsert)
      .select()
      .single() as { data: PTAssignmentRow | null; error: { message: string } | null }

    if (newErr) return { error: newErr.message }

    revalidatePath(`/admin/members/${old.member_id}`)
    revalidatePath(`/admin/trainers/${old.trainer_id}`)
    revalidatePath(`/admin/trainers/${input.new_trainer_id}`)
    return { data: newAssignment ?? undefined }
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

    const { data: existingRaw } = await supabase
      .from('pt_assignments')
      .select('*')
      .eq('id', assignmentId)
      .eq('brand_id', profile.brand_id)
      .single()
    const existing = existingRaw as unknown as PTAssignmentRow | null

    if (!existing) return { error: 'Assignment not found' }

    const { error } = await supabase
      .from('pt_assignments')
      .update({ status: 'released', released_at: new Date().toISOString() } as never)
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
      .from('pt_assignments')
      .update({ status: 'grace_period', grace_started_at: new Date().toISOString() } as never)
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
      .from('pt_assignments')
      .update({ status: 'released', released_at: new Date().toISOString() } as never)
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
      .from('pt_commission_payouts')
      .update({
        status:      'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      } as never)
      .eq('id', payoutId)
      .eq('brand_id', profile.brand_id)
      .eq('status', 'pending')

    if (error) return { error: error.message }

    revalidatePath('/admin/trainers')
    revalidatePath('/admin/commissions')
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
      .from('pt_commission_payouts')
      .update({
        status:  'paid',
        paid_at: new Date().toISOString(),
      } as never)
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
      .from('pt_commission_payouts')
      .select('*')
      .eq('brand_id', profile.brand_id)
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false })

    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.type)   query = query.eq('payout_type', filters.type)
    if (filters?.month) {
      const d     = new Date(filters.month)
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

// ─── List Commissions (admin view) ───────────────────────────────────────────

export type CommissionListItem = {
  id: string
  payout_type: 'session' | 'sales'
  amount: number
  status: 'pending' | 'approved' | 'paid'
  created_at: string
  approved_at: string | null
  notes: string | null
  // Session commission
  trainer_name: string | null
  session_date: string | null
  member_name: string | null
  // Sales commission
  sales_person_name: string | null
  sales_person_id: string | null
  package_name: string | null
  assignment_date: string | null
  pt_assignment_id: string | null
  trainer_session_id: string | null
}

export async function listCommissions(
  filters?: { type?: 'session' | 'sales'; status?: string }
): Promise<{ data: CommissionListItem[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: [], error: 'No brand context' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('pt_commission_payouts')
      .select('id, payout_type, amount, status, created_at, approved_at, notes, trainer_id, sales_person_id, trainer_session_id, pt_assignment_id')
      .eq('brand_id', profile.brand_id)
      .order('created_at', { ascending: false })

    if (filters?.type)   query = query.eq('payout_type', filters.type)
    if (filters?.status) query = query.eq('status', filters.status)

    const { data: payouts, error } = await query
    if (error) throw error
    if (!payouts || (payouts as unknown[]).length === 0) return { data: [] }

    type RawPayout = {
      id: string
      payout_type: string
      amount: number
      status: string
      created_at: string
      approved_at: string | null
      notes: string | null
      trainer_id: string | null
      sales_person_id: string | null
      trainer_session_id: string | null
      pt_assignment_id: string | null
    }

    const rawPayouts = payouts as RawPayout[]

    // Collect all IDs we need to look up
    const profileIds = new Set<string>()
    const sessionIds = new Set<string>()
    const assignmentIds = new Set<string>()

    for (const p of rawPayouts) {
      if (p.trainer_id) profileIds.add(p.trainer_id)
      if (p.sales_person_id) profileIds.add(p.sales_person_id)
      if (p.trainer_session_id) sessionIds.add(p.trainer_session_id)
      if (p.pt_assignment_id) assignmentIds.add(p.pt_assignment_id)
    }

    type ProfileNameRow = { id: string; full_name: string | null }
    type SessionSelectRow = { id: string; scheduled_at: string; member_id: string }

    // Build profile name map (direct from profiles table — covers trainers and staff)
    const profileMap: Record<string, string> = {}
    if (profileIds.size > 0) {
      const { data: rawDirectProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', [...profileIds])
      const directProfiles = (rawDirectProfiles ?? []) as ProfileNameRow[]
      for (const p of directProfiles) {
        profileMap[p.id] = p.full_name ?? 'Unknown'
      }
    }

    // Fetch trainer sessions (for member name and date)
    type SessionRow = { id: string; scheduled_at: string; member_id: string }
    const sessionMap: Record<string, SessionRow> = {}
    if (sessionIds.size > 0) {
      const { data: rawSessions } = await supabase
        .from('trainer_sessions')
        .select('id, scheduled_at, member_id')
        .in('id', [...sessionIds])
      const sessions = (rawSessions ?? []) as SessionSelectRow[]
      for (const s of sessions) {
        sessionMap[s.id] = s
      }
      const memberIds = sessions.map((s) => s.member_id).filter(Boolean)
      if (memberIds.length > 0) {
        const { data: rawMemberProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', memberIds)
        const memberProfiles = (rawMemberProfiles ?? []) as ProfileNameRow[]
        for (const mp of memberProfiles) {
          if (!profileMap[mp.id]) profileMap[mp.id] = mp.full_name ?? 'Unknown'
        }
      }
    }

    // Fetch assignments (for package name and member name)
    type AssignmentRow = {
      id: string
      assigned_at: string
      member_id: string
      membership: { membership_packages: { name: string } | null } | null
    }
    const assignmentMap: Record<string, AssignmentRow> = {}
    if (assignmentIds.size > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: assignments } = await (supabase as any)
        .from('pt_assignments')
        .select('id, assigned_at, member_id, membership:memberships!pt_assignments_membership_id_fkey(membership_packages(name))')
        .in('id', [...assignmentIds])
      for (const a of ((assignments as AssignmentRow[]) ?? [])) {
        assignmentMap[a.id] = a
      }
      const assignmentMemberIds = ((assignments as AssignmentRow[]) ?? []).map((a) => a.member_id).filter(Boolean)
      if (assignmentMemberIds.length > 0) {
        const { data: rawAssignmentMembers } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', assignmentMemberIds)
        const assignmentMembers = (rawAssignmentMembers ?? []) as ProfileNameRow[]
        for (const mp of assignmentMembers) {
          if (!profileMap[mp.id]) profileMap[mp.id] = mp.full_name ?? 'Unknown'
        }
      }
    }

    const result: CommissionListItem[] = rawPayouts.map((p) => {
      const session    = p.trainer_session_id ? sessionMap[p.trainer_session_id] : null
      const assignment = p.pt_assignment_id   ? assignmentMap[p.pt_assignment_id] : null
      const salesPersonId = p.sales_person_id ?? p.trainer_id

      return {
        id:               p.id,
        payout_type:      p.payout_type as 'session' | 'sales',
        amount:           p.amount,
        status:           p.status as 'pending' | 'approved' | 'paid',
        created_at:       p.created_at,
        approved_at:      p.approved_at ?? null,
        notes:            p.notes ?? null,
        trainer_name:     p.trainer_id ? (profileMap[p.trainer_id] ?? null) : null,
        session_date:     session?.scheduled_at ?? null,
        member_name:      session
          ? (profileMap[session.member_id] ?? null)
          : assignment
            ? (profileMap[assignment.member_id] ?? null)
            : null,
        sales_person_name: salesPersonId ? (profileMap[salesPersonId] ?? null) : null,
        sales_person_id:   salesPersonId ?? null,
        package_name:      assignment?.membership?.membership_packages?.name ?? null,
        assignment_date:   assignment?.assigned_at ?? null,
        pt_assignment_id:  p.pt_assignment_id ?? null,
        trainer_session_id: p.trainer_session_id ?? null,
      }
    })

    return { data: result }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

// ─── Edit Commission Sales PIC ────────────────────────────────────────────────

export async function editCommissionSalesPIC(
  payoutId: string,
  newSalesPersonId: string
): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }
    if (profile.role !== 'admin') return { error: 'Only admins can edit commissions' }

    // Verify the commission is pending and is a sales type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: payout } = await (supabase as any)
      .from('pt_commission_payouts')
      .select('id, status, payout_type')
      .eq('id', payoutId)
      .eq('brand_id', profile.brand_id)
      .single() as { data: { id: string; status: string; payout_type: string } | null }

    if (!payout) return { error: 'Commission not found' }
    if (payout.status !== 'pending') return { error: 'Cannot edit an approved commission' }
    if (payout.payout_type !== 'sales') return { error: 'Can only change PIC on sales commissions' }

    // Verify the new sales person exists in this brand
    const { data: person } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', newSalesPersonId)
      .eq('brand_id', profile.brand_id)
      .single()

    if (!person) return { error: 'Person not found in this brand' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('pt_commission_payouts')
      .update({ sales_person_id: newSalesPersonId })
      .eq('id', payoutId)
      .eq('brand_id', profile.brand_id)

    if (error) throw error
    revalidatePath('/admin/commissions')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('pt_commission_payouts')
      .select('*')
      .eq('brand_id', profile.brand_id)
      .order('created_at', { ascending: false })

    if (filters?.status)    query = query.eq('status', filters.status)
    if (filters?.trainerId) query = query.eq('trainer_id', filters.trainerId)

    const { data: rawPayouts, error } = await query
    if (error) return { data: [], error: (error as { message: string }).message }

    const payouts = (rawPayouts as PTCommissionPayoutRow[]) ?? []

    const trainerIds = [...new Set(payouts.map((p) => p.trainer_id))]
    const { data: trainerProfiles } = trainerIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', trainerIds)
      : { data: [] as { id: string; full_name: string }[] }

    const nameMap: Record<string, string> = Object.fromEntries(
      (trainerProfiles ?? []).map((p) => [p.id, p.full_name ?? ''])
    )

    const result = payouts.map((row) => ({
      ...row,
      trainer_name: nameMap[row.trainer_id] ?? '',
    })) as (PTCommissionPayoutRow & { trainer_name: string })[]

    return { data: result }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : 'An error occurred' }
  }
}
