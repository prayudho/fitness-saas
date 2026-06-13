'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getPTAssignment,
  getTrainerActiveMembers,
  getTrainerPayouts,
  getBrandPayouts,
  assignPT,
  reassignPT,
  releasePT,
  approveCommission,
  markCommissionPaid,
} from '@/lib/actions/pt-assignment.actions'

// ─── Queries ──────────────────────────────────────────────────────────────────

export function usePTAssignment(memberId: string, membershipId: string) {
  return useQuery({
    queryKey: ['pt-assignment', memberId, membershipId],
    queryFn: async () => {
      const r = await getPTAssignment({ member_id: memberId, membership_id: membershipId })
      if (r.error) throw new Error(r.error)
      return r.data ?? null
    },
    enabled: Boolean(memberId) && Boolean(membershipId),
  })
}

export function useTrainerActiveMembers(trainerId: string) {
  return useQuery({
    queryKey: ['trainer-active-members', trainerId],
    queryFn: async () => {
      const r = await getTrainerActiveMembers(trainerId)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    enabled: Boolean(trainerId),
  })
}

export function useTrainerPayouts(trainerId: string, filters?: { status?: string; type?: string; month?: string }) {
  return useQuery({
    queryKey: ['trainer-payouts', trainerId, filters],
    queryFn: async () => {
      const r = await getTrainerPayouts(trainerId, filters)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    enabled: Boolean(trainerId),
  })
}

export function useBrandPayouts(filters?: { status?: string; trainerId?: string }) {
  return useQuery({
    queryKey: ['brand-payouts', filters],
    queryFn: async () => {
      const r = await getBrandPayouts(filters)
      if (r.error) throw new Error(r.error)
      return r.data
    },
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useAssignPT() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Parameters<typeof assignPT>[0]) => {
      const r = await assignPT(input)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pt-assignment', vars.member_id] })
      qc.invalidateQueries({ queryKey: ['trainer-active-members', vars.trainer_id] })
      qc.invalidateQueries({ queryKey: ['brand-payouts'] })
      toast.success('Personal trainer assigned successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useReassignPT() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Parameters<typeof reassignPT>[0]) => {
      const r = await reassignPT(input)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pt-assignment'] })
      qc.invalidateQueries({ queryKey: ['trainer-active-members'] })
      toast.success('Personal trainer reassigned')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useReleasePT() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const r = await releasePT(assignmentId)
      if (r.error) throw new Error(r.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pt-assignment'] })
      qc.invalidateQueries({ queryKey: ['trainer-active-members'] })
      toast.success('PT assignment released')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useApproveCommission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payoutId: string) => {
      const r = await approveCommission(payoutId)
      if (r.error) throw new Error(r.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer-payouts'] })
      qc.invalidateQueries({ queryKey: ['brand-payouts'] })
      toast.success('Commission approved')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useMarkCommissionPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payoutId: string) => {
      const r = await markCommissionPaid(payoutId)
      if (r.error) throw new Error(r.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer-payouts'] })
      qc.invalidateQueries({ queryKey: ['brand-payouts'] })
      toast.success('Commission marked as paid')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
