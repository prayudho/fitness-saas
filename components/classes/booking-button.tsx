'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useBookClass, useCancelBooking } from '@/lib/hooks/use-classes'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'

interface BookingButtonProps {
  classId: string
  currentBookingId?: string
  currentStatus?: string
  availableSpots: number
}

export function BookingButton({
  classId,
  currentBookingId,
  currentStatus,
  availableSpots,
}: BookingButtonProps) {
  const bookClass = useBookClass()
  const cancelBooking = useCancelBooking()

  // Already attended — show badge only
  if (currentStatus === 'attended') {
    return (
      <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
        <CheckCircle2 className="h-4 w-4" />
        Attended
      </div>
    )
  }

  // Currently booked — show cancel option
  if (currentStatus === 'booked' && currentBookingId) {
    return (
      <ConfirmDialog
        title="Cancel Booking"
        description="Are you sure you want to cancel your booking for this class?"
        onConfirm={() => cancelBooking.mutate(currentBookingId)}
        isPending={cancelBooking.isPending}
      >
        <Button variant="outline" size="sm">
          <XCircle className="h-4 w-4 mr-1.5" />
          Cancel Booking
        </Button>
      </ConfirmDialog>
    )
  }

  // On waitlist — show badge + cancel
  if (currentStatus === 'waitlisted' && currentBookingId) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Waitlisted
        </Badge>
        <ConfirmDialog
          title="Leave Waitlist"
          description="Are you sure you want to remove yourself from the waitlist?"
          onConfirm={() => cancelBooking.mutate(currentBookingId)}
          isPending={cancelBooking.isPending}
        >
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            Cancel
          </Button>
        </ConfirmDialog>
      </div>
    )
  }

  // No booking yet
  if (availableSpots > 0) {
    return (
      <Button
        size="sm"
        disabled={bookClass.isPending}
        onClick={() => bookClass.mutate(classId)}
      >
        {bookClass.isPending ? 'Booking...' : 'Book Class'}
      </Button>
    )
  }

  // Class is full — join waitlist
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={bookClass.isPending}
      onClick={() => bookClass.mutate(classId)}
    >
      {bookClass.isPending ? 'Joining...' : 'Join Waitlist'}
    </Button>
  )
}
