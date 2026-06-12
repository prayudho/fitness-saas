'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  createPackage,
  updatePackage,
  deletePackage,
  togglePackageActive,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
} from '@/lib/actions/packages'
import type { PackageInput, PromoCodeInput } from '@/lib/actions/packages'
import type { Database } from '@/types/database'

type PackageRow = Database['public']['Tables']['membership_packages']['Row']
type PromoCodeRow = Database['public']['Tables']['promo_codes']['Row']

// ─── Packages ──────────────────────────────────────────────────────────────

export function usePackages() {
  return useQuery({
    queryKey: ['packages'],
    queryFn: async (): Promise<PackageRow[]> => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      const { data: profile } = await supabase
        .from('profiles')
        .select('brand_id')
        .eq('id', user.id)
        .single()
      if (!profile?.brand_id) throw new Error('No brand context')

      const { data, error } = await supabase
        .from('membership_packages')
        .select('*')
        .eq('brand_id', profile.brand_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreatePackage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: PackageInput) => {
      const r = await createPackage(input)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packages'] })
      toast.success('Package created')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdatePackage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<PackageInput> }) => {
      const r = await updatePackage(id, input)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packages'] })
      toast.success('Package updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeletePackage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await deletePackage(id)
      if (r.error) throw new Error(r.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packages'] })
      toast.success('Package deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useTogglePackageActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const r = await togglePackageActive(id, isActive)
      if (r.error) throw new Error(r.error)
    },
    onSuccess: (_, { isActive }) => {
      qc.invalidateQueries({ queryKey: ['packages'] })
      toast.success(isActive ? 'Package activated' : 'Package deactivated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ─── Promo Codes ───────────────────────────────────────────────────────────

export function usePromoCodes() {
  return useQuery({
    queryKey: ['promo_codes'],
    queryFn: async (): Promise<PromoCodeRow[]> => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      const { data: profile } = await supabase
        .from('profiles')
        .select('brand_id')
        .eq('id', user.id)
        .single()
      if (!profile?.brand_id) throw new Error('No brand context')

      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('brand_id', profile.brand_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreatePromoCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: PromoCodeInput) => {
      const r = await createPromoCode(input)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo_codes'] })
      toast.success('Promo code created')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdatePromoCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<PromoCodeInput> }) => {
      const r = await updatePromoCode(id, input)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo_codes'] })
      toast.success('Promo code updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeletePromoCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await deletePromoCode(id)
      if (r.error) throw new Error(r.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo_codes'] })
      toast.success('Promo code deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
