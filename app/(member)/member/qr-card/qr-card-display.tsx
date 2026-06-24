'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate } from '@/lib/utils'

interface QRCardDisplayProps {
  userId: string
  memberName: string
  membershipStatus: string | null
  packageName: string | null
  expiresAt: string | null
}

export function QRCardDisplay({
  userId,
  memberName,
  membershipStatus,
  packageName,
  expiresAt,
}: QRCardDisplayProps) {
  return (
    <Card className="overflow-hidden shadow-lg print:shadow-none print:border">
      {/* Header */}
      <div className="bg-primary px-6 py-5 text-primary-foreground text-center print:bg-gray-900 print:text-white">
        <p className="text-xs font-medium uppercase tracking-widest opacity-75">Gerak</p>
        <p className="text-lg font-bold mt-0.5">Member Card</p>
      </div>

      <CardContent className="flex flex-col items-center gap-5 py-6">
        {/* QR Code */}
        <div className="rounded-xl border-2 border-muted p-3 bg-white">
          <QRCodeSVG
            value={userId}
            size={220}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Member Info */}
        <div className="text-center w-full space-y-1">
          <p className="font-semibold text-lg leading-tight">{memberName}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {userId.slice(0, 8).toUpperCase()}
          </p>
        </div>

        {/* Package / Status */}
        <div className="w-full rounded-lg bg-muted/40 border px-4 py-3 text-center space-y-2">
          {packageName ? (
            <>
              <p className="text-xs text-muted-foreground">Package</p>
              <p className="text-sm font-semibold">{packageName}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No active package</p>
          )}
          {membershipStatus && (
            <div className="flex justify-center">
              <StatusBadge status={membershipStatus} />
            </div>
          )}
          {expiresAt && (
            <p className="text-xs text-muted-foreground">
              Valid until {formatDate(expiresAt)}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
