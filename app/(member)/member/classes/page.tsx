'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { WeekScheduleGrid } from '@/components/classes/week-schedule-grid'
import { BookingButton } from '@/components/classes/booking-button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { useClasses, useMemberBookings } from '@/lib/hooks/use-classes'
import type { ColumnDef } from '@tanstack/react-table'
import type { MemberBookingWithClass } from '@/lib/actions/classes'
import { Clock, MapPin } from 'lucide-react'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}


const bookingColumns: ColumnDef<MemberBookingWithClass>[] = [
  {
    accessorKey: 'classes',
    header: 'Class',
    cell: ({ row }) => {
      const cls = row.original.classes
      return (
        <div className="flex items-center gap-2">
          {cls?.class_types?.color && (
            <div
              className="h-3 w-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: cls.class_types.color }}
            />
          )}
          <span className="font-medium">{cls?.class_types?.name ?? 'Unknown'}</span>
        </div>
      )
    },
  },
  {
    id: 'scheduled_at',
    header: 'Date & Time',
    cell: ({ row }) => {
      const cls = row.original.classes
      if (!cls?.scheduled_at) return '—'
      return (
        <div className="flex items-center gap-1.5 text-sm">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          {formatDate(cls.scheduled_at)}
        </div>
      )
    },
  },
  {
    id: 'duration',
    header: 'Duration',
    cell: ({ row }) => {
      const cls = row.original.classes
      if (!cls?.duration_minutes) return '—'
      return `${cls.duration_minutes} min`
    },
  },
  {
    id: 'room',
    header: 'Room',
    cell: ({ row }) => {
      const cls = row.original.classes
      if (!cls?.room) return '—'
      return (
        <div className="flex items-center gap-1.5 text-sm">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          {cls.room}
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const booking = row.original
      const cls = booking.classes
      if (!cls) return null

      const bookedCount = 0 // We don't have full count here; show button based on status
      const availableSpots = booking.status === 'booked' ? 1 : 0 // Simplify for table view

      if (['cancelled', 'attended', 'no_show'].includes(booking.status)) {
        return <StatusBadge status={booking.status} />
      }

      return (
        <BookingButton
          classId={cls.id}
          currentBookingId={booking.id}
          currentStatus={booking.status}
          availableSpots={availableSpots}
        />
      )
    },
  },
]

export default function MemberClassesPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const { data: classes = [], isLoading: loadingClasses } = useClasses({
    weekStart: weekStart.toISOString(),
  })
  const { data: bookings = [], isLoading: loadingBookings } = useMemberBookings()

  // Build a map of classId -> booking for quick lookup
  const bookingMap = new Map(
    bookings
      .filter((b) => !['cancelled'].includes(b.status))
      .map((b) => [b.class_id, b])
  )

  function handleClassClick(classId: string) {
    setSelectedClassId(classId)
    setIsDetailOpen(true)
  }

  const selectedClass = classes.find((c) => c.id === selectedClassId)
  const selectedBooking = selectedClassId ? bookingMap.get(selectedClassId) : undefined

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Schedule"
        description="Browse and book upcoming group classes"
      />

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="bookings">
            My Bookings
            {bookings.filter((b) => b.status === 'booked').length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-xs">
                {bookings.filter((b) => b.status === 'booked').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="mt-4">
          {loadingClasses ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              Loading schedule...
            </div>
          ) : (
            <WeekScheduleGrid
              classes={classes}
              weekStart={weekStart}
              onClassClick={handleClassClick}
              onWeekChange={setWeekStart}
              isAdmin={false}
            />
          )}
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          <DataTable
            data={bookings}
            columns={bookingColumns}
            isLoading={loadingBookings}
            emptyTitle="No bookings yet"
            emptyDescription="Browse the schedule and book a class to get started"
          />
        </TabsContent>
      </Tabs>

      {/* Class detail sheet for member — shows class info + booking button */}
      <Sheet
        open={isDetailOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDetailOpen(false)
            setSelectedClassId(null)
          }
        }}
      >
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedClass?.class_types?.name ?? 'Class Details'}
            </SheetTitle>
          </SheetHeader>
          {selectedClass && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatDate(selectedClass.scheduled_at)}</span>
                  <span>·</span>
                  <span>{selectedClass.duration_minutes} min</span>
                </div>
                {selectedClass.room && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{selectedClass.room}</span>
                  </div>
                )}
                {selectedClass.instructor_profile && (
                  <p>
                    <span className="text-muted-foreground">Instructor: </span>
                    {selectedClass.instructor_profile.full_name}
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">Spots: </span>
                  {selectedClass.booked_count} / {selectedClass.capacity} filled
                </p>
                <StatusBadge status={selectedClass.status} />
              </div>

              {selectedClass.status !== 'cancelled' && (
                <div className="pt-2">
                  <BookingButton
                    classId={selectedClass.id}
                    currentBookingId={selectedBooking?.id}
                    currentStatus={selectedBooking?.status}
                    availableSpots={Math.max(
                      0,
                      selectedClass.capacity - selectedClass.booked_count
                    )}
                  />
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
