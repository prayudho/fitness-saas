'use client'

import { useState, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Download, Filter } from 'lucide-react'
import Papa from 'papaparse'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCheckinLog } from '@/lib/hooks/use-checkins'
import { useBranchList } from '@/lib/hooks/use-branches'
import type { CheckinWithProfile } from '@/lib/actions/checkins'
import { formatDate } from '@/lib/utils'

type DateFilter = 'today' | 'week' | 'all'

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatMethod(method: string) {
  switch (method) {
    case 'qr':
      return 'QR Code'
    case 'staff':
      return 'Staff'
    case 'gate':
      return 'Gate'
    default:
      return method
  }
}

const columns: ColumnDef<CheckinWithProfile>[] = [
  {
    id: 'member',
    header: 'Member',
    cell: ({ row }) => {
      const profile = row.original.profiles
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{profile?.full_name ?? 'Unknown'}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'method',
    header: 'Method',
    cell: ({ row }) => (
      <StatusBadge status={formatMethod(row.original.method)} />
    ),
  },
  {
    accessorKey: 'checked_in_at',
    header: 'Date & Time',
    cell: ({ row }) => {
      const dt = new Date(row.original.checked_in_at)
      return (
        <div className="text-sm">
          <p>{formatDate(dt)}</p>
          <p className="text-muted-foreground text-xs">
            {dt.toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
        </div>
      )
    },
    sortingFn: 'datetime',
  },
  {
    accessorKey: 'notes',
    header: 'Notes',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.notes ?? '—'}</span>
    ),
  },
]

export default function CheckinLogPage() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [branchId, setBranchId] = useState('all')
  const { data: branchData } = useBranchList()
  const { data: checkins, isLoading } = useCheckinLog(200, {
    branchId: branchId !== 'all' ? branchId : undefined,
  })

  const filteredCheckins = useMemo(() => {
    if (!checkins) return []

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    switch (dateFilter) {
      case 'today':
        return checkins.filter((c) => c.checked_in_at.startsWith(todayStr))
      case 'week': {
        const weekAgo = new Date(now)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return checkins.filter((c) => new Date(c.checked_in_at) >= weekAgo)
      }
      case 'all':
      default:
        return checkins
    }
  }, [checkins, dateFilter])

  function handleExport() {
    if (!filteredCheckins.length) return

    const rows = filteredCheckins.map((c) => ({
      Member: c.profiles?.full_name ?? 'Unknown',
      Method: formatMethod(c.method),
      'Date & Time': new Date(c.checked_in_at).toLocaleString('id-ID'),
      Notes: c.notes ?? '',
      'Membership ID': c.membership_id ?? '',
    }))

    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `checkin-log-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filterLabel: Record<DateFilter, string> = {
    today: 'Today',
    week: 'This Week',
    all: 'All Time',
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Check-in History"
        description="Complete log of member check-ins"
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={dateFilter}
                onValueChange={(v) => setDateFilter(v as DateFilter)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue>{filterLabel[dateFilter]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>

              {branchData?.isMultiBranch && (branchData.data?.length ?? 0) > 0 && (
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {(branchData.data ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!filteredCheckins.length}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      <div className="text-sm text-muted-foreground">
        {isLoading ? (
          'Loading...'
        ) : (
          <>
            Showing <strong>{filteredCheckins.length}</strong> check-in
            {filteredCheckins.length !== 1 ? 's' : ''} for{' '}
            <strong>{filterLabel[dateFilter].toLowerCase()}</strong>
          </>
        )}
      </div>

      <DataTable
        data={filteredCheckins}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No check-ins found"
        emptyDescription="No check-ins match the selected filter."
        pageSize={25}
      />
    </div>
  )
}
