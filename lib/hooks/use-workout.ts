'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getExercises,
  createExercise,
  saveWorkoutLog,
  getWorkoutLog,
  getMemberWorkoutHistory,
  getTrainerSessionWithLog,
  type TrainerSessionWithLogData,
} from '@/lib/actions/workout.actions'

export function useExercises(filters?: { category?: string; search?: string }) {
  return useQuery({
    queryKey: ['exercises', filters],
    queryFn: async () => {
      const result = await getExercises(filters)
      if (result.error) throw new Error(result.error)
      return result.data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Parameters<typeof createExercise>[0]) => {
      const r = await createExercise(input)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercises'] })
      toast.success('Exercise added to library')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useSaveWorkoutLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Parameters<typeof saveWorkoutLog>[0]) => {
      const r = await saveWorkoutLog(input)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: (_data, input) => {
      const i = input as { trainer_session_id?: string; member_id?: string }
      if (i.trainer_session_id) {
        qc.invalidateQueries({ queryKey: ['workout-log', i.trainer_session_id] })
        qc.invalidateQueries({ queryKey: ['trainer-session-with-log', i.trainer_session_id] })
      }
      if (i.member_id) {
        qc.invalidateQueries({ queryKey: ['member-workout-history', i.member_id] })
      }
      toast.success('Workout logged successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useWorkoutLog(trainerSessionId: string) {
  return useQuery({
    queryKey: ['workout-log', trainerSessionId],
    queryFn: async () => {
      const result = await getWorkoutLog(trainerSessionId)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: Boolean(trainerSessionId),
  })
}

export function useMemberWorkoutHistory(memberId: string) {
  return useQuery({
    queryKey: ['member-workout-history', memberId],
    queryFn: async () => {
      const result = await getMemberWorkoutHistory(memberId)
      if (result.error) throw new Error(result.error)
      return result.data ?? []
    },
    enabled: Boolean(memberId),
  })
}

export function useTrainerSessionWithLog(sessionId: string) {
  return useQuery<TrainerSessionWithLogData | null>({
    queryKey: ['trainer-session-with-log', sessionId],
    queryFn: async () => {
      const result = await getTrainerSessionWithLog(sessionId)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: Boolean(sessionId),
  })
}
