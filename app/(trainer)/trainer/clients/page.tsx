'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Eye } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useTrainerActiveMembers } from '@/lib/hooks/use-pt-assignments'
import type { TrainerActiveMember } from '@/lib/actions/pt-assignment.actions'
import { formatDate } from '@/lib/utils'

const columns: ColumnDef<TrainerActiveMember>[] = [
  {
    id: 'member',
    header: 'Member',
    cell: ({ row }) => {
      const m = row.original
      const initials = m.member_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={m.member_avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-sm">{m.member_name}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'package_name',
    header: 'Package',
    cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
  },
  {
    accessorKey: 'pt_sessions_remaining',
    header: 'Sessions Left',
    cell: ({ getValue }) => {
      const v = getValue() as number | null
      if (v == null) return <span className="text-muted-foreground text-sm">—</span>
      return (
        <Badge variant={v <= 3 ? 'destructive' : 'secondary'} className="text-xs">
          {v} left
        </Badge>
      )
    },
  },
  {
    accessorKey: 'pt_sessions_expires_at',
    header: 'Expires',
    cell: ({ getValue }) => {
      const v = getValue() as string | null
      return <span className="text-sm text-muted-foreground">{v ? formatDate(v) : '—'}</span>
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const v = getValue() as string
      return (
        <Badge variant={v === 'grace_period' ? 'secondary' : 'default'} className="capitalize text-xs">
          {v === 'grace_period' ? 'Grace Period' : 'Active'}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/trainer/clients/${row.original.member_id}`}>
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
    ),
  },
]

export default function TrainerClientsPage() {
  const { user } = useAuth()
  const { data: members = [], isLoading } = useTrainerActiveMembers(user?.id ?? '')

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Clients"
        description="Members currently assigned to you for personal training"
      />

      <DataTable
        data={members}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No clients assigned"
        emptyDescription="Members will appear here once an admin assigns them to you."
        pageSize={20}
      />
    </div>
  )
}
