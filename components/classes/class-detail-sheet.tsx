'use client'

import { formatDate } from '@/lib/utils'
import { useClass, useCancelClass, useCheckInAttendee } from '@/lib/hooks/use-classes'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { TableSkeleton } from '@/components/shared/skeleton-loaders'
import { Clock, MapPin, Users, UserCheck } from 'lucide-react'

interface ClassDetailSheetProps {
  classId: string | null
  isOpen: boolean
  onClose: () => void
  isAdmin?: boolean
}

export function ClassDetailSheet({
  classId,
  isOpen,
  onClose,
  isAdmin = false,
}: ClassDetailSheetProps) {
  const { data: cls, isLoading } = useClass(classId)
  const cancelClass = useCancelClass()
  const checkIn = useCheckInAttendee()

  const bookedCount =
    cls?.class_bookings?.filter((b) => b.status === 'booked' || b.status === 'attended').length ?? 0
  const capacityPercent = cls ? Math.round((bookedCount / cls.capacity) * 100) : 0

  async function handleCancelClass() {
    if (!classId) return
    await cancelClass.mutateAsync(classId)
    onClose()
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isLoading
              ? 'Loading...'
              : cls?.class_types?.name ?? 'Class Details'}
          </SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="mt-4">
            <TableSkeleton />
          </div>
        )}

        {!isLoading && cls && (
          <div className="mt-4 space-y-6">
            {/* Class info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {formatDate(cls.scheduled_at)} · {cls.duration_minutes} min
                </span>
              </div>
              {cls.room && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{cls.room}</span>
                </div>
              )}
              {cls.instructor_profile && (
                <div className="flex items-center gap-2 text-sm">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <span>{cls.instructor_profile.full_name}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">
                  {bookedCount} / {cls.capacity} spots filled
                </span>
                <StatusBadge status={cls.status} />
              </div>
              <Progress value={capacityPercent} className="h-2" />
            </div>

            <Separator />

            {/* Attendees */}
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Attendees ({cls.class_bookings?.length ?? 0})
              </h3>
              {cls.class_bookings && cls.class_bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookings yet</p>
              ) : (
                <div className="space-y-2">
                  {(cls.class_bookings ?? []).map((booking) => {
                    const member = booking.member_profile
                    const initials = member?.full_name
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) ?? '?'

                    return (
                      <div
                        key={booking.id}
                        className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/50"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member?.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member?.full_name ?? 'Unknown'}
                          </p>
                          {booking.checked_in_at && (
                            <p className="text-xs text-muted-foreground">
                              Checked in {formatDate(booking.checked_in_at)}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={booking.status} />
                        {isAdmin && booking.status === 'booked' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-1 h-7 text-xs"
                            disabled={checkIn.isPending}
                            onClick={() => checkIn.mutate(booking.id)}
                          >
                            Check In
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Admin actions */}
            {isAdmin && cls.status !== 'cancelled' && (
              <>
                <Separator />
                <div className="flex justify-end">
                  <ConfirmDialog
                    title="Cancel Class"
                    description="Are you sure you want to cancel this class? All bookings will remain but members will be notified."
                    onConfirm={handleCancelClass}
                    isPending={cancelClass.isPending}
                  >
                    <Button variant="destructive" size="sm">
                      Cancel Class
                    </Button>
                  </ConfirmDialog>
                </div>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
