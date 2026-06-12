'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface RoleState {
  role: string | null
  brandId: string | null
  userId: string | null
  loading: boolean
}

export function useRole() {
  const [state, setState] = useState<RoleState>({
    role: null,
    brandId: null,
    userId: null,
    loading: true,
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setState((s) => ({ ...s, loading: false }))
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, brand_id')
        .eq('id', user.id)
        .single()
      setState({
        role: profile?.role ?? null,
        brandId: profile?.brand_id ?? null,
        userId: user.id,
        loading: false,
      })
    })
  }, [])

  return state
}

export const useIsBrandAdmin = () => {
  const { role } = useRole()
  return role === 'admin' || role === 'superadmin'
}

export const useIsStaff = () => {
  const { role } = useRole()
  return role === 'admin' || role === 'staff' || role === 'superadmin'
}

export const useIsTrainer = () => {
  const { role } = useRole()
  return role === 'trainer'
}
