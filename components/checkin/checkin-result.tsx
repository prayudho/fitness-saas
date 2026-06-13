'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, X, ShieldAlert, UserCheck, UserX } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { MemberAccessStatus } from '@/lib/actions/membership.actions'

export type CheckinResultData = {
  success: boolean
  status: 'success' | 'warning' | 'denied' | 'override_required'
  message: string
  member: { full_name: string | null; avatar_url: string | null }
  membership?: {
    id?: string
    expires_at: string | null
    membership_packages: { name: string } | null
  } | null
  accessStatus?: MemberAccessStatus | null
}

interface CheckinResultProps {
  result: CheckinResultData | null
  memberId?: string
  lastMethod?: 'qr' | 'staff' | 'gate'
  onReset: () => void
  onOverride?: (allowed: boolean) => void
}

export function CheckinResult({ result, onReset, onOverride }: CheckinResultProps) {
  const [overrideLoading, setOverrideLoading] = useState<boolean | null>(null)

  // Auto-dismiss for success/warning/denied; override_required requires staff action
  useEffect(() => {
    if (!result) return
    if (result.status === 'override_required') return
    const timer = setTimeout(() => onReset(), 5000)
    return () => clearTimeout(timer)
  }, [result, onReset])

  if (!result) return null

  const initials = result.member.full_name
    ? result.member.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const checkinTime = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

  async function handleOverride(allowed: boolean) {
    setOverrideLoading(allowed)
    await onOverride?.(allowed)
    setOverrideLoading(null)
    onReset()
  }

  const isOverride = result.status === 'override_required'
  const as = result.accessStatus

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card
        className={cn(
          'w-full max-w-sm mx-4 shadow-xl border-2',
          result.status === 'success'          && 'border-green-500',
          result.status === 'warning'          && 'border-amber-500',
          result.status === 'denied'           && 'border-red-500',
          result.status === 'override_required' && 'border-orange-500'
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
            {result.status === 'override_required' && (
              <div className="rounded-full bg-orange-100 p-3">
                <ShieldAlert className="h-10 w-10 text-orange-600" />
              </div>
            )}

            {/* Member info */}
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-14 w-14">
                <AvatarImage src={result.member.avatar_url ?? undefined} />
                <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold">{result.member.full_name ?? 'Unknown Member'}</p>
                {result.membership?.membership_packages?.name && (
                  <p className="text-sm text-muted-foreground">
                    {result.membership.membership_packages.name}
                  </p>
                )}
              </div>
            </div>

            {/* Status content */}
            {result.status === 'success' && (
              <div className="space-y-1">
                <p className="text-green-700 font-medium">{result.message}</p>
                {as?.hasPTSessions && (
                  <p className="text-xs text-muted-foreground">
                    PT Sessions: {as.ptSessionsRemaining} remaining
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Check-in recorded at {checkinTime}</p>
              </div>
            )}

            {result.status === 'warning' && (
              <div className="space-y-1">
                <p className="text-amber-700 font-medium">{result.message}</p>
                {as?.gymExpiresAt && (
                  <p className="text-xs text-muted-foreground">
                    Gym Access:{' '}
                    {new Date(as.gymExpiresAt).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                )}
                {as?.hasPTSessions && (
                  <p className="text-xs text-muted-foreground">
                    PT Sessions: {as.ptSessionsRemaining} remaining
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Check-in recorded at {checkinTime}</p>
              </div>
            )}

            {result.status === 'denied' && (
              <div className="space-y-1">
                <p className="text-red-700 font-medium">{result.message}</p>
                {as?.gymExpiresAt && new Date(as.gymExpiresAt) < new Date() && (
                  <p className="text-xs text-muted-foreground">
                    Expired:{' '}
                    {new Date(as.gymExpiresAt).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Access denied</p>
              </div>
            )}

            {/* Override required — staff decision */}
            {isOverride && (
              <div className="w-full space-y-3">
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-left text-sm">
                  <p className="font-medium text-orange-800">⚠ Gym access expired</p>
                  {as?.ptSessionsRemaining != null && (
                    <p className="text-orange-700 mt-0.5">
                      PT Sessions still active: {as.ptSessionsRemaining} remaining
                    </p>
                  )}
                  {as?.ptSessionsExpiresAt && (
                    <p className="text-xs text-orange-600 mt-0.5">
                      PT credits expire{' '}
                      {new Date(as.ptSessionsExpiresAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="border-green-500 text-green-700 hover:bg-green-50"
                    disabled={overrideLoading !== null}
                    onClick={() => handleOverride(true)}
                  >
                    <UserCheck className="mr-1.5 h-4 w-4" />
                    {overrideLoading === true ? 'Recording…' : 'Allow Entry'}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-500 text-red-700 hover:bg-red-50"
                    disabled={overrideLoading !== null}
                    onClick={() => handleOverride(false)}
                  >
                    <UserX className="mr-1.5 h-4 w-4" />
                    {overrideLoading === false ? 'Recording…' : 'Deny Entry'}
                  </Button>
                </div>
              </div>
            )}

            {/* Dismiss (not shown for override_required) */}
            {!isOverride && (
              <>
                <Button variant="outline" size="sm" onClick={onReset} className="mt-2 w-full">
                  <X className="mr-2 h-4 w-4" />
                  Dismiss
                </Button>
                <p className="text-xs text-muted-foreground -mt-2">Auto-dismissing in 5 seconds</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
