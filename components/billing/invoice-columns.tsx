'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { InvoiceWithDetails } from '@/lib/actions/billing'

export type { InvoiceWithDetails }

interface InvoiceColumnHandlers {
  onRecordPayment?: (invoice: InvoiceWithDetails) => void
  onRefund?: (id: string) => void
  onPay?: (id: string) => void
}

export function getInvoiceColumns(
  handlers: InvoiceColumnHandlers
): ColumnDef<InvoiceWithDetails>[] {
  return [
    {
      accessorKey: 'id',
      header: 'Invoice #',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          #{row.original.id.slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      id: 'member',
      header: 'Member',
      accessorFn: (row) => row.profiles?.full_name ?? 'Unknown',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.profiles?.full_name ?? 'Unknown'}</span>
      ),
    },
    {
      id: 'package',
      header: 'Package',
      accessorFn: (row) => row.memberships?.membership_packages?.name ?? '-',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.memberships?.membership_packages?.name ?? '-'}
        </span>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-semibold">
          {formatCurrency(row.original.amount, row.original.currency ?? 'IDR')}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status ?? 'pending'} />,
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) =>
        row.original.created_at ? formatDate(row.original.created_at) : '-',
    },
    {
      accessorKey: 'paid_at',
      header: 'Paid At',
      cell: ({ row }) =>
        row.original.paid_at ? formatDate(row.original.paid_at) : '-',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const invoice = row.original
        const status = invoice.status

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {status === 'pending' && handlers.onRecordPayment && (
                <DropdownMenuItem onClick={() => handlers.onRecordPayment!(invoice)}>
                  Record Payment
                </DropdownMenuItem>
              )}
              {status === 'pending' && handlers.onPay && (
                <DropdownMenuItem onClick={() => handlers.onPay!(invoice.id)}>
                  Pay via Midtrans
                </DropdownMenuItem>
              )}
              {status === 'paid' && handlers.onRefund && (
                <DropdownMenuItem
                  onClick={() => handlers.onRefund!(invoice.id)}
                  className="text-destructive focus:text-destructive"
                >
                  Refund
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
