'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, UserPlus, Eye, Pencil } from 'lucide-react'
import { useTrainers } from '@/lib/hooks/use-trainers'
import { useBranchList } from '@/lib/hooks/use-branches'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'
import type { TrainerWithProfile } from '@/lib/actions/trainers'
import { formatCurrency } from '@/lib/utils'

function TrainerActions({ trainer }: { trainer: TrainerWithProfile }) {
  const router = useRouter()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/admin/trainers/${trainer.id}`)}>
          <Eye className="mr-2 h-4 w-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/admin/trainers/${trainer.id}?tab=profile`)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
      const visible = specialties.slice(0, 2)
      const extra = specialties.length - 2
      return (
        <div className="flex flex-wrap gap-1">
          {visible.map((s) => (
            <Badge key={s} variant="secondary" className="text-xs">
              {s}
            </Badge>
          ))}
          {extra > 0 && (
            <Badge variant="outline" className="text-xs">
              +{extra} more
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'sessions_this_month',
    header: 'Sessions This Month',
    cell: ({ getValue }) => (
      <span className="font-medium">{getValue() as number}</span>
    ),
  },
  {
    accessorKey: 'active_members_count',
    header: 'Active Members',
    cell: ({ getValue }) => {
      const v = getValue() as number
      return (
        <div className="flex items-center gap-1">
          <span className="font-medium">{v}</span>
          {v > 0 && <Badge variant="secondary" className="text-xs px-1.5 py-0">{v}</Badge>}
        </div>
      )
    },
  },
  {
    accessorKey: 'pending_commission_amount',
    header: 'Pending Commission',
    cell: ({ getValue }) => {
      const v = getValue() as number
      return (
        <span className={v > 0 ? 'text-sm font-medium text-amber-600' : 'text-sm text-muted-foreground'}>
          {v > 0 ? formatCurrency(v) : '—'}
        </span>
      )
    },
  },
  {
    id: 'commission',
    header: 'Commission Model',
    cell: ({ row }) => {
      const model = row.original.commission_model
      const value = row.original.commission_value
      const label =
        model === 'percent'
          ? `${value}%`
          : model === 'per_session'
          ? `${formatCurrency(value)} / session`
          : `${formatCurrency(value)} flat`
      return (
        <div>
          <Badge variant="outline" className="capitalize text-xs">
            {model}
          </Badge>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      )
    },
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <StatusBadge status={row.original.is_active ? 'active' : 'inactive'} />
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => <TrainerActions trainer={row.original} />,
  },
]

export default function TrainersPage() {
  const [branchId, setBranchId] = useState('all')
  const { data: branchData } = useBranchList()
  const { data: trainers, isLoading } = useTrainers({
    branchId: branchId !== 'all' ? branchId : undefined,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trainers"
        description="Manage your personal trainers"
        action={
          <div className="flex gap-2 items-center flex-wrap">
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
            <Button asChild>
              <Link href="/admin/trainers/new">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Trainer
              </Link>
            </Button>
          </div>
        }
      />

      <DataTable
        data={trainers ?? []}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No trainers yet"
        emptyDescription="Add your first trainer to get started."
        pageSize={20}
      />
    </div>
  )
}
