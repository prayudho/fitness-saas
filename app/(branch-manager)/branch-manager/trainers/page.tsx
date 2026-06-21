'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { UserPlus, Eye } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useTrainers } from '@/lib/hooks/use-trainers'
import { getCurrentBranchId } from '@/lib/actions/branches.actions'
import type { TrainerWithProfile } from '@/lib/actions/trainers'

function TrainerActions({ trainer }: { trainer: TrainerWithProfile }) {
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => router.push(`/branch-manager/trainers/${trainer.id}`)}
    >
      <Eye className="h-4 w-4" />
      <span className="sr-only">View</span>
    </Button>
  )
}

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
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => <TrainerActions trainer={row.original} />,
  },
]

export default function BranchManagerTrainersPage() {
  const { data: branchCtx } = useQuery({
    queryKey: ['branch-context'],
    queryFn: () => getCurrentBranchId(),
    staleTime: Infinity,
  })
  const branchId = branchCtx?.branchId ?? undefined

  const { data: trainers, isLoading } = useTrainers(branchId ? { branchId } : undefined)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trainers"
        description="Personal trainers at your branch"
        action={
          <Button asChild>
            <Link href="/branch-manager/trainers/new">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Trainer
            </Link>
          </Button>
        }
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
