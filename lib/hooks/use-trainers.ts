'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getTrainers,
  getTrainer,
  createTrainer,
  updateTrainer,
  setTrainerAvailability,
  getTrainerAvailability,
  createSession,
  updateSessionStatus,
  getTrainerSessions,
  getMemberPTBookings,
} from '@/lib/actions/trainers'

export function useTrainers() {
  return useQuery({
    queryKey: ['trainers'],
    queryFn: async () => {
      const result = await getTrainers()
      if (result.error) throw new Error(result.error)
      return result.data
    },
  })
}

export function useTrainer(id: string) {
  return useQuery({
    queryKey: ['trainers', id],
    queryFn: async () => {
      const result = await getTrainer(id)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: Boolean(id),
  })
}

export function useCreateTrainer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Parameters<typeof createTrainer>[0]) => {
      const r = await createTrainer(input)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainers'] })
      toast.success('Trainer created successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateTrainer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Parameters<typeof updateTrainer>[1] }) => {
      const r = await updateTrainer(id, input)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['trainers'] })
      qc.invalidateQueries({ queryKey: ['trainers', id] })
      toast.success('Trainer updated successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useSetAvailability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      trainerId,
      slots,
    }: {
      trainerId: string
      slots: { day_of_week: number; start_time: string; end_time: string }[]
    }) => {
      const r = await setTrainerAvailability(trainerId, slots)
      if (r.error) throw new Error(r.error)
    },
    onSuccess: (_data, { trainerId }) => {
      qc.invalidateQueries({ queryKey: ['trainer-availability', trainerId] })
      qc.invalidateQueries({ queryKey: ['trainers', trainerId] })
      toast.success('Availability saved')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useTrainerAvailability(trainerId: string) {
  return useQuery({
    queryKey: ['trainer-availability', trainerId],
    queryFn: async () => {
      const result = await getTrainerAvailability(trainerId)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: Boolean(trainerId),
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Parameters<typeof createSession>[0]) => {
      const r = await createSession(input)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer-sessions'] })
      qc.invalidateQueries({ queryKey: ['member-pt-bookings'] })
      qc.invalidateQueries({ queryKey: ['trainers'] })
      toast.success('Session booked successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateSessionStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'completed' | 'cancelled' | 'no_show' }) => {
      const r = await updateSessionStatus(id, status)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer-sessions'] })
      qc.invalidateQueries({ queryKey: ['member-pt-bookings'] })
      qc.invalidateQueries({ queryKey: ['trainers'] })
      toast.success('Session status updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useTrainerSessions(trainerId: string, filters?: { status?: string; month?: string }) {
  return useQuery({
    queryKey: ['trainer-sessions', trainerId, filters],
    queryFn: async () => {
      const result = await getTrainerSessions(trainerId, filters)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: Boolean(trainerId),
  })
}

export function useMemberPTBookings(memberId: string) {
  return useQuery({
    queryKey: ['member-pt-bookings', memberId],
    queryFn: async () => {
      const result = await getMemberPTBookings(memberId)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: Boolean(memberId),
  })
}
