'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  processCheckin,
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
      const result = await processCheckin(input)
      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkin-log'] })
      qc.invalidateQueries({ queryKey: ['occupancy'] })
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
