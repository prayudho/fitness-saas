'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function TeamError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[Team] Page error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Something went wrong</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {error.message || 'An unexpected error occurred while loading the team page.'}
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={reset} variant="default" size="sm">
                Try Again
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin">Go to Dashboard</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
