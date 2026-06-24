'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/hooks/use-auth'
import { cn } from '@/lib/utils'

interface NavbarProps {
  brandName?: string
  logoUrl?: string | null
}

export function Navbar({ brandName = 'Gerak', logoUrl }: NavbarProps) {
  const { user, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4">
        <Link href="/" className="flex items-center gap-2">
          {logoUrl && (
            <img src={logoUrl} alt={brandName} className="h-8 w-8 rounded object-cover" />
          )}
          <span className="font-bold text-lg">{brandName}</span>
        </Link>

        <div className="flex-1" />

        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user.email}
            </span>
            <button
              onClick={signOut}
              className={cn(
                'text-sm font-medium px-3 py-1.5 rounded-md border',
                'hover:bg-accent hover:text-accent-foreground transition-colors'
              )}
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  )
}
