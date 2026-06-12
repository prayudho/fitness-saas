import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'

export const metadata: Metadata = { title: 'Payment Entry' }

export default function PaymentsPage() {
  return (
    <div>
      <PageHeader title="Payment Entry" description="Record member payments and package purchases" />
      <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="font-semibold">New Payment</h2>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Member</label>
              <input type="search" placeholder="Search member..." className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Package</label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option>Select package...</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Payment Method</label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="cash">Cash</option>
                <option value="transfer">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="ewallet">E-Wallet</option>
              </select>
            </div>
            <button className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Record Payment
            </button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-3">Today&apos;s Payments</h2>
          <p className="text-sm text-muted-foreground">No payments recorded today.</p>
        </div>
      </div>
    </div>
  )
}
