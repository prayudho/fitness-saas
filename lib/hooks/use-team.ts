'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getTeamMembers,
  getTeamMemberById,
  getCustomRoles,
  inviteTeamMember,
  updateTeamMember,
  deactivateTeamMember,
  reactivateTeamMember,
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
  type TeamMember,
  type TeamMemberDetail,
  type CustomRole,
} from '@/lib/actions/team.actions'
import type {
  InviteTeamMemberInput,
  UpdateTeamMemberInput,
  CreateCustomRoleInput,
  UpdateCustomRoleInput,
} from '@/lib/validations/team'

export type { TeamMember, TeamMemberDetail, CustomRole }

// ----------------------------------------------------------------
// getTeamMembers
// ----------------------------------------------------------------
export function useTeamMembers(
  brandId?: string,
  filters?: { search?: string; role?: string; isActive?: boolean; page?: number }
) {
  return useQuery({
    queryKey: ['team', 'list', brandId ?? 'auto', filters],
    queryFn: async () => {
      const result = await getTeamMembers(brandId || undefined, filters)
      if (result.error) throw new Error(result.error)
      return { data: result.data, total: result.total }
    },
  })
}

// ----------------------------------------------------------------
// getTeamMemberById
// ----------------------------------------------------------------
export function useTeamMember(id: string) {
  return useQuery({
    queryKey: ['team', 'member', id],
    queryFn: async () => {
      const result = await getTeamMemberById(id)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: Boolean(id),
  })
}

// ----------------------------------------------------------------
// getCustomRoles
// ----------------------------------------------------------------
export function useCustomRoles(brandId: string) {
  return useQuery({
    queryKey: ['custom-roles', brandId],
    queryFn: async () => {
      const result = await getCustomRoles(brandId)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: Boolean(brandId),
  })
}

// ----------------------------------------------------------------
// inviteTeamMember
// ----------------------------------------------------------------
export function useInviteTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: InviteTeamMemberInput) => {
      const result = await inviteTeamMember(input)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ----------------------------------------------------------------
// updateTeamMember
// ----------------------------------------------------------------
export function useUpdateTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateTeamMemberInput }) => {
      const result = await updateTeamMember(id, input)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['team'] })
      qc.invalidateQueries({ queryKey: ['team', 'member', id] })
      toast.success('Team member updated successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ----------------------------------------------------------------
// deactivateTeamMember
// ----------------------------------------------------------------
export function useDeactivateTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deactivateTeamMember(id)
      if (result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] })
      toast.success('Team member deactivated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ----------------------------------------------------------------
// reactivateTeamMember
// ----------------------------------------------------------------
export function useReactivateTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await reactivateTeamMember(id)
      if (result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] })
      toast.success('Team member reactivated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ----------------------------------------------------------------
// createCustomRole
// ----------------------------------------------------------------
export function useCreateCustomRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCustomRoleInput) => {
      const result = await createCustomRole(input)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-roles'] })
      toast.success('Custom role created')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ----------------------------------------------------------------
// updateCustomRole
// ----------------------------------------------------------------
export function useUpdateCustomRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateCustomRoleInput }) => {
      const result = await updateCustomRole(id, input)
      if (result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-roles'] })
      toast.success('Custom role updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ----------------------------------------------------------------
// deleteCustomRole
// ----------------------------------------------------------------
export function useDeleteCustomRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteCustomRole(id)
      if (result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-roles'] })
      toast.success('Custom role deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
