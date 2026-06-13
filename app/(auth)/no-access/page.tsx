'use client'

import Link from 'next/link'
import { ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/actions/auth'

export default function NoAccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-4">
            <ShieldOff className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">No access to this gym</h1>
          <p className="text-muted-foreground">
            You do not have an account at this gym. Please contact the gym admin to be
            added, or sign in to a different gym.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" asChild>
            <Link href="/login">Back to login</Link>
          </Button>
          <form action={signOut}>
            <Button type="submit" variant="default" className="w-full sm:w-auto">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
