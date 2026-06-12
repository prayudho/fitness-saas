import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'

export const metadata: Metadata = { title: 'Member Search' }

export default function StaffMembersPage() {
  return (
    <div>
      <PageHeader title="Member Search" description="Find and view member details" />
      <div className="max-w-xl space-y-4">
        <input
          type="search"
          placeholder="Search by name, phone, or email..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <p className="text-sm text-muted-foreground">Enter a name or phone number to search.</p>
      </div>
    </div>
  )
}
