'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useTogglePackageActive, useDeletePackage } from '@/lib/hooks/use-packages'
import { cn, formatCurrency } from '@/lib/utils'
import type { Database } from '@/types/database'

type PackageRow = Database['public']['Tables']['membership_packages']['Row']

const typeConfig: Record<
  PackageRow['type'],
  { label: string; className: string }
> = {
  monthly: { label: 'Monthly', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  annual: { label: 'Annual', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  sessions: { label: 'Sessions', className: 'bg-green-100 text-green-800 border-green-200' },
  day_pass: { label: 'Day Pass', className: 'bg-orange-100 text-orange-800 border-orange-200' },
}

interface PackageCardProps {
  pkg: PackageRow
  onEdit: () => void
  onDelete: () => void
}

export function PackageCard({ pkg, onEdit, onDelete }: PackageCardProps) {
  const toggleMutation = useTogglePackageActive()
  const deleteMutation = useDeletePackage()

  const typeInfo = typeConfig[pkg.type]

  return (
    <Card className={cn('flex flex-col', !pkg.is_active && 'opacity-50')}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{pkg.name}</CardTitle>
          <Badge
            variant="outline"
            className={cn('shrink-0 text-xs font-medium', typeInfo.className)}
          >
            {typeInfo.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <p className="text-2xl font-bold tracking-tight">
          {formatCurrency(pkg.price, pkg.currency)}
        </p>

        <div className="space-y-1 text-sm text-muted-foreground">
          {pkg.duration_days != null && (
            <p>{pkg.duration_days} days</p>
          )}
          {pkg.session_credits != null && pkg.session_credits > 0 && (
            <p>{pkg.session_credits} session credits</p>
          )}
          {pkg.allow_freeze && (
            <Badge variant="secondary" className="text-xs">
              Freeze allowed
              {pkg.max_freeze_days != null ? ` (up to ${pkg.max_freeze_days} days)` : ''}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2 pt-4 border-t">
        <div className="flex items-center gap-2">
          <Switch
            checked={pkg.is_active}
            onCheckedChange={(checked) =>
              toggleMutation.mutate({ id: pkg.id, isActive: checked })
            }
            disabled={toggleMutation.isPending}
            aria-label="Toggle active"
          />
          <span className="text-xs text-muted-foreground">
            {pkg.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit package">
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            title="Delete Package"
            description={`Are you sure you want to delete "${pkg.name}"? This action cannot be undone.`}
            onConfirm={onDelete}
            isPending={deleteMutation.isPending}
            variant="destructive"
          >
            <Button variant="ghost" size="icon" aria-label="Delete package">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </ConfirmDialog>
        </div>
      </CardFooter>
    </Card>
  )
}
