'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2, MoreHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Database } from '@/types/database'

type PromoRow = Database['public']['Tables']['promo_codes']['Row']

interface ColumnHandlers {
  onEdit: (row: PromoRow) => void
  onDelete: (id: string) => void
}

export function getPromoColumns(handlers: ColumnHandlers): ColumnDef<PromoRow>[] {
  return [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono font-bold tracking-wide text-sm">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: 'discount_value',
      header: 'Discount',
      cell: ({ row }) => {
        const { discount_type, discount_value } = row.original
        if (discount_type === 'percent') {
          return <span>{discount_value}%</span>
        }
        return <span>{formatCurrency(discount_value, 'IDR')}</span>
      },
    },
    {
      id: 'usage',
      header: 'Usage',
      cell: ({ row }) => {
        const { used_count, max_uses } = row.original
        return (
          <span className="text-sm text-muted-foreground">
            {used_count} / {max_uses != null ? max_uses : '∞'}
          </span>
        )
      },
    },
    {
      accessorKey: 'valid_until',
      header: 'Valid Until',
      cell: ({ row }) => {
        const val = row.original.valid_until
        if (!val) return <span className="text-muted-foreground text-sm">No expiry</span>
        return <span className="text-sm">{formatDate(val)}</span>
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Active',
      cell: ({ row }) => {
        const active = row.original.is_active
        return (
          <Badge variant={active ? 'default' : 'secondary'}>
            {active ? 'Active' : 'Inactive'}
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const promo = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handlers.onEdit(promo)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <ConfirmDialog
                title="Delete Promo Code"
                description={`Are you sure you want to delete the promo code "${promo.code}"? This action cannot be undone.`}
                onConfirm={() => handlers.onDelete(promo.id)}
                variant="destructive"
              >
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </ConfirmDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
