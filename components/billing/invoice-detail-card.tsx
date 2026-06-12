'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PayMidtransButton } from '@/components/billing/pay-midtrans-button'
import { RecordPaymentDialog } from '@/components/billing/record-payment-dialog'
import type { InvoiceWithDetails } from '@/lib/actions/billing'

interface InvoiceDetailCardProps {
  invoice: InvoiceWithDetails
}

export function InvoiceDetailCard({ invoice }: InvoiceDetailCardProps) {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)

  const isPending = invoice.status === 'pending'

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Invoice #{invoice.id.slice(0, 8).toUpperCase()}
          </CardTitle>
          <StatusBadge status={invoice.status ?? 'pending'} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Member</p>
            <p className="font-medium">{invoice.profiles?.full_name ?? 'Unknown'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Package</p>
            <p className="font-medium">
              {invoice.memberships?.membership_packages?.name ?? '-'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Amount</p>
            <p className="font-semibold text-lg">
              {formatCurrency(invoice.amount, invoice.currency ?? 'IDR')}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Currency</p>
            <p className="font-medium">{invoice.currency ?? 'IDR'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="font-medium">
              {invoice.created_at ? formatDate(invoice.created_at) : '-'}
            </p>
          </div>
          {invoice.paid_at && (
            <div>
              <p className="text-muted-foreground">Paid At</p>
              <p className="font-medium">{formatDate(invoice.paid_at)}</p>
            </div>
          )}
          {invoice.payment_method && (
            <div>
              <p className="text-muted-foreground">Payment Method</p>
              <p className="font-medium capitalize">{invoice.payment_method.replace(/_/g, ' ')}</p>
            </div>
          )}
          {invoice.gateway_ref && (
            <div>
              <p className="text-muted-foreground">Gateway Ref</p>
              <p className="font-mono text-xs">{invoice.gateway_ref}</p>
            </div>
          )}
        </div>

        {invoice.notes && (
          <>
            <Separator />
            <div>
              <p className="text-muted-foreground text-sm mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          </>
        )}

        {isPending && (
          <>
            <Separator />
            <div className="flex gap-2 flex-wrap">
              <PayMidtransButton invoiceId={invoice.id} />
              <Button variant="outline" size="sm" onClick={() => setPaymentDialogOpen(true)}>
                Record Payment
              </Button>
            </div>

            <RecordPaymentDialog
              invoiceId={invoice.id}
              amount={invoice.amount}
              currency={invoice.currency ?? 'IDR'}
              open={paymentDialogOpen}
              onOpenChange={setPaymentDialogOpen}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
