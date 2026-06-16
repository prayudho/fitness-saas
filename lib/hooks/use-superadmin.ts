'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getPlatformStats,
  getBrandsList,
  getBrandDetail,
  createBrand,
  suspendBrand,
  activateBrand,
  toggleMultiBranch,
} from '@/lib/actions/superadmin'

export function usePlatformStats() {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      return getPlatformStats()
    },
    staleTime: 60_000,
  })
}

export function useBrandsList(opts: {
  search?: string
  status?: string
  page?: number
} = {}) {
  return useQuery({
    queryKey: ['brands', opts],
    queryFn: async () => {
      return getBrandsList(opts)
    },
    staleTime: 30_000,
  })
}

export function useBrandDetail(id: string) {
  return useQuery({
    queryKey: ['brands', id],
    queryFn: async () => {
      const result = await getBrandDetail(id)
      if (!result) throw new Error('Brand not found')
      return result
    },
    enabled: Boolean(id),
  })
}

export function useCreateBrand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      brandName: string
      brandSlug: string
      ownerName: string
      email: string
      password: string
      plan: string
    }) => {
      const result = await createBrand(data)
      if (result.error) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brands'] })
      qc.invalidateQueries({ queryKey: ['platform-stats'] })
      toast.success('Brand created successfully!')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useSuspendBrand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await suspendBrand(id)
      if (result.error) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brands'] })
      qc.invalidateQueries({ queryKey: ['platform-stats'] })
      toast.success('Brand suspended.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useActivateBrand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await activateBrand(id)
      if (result.error) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brands'] })
      qc.invalidateQueries({ queryKey: ['platform-stats'] })
      toast.success('Brand activated.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useToggleMultiBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const result = await toggleMultiBranch(id, enabled)
      if (result.error) throw new Error(result.error)
      return result
    },
    onSuccess: (_, { enabled }) => {
      qc.invalidateQueries({ queryKey: ['brands'] })
      toast.success(enabled ? 'Multi-branch enabled.' : 'Multi-branch disabled.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
