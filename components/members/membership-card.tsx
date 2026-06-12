'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { FreezeDialog } from '@/components/members/freeze-dialog'
import { useUnfreezeMembership, useCancelMembership } from '@/lib/hooks/use-members'
import { formatDate } from '@/lib/utils'
import { Calendar, CreditCard, Zap } from 'lucide-react'

interface MembershipCardProps {
  membership: {
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
  onRefresh: () => void
}

export function MembershipCard({ membership, onRefresh }: MembershipCardProps) {
  const unfreeze = useUnfreezeMembership()
  const cancel = useCancelMembership()

  const daysUntilExpiry = useMemo(() => {
    if (!membership.expires_at || membership.status !== 'active') return null
    const diff = new Date(membership.expires_at).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }, [membership.expires_at, membership.status])

  async function handleUnfreeze() {
    await unfreeze.mutateAsync(membership.id)
    onRefresh()
  }

  async function handleCancel() {
    await cancel.mutateAsync(membership.id)
    onRefresh()
  }

  const pkg = membership.membership_packages

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{pkg?.name ?? 'Unknown Package'}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {pkg?.type && (
              <Badge variant="secondary" className="capitalize text-xs">
                {pkg.type.replace('_', ' ')}
              </Badge>
            )}
            <StatusBadge status={membership.status} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Start Date</p>
            <p className="font-medium">{formatDate(membership.starts_at)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Expiry Date</p>
            <p className="font-medium">
              {membership.expires_at ? formatDate(membership.expires_at) : '—'}
            </p>
          </div>

          {membership.sessions_remaining !== null && (
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Sessions Remaining</p>
              <div className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-yellow-500" />
                <p className="font-medium">{membership.sessions_remaining}</p>
              </div>
            </div>
          )}

          {daysUntilExpiry !== null && (
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Time Remaining</p>
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                <p className={`font-medium ${daysUntilExpiry <= 7 ? 'text-red-600' : ''}`}>
                  {daysUntilExpiry > 0
                    ? `${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`
                    : 'Expired'}
                </p>
              </div>
            </div>
          )}
        </div>

        {membership.auto_renew && (
          <p className="text-xs text-muted-foreground">Auto-renew enabled</p>
        )}

        {membership.status !== 'cancelled' && membership.status !== 'expired' && (
          <div className="flex flex-wrap gap-2 pt-1">
            {membership.status === 'active' && pkg?.allow_freeze && (
              <FreezeDialog membershipId={membership.id} onSuccess={onRefresh} />
            )}

            {membership.status === 'frozen' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnfreeze}
                disabled={unfreeze.isPending}
              >
                {unfreeze.isPending ? 'Unfreezing...' : 'Unfreeze'}
              </Button>
            )}

            <ConfirmDialog
              title="Cancel Membership"
              description="Are you sure you want to cancel this membership? This action cannot be undone."
              onConfirm={handleCancel}
              isPending={cancel.isPending}
              variant="destructive"
            >
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                Cancel Membership
              </Button>
            </ConfirmDialog>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
