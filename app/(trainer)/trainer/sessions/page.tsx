'use client'

import { useState, useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { TrainerStatsCard } from '@/components/trainers/trainer-stats-card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTrainerSessions } from '@/lib/hooks/use-trainers'
import { useAuth } from '@/lib/hooks/use-auth'
import type { TrainerSessionWithMember } from '@/lib/actions/trainers'
import { formatCurrency, formatDate } from '@/lib/utils'

const columns: ColumnDef<TrainerSessionWithMember>[] = [
  {
    id: 'member',
    header: 'Member',
    cell: ({ row }) => (
      <span className="font-medium text-sm">{row.original.member?.full_name ?? 'Unknown'}</span>
    ),
  },
  {
    accessorKey: 'scheduled_at',
    header: 'Date & Time',
    cell: ({ getValue }) => {
      const val = getValue() as string
      return (
        <div>
          <p className="text-sm">{formatDate(val)}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(val).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )
    },
  },
  {
    accessorKey: 'duration_minutes',
    header: 'Duration',
    cell: ({ getValue }) => <span className="text-sm">{getValue() as number} min</span>,
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'session_fee',
    header: 'Fee',
    cell: ({ getValue }) => {
      const val = getValue() as number | null
      return <span className="text-sm">{val != null ? formatCurrency(val) : '—'}</span>
    },
  },
  {
    accessorKey: 'commission_earned',
    header: 'Commission',
    cell: ({ getValue }) => {
      const val = getValue() as number | null
      return (
        <span className="text-sm text-green-600">
          {val != null ? formatCurrency(val) : '—'}
        </span>
      )
    },
  },
]

function generateMonthOptions() {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    options.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
    })
  }
  return options
}

export default function TrainerSessionsPage() {
  const { user } = useAuth()
  const monthOptions = useMemo(() => generateMonthOptions(), [])
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value)
  const [selectedStatus, setSelectedStatus] = useState('all')

  const { data: sessions, isLoading } = useTrainerSessions(user?.id ?? '', {
    month: selectedMonth,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
  })

  const filteredSessions = sessions ?? []
  const totalRevenue = filteredSessions.reduce((sum, s) => sum + (s.session_fee ?? 0), 0)
  const totalCommission = filteredSessions.reduce((sum, s) => sum + (s.commission_earned ?? 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader title="PT Sessions" description="Track all your personal training sessions" />

      <TrainerStatsCard
        sessions={filteredSessions.length}
        revenue={totalRevenue}
        commission={totalCommission}
      />

      <div className="flex gap-3">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={filteredSessions}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No sessions found"
        emptyDescription="No sessions match your current filters."
      />
    </div>
  )
}
