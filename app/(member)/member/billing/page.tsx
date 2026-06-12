'use client'

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { PayMidtransButton } from '@/components/billing/pay-midtrans-button'
import { useMemberInvoices } from '@/lib/hooks/use-billing'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { InvoiceWithDetails } from '@/lib/actions/billing'

function getMemberInvoiceColumns(): ColumnDef<InvoiceWithDetails>[] {
  return [
    {
      id: 'package',
      header: 'Package',
      accessorFn: (row) => row.memberships?.membership_packages?.name ?? '-',
      cell: ({ row }) => (
        <span className="font-medium">
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
      header: 'Date',
      cell: ({ row }) =>
        row.original.created_at ? formatDate(row.original.created_at) : '-',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const invoice = row.original
        if (invoice.status === 'pending') {
          return <PayMidtransButton invoiceId={invoice.id} label="Pay Now" />
        }
        if (invoice.status === 'paid') {
          return (
            <span className="text-xs text-muted-foreground italic">
              Receipt available soon
            </span>
          )
        }
        return null
      },
    },
  ]
}

export default function MemberBillingPage() {
  const { data: invoices, isLoading } = useMemberInvoices()

  const invoiceList = invoices ?? []

  // Stats
  const pendingInvoices = invoiceList.filter((inv) => inv.status === 'pending')
  const amountDue = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0)

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const paidThisMonth = invoiceList
    .filter(
      (inv) => inv.status === 'paid' && inv.paid_at && new Date(inv.paid_at) >= thisMonthStart
    )
    .reduce((sum, inv) => sum + inv.amount, 0)

  // Use the first invoice's currency as default display currency
  const displayCurrency = invoiceList[0]?.currency ?? 'IDR'

  const columns = getMemberInvoiceColumns()

  return (
    <div className="space-y-6">
      <PageHeader title="My Invoices" description="View your payment history and outstanding invoices" />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Amount Due</p>
          <p className="mt-2 text-3xl font-bold text-orange-600">
            {formatCurrency(amountDue, displayCurrency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {pendingInvoices.length} pending invoice{pendingInvoices.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Paid This Month</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {formatCurrency(paidThisMonth, displayCurrency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Total payments this month</p>
        </div>
      </div>

      {/* Invoice Table */}
      <DataTable
        data={invoiceList}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No invoices yet"
        emptyDescription="Your invoices will appear here once a membership is assigned."
      />
    </div>
  )
}
