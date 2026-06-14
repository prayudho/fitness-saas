'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { useRecordPayment } from '@/lib/hooks/use-billing'

const schema = z.object({
  payment_method: z.enum(['cash', 'transfer'], { required_error: 'Select a payment method' }),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface RecordPaymentDialogProps {
  invoiceId: string
  amount: number
  currency?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function RecordPaymentDialog({
  invoiceId,
  amount,
  currency = 'IDR',
  open,
  onOpenChange,
  onSuccess,
}: RecordPaymentDialogProps) {
  const mutation = useRecordPayment()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { reference_number: '', notes: '' },
  })

  async function onSubmit(data: FormData) {
    await mutation.mutateAsync({
      invoiceId,
      input: {
        payment_method: data.payment_method,
        reference_number: data.reference_number || undefined,
        notes: data.notes || undefined,
      },
    })
    form.reset()
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Amount due: </span>
          <span className="font-semibold text-foreground">{formatCurrency(amount, currency)}</span>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reference_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference Number (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Bank transfer ref / receipt no." {...field} />
                  </FormControl>
                  <FormDescription>For bank transfer, enter the transfer reference number.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any payment notes..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Recording...' : 'Record Payment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
