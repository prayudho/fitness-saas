'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ScanLine,
  UserCheck,
  BarChart3,
  KeyRound,
  Building2,
  UsersRound,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/actions/auth'

const STORAGE_KEY = 'branch-manager-sidebar-collapsed'

const NAV_ITEMS = [
  { href: '/branch-manager',           label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/branch-manager/members',   label: 'Members',    icon: Users },
  { href: '/branch-manager/classes',   label: 'Classes',    icon: CalendarDays },
  { href: '/branch-manager/checkins',  label: 'Check-ins',  icon: ScanLine },
  { href: '/branch-manager/trainers',  label: 'Trainers',   icon: UserCheck },
  { href: '/branch-manager/team',      label: 'Team',       icon: UsersRound },
  { href: '/branch-manager/reports',   label: 'Reports',    icon: BarChart3 },
  { href: '/branch-manager/account',   label: 'My Account', icon: KeyRound },
]

function NavLinks({
  collapsed,
  branchName,
  onClose,
}: {
  collapsed: boolean
  branchName: string
  onClose?: () => void
}) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn('flex items-center gap-2 px-3 py-4 border-b', collapsed && 'px-2 justify-center')}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{branchName || 'Branch Manager'}</p>
            <p className="text-xs text-muted-foreground">Branch Portal</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === '/branch-manager'
                ? pathname === '/branch-manager'
                : pathname.startsWith(href)

            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors min-h-[44px]',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    collapsed && 'px-2 justify-center'
                  )}
                  title={collapsed ? label : undefined}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

export function BranchManagerSidebar({ branchName }: { branchName: string }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) setCollapsed(stored === 'true')
    } catch {
      // ignore
    }
  }, [])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem(STORAGE_KEY, String(next)) } catch { /* ignore */ }
      return next
    })
  }

  return (
    <>
      {/* Mobile FAB */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg md:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r bg-background transition-transform md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex justify-end p-2">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <NavLinks
          collapsed={false}
          branchName={branchName}
          onClose={() => setMobileOpen(false)}
        />
        <div className="border-t p-3">
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors min-h-[44px]"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'relative hidden h-screen flex-col border-r bg-background transition-all duration-200 md:flex',
          collapsed ? 'w-14' : 'w-60'
        )}
      >
        <NavLinks collapsed={collapsed} branchName={branchName} />

        {/* Footer: collapse toggle + logout */}
        <div className="border-t p-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-1"
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
          <form action={signOut}>
            <button
              type="submit"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
