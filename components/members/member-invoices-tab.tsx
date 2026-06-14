'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/shared/status-badge'
import { RecordPaymentDialog } from '@/components/billing/record-payment-dialog'
import { Button } from '@/components/ui/button'
import { formatDate, formatCurrency } from '@/lib/utils'
import { cancelPendingPackage } from '@/lib/actions/billing'

interface Invoice {
  id: string
  created_at: string
  amount: number
  currency: string | null
  status: string | null
  paid_at: string | null
  membership_id: string | null
}

interface MemberInvoicesTabProps {
  invoices: Invoice[]
}

export function MemberInvoicesTab({ invoices }: MemberInvoicesTabProps) {
  const router = useRouter()
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null)

  const cancelMutation = useMutation({
    mutationFn: (membershipId: string) => cancelPendingPackage(membershipId),
    onSuccess: () => {
      toast.success('Package and invoice cancelled')
      router.refresh()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (invoices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">No invoices yet.</p>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 pr-4 font-medium text-muted-foreground">Date</th>
              <th className="pb-2 pr-4 font-medium text-muted-foreground">Amount</th>
              <th className="pb-2 pr-4 font-medium text-muted-foreground">Status</th>
              <th className="pb-2 font-medium text-muted-foreground">Paid At</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td className="py-2.5 pr-4 text-muted-foreground">{formatDate(inv.created_at)}</td>
                <td className="py-2.5 pr-4 font-medium">{formatCurrency(inv.amount, inv.currency ?? undefined)}</td>
                <td className="py-2.5 pr-4"><StatusBadge status={inv.status ?? 'pending'} /></td>
                <td className="py-2.5 text-muted-foreground">{inv.paid_at ? formatDate(inv.paid_at) : '—'}</td>
                <td className="py-2.5">
                  {inv.status === 'pending' && (
                    <div className="flex items-center gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => setPaymentInvoice(inv)}>
                        Confirm Payment
                      </Button>
                      {inv.membership_id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={cancelMutation.isPending}
                          onClick={() => cancelMutation.mutate(inv.membership_id!)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paymentInvoice && (
        <RecordPaymentDialog
          invoiceId={paymentInvoice.id}
          amount={paymentInvoice.amount}
          currency={paymentInvoice.currency ?? 'IDR'}
          open={Boolean(paymentInvoice)}
          onOpenChange={(open) => { if (!open) setPaymentInvoice(null) }}
          onSuccess={() => router.refresh()}
        />
      )}
    </>
  )
}
