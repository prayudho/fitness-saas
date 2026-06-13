'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Calendar, Users, Clock, DollarSign, KeyRound, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'trainer-sidebar-collapsed'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { href: '/trainer/schedule', label: 'My Schedule', icon: Calendar },
  { href: '/trainer/clients', label: 'My Clients', icon: Users },
  { href: '/trainer/availability', label: 'Availability', icon: Clock },
  { href: '/trainer/sessions', label: 'Sessions', icon: Clock },
  { href: '/trainer/earnings', label: 'Earnings', icon: DollarSign },
  { href: '/trainer/account', label: 'My Account', icon: KeyRound },
]

export function TrainerSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setCollapsed(stored === 'true')
    }
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(STORAGE_KEY, String(next))
  }

  const NavLinks = () => (
    <nav className="flex flex-col gap-0.5 p-2 flex-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
              collapsed ? 'justify-center' : '',
              isActive
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="flex-1 truncate">{label}</span>}
          </Link>
        )
      })}
    </nav>
  )

  if (!mounted) {
    return (
      <aside className="w-60 shrink-0 min-h-[calc(100vh-3.5rem)] border-r bg-card hidden md:flex flex-col" />
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
        className="fixed bottom-4 left-4 z-50 md:hidden flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 bg-card border-r flex flex-col transition-transform duration-200 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Trainer Portal
          </p>
          <button
            onClick={() => setMobileOpen(false)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <NavLinks />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col shrink-0 min-h-[calc(100vh-3.5rem)] border-r bg-card transition-all duration-200 ease-in-out',
          collapsed ? 'w-14' : 'w-60'
        )}
      >
        <div
          className={cn(
            'flex items-center border-b px-3 py-3',
            collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          {!collapsed && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Trainer Portal
            </p>
          )}
          <button
            onClick={toggleCollapsed}
            className="text-muted-foreground hover:text-foreground ml-auto"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
        <NavLinks />
      </aside>
    </>
  )
}
