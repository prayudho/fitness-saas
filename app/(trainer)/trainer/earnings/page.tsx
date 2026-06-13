'use client'

import { useState, useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/lib/hooks/use-auth'
import { useTrainerPayouts } from '@/lib/hooks/use-pt-assignments'
import type { PTCommissionPayoutRow } from '@/lib/actions/pt-assignment.actions'
import { formatCurrency, formatDate } from '@/lib/utils'

const STATUS_COLOR: Record<string, 'default' | 'secondary' | 'outline'> = {
  paid: 'default',
  approved: 'secondary',
  pending: 'outline',
}

const columns: ColumnDef<PTCommissionPayoutRow>[] = [
  {
    accessorKey: 'created_at',
    header: 'Date',
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">{formatDate(getValue() as string)}</span>
    ),
  },
  {
    accessorKey: 'payout_type',
    header: 'Type',
    cell: ({ getValue }) => (
      <Badge variant="outline" className="capitalize text-xs">{getValue() as string}</Badge>
    ),
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ getValue }) => (
      <span className="text-sm font-medium text-green-600">{formatCurrency(getValue() as number)}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const v = getValue() as string
      return <Badge variant={STATUS_COLOR[v] ?? 'outline'} className="capitalize text-xs">{v}</Badge>
    },
  },
]

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}

export default function TrainerEarningsPage() {
  const { user } = useAuth()
  const { data: allPayouts = [], isLoading } = useTrainerPayouts(user?.id ?? '')

  const sessionPayouts = useMemo(() => allPayouts.filter((p) => p.payout_type === 'session'), [allPayouts])
  const salesPayouts   = useMemo(() => allPayouts.filter((p) => p.payout_type === 'sales'),   [allPayouts])

  const totalPaid    = useMemo(() => allPayouts.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0), [allPayouts])
  const totalPending = useMemo(() => allPayouts.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0), [allPayouts])
  const totalApproved = useMemo(() => allPayouts.filter((p) => p.status === 'approved').reduce((s, p) => s + p.amount, 0), [allPayouts])

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Earnings"
        description="Session commissions and sales commissions"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Paid" value={formatCurrency(totalPaid)} />
        <StatCard label="Approved (Awaiting Payment)" value={formatCurrency(totalApproved)} />
        <StatCard label="Pending Approval" value={formatCurrency(totalPending)} />
      </div>

      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions">
            Session Commissions
            <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
              {sessionPayouts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="sales">
            Sales Commissions
            <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
              {salesPayouts.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <DataTable
            data={sessionPayouts}
            columns={columns}
            isLoading={isLoading}
            emptyTitle="No session earnings yet"
            emptyDescription="You'll earn session commissions once sessions are completed and approved."
          />
        </TabsContent>

        <TabsContent value="sales">
          <DataTable
            data={salesPayouts}
            columns={columns}
            isLoading={isLoading}
            emptyTitle="No sales commissions yet"
            emptyDescription="You'll earn a sales commission when you're assigned to a new member."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
