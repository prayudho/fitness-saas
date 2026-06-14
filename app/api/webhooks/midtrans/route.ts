import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { activateMembershipForInvoice } from '@/lib/billing/shared'

// C4: validate every field before touching the DB
const midtransBodySchema = z.object({
  order_id:           z.string().uuid('order_id must be a UUID'),
  status_code:        z.string(),
  gross_amount:       z.string(),
  signature_key:      z.string(),
  transaction_status: z.string(),
})

const PAID_STATUSES    = new Set(['settlement', 'capture'])
const FAILED_STATUSES  = new Set(['cancel', 'deny', 'expire'])

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    // Malformed JSON — return 200 so Midtrans doesn't retry endlessly
    console.error('[midtrans-webhook] invalid JSON body')
    return NextResponse.json({ message: 'Bad request' }, { status: 200 })
  }

  const parsed = midtransBodySchema.safeParse(body)
  if (!parsed.success) {
    console.error('[midtrans-webhook] schema validation failed', parsed.error.flatten())
    return NextResponse.json({ message: 'Bad request' }, { status: 200 })
  }

  const { order_id, status_code, gross_amount, signature_key, transaction_status } = parsed.data

  // Verify Midtrans signature
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? ''
  const expected = crypto
    .createHash('sha512')
    .update(order_id + status_code + gross_amount + serverKey)
    .digest('hex')

  if (expected !== signature_key) {
    // 401 here tells Midtrans the request was rejected — correct for tampered payloads
    return NextResponse.json({ message: 'Invalid signature' }, { status: 401 })
  }

  let invoiceStatus: 'paid' | 'failed' | 'refunded' | null = null
  if (PAID_STATUSES.has(transaction_status))  invoiceStatus = 'paid'
  else if (FAILED_STATUSES.has(transaction_status)) invoiceStatus = 'failed'
  else if (transaction_status === 'refund')   invoiceStatus = 'refunded'

  if (!invoiceStatus) {
    // Pending / unknown statuses — acknowledge and skip
    return NextResponse.json({ message: 'OK' })
  }

  try {
    const supabase = createServiceClient()

    // C2/C3: fetch the invoice first so we can validate brand ownership and
    // implement idempotency (only process if still pending).
    const { data: invoice, error: fetchErr } = await supabase
      .from('invoices')
      .select('id, status, amount, membership_id, member_id, brand_id')
      .eq('id', order_id)
      .maybeSingle()

    if (fetchErr || !invoice) {
      console.error('[midtrans-webhook] invoice not found', { order_id, error: fetchErr?.message })
      return NextResponse.json({ message: 'OK' })
    }

    // C2: idempotency — skip if already processed
    if (invoice.status !== 'pending') {
      return NextResponse.json({ message: 'OK' })
    }

    // L3: validate gross_amount from Midtrans matches our stored amount
    const midtransAmount = Math.round(parseFloat(gross_amount))
    const storedAmount   = Math.round(invoice.amount)
    if (midtransAmount !== storedAmount) {
      console.error('[midtrans-webhook] amount mismatch', {
        order_id,
        midtrans: midtransAmount,
        stored: storedAmount,
      })
      return NextResponse.json({ message: 'Amount mismatch' }, { status: 200 })
    }

    const updateData = {
      status:      invoiceStatus,
      gateway_ref: order_id,
      ...(invoiceStatus === 'paid' ? { paid_at: new Date().toISOString() } : {}),
    } as never

    const { error: updateErr } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', order_id)
      .eq('status', 'pending')  // extra idempotency guard at DB level

    if (updateErr) {
      console.error('[midtrans-webhook] invoice update failed', { order_id, error: updateErr.message })
      return NextResponse.json({ message: 'OK' })
    }

    // C1: activate the linked membership after a successful payment
    if (invoiceStatus === 'paid') {
      await activateMembershipForInvoice(supabase, {
        id:            invoice.id,
        membership_id: invoice.membership_id,
        member_id:     invoice.member_id,
        brand_id:      invoice.brand_id,
      })
    }
  } catch (err) {
    console.error('[midtrans-webhook] unexpected error', { order_id, err })
    // Return 200 so Midtrans stops retrying; the error is logged for manual review
  }

  return NextResponse.json({ message: 'OK' })
}
