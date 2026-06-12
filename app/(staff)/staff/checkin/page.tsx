'use client'

import { useState, useCallback } from 'react'
import { QrCode, Search, Clock, Smartphone } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { QRScanner } from '@/components/checkin/qr-scanner'
import { CheckinResult } from '@/components/checkin/checkin-result'
import { MemberSearch } from '@/components/checkin/member-search'
import { OccupancyCounter } from '@/components/checkin/occupancy-counter'
import { useProcessCheckin, useCheckinLog } from '@/lib/hooks/use-checkins'
import type { CheckinResult as CheckinResultType } from '@/lib/actions/checkins'
import { formatRelativeTime } from '@/lib/utils'

export default function CheckinPage() {
  const [checkinResult, setCheckinResult] = useState<CheckinResultType | null>(null)
  const processCheckin = useProcessCheckin()
  const { data: recentCheckins } = useCheckinLog(10)

  const handleCheckin = useCallback(
    async (memberId: string, method: 'qr' | 'staff' | 'gate' = 'staff') => {
      const result = await processCheckin.mutateAsync({ member_id: memberId, method })
      if (result) {
        setCheckinResult(result)
      }
    },
    [processCheckin]
  )

  const handleQRScan = useCallback(
    (memberId: string) => {
      handleCheckin(memberId, 'qr')
    },
    [handleCheckin]
  )

  const handleReset = useCallback(() => {
    setCheckinResult(null)
  }, [])

  function getMethodLabel(method: string) {
    switch (method) {
      case 'qr':
        return 'QR'
      case 'staff':
        return 'Staff'
      case 'gate':
        return 'Gate'
      default:
        return method
    }
  }

  function getInitials(name: string | null) {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Check-in Station"
          description="Scan QR code or search member by name / phone"
        />
        <OccupancyCounter className="shrink-0" />
      </div>

      {/* Result overlay */}
      <CheckinResult result={checkinResult} onReset={handleReset} />

      {/* Main check-in interface */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <Tabs defaultValue="qr">
            <TabsList className="w-full">
              <TabsTrigger value="qr" className="flex-1">
                <QrCode className="mr-2 h-4 w-4" />
                QR Scanner
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex-1">
                <Search className="mr-2 h-4 w-4" />
                Manual Search
              </TabsTrigger>
            </TabsList>

            <TabsContent value="qr" className="mt-4">
              <div className="border rounded-lg p-4 bg-card">
                <QRScanner
                  onScan={handleQRScan}
                  isProcessing={processCheckin.isPending}
                />
              </div>
            </TabsContent>

            <TabsContent value="manual" className="mt-4">
              <div className="border rounded-lg p-4 bg-card">
                <MemberSearch
                  onCheckin={(memberId) => handleCheckin(memberId, 'staff')}
                  isProcessing={processCheckin.isPending}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Recent check-ins */}
        <div className="border rounded-lg bg-card">
          <div className="flex items-center gap-2 p-4 border-b">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Recent Check-ins</h3>
          </div>

          {!recentCheckins || recentCheckins.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Smartphone className="h-8 w-8" />
              <p className="text-sm">No check-ins yet today</p>
            </div>
          ) : (
            <ul className="divide-y max-h-[420px] overflow-y-auto">
              {recentCheckins.map((checkin) => (
                <li key={checkin.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={checkin.profiles?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(checkin.profiles?.full_name ?? null)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {checkin.profiles?.full_name ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(checkin.checked_in_at)}
                    </p>
                  </div>

                  <StatusBadge status={getMethodLabel(checkin.method)} className="shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
