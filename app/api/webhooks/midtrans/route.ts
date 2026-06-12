import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { order_id, status_code, gross_amount, signature_key, transaction_status } = body

    // Verify signature
    const serverKey = process.env.MIDTRANS_SERVER_KEY ?? ''
    const expected = crypto
      .createHash('sha512')
      .update(order_id + status_code + gross_amount + serverKey)
      .digest('hex')

    if (expected !== signature_key) {
      return NextResponse.json({ message: 'Invalid signature' }, { status: 401 })
    }

    // Map transaction_status to invoice status
    let invoiceStatus: string | null = null
    if (['settlement', 'capture'].includes(transaction_status)) invoiceStatus = 'paid'
    else if (['cancel', 'deny', 'expire'].includes(transaction_status)) invoiceStatus = 'failed'
    else if (transaction_status === 'refund') invoiceStatus = 'refunded'

    if (invoiceStatus) {
      const supabase = createServiceClient()
      const updateData: Record<string, unknown> = {
        status: invoiceStatus,
        gateway_ref: order_id,
      }
      if (invoiceStatus === 'paid') updateData.paid_at = new Date().toISOString()
      await supabase.from('invoices').update(updateData).eq('id', order_id)
    }

    return NextResponse.json({ message: 'OK' })
  } catch (e) {
    return NextResponse.json({ message: 'Error' }, { status: 500 })
  }
}
