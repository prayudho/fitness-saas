'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getAuthedProfile } from '@/lib/actions/utils'
import {
  saveWorkoutLogSchema,
  createExerciseSchema,
  type WorkoutExercise,
} from '@/lib/validations/workout.validations'
import type { SupabaseClient } from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Exercise {
  id:                string
  brand_id:          string
  name:              string
  category:          string
  muscle_groups:     string[]
  secondary_muscles: string[]
  equipment:         string | null
  instructions:      string | null
  created_by:        string | null
  created_at:        string
}

export interface WorkoutLog {
  id:                 string
  brand_id:           string
  trainer_session_id: string | null
  trainer_id:         string
  member_id:          string
  exercises:          WorkoutExercise[]
  duration_minutes:   number | null
  notes:              string | null
  created_at:         string
  updated_at:         string
}

export interface WorkoutLogWithDetails extends WorkoutLog {
  trainer?: { full_name: string | null } | null
  session?: { scheduled_at: string; duration_minutes: number } | null
}

export interface TrainerSessionWithLogData {
  session: {
    id:               string
    scheduled_at:     string
    duration_minutes: number
    status:           string
    notes:            string | null
    session_fee:      number | null
    member:           { id: string; full_name: string | null } | null
  }
  log: WorkoutLog | null
}

// Helper: cast supabase client to untyped form for new tables not yet in
// the generated database.ts types. Using `unknown as SupabaseClient` avoids
// `any` while still allowing from() to accept arbitrary table names.
function untyped(supabase: ReturnType<typeof createClient>): SupabaseClient {
  return supabase as unknown as SupabaseClient
}

// ── Exercise library ──────────────────────────────────────────────────────────

export async function getExercises(filters?: { category?: string; search?: string }) {
  const supabase = untyped(createClient())

  let query = supabase
    .from('exercises')
    .select('*')
    .order('name')

  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }
  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) return { data: null, error: (error as { message: string }).message }
  return { data: data as Exercise[], error: null }
}

export async function createExercise(input: unknown) {
  const parsed = createExerciseSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.errors[0].message }

  const typedClient = createClient()
  const { user, profile } = await getAuthedProfile(typedClient)
  if (!profile.brand_id) return { data: null, error: 'Brand not found' }

  const supabase = untyped(typedClient)
  const { data, error } = await supabase
    .from('exercises')
    .insert({
      brand_id:          profile.brand_id,
      name:              parsed.data.name,
      category:          parsed.data.category,
      muscle_groups:     parsed.data.muscle_groups,
      secondary_muscles: parsed.data.secondary_muscles ?? [],
      equipment:         parsed.data.equipment ?? null,
      instructions:      parsed.data.instructions ?? null,
      created_by:        user.id,
    })
    .select()
    .single()

  if (error) return { data: null, error: (error as { message: string }).message }
  return { data: data as Exercise, error: null }
}

// ── Workout logs ──────────────────────────────────────────────────────────────

export async function saveWorkoutLog(input: unknown) {
  const parsed = saveWorkoutLogSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.errors[0].message }

  const typedClient = createClient()
  const { user, profile } = await getAuthedProfile(typedClient)
  if (!profile.brand_id) return { data: null, error: 'Brand not found' }

  const supabase = untyped(typedClient)

  const payload = {
    brand_id:           profile.brand_id,
    trainer_session_id: parsed.data.trainer_session_id ?? null,
    trainer_id:         user.id,
    member_id:          parsed.data.member_id,
    exercises:          parsed.data.exercises,
    duration_minutes:   parsed.data.duration_minutes ?? null,
    notes:              parsed.data.notes ?? null,
  }

  // Upsert by trainer_session_id when provided (one log per session)
  if (parsed.data.trainer_session_id) {
    const { data: existing } = await supabase
      .from('workout_logs')
      .select('id')
      .eq('trainer_session_id', parsed.data.trainer_session_id)
      .maybeSingle()

    if (existing) {
      const existingRow = existing as { id: string }
      const { data, error } = await supabase
        .from('workout_logs')
        .update({
          exercises:        parsed.data.exercises,
          duration_minutes: payload.duration_minutes,
          notes:            payload.notes,
        })
        .eq('id', existingRow.id)
        .select()
        .single()
      if (error) return { data: null, error: (error as { message: string }).message }
      return { data: data as WorkoutLog, error: null }
    }
  }

  const { data, error } = await supabase
    .from('workout_logs')
    .insert(payload)
    .select()
    .single()

  if (error) return { data: null, error: (error as { message: string }).message }
  return { data: data as WorkoutLog, error: null }
}

export async function getWorkoutLog(trainerSessionId: string) {
  const supabase = untyped(createClient())

  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('trainer_session_id', trainerSessionId)
    .maybeSingle()

  if (error) return { data: null, error: (error as { message: string }).message }
  return { data: data as WorkoutLog | null, error: null }
}

export async function getMemberWorkoutHistory(memberId: string) {
  // Use service client to bypass RLS so branch managers can read workout logs for their members
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedClient = createServiceClient() as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase    = typedClient as any

  // workout_logs.trainer_id references auth.users, not profiles — no PostgREST
  // join is possible for trainer name. Fetch logs + session date separately.
  const { data: rawLogs, error } = await supabase
    .from('workout_logs')
    .select('*, session:trainer_sessions!workout_logs_trainer_session_id_fkey(scheduled_at, duration_minutes)')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: (error as { message: string }).message }

  const logs = (rawLogs ?? []) as WorkoutLog[]

  // Batch-fetch trainer names from profiles
  const trainerIds = [...new Set(logs.map((l) => l.trainer_id).filter(Boolean))]
  const trainerMap: Record<string, string | null> = {}
  if (trainerIds.length > 0) {
    const { data: trainers } = await typedClient
      .from('profiles')
      .select('id, full_name')
      .in('id', trainerIds)
    for (const t of trainers ?? []) {
      const p = t as unknown as { id: string; full_name: string | null }
      trainerMap[p.id] = p.full_name
    }
  }

  const merged = logs.map((log) => ({
    ...log,
    trainer: trainerMap[log.trainer_id] !== undefined
      ? { full_name: trainerMap[log.trainer_id] }
      : null,
  }))

  return { data: merged as WorkoutLogWithDetails[], error: null }
}

export async function getTrainerSessionWithLog(
  sessionId: string
): Promise<{ data: TrainerSessionWithLogData | null; error: string | null }> {
  const typedClient = createClient()
  const supabase    = untyped(typedClient)

  // Fetch session and workout log in parallel; member is fetched separately to
  // avoid relying on a PostgREST FK hint that differs between environments.
  const [sessionResult, logResult] = await Promise.all([
    typedClient
      .from('trainer_sessions')
      .select('id, scheduled_at, duration_minutes, status, notes, session_fee, member_id')
      .eq('id', sessionId)
      .single(),
    supabase
      .from('workout_logs')
      .select('*')
      .eq('trainer_session_id', sessionId)
      .maybeSingle(),
  ])

  if (sessionResult.error) return { data: null, error: sessionResult.error.message }

  const raw = sessionResult.data as {
    id: string
    scheduled_at: string
    duration_minutes: number
    status: string
    notes: string | null
    session_fee: number | null
    member_id: string | null
  }

  // Fetch member name separately to avoid composite-FK join issues
  let member: { id: string; full_name: string | null } | null = null
  if (raw.member_id) {
    const { data: memberData } = await typedClient
      .from('profiles')
      .select('id, full_name')
      .eq('id', raw.member_id)
      .maybeSingle()
    if (memberData) {
      const m = memberData as unknown as { id: string; full_name: string | null }
      member = { id: m.id, full_name: m.full_name }
    }
  }

  const session: TrainerSessionWithLogData['session'] = {
    id:               raw.id,
    scheduled_at:     raw.scheduled_at,
    duration_minutes: raw.duration_minutes,
    status:           raw.status,
    notes:            raw.notes ?? null,
    session_fee:      raw.session_fee ?? null,
    member,
  }

  return {
    data: {
      session,
      log: logResult.data as WorkoutLog | null,
    },
    error: null,
  }
}
