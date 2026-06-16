'use client'

import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useCheckinLog } from '@/lib/hooks/use-checkins'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CheckinWithProfile } from '@/lib/actions/checkins'

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
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
            <AvatarFallback className="text-xs">{getInitials(profile?.full_name)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{profile?.full_name ?? 'Unknown'}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'checked_in_at',
    header: 'Check-in Time',
    cell: ({ getValue }) => {
      const dt = new Date(getValue() as string)
      return (
        <div className="text-sm">
          <p>{dt.toLocaleDateString()}</p>
          <p className="text-xs text-muted-foreground">
            {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )
    },
    sortingFn: 'datetime',
  },
  {
    accessorKey: 'method',
    header: 'Method',
    cell: ({ getValue }) => (
      <Badge variant="outline" className="capitalize text-xs">
        {(getValue() as string) ?? 'qr'}
      </Badge>
    ),
  },
  {
    id: 'override',
    header: 'Override',
    cell: ({ row }) => {
      const override = (row.original as CheckinWithProfile & { staff_override?: boolean | null }).staff_override
      if (override === true) return <Badge variant="secondary" className="text-xs">Allowed</Badge>
      if (override === false) return <Badge variant="destructive" className="text-xs">Denied</Badge>
      return <span className="text-muted-foreground text-sm">—</span>
    },
  },
  {
    accessorKey: 'notes',
    header: 'Notes',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {(row.original as CheckinWithProfile & { notes?: string | null }).notes ?? '—'}
      </span>
    ),
  },
]

export default function BranchManagerCheckinsPage() {
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'all'>('today')
  const { data: checkins, isLoading } = useCheckinLog(100, { dateFilter })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Check-in Log"
        description="Recent member check-ins at your branch"
        action={
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as 'today' | 'week' | 'all')}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <DataTable
        data={checkins ?? []}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No check-ins"
        emptyDescription="No check-ins recorded for this period."
      />
    </div>
  )
}
