'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  processCheckin,
  recordCheckinWithOverride,
  searchMemberForCheckin,
  getCheckinLog,
  getOccupancyCount,
} from '@/lib/actions/checkins'

export function useCheckinLog(limit = 50) {
  return useQuery({
    queryKey: ['checkin-log', limit],
    queryFn: async () => {
      const result = await getCheckinLog(limit)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    refetchInterval: 30000,
  })
}

export function useProcessCheckin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { member_id: string; method: 'qr' | 'staff' | 'gate' }) => {
      return processCheckin(input)
    },
    onSuccess: (result) => {
      // Only invalidate log/occupancy for actual check-ins (not override_required)
      if (result.status !== 'override_required') {
        qc.invalidateQueries({ queryKey: ['checkin-log'] })
        qc.invalidateQueries({ queryKey: ['occupancy'] })
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useRecordCheckinWithOverride() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      member_id: string
      membership_id: string
      method: 'qr' | 'staff' | 'gate'
      allowed: boolean
      warning_message: string | null
    }) => {
      const result = await recordCheckinWithOverride(input)
      if (result.error) throw new Error(result.error)
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['checkin-log'] })
      qc.invalidateQueries({ queryKey: ['occupancy'] })
      if (vars.allowed) {
        toast.success('Entry allowed — recorded with staff override')
      } else {
        toast('Entry denied — recorded')
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useSearchMember() {
  return useMutation({
    mutationFn: async (query: string) => {
      const result = await searchMemberForCheckin(query)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useOccupancy() {
  return useQuery({
    queryKey: ['occupancy'],
    queryFn: async () => {
      const result = await getOccupancyCount()
      if (result.error) throw new Error(result.error)
      return result.count
    },
    refetchInterval: 30000,
  })
}
