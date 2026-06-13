'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAuthedProfile } from '@/lib/actions/utils'
import type { Database } from '@/types/database'

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

export type TrainerRow = Row<'trainers'>
export type TrainerAvailabilityRow = Row<'trainer_availability'>
export type TrainerSessionRow = Row<'trainer_sessions'>
export type ProfileRow = Row<'profiles'>

export type TrainerWithProfile = TrainerRow & {
  profiles: Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url' | 'phone'> | null
  sessions_this_month: number
  active_members_count: number
  pending_commission_amount: number
}

export type TrainerSessionWithMember = TrainerSessionRow & {
  member: Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url'> | null
}

export type TrainerSessionWithTrainer = TrainerSessionRow & {
  trainer: (TrainerRow & {
    profiles: Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url'> | null
  }) | null
}

export type TrainerDetail = TrainerRow & {
  profiles: ProfileRow | null
  trainer_availability: TrainerAvailabilityRow[]
  sessions: TrainerSessionWithMember[]
}

export async function getTrainers(): Promise<{ data: TrainerWithProfile[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: [], error: 'No brand context' }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const { data: trainers, error } = await supabase
      .from('trainers')
      .select(`
        *,
        profiles!trainers_id_brand_fkey (id, full_name, avatar_url, phone)
      `)
      .eq('brand_id', profile.brand_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const [sessionCountsRes, activeMembersRes, pendingPayoutsRes] = await Promise.all([
      supabase
        .from('trainer_sessions')
        .select('trainer_id')
        .eq('brand_id', profile.brand_id)
        .gte('scheduled_at', startOfMonth),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('pt_assignments')
        .select('trainer_id')
        .eq('brand_id', profile.brand_id)
        .in('status', ['active', 'grace_period']),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('pt_commission_payouts')
        .select('trainer_id, amount')
        .eq('brand_id', profile.brand_id)
        .eq('status', 'pending'),
    ])

    const countMap: Record<string, number> = {}
    for (const s of sessionCountsRes.data ?? []) {
      countMap[s.trainer_id] = (countMap[s.trainer_id] ?? 0) + 1
    }

    const activeMembersMap: Record<string, number> = {}
    for (const a of activeMembersRes.data ?? []) {
      activeMembersMap[a.trainer_id] = (activeMembersMap[a.trainer_id] ?? 0) + 1
    }

    const pendingCommissionMap: Record<string, number> = {}
    for (const p of pendingPayoutsRes.data ?? []) {
      pendingCommissionMap[p.trainer_id] = (pendingCommissionMap[p.trainer_id] ?? 0) + (p.amount ?? 0)
    }

    const result: TrainerWithProfile[] = (trainers ?? []).map((t) => ({
      ...t,
      sessions_this_month: countMap[t.id] ?? 0,
      active_members_count: activeMembersMap[t.id] ?? 0,
      pending_commission_amount: pendingCommissionMap[t.id] ?? 0,
    }))

    return { data: result }
  } catch (e) {
    return { data: [], error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function getTrainer(id: string): Promise<{ data: TrainerDetail | null; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: null, error: 'No brand context' }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const { data: trainer, error } = await supabase
      .from('trainers')
      .select(`
        *,
        profiles!trainers_id_brand_fkey (*)
      `)
      .eq('id', id)
      .eq('brand_id', profile.brand_id)
      .single()

    if (error) throw error

    const { data: availability } = await supabase
      .from('trainer_availability')
      .select('*')
      .eq('trainer_id', id)
      .order('day_of_week')
      .order('start_time')

    const { data: sessions } = await supabase
      .from('trainer_sessions')
      .select(`
        *,
        member:profiles!trainer_sessions_member_brand_fkey (id, full_name, avatar_url)
      `)
      .eq('trainer_id', id)
      .eq('brand_id', profile.brand_id)
      .gte('scheduled_at', startOfMonth)
      .order('scheduled_at', { ascending: false })

    return {
      data: {
        ...trainer,
        trainer_availability: availability ?? [],
        sessions: (sessions ?? []) as TrainerSessionWithMember[],
      },
    }
  } catch (e) {
    return { data: null, error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function createTrainer(input: {
  member_id: string
  bio?: string
  specialties?: string[]
  certifications?: string[]
  commission_model: string
  commission_value: number
}): Promise<{ data?: TrainerRow; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { data: memberProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, brand_id, role')
      .eq('id', input.member_id)
      .eq('brand_id', profile.brand_id)
      .single()

    if (profileError || !memberProfile) return { error: 'Member profile not found in your brand' }

    const existingTrainer = await supabase
      .from('trainers')
      .select('id')
      .eq('id', input.member_id)
      .single()

    if (existingTrainer.data) return { error: 'This profile is already a trainer' }

    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .insert({
        id: input.member_id,
        brand_id: profile.brand_id,
        bio: input.bio ?? null,
        specialties: input.specialties ?? [],
        certifications: input.certifications ?? [],
        commission_model: (input.commission_model as 'flat' | 'percent' | 'per_session') ?? 'flat',
        commission_value: input.commission_value ?? 0,
        is_active: true,
      })
      .select()
      .single()

    if (trainerError) throw trainerError

    await supabase
      .from('profiles')
      .update({ role: 'trainer' })
      .eq('id', input.member_id)

    revalidatePath('/admin/trainers')
    return { data: trainer }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function updateTrainer(
  id: string,
  input: {
    bio?: string
    specialties?: string[]
    certifications?: string[]
    commission_model?: string
    commission_value?: number
    is_active?: boolean
  }
): Promise<{ data?: TrainerRow; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const updateData: Partial<Database['public']['Tables']['trainers']['Update']> = {}
    if (input.bio !== undefined) updateData.bio = input.bio
    if (input.specialties !== undefined) updateData.specialties = input.specialties
    if (input.certifications !== undefined) updateData.certifications = input.certifications
    if (input.commission_model !== undefined) updateData.commission_model = input.commission_model as 'flat' | 'percent' | 'per_session'
    if (input.commission_value !== undefined) updateData.commission_value = input.commission_value
    if (input.is_active !== undefined) updateData.is_active = input.is_active

    const { data, error } = await supabase
      .from('trainers')
      .update(updateData)
      .eq('id', id)
      .eq('brand_id', profile.brand_id)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/trainers')
    revalidatePath(`/admin/trainers/${id}`)
    return { data }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function setTrainerAvailability(
  trainerId: string,
  slots: { day_of_week: number; start_time: string; end_time: string }[]
): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { error: deleteError } = await supabase
      .from('trainer_availability')
      .delete()
      .eq('trainer_id', trainerId)

    if (deleteError) throw deleteError

    if (slots.length > 0) {
      const { error: insertError } = await supabase
        .from('trainer_availability')
        .insert(
          slots.map((s) => ({
            trainer_id: trainerId,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            is_recurring: true,
          }))
        )
      if (insertError) throw insertError
    }

    revalidatePath('/trainer/availability')
    revalidatePath(`/admin/trainers/${trainerId}`)
    return {}
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function getTrainerAvailability(
  trainerId: string
): Promise<{ data: TrainerAvailabilityRow[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: [], error: 'No brand context' }

    const { data, error } = await supabase
      .from('trainer_availability')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('day_of_week')
      .order('start_time')

    if (error) throw error
    return { data: data ?? [] }
  } catch (e) {
    return { data: [], error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function createSession(input: {
  trainer_id: string
  member_id: string
  scheduled_at: string
  duration_minutes?: number
  session_fee?: number
  notes?: string
}): Promise<{ data?: TrainerSessionRow; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { data: session, error } = await supabase
      .from('trainer_sessions')
      .insert({
        brand_id: profile.brand_id,
        trainer_id: input.trainer_id,
        member_id: input.member_id,
        scheduled_at: input.scheduled_at,
        duration_minutes: input.duration_minutes ?? 60,
        session_fee: input.session_fee ?? null,
        notes: input.notes ?? null,
        status: 'scheduled',
      })
      .select()
      .single()

    if (error) throw error

    // Decrement sessions_remaining on active sessions-type membership
    const { data: membership } = await supabase
      .from('memberships')
      .select('id, sessions_remaining, membership_packages(type)')
      .eq('member_id', input.member_id)
      .eq('brand_id', profile.brand_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (membership && (membership.membership_packages as { type?: string } | null)?.type === 'sessions' && (membership.sessions_remaining ?? 0) > 0) {
      await supabase
        .from('memberships')
        .update({ sessions_remaining: (membership.sessions_remaining ?? 1) - 1 })
        .eq('id', membership.id)
    }

    revalidatePath('/admin/trainers')
    revalidatePath('/trainer/sessions')
    revalidatePath('/trainer/schedule')
    revalidatePath('/member/pt-booking')
    return { data: session }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function updateSessionStatus(
  id: string,
  status: 'completed' | 'cancelled' | 'no_show'
): Promise<{ data?: TrainerSessionRow; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: fetchError } = await (supabase as any)
      .from('trainer_sessions')
      .select(`*, trainers!trainer_sessions_trainer_id_fkey (commission_model, commission_value)`)
      .eq('id', id)
      .eq('brand_id', profile.brand_id)
      .single()

    if (fetchError || !existing) throw fetchError ?? new Error('Session not found')

    let commission_earned: number | null = null
    if (status === 'completed') {
      const trainer = existing.trainers as { commission_model?: string; commission_value?: number } | null
      const fee = existing.session_fee ?? 0
      if (trainer?.commission_model === 'percent') {
        commission_earned = fee * ((trainer.commission_value ?? 0) / 100)
      } else if (trainer?.commission_model === 'flat' || trainer?.commission_model === 'per_session') {
        commission_earned = trainer.commission_value ?? 0
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('trainer_sessions')
      .update({
        status,
        ...(commission_earned !== null ? { commission_earned } : {}),
        ...(status === 'completed' ? { commission_status: 'pending' } : {}),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Create a session commission payout row if there's an active PT assignment with a commission amount
    if (status === 'completed' && data) {
      const sessionAny = existing as Record<string, unknown>
      const assignmentId = sessionAny.pt_assignment_id as string | null

      if (assignmentId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: assignment } = await (supabase as any)
          .from('pt_assignments')
          .select('*, membership:memberships!pt_assignments_membership_id_fkey(membership_packages(session_commission_amount))')
          .eq('id', assignmentId)
          .single()

        if (assignment) {
          const pkgCommission = (
            (assignment as unknown as {
              membership: { membership_packages: { session_commission_amount: number | null } | null } | null
            }).membership?.membership_packages?.session_commission_amount
          )
          const amount = pkgCommission ?? commission_earned

          if (amount && amount > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any).from('pt_commission_payouts').insert({
              brand_id: profile.brand_id,
              trainer_id: existing.trainer_id,
              payout_type: 'session',
              pt_assignment_id: assignmentId,
              trainer_session_id: id,
              amount,
              status: 'pending',
            })

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from('trainer_sessions')
              .update({ session_commission_amount: amount })
              .eq('id', id)
          }
        }
      }
    }

    revalidatePath('/admin/trainers')
    revalidatePath('/trainer/sessions')
    revalidatePath('/trainer/schedule')
    revalidatePath('/member/pt-booking')
    return { data }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function getTrainerSessions(
  trainerId: string,
  filters?: { status?: string; month?: string }
): Promise<{ data: TrainerSessionWithMember[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: [], error: 'No brand context' }

    let query = supabase
      .from('trainer_sessions')
      .select(`
        *,
        member:profiles!trainer_sessions_member_brand_fkey (id, full_name, avatar_url)
      `)
      .eq('trainer_id', trainerId)
      .eq('brand_id', profile.brand_id)
      .order('scheduled_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.month) {
      const date = new Date(filters.month)
      const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString()
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString()
      query = query.gte('scheduled_at', start).lte('scheduled_at', end)
    }

    const { data, error } = await query
    if (error) throw error
    return { data: (data ?? []) as TrainerSessionWithMember[] }
  } catch (e) {
    return { data: [], error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function getMemberPTBookings(
  memberId: string
): Promise<{ data: TrainerSessionWithTrainer[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: [], error: 'No brand context' }

    const { data, error } = await supabase
      .from('trainer_sessions')
      .select(`
        *,
        trainer:trainers!trainer_sessions_trainer_id_fkey (
          *,
          profiles!trainers_id_brand_fkey (id, full_name, avatar_url)
        )
      `)
      .eq('member_id', memberId)
      .eq('brand_id', profile.brand_id)
      .order('scheduled_at', { ascending: false })

    if (error) throw error
    return { data: (data ?? []) as TrainerSessionWithTrainer[] }
  } catch (e) {
    return { data: [], error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}
