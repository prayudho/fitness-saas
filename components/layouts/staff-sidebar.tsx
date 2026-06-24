'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ScanLine, Users, UserPlus, DollarSign, KeyRound, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROLE_VARIANTS } from '@/lib/design-tokens'

const token = ROLE_VARIANTS.staff

const STORAGE_KEY = 'staff-sidebar-collapsed'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { href: '/staff/checkin',  label: 'Check-in',  icon: ScanLine },
  { href: '/staff/members',  label: 'Members',   icon: Users },
  { href: '/staff/walkin',   label: 'Walk-in',   icon: UserPlus },
  { href: '/staff/payments', label: 'Payments',  icon: DollarSign },
  { href: '/staff/account',  label: 'My Account', icon: KeyRound },
]

function NavLinks({ pathname, collapsed }: { pathname: string; collapsed: boolean }) {
  return (
    <nav className="flex flex-col gap-0.5 p-2 flex-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 min-h-[44px] text-sm transition-colors',
              collapsed ? 'justify-center' : '',
              isActive
                ? cn(token.activeClass, 'font-medium')
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            )}
            style={isActive ? { boxShadow: token.activeShadow } : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="flex-1 truncate">{label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

export function StaffSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) setCollapsed(stored === 'true')
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(STORAGE_KEY, String(next))
  }

  if (!mounted) {
    return (
      <aside className="w-60 shrink-0 min-h-[calc(100vh-3.5rem)] border-r bg-zinc-950 hidden md:flex flex-col" />
    )
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 left-4 z-50 md:hidden flex items-center justify-center h-10 w-10 rounded-full bg-amber-500 text-white shadow-lg"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 border-r border-zinc-800 flex flex-col transition-transform duration-200 ease-in-out md:hidden',
          'bg-zinc-950 text-white',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Front Desk
          </p>
          <button
            onClick={() => setMobileOpen(false)}
            className="text-zinc-400 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <NavLinks pathname={pathname} collapsed={false} />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col shrink-0 min-h-[calc(100vh-3.5rem)] border-r border-zinc-800 transition-all duration-200 ease-in-out',
          'bg-zinc-950 text-white',
          collapsed ? 'w-14' : 'w-60'
        )}
      >
        <div className={cn(
          'flex items-center border-b border-zinc-800 px-3 py-3',
          collapsed ? 'justify-center' : 'justify-between'
        )}>
          {!collapsed && (
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Front Desk
            </p>
          )}
          <button
            onClick={toggleCollapsed}
            className="text-zinc-400 hover:text-white ml-auto"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
        <NavLinks pathname={pathname} collapsed={collapsed} />
      </aside>
    </>
  )
}
