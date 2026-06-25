'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Home,
  QrCode,
  CalendarDays,
  Receipt,
  MoreHorizontal,
  Dumbbell,
  ClipboardList,
  User,
  KeyRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { ROLE_VARIANTS } from '@/lib/design-tokens'

const token = ROLE_VARIANTS.member
const activeBottomShadow = 'inset 0 3px 0 #0ea5e9'

const PRIMARY_ITEMS = [
  { href: '/member',          label: 'Dashboard', icon: Home },
  { href: '/member/qr-card',  label: 'My Card',   icon: QrCode },
  { href: '/member/classes',  label: 'Classes',   icon: CalendarDays },
  { href: '/member/billing',  label: 'Billing',   icon: Receipt },
]

const MORE_ITEMS = [
  { href: '/member/pt-booking', label: 'PT Booking',       icon: Dumbbell },
  { href: '/member/training',   label: 'Training History', icon: ClipboardList },
  { href: '/member/profile',    label: 'Profile',          icon: User },
  { href: '/member/account',    label: 'My Account',       icon: KeyRound },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const isMoreActive = MORE_ITEMS.some(({ href }) => pathname.startsWith(href))

  return (
    <>
      <nav
        className="fixed bottom-0 inset-x-0 z-40 border-t bg-background md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-16">
          {PRIMARY_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/member' ? pathname === '/member' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors',
                  isActive ? cn(token.activeClass, 'font-medium') : 'text-muted-foreground'
                )}
                style={isActive ? { boxShadow: activeBottomShadow } : undefined}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            )
          })}

          {/* More tab */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors',
              isMoreActive ? cn(token.activeClass, 'font-medium') : 'text-muted-foreground'
            )}
            style={isMoreActive ? { boxShadow: activeBottomShadow } : undefined}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <SheetTitle className="sr-only">More options</SheetTitle>
          <nav className="grid grid-cols-4 gap-2 pt-2">
            {MORE_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-lg p-3 text-xs text-center transition-colors',
                    isActive
                      ? cn(token.activeClass, 'font-medium')
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
