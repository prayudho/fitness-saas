'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useMembers } from '@/lib/hooks/use-members'
import type { ProfileWithMembership } from '@/lib/actions/members'

const columns: ColumnDef<ProfileWithMembership>[] = [
  {
    id: 'member',
    header: 'Member',
    cell: ({ row }) => {
      const name = row.original.full_name ?? 'Unknown'
      const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.original.avatar_url ?? undefined} alt={name} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{name}</p>
            <p className="text-xs text-muted-foreground">{row.original.phone ?? '—'}</p>
          </div>
        </div>
      )
    },
  },
  {
    id: 'status',
    header: 'Membership Status',
    cell: ({ row }) => {
      const membership = row.original.memberships?.[0]
      if (!membership) return <StatusBadge status="inactive" />
      return <StatusBadge status={membership.gym_access_status ?? 'inactive'} />
    },
  },
  {
    id: 'expires',
    header: 'Expires',
    cell: ({ row }) => {
      const membership = row.original.memberships?.[0]
      const v = membership?.gym_access_expires_at
      if (!v) return <span className="text-muted-foreground text-sm">—</span>
      return <span className="text-sm">{new Date(v).toLocaleDateString()}</span>
    },
  },
]

export default function BranchManagerMembersPage() {
  const { data: membersData, isLoading } = useMembers({})

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="Members at your branch"
      />
      <DataTable
        data={(membersData?.data ?? []) as ProfileWithMembership[]}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No members found"
        emptyDescription="No members are assigned to your branch yet."
      />
    </div>
  )
}
