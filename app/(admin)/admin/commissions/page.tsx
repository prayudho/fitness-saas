'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle, Pencil } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/browser'
import {
  listCommissions,
  approveCommission,
  editCommissionSalesPIC,
} from '@/lib/actions/pt-assignment.actions'
import type { CommissionListItem } from '@/lib/actions/pt-assignment.actions'
import { formatCurrency, formatDate } from '@/lib/utils'

// ─── Status badge ─────────────────────────────────────────────────────────────

function CommissionStatusBadge({ status }: { status: string }) {
  if (status === 'approved') return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>
  if (status === 'paid')     return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Paid</Badge>
  return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CommissionsPage() {
  const qc = useQueryClient()
  const [editingPayout, setEditingPayout]     = useState<CommissionListItem | null>(null)
  const [newSalesPersonId, setNewSalesPersonId] = useState('')
  const [salesPeople, setSalesPeople] = useState<{ id: string; name: string }[]>([])

  // ── Fetch eligible sales people (staff / trainer / admin) ──────────────────
  useEffect(() => {
    async function fetchSalesPeople() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('brand_id')
        .eq('id', user.id)
        .maybeSingle()
      if (!profileRow?.brand_id) return
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('brand_id', profileRow.brand_id)
        .in('role', ['staff', 'trainer', 'admin'])
        .order('full_name')
      setSalesPeople((data ?? []).map((p) => ({ id: p.id, name: p.full_name ?? 'Unknown' })))
    }
    fetchSalesPeople()
  }, [])

  // ── Queries ────────────────────────────────────────────────────────────────
  const {
    data: sessionCommissions = [],
    isLoading: sessionLoading,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ['commissions', 'session'],
    queryFn: async () => {
      const result = await listCommissions({ type: 'session' })
      if (result.error) throw new Error(result.error)
      return result.data ?? []
    },
  })

  const {
    data: salesCommissions = [],
    isLoading: salesLoading,
    refetch: refetchSales,
  } = useQuery({
    queryKey: ['commissions', 'sales'],
    queryFn: async () => {
      const result = await listCommissions({ type: 'sales' })
      if (result.error) throw new Error(result.error)
      return result.data ?? []
    },
  })

  // ── Approve mutation ───────────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await approveCommission(id)
      if (r.error) throw new Error(r.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commissions'] })
      toast.success('Commission approved')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // ── Approve all pending mutation ───────────────────────────────────────────
  const approveAllMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(ids.map((id) => approveCommission(id)))
      const firstError = results.find((r) => r.error)
      if (firstError?.error) throw new Error(firstError.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commissions'] })
      toast.success('All pending commissions approved')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // ── Edit PIC mutation ──────────────────────────────────────────────────────
  const editPICMutation = useMutation({
    mutationFn: async ({ payoutId, personId }: { payoutId: string; personId: string }) => {
      const r = await editCommissionSalesPIC(payoutId, personId)
      if (r.error) throw new Error(r.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commissions'] })
      toast.success('Sales person updated')
      setEditingPayout(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // ── Column definitions ─────────────────────────────────────────────────────
  const sessionColumns: ColumnDef<CommissionListItem>[] = [
    {
      id: 'trainer',
      header: 'Trainer',
      accessorKey: 'trainer_name',
      cell: ({ row }) => <span className="font-medium">{row.original.trainer_name ?? '—'}</span>,
    },
    {
      id: 'member',
      header: 'Member',
      accessorKey: 'member_name',
      cell: ({ row }) => row.original.member_name ?? '—',
    },
    {
      id: 'session_date',
      header: 'Session Date',
      accessorKey: 'session_date',
      cell: ({ row }) =>
        row.original.session_date ? formatDate(row.original.session_date) : '—',
    },
    {
      id: 'amount',
      header: 'Amount',
      accessorKey: 'amount',
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => <CommissionStatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const item = row.original
        if (item.status !== 'pending') return null
        return (
          <Button
            size="sm"
            variant="outline"
            disabled={approveMutation.isPending}
            onClick={() => approveMutation.mutate(item.id)}
          >
            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
            Approve
          </Button>
        )
      },
    },
  ]

  const salesColumns: ColumnDef<CommissionListItem>[] = [
    {
      id: 'sold_by',
      header: 'Sold By',
      accessorKey: 'sales_person_name',
      cell: ({ row }) => <span className="font-medium">{row.original.sales_person_name ?? '—'}</span>,
    },
    {
      id: 'member',
      header: 'Member',
      accessorKey: 'member_name',
      cell: ({ row }) => row.original.member_name ?? '—',
    },
    {
      id: 'package',
      header: 'Package',
      accessorKey: 'package_name',
      cell: ({ row }) => row.original.package_name ?? '—',
    },
    {
      id: 'amount',
      header: 'Amount',
      accessorKey: 'amount',
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => <CommissionStatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const item = row.original
        if (item.status !== 'pending') return null
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={approveMutation.isPending}
              onClick={() => approveMutation.mutate(item.id)}
            >
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditingPayout(item)
                setNewSalesPersonId(item.sales_person_id ?? '')
              }}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit Sold By
            </Button>
          </div>
        )
      },
    },
  ]

  const pendingSessionIds = sessionCommissions
    .filter((c) => c.status === 'pending')
    .map((c) => c.id)

  const pendingSalesIds = salesCommissions
    .filter((c) => c.status === 'pending')
    .map((c) => c.id)

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Commissions"
        description="Review and approve trainer and staff commissions."
      />

      <Tabs defaultValue="session">
        <TabsList>
          <TabsTrigger value="session">Session Commissions</TabsTrigger>
          <TabsTrigger value="sales">Sales Commissions</TabsTrigger>
        </TabsList>

        {/* ── Session tab ─────────────────────────────────────────────────── */}
        <TabsContent value="session" className="mt-4 space-y-3">
          {pendingSessionIds.length > 0 && (
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={approveAllMutation.isPending}
                onClick={() => approveAllMutation.mutate(pendingSessionIds)}
              >
                <CheckCircle className="mr-1.5 h-4 w-4" />
                Approve All Pending ({pendingSessionIds.length})
              </Button>
            </div>
          )}
          <DataTable
            columns={sessionColumns}
            data={sessionCommissions}
            isLoading={sessionLoading}
            searchKey="trainer_name"
            searchPlaceholder="Search by trainer…"
          />
        </TabsContent>

        {/* ── Sales tab ───────────────────────────────────────────────────── */}
        <TabsContent value="sales" className="mt-4 space-y-3">
          {pendingSalesIds.length > 0 && (
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={approveAllMutation.isPending}
                onClick={() => approveAllMutation.mutate(pendingSalesIds)}
              >
                <CheckCircle className="mr-1.5 h-4 w-4" />
                Approve All Pending ({pendingSalesIds.length})
              </Button>
            </div>
          )}
          <DataTable
            columns={salesColumns}
            data={salesCommissions}
            isLoading={salesLoading}
            searchKey="sales_person_name"
            searchPlaceholder="Search by person…"
          />
        </TabsContent>
      </Tabs>

      {/* ── Edit Sold By dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!editingPayout} onOpenChange={(open) => { if (!open) setEditingPayout(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Sold By</DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">
              Change the person who earns the sales commission for this package.
              This can only be changed before the commission is approved.
            </p>
            <Select value={newSalesPersonId} onValueChange={setNewSalesPersonId}>
              <SelectTrigger>
                <SelectValue placeholder="Select person…" />
              </SelectTrigger>
              <SelectContent>
                {salesPeople.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPayout(null)}>
              Cancel
            </Button>
            <Button
              disabled={!newSalesPersonId || editPICMutation.isPending}
              onClick={() => {
                if (editingPayout && newSalesPersonId) {
                  editPICMutation.mutate({ payoutId: editingPayout.id, personId: newSalesPersonId })
                }
              }}
            >
              {editPICMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
