'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getInvoices,
  getMemberInvoices,
  createInvoice,
  recordPayment,
  getMidtransSnapToken,
  processRefund,
  cancelPendingPackage,
} from '@/lib/actions/billing'

export function useInvoices(filters?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      const result = await getInvoices(filters)
      if (result.error) throw new Error(result.error)
      return { data: result.data, count: result.count }
    },
  })
}

export function useMemberInvoices() {
  return useQuery({
    queryKey: ['member-invoices'],
    queryFn: async () => {
      const result = await getMemberInvoices()
      if (result.error) throw new Error(result.error)
      return result.data
    },
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Parameters<typeof createInvoice>[0]) => {
      const r = await createInvoice(input)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Invoice created successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useRecordPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      invoiceId,
      input,
    }: {
      invoiceId: string
      input: Parameters<typeof recordPayment>[1]
    }) => {
      const r = await recordPayment(invoiceId, input)
      if (r.error) throw new Error(r.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['member-invoices'] })
      toast.success('Payment recorded successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useGetMidtransToken() {
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const r = await getMidtransSnapToken(invoiceId)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useProcessRefund() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ invoiceId, reason }: { invoiceId: string; reason: string }) => {
      const r = await processRefund(invoiceId, reason)
      if (r.error) throw new Error(r.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Invoice refunded successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useCancelPendingPackage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (membershipId: string) => cancelPendingPackage(membershipId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['members'] })
      toast.success('Package cancelled and invoice deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
