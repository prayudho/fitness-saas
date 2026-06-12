'use client'

import { useEffect } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type CheckinResultData = {
  success: boolean
  status: 'success' | 'warning' | 'denied'
  message: string
  member: { full_name: string | null; avatar_url: string | null }
  membership?: {
    expires_at: string | null
    membership_packages: { name: string } | null
  } | null
}

interface CheckinResultProps {
  result: CheckinResultData | null
  onReset: () => void
}

export function CheckinResult({ result, onReset }: CheckinResultProps) {
  useEffect(() => {
    if (!result) return
    const timer = setTimeout(() => {
      onReset()
    }, 5000)
    return () => clearTimeout(timer)
  }, [result, onReset])

  if (!result) return null

  const initials = result.member.full_name
    ? result.member.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  const checkinTime = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const expiryDate = result.membership?.expires_at
    ? new Date(result.membership.expires_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card
        className={cn(
          'w-full max-w-sm mx-4 shadow-xl border-2',
          result.status === 'success' && 'border-green-500',
          result.status === 'warning' && 'border-amber-500',
          result.status === 'denied' && 'border-red-500'
        )}
      >
        <CardContent className="pt-6 pb-4">
          <div className="flex flex-col items-center text-center gap-4">
            {/* Status icon */}
            {result.status === 'success' && (
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            )}
            {result.status === 'warning' && (
              <div className="rounded-full bg-amber-100 p-3">
                <AlertTriangle className="h-10 w-10 text-amber-600" />
              </div>
            )}
            {result.status === 'denied' && (
              <div className="rounded-full bg-red-100 p-3">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
            )}

            {/* Member info */}
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-14 w-14">
                <AvatarImage src={result.member.avatar_url ?? undefined} />
                <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold">
                  {result.member.full_name ?? 'Unknown Member'}
                </p>
                {result.membership?.membership_packages?.name && result.status !== 'denied' && (
                  <p className="text-sm text-muted-foreground">
                    {result.membership.membership_packages.name}
                  </p>
                )}
              </div>
            </div>

            {/* Status message */}
            {result.status === 'success' && (
              <div className="space-y-1">
                <p className="text-green-700 font-medium">{result.message}</p>
                <p className="text-xs text-muted-foreground">
                  Check-in recorded at {checkinTime}
                </p>
              </div>
            )}

            {result.status === 'warning' && (
              <div className="space-y-1">
                <p className="text-amber-700 font-medium">Membership expiring soon!</p>
                <p className="text-sm text-amber-600">{result.message}</p>
                {expiryDate && (
                  <p className="text-xs text-muted-foreground">Expires: {expiryDate}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Check-in recorded at {checkinTime}
                </p>
              </div>
            )}

            {result.status === 'denied' && (
              <div className="space-y-1">
                <p className="text-red-700 font-medium">{result.message}</p>
                <p className="text-xs text-muted-foreground">Access denied</p>
              </div>
            )}

            {/* Dismiss button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="mt-2 w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Dismiss
            </Button>

            {/* Auto-dismiss indicator */}
            <p className="text-xs text-muted-foreground -mt-2">
              Auto-dismissing in 5 seconds
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
