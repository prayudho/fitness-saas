'use client'

import { MapPin, Phone, Users, CheckCheck, TrendingUp, MoreHorizontal, Pencil, Power } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency } from '@/lib/utils'
import type { BranchWithStats } from '@/lib/actions/branches.actions'

interface BranchCardProps {
  branch: BranchWithStats
  onEdit: (branch: BranchWithStats) => void
  onToggleActive: (branch: BranchWithStats) => void
}

export function BranchCard({ branch, onEdit, onToggleActive }: BranchCardProps) {
  return (
    <Card className="relative flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base leading-tight truncate">{branch.name}</h3>
              <Badge variant={branch.is_active ? 'default' : 'secondary'} className="shrink-0 text-xs">
                {branch.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {branch.address && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{branch.address}</span>
              </p>
            )}

            {branch.phone && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" />
                <span>{branch.phone}</span>
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Branch options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(branch)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onToggleActive(branch)}
                className={branch.is_active ? 'text-destructive focus:text-destructive' : ''}
              >
                <Power className="mr-2 h-4 w-4" />
                {branch.is_active ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0 mt-auto">
        <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/50 p-3">
          <div className="flex flex-col items-center gap-0.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-lg font-semibold leading-tight">{branch.active_members}</span>
            <span className="text-[10px] text-muted-foreground text-center">Active Members</span>
          </div>

          <div className="flex flex-col items-center gap-0.5 border-x">
            <CheckCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-lg font-semibold leading-tight">{branch.checkins_today}</span>
            <span className="text-[10px] text-muted-foreground text-center">Today's Check-ins</span>
          </div>

          <div className="flex flex-col items-center gap-0.5">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold leading-tight">
              {formatCurrency(branch.revenue_this_month)}
            </span>
            <span className="text-[10px] text-muted-foreground text-center">Revenue MTD</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
