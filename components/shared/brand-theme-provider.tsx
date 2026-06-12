'use client'

import { useEffect } from 'react'

interface BrandThemeProviderProps {
  primaryColor?: string | null
  secondaryColor?: string | null
  children: React.ReactNode
}

function hexLuminance(hex: string): number {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16) / 255
  const g = parseInt(clean.substring(2, 4), 16) / 255
  const b = parseInt(clean.substring(4, 6), 16) / 255

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

export function BrandThemeProvider({
  primaryColor,
  secondaryColor,
  children,
}: BrandThemeProviderProps) {
  const primary = primaryColor ?? '#6366f1'
  const secondary = secondaryColor ?? '#8b5cf6'

  useEffect(() => {
    const root = document.documentElement

    root.style.setProperty('--brand-primary', primary)
    root.style.setProperty('--brand-secondary', secondary)

    const luminance = hexLuminance(primary)
    const foreground = luminance > 0.5 ? '#000000' : '#ffffff'
    root.style.setProperty('--brand-primary-foreground', foreground)
  }, [primary, secondary])

  return <>{children}</>
}
