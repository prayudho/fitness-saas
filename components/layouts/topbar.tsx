'use client'

import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from '@/lib/actions/auth'

interface TopBarProps {
  userName?: string
  userEmail?: string
  userRole?: string
  brandName?: string
}

const MOBILE_NAV_KEY = 'mobile-nav-open'

function getProfileHref(role?: string): string {
  switch (role) {
    case 'admin':
    case 'superadmin':
      return '/admin/settings'
    case 'staff':
      return '/staff/profile'
    case 'trainer':
      return '/trainer/profile'
    case 'member':
      return '/member/profile'
    default:
      return '/admin/settings'
  }
}

function getInitials(name?: string): string {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function TopBar({ userName, userEmail, userRole, brandName }: TopBarProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem(MOBILE_NAV_KEY)
    setMobileNavOpen(stored === 'true')
  }, [])

  function toggleMobileNav() {
    const next = !mobileNavOpen
    setMobileNavOpen(next)
    sessionStorage.setItem(MOBILE_NAV_KEY, String(next))
  }

  const profileHref = getProfileHref(userRole)

  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur sticky top-0 z-40 flex items-center px-4 gap-3">
      {/* Mobile menu trigger */}
      <button
        onClick={toggleMobileNav}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors md:hidden"
        aria-label="Toggle mobile navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Brand name */}
      <span className="font-semibold text-sm flex-1 truncate">
        {brandName ?? 'FitnessPlace'}
      </span>

      {/* Right: user dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="User menu"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={undefined} />
              <AvatarFallback className="text-xs">{getInitials(userName)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="pb-1">
            <p className="font-semibold text-sm leading-tight truncate">
              {userName ?? 'Admin User'}
            </p>
            <p className="text-xs font-normal text-muted-foreground truncate">
              {userEmail ?? ''}
            </p>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <a href={profileHref}>Profile Settings</a>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <form action={signOut} className="w-full">
              <button type="submit" className="w-full text-left cursor-pointer">
                Sign Out
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
