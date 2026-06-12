'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Shield,
  LayoutDashboard,
  Building2,
  Settings2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/use-auth'

const STORAGE_KEY = 'superadmin-sidebar-collapsed'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { href: '/superadmin/dashboard', label: 'Platform', icon: LayoutDashboard },
  { href: '/superadmin/brands', label: 'Brands', icon: Building2 },
  { href: '/superadmin/settings', label: 'Settings', icon: Settings2 },
]

export function SuperadminSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setCollapsed(stored === 'true')
    }
  }, [])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(STORAGE_KEY, String(next))
  }

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? 'Super Admin'
  const avatarInitial = displayName.charAt(0).toUpperCase()

  return (
    <aside
      className={cn(
        'relative flex flex-col shrink-0 min-h-[calc(100vh-3.5rem)] border-r',
        'bg-gradient-to-b from-indigo-950 to-purple-950 text-indigo-100',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo area */}
      <div
        className={cn(
          'flex items-center gap-2.5 px-4 py-4 border-b border-indigo-800/60',
          collapsed && 'justify-center px-2'
        )}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 shrink-0">
          <Shield className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm text-white leading-tight truncate">
              FitnessPlace
            </span>
            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-700 leading-none w-fit">
              SUPER ADMIN
            </span>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-0.5 p-2 pt-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/50'
                  : 'text-indigo-300 hover:bg-indigo-800/60 hover:text-white'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: user info */}
      {mounted && (
        <div className={cn('border-t border-indigo-800/60 p-3', collapsed && 'px-2')}>
          <div className={cn('flex items-center gap-2.5', collapsed && 'justify-center')}>
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 text-xs font-bold text-white">
              {avatarInitial}
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-white truncate leading-tight">
                  {displayName}
                </span>
                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-700 leading-none w-fit">
                  Super Admin
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggleCollapsed}
        className={cn(
          'absolute -right-3 top-6 z-10',
          'w-6 h-6 rounded-full border border-indigo-700 bg-indigo-900 text-indigo-300',
          'flex items-center justify-center shadow-md',
          'hover:bg-indigo-700 hover:text-white transition-colors'
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  )
}
