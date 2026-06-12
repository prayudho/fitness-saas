'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCheckInAttendee } from '@/lib/hooks/use-classes'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, UserCheck, Clock, Users } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type BookingStatus = Database['public']['Tables']['class_bookings']['Row']['status']

interface ClassBookingItem {
  id: string
  status: BookingStatus
  checked_in_at: string | null
  classes: {
    id: string
    scheduled_at: string
    duration_minutes: number
    room: string | null
    capacity: number
    class_types: {
      name: string
      color: string
    } | null
  } | null
}

interface FoundMember {
  id: string
  full_name: string
  phone: string | null
  avatar_url: string | null
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function isTodayOrUpcoming(scheduledAt: string): boolean {
  const now = new Date()
  const classDate = new Date(scheduledAt)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const endOfDay = new Date(today)
  endOfDay.setDate(endOfDay.getDate() + 1)
  return classDate >= today && classDate < endOfDay
}

export default function ClassCheckinPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [foundMember, setFoundMember] = useState<FoundMember | null>(null)
  const [memberBookings, setMemberBookings] = useState<ClassBookingItem[]>([])
  const checkIn = useCheckInAttendee()

  async function searchMember() {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setFoundMember(null)
    setMemberBookings([])

    try {
      const supabase = createClient()

      // Search by name or phone
      const { data: members, error: memberError } = await supabase
        .from('profiles')
        .select('id, full_name, phone, avatar_url')
        .eq('role', 'member')
        .or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(1)

      if (memberError) {
        toast.error('Search failed: ' + memberError.message)
        return
      }

      if (!members || members.length === 0) {
        toast.info('No member found')
        return
      }

      const member = members[0] as FoundMember
      setFoundMember(member)

      // Fetch today's class bookings for this member
      const now = new Date()
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(todayStart)
      todayEnd.setDate(todayEnd.getDate() + 1)

      const { data: bookings, error: bookingsError } = await supabase
        .from('class_bookings')
        .select(`
          id,
          status,
          checked_in_at,
          classes(
            id,
            scheduled_at,
            duration_minutes,
            room,
            capacity,
            class_types!class_type_id(name, color)
          )
        `)
        .eq('member_id', member.id)
        .in('status', ['booked', 'attended', 'waitlisted'])
        .order('booked_at', { ascending: false })

      if (bookingsError) {
        toast.error('Failed to load bookings: ' + bookingsError.message)
        return
      }

      // Filter to today's classes only
      const todayBookings = (bookings ?? []).filter((b) => {
        const cls = b.classes as ClassBookingItem['classes']
        if (!cls?.scheduled_at) return false
        return isTodayOrUpcoming(cls.scheduled_at)
      })

      setMemberBookings(todayBookings as ClassBookingItem[])

      if (todayBookings.length === 0) {
        toast.info('Member found but has no classes scheduled for today')
      }
    } finally {
      setIsSearching(false)
    }
  }

  async function handleCheckIn(bookingId: string) {
    await checkIn.mutateAsync(bookingId)
    // Update local state to reflect check-in
    setMemberBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? { ...b, status: 'attended' as BookingStatus, checked_in_at: new Date().toISOString() }
          : b
      )
    )
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') searchMember()
  }

  function handleReset() {
    setSearchQuery('')
    setFoundMember(null)
    setMemberBookings([])
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader
        title="Class Check-in Station"
        description="Search member and check in to their class"
      />

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Find Member
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Search by name or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-base"
              autoFocus
            />
            <Button onClick={searchMember} disabled={isSearching || !searchQuery.trim()}>
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
            {foundMember && (
              <Button variant="outline" onClick={handleReset}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Member info + bookings */}
      {foundMember && (
        <div className="space-y-4">
          {/* Member card */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={foundMember.avatar_url ?? undefined} />
                  <AvatarFallback className="text-lg">
                    {getInitials(foundMember.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">{foundMember.full_name}</p>
                  {foundMember.phone && (
                    <p className="text-sm text-muted-foreground">{foundMember.phone}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's class bookings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Today&apos;s Classes
                <Badge variant="secondary" className="ml-1">
                  {memberBookings.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {memberBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No classes scheduled for today
                </p>
              ) : (
                <div className="space-y-3">
                  {memberBookings.map((booking) => {
                    const cls = booking.classes
                    if (!cls) return null
                    const isCheckedIn = booking.status === 'attended'

                    return (
                      <div
                        key={booking.id}
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                      >
                        {/* Color indicator */}
                        <div
                          className="h-10 w-1.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: cls.class_types?.color ?? '#6366f1',
                          }}
                        />

                        <div className="flex-1 min-w-0">
                          <p className="font-medium">
                            {cls.class_types?.name ?? 'Class'}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(cls.scheduled_at)}
                            </span>
                            <span>{cls.duration_minutes} min</span>
                            {cls.room && <span>{cls.room}</span>}
                          </div>
                          {isCheckedIn && booking.checked_in_at && (
                            <p className="text-xs text-green-600 mt-0.5">
                              Checked in at {formatDate(booking.checked_in_at)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={booking.status} />
                          {!isCheckedIn && booking.status === 'booked' && (
                            <Button
                              size="sm"
                              disabled={checkIn.isPending}
                              onClick={() => handleCheckIn(booking.id)}
                              className="gap-1.5"
                            >
                              <UserCheck className="h-4 w-4" />
                              Check In
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
