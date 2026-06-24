'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Home,
  CreditCard,
  CalendarDays,
  Dumbbell,
  ClipboardList,
  Receipt,
  User,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { signOut } from '@/lib/actions/auth'
import { ROLE_VARIANTS } from '@/lib/design-tokens'

const token = ROLE_VARIANTS.member

const NAV_ITEMS = [
  { href: '/member',           label: 'Dashboard',        icon: Home },
  { href: '/member/qr-card',   label: 'My Card',          icon: CreditCard },
  { href: '/member/classes',   label: 'Classes',          icon: CalendarDays },
  { href: '/member/pt-booking', label: 'Personal Trainer', icon: Dumbbell },
  { href: '/member/training',  label: 'Training History', icon: ClipboardList },
  { href: '/member/billing',   label: 'Billing',          icon: Receipt },
  { href: '/member/profile',   label: 'Profile',          icon: User },
  { href: '/member/account',   label: 'My Account',       icon: KeyRound },
]

const STORAGE_KEY = 'member-sidebar-collapsed'

interface MemberSidebarProps {
  userName?: string
  userEmail?: string
  avatarUrl?: string | null
}

export function MemberSidebar({ userName, userEmail, avatarUrl }: MemberSidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) setIsCollapsed(stored === 'true')
    setMounted(true)
  }, [])

  function toggleCollapsed() {
    const next = !isCollapsed
    setIsCollapsed(next)
    localStorage.setItem(STORAGE_KEY, String(next))
  }

  const collapsed = mounted ? isCollapsed : false

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen sticky top-0 overflow-hidden border-r transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
      style={{ backgroundColor: token.sidebarBgHex }}
    >
      {/* Logo / Brand area */}
      <div className="flex items-center justify-between px-3 py-4 border-b shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Dumbbell className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm truncate">Member Portal</span>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground mx-auto">
            <Dumbbell className="h-4 w-4" />
          </div>
        )}
        <button
          onClick={toggleCollapsed}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
            'text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
            collapsed ? 'ml-auto' : ''
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/member' ? pathname === '/member' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-2 py-2 min-h-[44px] text-sm font-medium transition-colors',
                collapsed ? 'justify-center' : '',
                isActive
                  ? token.activeClass
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              style={isActive ? { boxShadow: token.activeShadow } : undefined}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className={cn(
                'truncate transition-all duration-300',
                collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'
              )}>
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom: user info + sign out */}
      <div className="border-t p-3 shrink-0">
        <div className={cn('flex items-center gap-3', collapsed ? 'justify-center flex-col' : '')}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={avatarUrl ?? undefined} />
            <AvatarFallback className="text-xs">{getInitials(userName, 'M')}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 overflow-hidden min-w-0">
              <p className="text-sm font-medium truncate leading-tight">{userName ?? 'Member'}</p>
              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary leading-none">
                Member
              </span>
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
