'use client'

import { useState, useEffect } from 'react'
import { TenantContext } from '@/lib/hooks/use-tenant'
import type { Tenant, TenantContext as TenantContextType } from '@/types/tenant'

interface TenantProviderProps {
  children: React.ReactNode
  initialTenant?: Tenant | null
}

export function TenantProvider({ children, initialTenant = null }: TenantProviderProps) {
  const [tenant, setTenant] = useState<Tenant | null>(initialTenant)
  const [isLoading, setIsLoading] = useState(!initialTenant)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialTenant) return

    fetch('/api/tenant')
      .then((res) => res.json())
      .then((data) => {
        setTenant(data.tenant ?? null)
        setIsLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setIsLoading(false)
      })
  }, [initialTenant])

  const value: TenantContextType = { tenant, isLoading, error }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}
