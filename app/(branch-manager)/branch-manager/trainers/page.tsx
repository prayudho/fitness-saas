'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useTrainers } from '@/lib/hooks/use-trainers'
import type { TrainerWithProfile } from '@/lib/actions/trainers'

const columns: ColumnDef<TrainerWithProfile>[] = [
  {
    id: 'trainer',
    header: 'Trainer',
    cell: ({ row }) => {
      const trainer = row.original
      const name = trainer.profiles?.full_name ?? 'Unknown'
      const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={trainer.profiles?.avatar_url ?? undefined} alt={name} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{name}</p>
            {trainer.profiles?.phone && (
              <p className="text-xs text-muted-foreground">{trainer.profiles.phone}</p>
            )}
          </div>
        </div>
      )
    },
  },
  {
    id: 'specialties',
    header: 'Specialties',
    cell: ({ row }) => {
      const specialties = row.original.specialties ?? []
      if (!specialties.length) return <span className="text-muted-foreground text-sm">—</span>
      return (
        <div className="flex flex-wrap gap-1">
          {specialties.slice(0, 2).map((s) => (
            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
          ))}
          {specialties.length > 2 && (
            <Badge variant="outline" className="text-xs">+{specialties.length - 2} more</Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'sessions_this_month',
    header: 'Sessions (MTD)',
    cell: ({ getValue }) => <span className="font-medium">{getValue() as number}</span>,
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.is_active ? 'active' : 'inactive'} />,
  },
]

export default function BranchManagerTrainersPage() {
  const { data: trainers, isLoading } = useTrainers()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trainers"
        description="Personal trainers at your branch (read-only)"
      />
      <DataTable
        data={trainers ?? []}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No trainers found"
        emptyDescription="No trainers are assigned to your branch yet."
      />
    </div>
  )
}
