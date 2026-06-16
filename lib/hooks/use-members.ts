'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getMembers,
  getMember,
  updateMember,
  freezeMembership,
  unfreezeMembership,
  cancelMembership,
  assignPackage,
} from '@/lib/actions/members'

export function useMembers(filters?: { search?: string; status?: string; branchId?: string; page?: number }) {
  return useQuery({
    queryKey: ['members', filters],
    queryFn: async () => {
      const result = await getMembers(filters)
      if (result.error) throw new Error(result.error)
      return { data: result.data, count: result.count }
    },
  })
}

export function useMember(id: string) {
  return useQuery({
    queryKey: ['members', id],
    queryFn: async () => {
      const result = await getMember(id)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: Boolean(id),
  })
}

export function useUpdateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Parameters<typeof updateMember>[1] }) => {
      const r = await updateMember(id, input)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['members'] })
      qc.invalidateQueries({ queryKey: ['members', id] })
      toast.success('Member updated successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useFreezeMembership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      membershipId,
      input,
    }: {
      membershipId: string
      input: Parameters<typeof freezeMembership>[1]
    }) => {
      const r = await freezeMembership(membershipId, input)
      if (r.error) throw new Error(r.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] })
      toast.success('Membership frozen successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUnfreezeMembership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (membershipId: string) => {
      const r = await unfreezeMembership(membershipId)
      if (r.error) throw new Error(r.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] })
      toast.success('Membership unfrozen successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useCancelMembership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (membershipId: string) => {
      const r = await cancelMembership(membershipId)
      if (r.error) throw new Error(r.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] })
      toast.success('Membership cancelled')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useAssignPackage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Parameters<typeof assignPackage>[0]) => {
      const r = await assignPackage(input)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] })
      toast.success('Package assigned successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
