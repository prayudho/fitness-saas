'use client'

import { useState, useCallback, useRef } from 'react'
import { QrCode, Search, Clock, Smartphone, GitBranch } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { QRScanner } from '@/components/checkin/qr-scanner'
import { CheckinResult } from '@/components/checkin/checkin-result'
import type { CheckinResultData } from '@/components/checkin/checkin-result'
import { MemberSearch } from '@/components/checkin/member-search'
import { OccupancyCounter } from '@/components/checkin/occupancy-counter'
import { useProcessCheckin, useCheckinLog, useRecordCheckinWithOverride } from '@/lib/hooks/use-checkins'
import { useBranchList } from '@/lib/hooks/use-branches'
import { formatRelativeTime } from '@/lib/utils'

export default function CheckinPage() {
  const [checkinResult, setCheckinResult] = useState<CheckinResultData | null>(null)
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')
  const lastInputRef = useRef<{ member_id: string; membership_id?: string; method: 'qr' | 'staff' | 'gate' }>()

  const processCheckin = useProcessCheckin()
  const recordOverride = useRecordCheckinWithOverride()
  const { data: recentCheckins } = useCheckinLog(10)
  const { data: branchData } = useBranchList()

  const isMultiBranch = branchData?.isMultiBranch ?? false
  const activeBranchId = selectedBranchId || undefined

  const handleCheckin = useCallback(
    async (memberId: string, method: 'qr' | 'staff' | 'gate' = 'staff') => {
      lastInputRef.current = { member_id: memberId, method }
      const result = await processCheckin.mutateAsync({ member_id: memberId, method, branchId: activeBranchId })
      if (result) {
        if (result.membership?.id) {
          lastInputRef.current.membership_id = result.membership.id
        }
        setCheckinResult(result as CheckinResultData)
      }
    },
    [processCheckin, activeBranchId]
  )

  const handleQRScan = useCallback(
    (memberId: string) => handleCheckin(memberId, 'qr'),
    [handleCheckin]
  )

  const handleReset = useCallback(() => setCheckinResult(null), [])

  const handleOverride = useCallback(
    async (allowed: boolean) => {
      const last = lastInputRef.current
      const membershipId = checkinResult?.membership?.id ?? last?.membership_id
      if (!last?.member_id || !membershipId) return

      await recordOverride.mutateAsync({
        member_id:       last.member_id,
        membership_id:   membershipId,
        method:          last.method,
        allowed,
        warning_message: checkinResult?.message ?? null,
        branchId:        activeBranchId,
      })
    },
    [checkinResult, recordOverride, activeBranchId]
  )

  function getMethodLabel(method: string) {
    switch (method) {
      case 'qr':    return 'QR'
      case 'staff': return 'Staff'
      case 'gate':  return 'Gate'
      default:      return method
    }
  }

  function getInitials(name: string | null) {
    if (!name) return '?'
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Check-in Station"
          description="Scan QR code or search member by name / phone"
        />
        <OccupancyCounter className="shrink-0" />
      </div>

      {isMultiBranch && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
          <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
          <Label className="text-sm font-medium shrink-0">Check-in Branch</Label>
          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="max-w-[240px]">
              <SelectValue placeholder="Auto-detect from profile" />
            </SelectTrigger>
            <SelectContent>
              {(branchData?.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedBranchId && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground underline"
              onClick={() => setSelectedBranchId('')}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Result overlay */}
      <CheckinResult
        result={checkinResult}
        memberId={lastInputRef.current?.member_id}
        lastMethod={lastInputRef.current?.method}
        onReset={handleReset}
        onOverride={handleOverride}
      />

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
              {recentCheckins.map((checkin) => {
                const overrideFlag = (checkin as unknown as Record<string, unknown>).staff_override
                const warningMsg   = (checkin as unknown as Record<string, unknown>).warning_message as string | null

                return (
                  <li key={checkin.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs">
                        {getInitials(checkin.profiles?.full_name ?? null)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">
                          {checkin.profiles?.full_name ?? 'Unknown'}
                        </p>
                        {overrideFlag === true && (
                          <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 shrink-0">
                            Override
                          </span>
                        )}
                        {overrideFlag === false && (
                          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 shrink-0">
                            Denied
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(checkin.checked_in_at)}
                      </p>
                      {warningMsg && (
                        <p className="text-[10px] text-amber-600 truncate mt-0.5">{warningMsg}</p>
                      )}
                    </div>

                    <StatusBadge status={getMethodLabel(checkin.method)} className="shrink-0" />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
