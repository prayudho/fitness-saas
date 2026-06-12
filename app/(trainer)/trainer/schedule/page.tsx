'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useTrainerSessions, useUpdateSessionStatus } from '@/lib/hooks/use-trainers'
import { useAuth } from '@/lib/hooks/use-auth'
import type { TrainerSessionWithMember } from '@/lib/actions/trainers'
import { formatCurrency, formatDate } from '@/lib/utils'

function SessionCard({ session }: { session: TrainerSessionWithMember }) {
  const mutation = useUpdateSessionStatus()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<'completed' | 'cancelled' | 'no_show' | null>(null)

  const memberName = session.member?.full_name ?? 'Unknown Member'
  const memberInitials = memberName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const scheduledDate = new Date(session.scheduled_at)

  function openConfirm(status: 'completed' | 'cancelled' | 'no_show') {
    setPendingStatus(status)
    setDialogOpen(true)
  }

  async function confirmStatusChange() {
    if (!pendingStatus) return
    await mutation.mutateAsync({ id: session.id, status: pendingStatus })
    setDialogOpen(false)
  }

  const statusLabels: Record<string, string> = {
    completed: 'Mark as Complete',
    cancelled: 'Cancel Session',
    no_show: 'Mark as No Show',
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={session.member?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">{memberInitials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{memberName}</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(session.scheduled_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {scheduledDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>{session.duration_minutes} min</span>
                  </div>
                  {session.session_fee != null && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Fee: {formatCurrency(session.session_fee)}
                    </p>
                  )}
                  {session.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{session.notes}</p>
                  )}
                </div>
                <StatusBadge status={session.status} />
              </div>

              {session.status === 'scheduled' && (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => openConfirm('completed')}
                    className="text-xs"
                  >
                    <CheckCircle className="mr-1 h-3.5 w-3.5" />
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openConfirm('no_show')}
                    className="text-xs"
                  >
                    <AlertCircle className="mr-1 h-3.5 w-3.5" />
                    No Show
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openConfirm('cancelled')}
                    className="text-xs text-destructive hover:text-destructive"
                  >
                    <XCircle className="mr-1 h-3.5 w-3.5" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingStatus ? statusLabels[pendingStatus] : 'Confirm Action'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {pendingStatus === 'completed' &&
              `Mark the session with ${memberName} as completed? Commission will be calculated automatically.`}
            {pendingStatus === 'cancelled' &&
              `Cancel the session with ${memberName} on ${formatDate(session.scheduled_at)}?`}
            {pendingStatus === 'no_show' &&
              `Mark ${memberName} as a no show for this session?`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Go Back
            </Button>
            <Button
              onClick={confirmStatusChange}
              disabled={mutation.isPending}
              variant={pendingStatus === 'cancelled' ? 'destructive' : 'default'}
            >
              {mutation.isPending ? 'Saving...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function TrainerSchedulePage() {
  const { user } = useAuth()
  const { data: sessions, isLoading } = useTrainerSessions(user?.id ?? '')

  const upcoming = (sessions ?? [])
    .filter((s) => s.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  const past = (sessions ?? [])
    .filter((s) => s.status !== 'scheduled')
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
    .slice(0, 10)

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Schedule"
        description="View and manage your upcoming training sessions"
      />

      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Upcoming Sessions
        </h3>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming sessions"
            description="Your scheduled sessions will appear here."
          />
        ) : (
          <div className="space-y-3">
            {upcoming.map((session) => (
              <SessionCard key={session.id} session={session as TrainerSessionWithMember} />
            ))}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Recent Sessions
          </h3>
          <div className="space-y-3">
            {past.map((session) => (
              <SessionCard key={session.id} session={session as TrainerSessionWithMember} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
