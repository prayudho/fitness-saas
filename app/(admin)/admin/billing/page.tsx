'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatsSkeleton } from '@/components/shared/skeleton-loaders'
import { RecordPaymentDialog } from '@/components/billing/record-payment-dialog'
import { getInvoiceColumns } from '@/components/billing/invoice-columns'
import {
  useInvoices,
  useCreateInvoice,
  useProcessRefund,
  useGetMidtransToken,
  useCancelPendingPackage,
} from '@/lib/hooks/use-billing'
import { useMembers } from '@/lib/hooks/use-members'
import { formatCurrency } from '@/lib/utils'
import type { InvoiceWithDetails } from '@/lib/actions/billing'
import { toast } from 'sonner'

const createInvoiceSchema = z.object({
  member_id: z.string().min(1, 'Select a member'),
  membership_id: z.string().optional(),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().default('IDR'),
  notes: z.string().optional(),
})

type CreateInvoiceFormData = z.infer<typeof createInvoiceSchema>

export default function AdminBillingPage() {
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [recordPaymentInvoice, setRecordPaymentInvoice] = React.useState<InvoiceWithDetails | null>(null)

  const { data, isLoading } = useInvoices({ status: statusFilter })
  const { data: membersData } = useMembers()
  const createMutation = useCreateInvoice()
  const refundMutation = useProcessRefund()
  const midtransMutation = useGetMidtransToken()
  const cancelMutation = useCancelPendingPackage()

  const invoices = data?.data ?? []
  const members = membersData?.data ?? []

  // Stats
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const allPaidInvoices = invoices.filter((inv) => inv.status === 'paid')
  const thisMonthPaid = allPaidInvoices.filter((inv) =>
    inv.paid_at ? new Date(inv.paid_at) >= thisMonthStart : false
  )
  const totalThisMonth = thisMonthPaid.reduce((sum, inv) => sum + inv.amount, 0)
  const pendingCount = invoices.filter((inv) => inv.status === 'pending').length
  const paidCount = allPaidInvoices.length

  const form = useForm<CreateInvoiceFormData>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: { currency: 'IDR', notes: '' },
  })

  const selectedMemberId = form.watch('member_id')
  const selectedMember = members.find((m) => m.id === selectedMemberId)
  const memberMemberships = selectedMember?.memberships ?? []

  async function onSubmit(data: CreateInvoiceFormData) {
    await createMutation.mutateAsync({
      member_id: data.member_id,
      membership_id: data.membership_id || undefined,
      amount: data.amount,
      currency: data.currency,
      notes: data.notes || undefined,
    })
    form.reset()
    setSheetOpen(false)
  }

  async function handlePayMidtrans(invoiceId: string) {
    const result = await midtransMutation.mutateAsync(invoiceId)
    if (result?.redirect_url) {
      window.open(result.redirect_url, '_blank')
    } else {
      toast.error('Midtrans not configured. Please set MIDTRANS_SERVER_KEY.')
    }
  }

  async function handleRefund(invoiceId: string) {
    const reason = window.prompt('Enter refund reason:')
    if (!reason) return
    await refundMutation.mutateAsync({ invoiceId, reason })
  }

  async function handleCancel(membershipId: string) {
    await cancelMutation.mutateAsync(membershipId)
  }

  const columns = getInvoiceColumns({
    onRecordPayment: (invoice) => setRecordPaymentInvoice(invoice),
    onRefund: handleRefund,
    onPay: handlePayMidtrans,
    onCancel: handleCancel,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Invoices"
        description="Manage member invoices and track revenue"
        action={
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        }
      />

      {/* Stats */}
      {isLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Revenue This Month</p>
            <p className="mt-2 text-3xl font-bold">{formatCurrency(totalThisMonth)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Paid invoices this month</p>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Pending</p>
            <p className="mt-2 text-3xl font-bold">{pendingCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Awaiting payment</p>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Paid</p>
            <p className="mt-2 text-3xl font-bold">{paidCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Completed payments</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        data={invoices}
        columns={columns}
        isLoading={isLoading}
        searchKey="id"
        searchPlaceholder="Search invoices..."
        emptyTitle="No invoices found"
        emptyDescription="Create an invoice to get started."
      />

      {/* Record Payment Dialog */}
      {recordPaymentInvoice && (
        <RecordPaymentDialog
          invoiceId={recordPaymentInvoice.id}
          amount={recordPaymentInvoice.amount}
          currency={recordPaymentInvoice.currency ?? 'IDR'}
          open={Boolean(recordPaymentInvoice)}
          onOpenChange={(open) => { if (!open) setRecordPaymentInvoice(null) }}
        />
      )}

      {/* Create Invoice Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create Invoice</SheetTitle>
          </SheetHeader>

          <div className="mt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="member_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Member</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {members.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.full_name ?? member.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedMemberId && memberMemberships.length > 0 && (
                  <FormField
                    control={form.control}
                    name="membership_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Membership (optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Link to membership" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {memberMemberships.map((mem: { id: string; status: string; membership_packages?: { name: string } | null }) => (
                              <SelectItem key={mem.id} value={mem.id}>
                                {mem.membership_packages?.name ?? mem.id} — {mem.status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="IDR">IDR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="SGD">SGD</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any notes..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setSheetOpen(false); form.reset() }}
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
