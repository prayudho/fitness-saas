import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'

export const metadata: Metadata = { title: 'Billing & Plans' }

export default function BillingPage() {
  const plans = [
    { name: 'Starter', price: 'Rp 299.000', members: 100, features: ['1 location', '100 members', 'Basic reports'] },
    { name: 'Growth', price: 'Rp 699.000', members: 500, features: ['3 locations', '500 members', 'Advanced reports', 'PT booking'] },
    { name: 'Enterprise', price: 'Custom', members: -1, features: ['Unlimited locations', 'Unlimited members', 'White-label', 'API access'] },
  ]

  return (
    <div>
      <PageHeader title="Billing & Plans" description="Manage subscription plans for brands" />
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className="rounded-lg border bg-card p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{plan.name}</h3>
              <p className="text-2xl font-bold mt-1">{plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
            </div>
            <ul className="space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-primary">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
