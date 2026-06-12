'use client'

import { PageHeader } from '@/components/shared/page-header'
import { AvailabilityEditor } from '@/components/trainers/availability-editor'
import { useAuth } from '@/lib/hooks/use-auth'
import { Skeleton } from '@/components/ui/skeleton'

export default function TrainerAvailabilityPage() {
  const { user, loading } = useAuth()

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="My Availability"
        description="Set your available hours for personal training bookings"
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : user ? (
        <AvailabilityEditor trainerId={user.id} />
      ) : (
        <p className="text-sm text-muted-foreground">Please log in to manage your availability.</p>
      )}
    </div>
  )
}
