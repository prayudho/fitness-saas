'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Snowflake, XCircle, Eye, Dumbbell } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate } from '@/lib/utils'

export type MembershipSummary = {
  id: string
  status: string
  expires_at: string | null
  package_category: string | null
  pt_sessions_remaining: number | null
  pt_sessions_status: string | null
  membership_packages: { name: string } | null
}

export type MemberRow = {
  id: string
  full_name: string | null
  phone: string | null
  created_at: string
  memberships: MembershipSummary[]
}

interface MemberColumnHandlers {
  onEdit: (id: string) => void
  onFreeze: (m: MemberRow) => void
  onCancel: (m: MemberRow) => void
}

export function getMemberColumns(handlers: MemberColumnHandlers): ColumnDef<MemberRow>[] {
  return [
    {
      id: 'member',
      header: 'Member',
      cell: ({ row }) => {
        const member = row.original
        const initials = (member.full_name ?? 'U')
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)

        return (
          <Link
            href={`/admin/members/${member.id}`}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={undefined} alt={member.full_name ?? ''} />
              <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm leading-none hover:underline">{member.full_name ?? '—'}</p>
              {member.phone && (
                <p className="text-xs text-muted-foreground mt-0.5">{member.phone}</p>
              )}
            </div>
          </Link>
        )
      },
    },
    {
      id: 'membership',
      header: 'Membership',
      cell: ({ row }) => {
        const activeMembership = row.original.memberships.find(
          (m) => m.status === 'active' || m.status === 'frozen'
        ) ?? row.original.memberships[0]

        if (!activeMembership) {
          return <span className="text-sm text-muted-foreground">No package</span>
        }

        return (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {activeMembership.membership_packages?.name ?? 'Unknown Package'}
            </span>
            <StatusBadge status={activeMembership.status} />
          </div>
        )
      },
    },
    {
      id: 'expires',
      header: 'Expires',
      cell: ({ row }) => {
        const activeMembership = row.original.memberships.find(
          (m) => m.status === 'active' || m.status === 'frozen'
        ) ?? row.original.memberships[0]

        if (!activeMembership?.expires_at) {
          return <span className="text-sm text-muted-foreground">—</span>
        }

        return <span className="text-sm">{formatDate(activeMembership.expires_at)}</span>
      },
    },
    {
      id: 'pt_sessions',
      header: 'PT Sessions',
      cell: ({ row }) => {
        const ptMembership = row.original.memberships.find(
          (m) => m.package_category === 'pt_sessions' || m.package_category === 'bundled'
        )
        if (!ptMembership) {
          return <span className="text-sm text-muted-foreground">—</span>
        }
        const remaining = ptMembership.pt_sessions_remaining
        const ptStatus = ptMembership.pt_sessions_status ?? 'active'
        return (
          <div className="flex flex-col gap-1">
            {remaining !== null && (
              <div className="flex items-center gap-1.5">
                <Dumbbell className="h-3 w-3 text-purple-600" />
                <span className="text-sm font-medium">{remaining} left</span>
              </div>
            )}
            <Badge
              variant={
                ptStatus === 'expired' || ptStatus === 'exhausted'
                  ? 'destructive'
                  : ptStatus === 'active' && remaining !== null && remaining <= 3
                  ? 'secondary'
                  : 'outline'
              }
              className="text-xs w-fit capitalize"
            >
              {ptStatus === 'exhausted' ? 'Exhausted' : ptStatus === 'expired' ? 'Expired' : 'Active'}
            </Badge>
          </div>
        )
      },
    },
    {
      id: 'joined',
      header: 'Joined',
      cell: ({ row }) => (
        <span className="text-sm">{formatDate(row.original.created_at)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const member = row.original
        const activeMembership = member.memberships.find(
          (m) => m.status === 'active' || m.status === 'frozen'
        ) ?? member.memberships[0]
        const isFrozen = activeMembership?.status === 'frozen'

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/members/${member.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handlers.onEdit(member.id)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {activeMembership && (
                <DropdownMenuItem onClick={() => handlers.onFreeze(member)}>
                  <Snowflake className="mr-2 h-4 w-4" />
                  {isFrozen ? 'Unfreeze' : 'Freeze'}
                </DropdownMenuItem>
              )}
              {activeMembership && (
                <DropdownMenuItem
                  onClick={() => handlers.onCancel(member)}
                  className="text-destructive focus:text-destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
