import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'

export const metadata: Metadata = { title: 'My Clients' }

export default function TrainerClientsPage() {
  return (
    <div>
      <PageHeader title="My Clients" description="Members assigned to you for personal training" />
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        No clients assigned yet.
      </div>
    </div>
  )
}
