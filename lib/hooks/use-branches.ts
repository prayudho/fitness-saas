'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getBranches,
  getBranchList,
  getBranchManagerDashboard,
  createBranch,
  updateBranch,
  type BranchInput,
} from '@/lib/actions/branches.actions'

export function useBranches() {
  return useQuery({
    queryKey: ['branches', 'list'],
    queryFn: async () => {
      const result = await getBranches()
      if (result.error) throw new Error(result.error)
      return result
    },
    staleTime: 30_000,
  })
}

// Lightweight hook for branch filter dropdowns on DataTable pages
export function useBranchList() {
  return useQuery({
    queryKey: ['branches', 'slim'],
    queryFn: () => getBranchList(),
    staleTime: 60_000,
  })
}

export function useBranchManagerDashboard() {
  return useQuery({
    queryKey: ['branch-manager', 'dashboard'],
    queryFn: async () => {
      const result = await getBranchManagerDashboard()
      if (result.error) throw new Error(result.error)
      return result.data
    },
    staleTime: 30_000,
  })
}

export function useCreateBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: BranchInput) => {
      const r = await createBranch(input)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] })
      toast.success('Branch created successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<BranchInput> }) => {
      const r = await updateBranch(id, input)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] })
      toast.success('Branch updated successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
