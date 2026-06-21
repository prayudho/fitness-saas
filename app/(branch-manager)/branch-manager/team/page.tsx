'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { UserPlus, Pencil, UserX, UserCheck } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

import { useDebounce } from '@/lib/hooks/use-debounce'
import {
  useTeamMembers,
  useDeactivateTeamMember,
  useReactivateTeamMember,
  type TeamMember,
} from '@/lib/hooks/use-team'
import { useBranchList } from '@/lib/hooks/use-branches'
import { useQuery } from '@tanstack/react-query'
import { getCurrentBranchId } from '@/lib/actions/branches.actions'

function getRoleBadgeClass(role: string): string {
  switch (role) {
    case 'staff':       return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'trainer':     return 'bg-green-100 text-green-700 border-green-200'
    case 'support':     return 'bg-purple-100 text-purple-700 border-purple-200'
    default:            return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

function RoleBadge({ role, customRoleName }: { role: string; customRoleName: string | null }) {
  const label = customRoleName ? `Custom: ${customRoleName}` : role
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${getRoleBadgeClass(role)}`}>
      {label}
    </span>
  )
}

function TeamRowActions({ member }: { member: TeamMember }) {
  const router = useRouter()
  const deactivate = useDeactivateTeamMember()
  const reactivate = useReactivateTeamMember()

  const handleDeactivate = useCallback(async () => {
    await deactivate.mutateAsync(member.id)
  }, [deactivate, member.id])

  const handleReactivate = useCallback(async () => {
    await reactivate.mutateAsync(member.id)
  }, [reactivate, member.id])

  const isAdmin = member.role === 'admin'

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => router.push(`/branch-manager/team/${member.id}`)}
      >
        <Pencil className="h-4 w-4" />
        <span className="sr-only">Edit</span>
      </Button>
      {!isAdmin && (
        member.is_active ? (
          <ConfirmDialog
            title="Deactivate Team Member"
            description={`Deactivate ${member.full_name}? This will revoke their access immediately.`}
            onConfirm={handleDeactivate}
            isPending={deactivate.isPending}
            variant="destructive"
          >
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
              <UserX className="h-4 w-4" />
              <span className="sr-only">Deactivate</span>
            </Button>
          </ConfirmDialog>
        ) : (
          <ConfirmDialog
            title="Reactivate Team Member"
            description={`Reactivate ${member.full_name}? They will regain access to the platform.`}
            onConfirm={handleReactivate}
            isPending={reactivate.isPending}
          >
            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-600">
              <UserCheck className="h-4 w-4" />
              <span className="sr-only">Reactivate</span>
            </Button>
          </ConfirmDialog>
        )
      )}
    </div>
  )
}

function getColumns(branchMap: Record<string, string>): ColumnDef<TeamMember>[] {
  const hasBranches = Object.keys(branchMap).length > 0
  const cols: ColumnDef<TeamMember>[] = [
    {
      id: 'member',
      header: 'Member',
      cell: ({ row }) => {
        const m = row.original
        const initials = m.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{m.full_name}</p>
              {m.phone && <p className="text-xs text-muted-foreground">{m.phone}</p>}
            </div>
          </div>
        )
      },
    },
    {
      id: 'role',
      header: 'Role',
      cell: ({ row }) => <RoleBadge role={row.original.role} customRoleName={row.original.custom_role_name} />,
    },
  ]

  if (hasBranches) {
    cols.push({
      id: 'home_branch',
      header: 'Home Branch',
      cell: ({ row }) => {
        const m = row.original
        const branchId = m.branch_id ?? m.home_branch_id
        const name = branchId ? branchMap[branchId] : null
        return name
          ? <Badge variant="outline" className="text-xs font-normal">{name}</Badge>
          : <span className="text-muted-foreground text-xs">—</span>
      },
    })
  }

  cols.push(
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.is_active ? 'active' : 'inactive'} />,
    },
    {
      id: 'date_added',
      header: 'Date Added',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.original.created_at), 'dd MMM yyyy')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => <TeamRowActions member={row.original} />,
    }
  )
  return cols
}

function TeamTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={`h-${i}`} className="h-8" />)}
      </div>
      {Array.from({ length: 6 }).map((_, row) => (
        <div key={`r-${row}`} className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, col) => <Skeleton key={`c-${row}-${col}`} className="h-10" />)}
        </div>
      ))}
    </div>
  )
}

export default function BranchManagerTeamPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const debouncedSearch = useDebounce(search, 300)
  const { data: branchData } = useBranchList()
  const branches = branchData?.data ?? []

  const { data: branchCtx } = useQuery({
    queryKey: ['branch-context'],
    queryFn: () => getCurrentBranchId(),
    staleTime: Infinity,
  })
  const branchId = branchCtx?.branchId ?? undefined

  const branchMap = useMemo(
    () => Object.fromEntries(branches.map((b) => [b.id, b.name])),
    [branches]
  )
  const columns = useMemo(() => getColumns(branchMap), [branchMap])

  const isActiveFilter = statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined

  const { data, isLoading, isError } = useTeamMembers(undefined, {
    search: debouncedSearch || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
    isActive: isActiveFilter,
    branchId,
  })

  const members = data?.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Manage your branch team members"
        action={
          <Button asChild>
            <Link href="/branch-manager/team/new">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Team Member
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="trainer">Trainer</SelectItem>
            <SelectItem value="support">Support</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TeamTableSkeleton />
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
          Failed to load team members.
        </div>
      ) : (
        <DataTable
          data={members}
          columns={columns}
          isLoading={false}
          emptyTitle="No team members yet"
          emptyDescription="Add your first team member."
          pageSize={25}
        />
      )}
    </div>
  )
}
