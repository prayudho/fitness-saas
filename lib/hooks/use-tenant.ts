'use client'

import { createContext, useContext } from 'react'
import type { TenantContext as TenantContextType } from '@/types/tenant'

export const TenantContext = createContext<TenantContextType | null>(null)

export function useTenant(): TenantContextType {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider')
  }
  return context
}
