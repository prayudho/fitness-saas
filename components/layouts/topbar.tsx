'use client'

import { Menu } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
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
import { useMobileNav } from '@/lib/stores/mobile-nav-store'
import { ROLE_VARIANTS, type RoleVariantKey } from '@/lib/design-tokens'

interface TopBarProps {
  userName?: string
  userEmail?: string
  userRole?: string
  brandName?: string
  showMobileMenu?: boolean
}

function getProfileHref(role?: string): string {
  switch (role) {
    case 'admin':
    case 'superadmin':
      return '/admin/settings'
    case 'branch_manager':
      return '/branch-manager/account'
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

function RoleBadge({ role }: { role?: string }) {
  if (!role) return null
  const token = ROLE_VARIANTS[role as RoleVariantKey]
  if (!token) return null
  return (
    <span className={cn(
      'inline-flex items-center h-6 px-2 rounded-full text-xs font-medium ring-1 ring-inset ring-current/20',
      token.badgeClass
    )}>
      {token.label}
    </span>
  )
}

export function TopBar({ userName, userEmail, userRole, brandName, showMobileMenu = true }: TopBarProps) {
  const { toggle } = useMobileNav()
  const profileHref = getProfileHref(userRole)

  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur sticky top-0 z-40 flex items-center px-4 gap-3">
      {/* Mobile menu trigger */}
      {showMobileMenu && (
        <button
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors md:hidden"
          aria-label="Toggle mobile navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Brand name */}
      <span className="font-semibold text-sm flex-1 truncate">
        {brandName ?? 'Gerak'}
      </span>

      {/* Role badge */}
      <RoleBadge role={userRole} />

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
