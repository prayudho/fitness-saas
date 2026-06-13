'use client'

import { useRouter } from 'next/navigation'
import { MembershipCard } from '@/components/members/membership-card'
import { AssignPackageDialog } from '@/components/members/assign-package-dialog'

interface Membership {
  id: string
  status: string
  starts_at: string
  expires_at: string | null
  sessions_remaining: number | null
  auto_renew: boolean
  membership_packages: {
    name: string
    type: string
    allow_freeze: boolean
  } | null
}

interface MembershipsSectionProps {
  memberId: string
  memberships: Membership[]
}

export function MembershipsSection({ memberId, memberships }: MembershipsSectionProps) {
  const router = useRouter()

  function refresh() {
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AssignPackageDialog memberId={memberId} onSuccess={refresh} />
      </div>
      {memberships.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No memberships yet. Assign a package to get started.
        </div>
      ) : (
        memberships.map((m) => (
          <MembershipCard key={m.id} membership={m} onRefresh={refresh} />
        ))
      )}
    </div>
  )
}
