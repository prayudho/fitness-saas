'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Calendar, Phone, User } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useTrainerSessions } from '@/lib/hooks/use-trainers'
import type { TrainerSessionWithMember } from '@/lib/actions/trainers'
import { formatCurrency, formatDate } from '@/lib/utils'

const sessionColumns: ColumnDef<TrainerSessionWithMember>[] = [
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
      const v = getValue() as number | null
      return <span className="text-sm">{v != null ? formatCurrency(v) : '—'}</span>
    },
  },
  {
    accessorKey: 'notes',
    header: 'Notes',
    cell: ({ getValue }) => {
      const v = getValue() as string | null
      return <span className="text-sm text-muted-foreground">{v ?? '—'}</span>
    },
  },
]

interface PageProps {
  params: { id: string }
}

export default function TrainerClientDetailPage({ params }: PageProps) {
  const { user } = useAuth()
  const { data: sessions = [], isLoading } = useTrainerSessions(user?.id ?? '', {})

  const memberSessions = sessions.filter((s) => s.member_id === params.id)
  const member = memberSessions[0]?.member

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const name = member?.full_name ?? 'Unknown Member'
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const completed = memberSessions.filter((s) => s.status === 'completed').length
  const scheduled = memberSessions.filter((s) => s.status === 'scheduled').length

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/trainer/clients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          My Clients
        </Link>
      </div>

      <PageHeader
        title={name}
        description="Training history and upcoming sessions"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DataTable
            data={memberSessions}
            columns={sessionColumns}
            isLoading={false}
            emptyTitle="No sessions yet"
            emptyDescription="Sessions with this member will appear here."
          />
        </div>

        <div>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-3 pb-4 border-b">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-xl font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <p className="font-semibold">{name}</p>
              </div>

              <div className="pt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total sessions</span>
                  <span className="font-medium">{memberSessions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-medium text-green-600">{completed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Upcoming</span>
                  <span className="font-medium">{scheduled}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
