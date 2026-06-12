'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Package,
  CalendarDays,
  UserCheck,
  CreditCard,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Dumbbell,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { signOut } from '@/lib/actions/auth'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/members', label: 'Members', icon: Users },
  { href: '/admin/packages', label: 'Packages', icon: Package },
  { href: '/admin/classes', label: 'Classes', icon: CalendarDays },
  { href: '/admin/trainers', label: 'Trainers', icon: UserCheck },
  { href: '/admin/billing', label: 'Billing', icon: CreditCard },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

const STORAGE_KEY = 'admin-sidebar-collapsed'

interface AdminSidebarProps {
  userName?: string
  userEmail?: string
  userRole?: string
}

export function AdminSidebar({ userName, userEmail, userRole }: AdminSidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setIsCollapsed(stored === 'true')
    }
    setMounted(true)
  }, [])

  function toggleCollapsed() {
    const next = !isCollapsed
    setIsCollapsed(next)
    localStorage.setItem(STORAGE_KEY, String(next))
  }

  function getInitials(name?: string) {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Prevent hydration mismatch — render expanded on server
  const collapsed = mounted ? isCollapsed : false

  return (
    <aside
      className={`
        hidden md:flex flex-col
        ${collapsed ? 'w-16' : 'w-60'}
        transition-all duration-300
        bg-card border-r h-screen sticky top-0
        overflow-hidden
      `}
    >
      {/* Logo / Brand area */}
      <div className="flex items-center justify-between px-3 py-4 border-b shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Dumbbell className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm truncate">FitnessPlace</span>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground mx-auto">
            <Dumbbell className="h-4 w-4" />
          </div>
        )}
        <button
          onClick={toggleCollapsed}
          className={`
            flex h-7 w-7 shrink-0 items-center justify-center rounded-md
            text-muted-foreground hover:bg-accent hover:text-accent-foreground
            transition-colors
            ${collapsed ? 'ml-auto' : ''}
          `}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium
                transition-colors
                ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span
                className={`
                  truncate transition-all duration-300
                  ${collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}
                `}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom: user info + sign out */}
      <div className="border-t p-3 shrink-0">
        <div
          className={`flex items-center gap-3 ${collapsed ? 'justify-center flex-col' : ''}`}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={undefined} />
            <AvatarFallback className="text-xs">{getInitials(userName)}</AvatarFallback>
          </Avatar>

          {!collapsed && (
            <div className="flex-1 overflow-hidden min-w-0">
              <p className="text-sm font-medium truncate leading-tight">
                {userName ?? 'Admin User'}
              </p>
              <p className="text-xs text-muted-foreground truncate capitalize leading-tight">
                {userRole ?? 'admin'}
              </p>
            </div>
          )}

          <form action={signOut}>
            <button
              type="submit"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
