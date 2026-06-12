'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Ticket, Calendar, ScanLine, MapPin, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type MembershipRow = Database['public']['Tables']['memberships']['Row']
type MembershipPackageRow = Database['public']['Tables']['membership_packages']['Row']
type CheckinRow = Database['public']['Tables']['checkins']['Row']
type TrainerSessionRow = Database['public']['Tables']['trainer_sessions']['Row']
type ClassBookingRow = Database['public']['Tables']['class_bookings']['Row']
type ClassRow = Database['public']['Tables']['classes']['Row']
type ClassTypeRow = Database['public']['Tables']['class_types']['Row']

interface MembershipWithPackage extends MembershipRow {
  membership_packages: MembershipPackageRow | null
}

interface TrainerProfile {
  id: string
  full_name: string
  avatar_url: string | null
}

interface TrainerWithProfile {
  id: string
  profiles: TrainerProfile | null
}

interface TrainerSessionWithTrainer extends TrainerSessionRow {
  trainer: TrainerWithProfile | null
}

interface ClassTypeInfo extends ClassTypeRow {}

interface ClassWithType extends ClassRow {
  class_types: ClassTypeInfo | null
  instructor_profile: Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url'> | null
}

interface BookingWithClass extends ClassBookingRow {
  classes: ClassWithType | null
}

interface DashboardData {
  profile: ProfileRow
  activeMembership: MembershipWithPackage | null
  upcomingBookings: BookingWithClass[]
  upcomingPTSessions: TrainerSessionWithTrainer[]
  recentCheckins: CheckinRow[]
  classesThisMonth: number
  checkinsThisMonth: number
}

async function fetchDashboardData(): Promise<DashboardData> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    profileResult,
    membershipResult,
    bookingsResult,
    ptSessionsResult,
    checkinsResult,
    monthCheckinsResult,
    monthBookingsResult,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('memberships')
      .select('*, membership_packages(*)')
      .eq('member_id', user.id)
      .in('status', ['active', 'frozen'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('class_bookings')
      .select(
        `*, classes(*, class_types(*), instructor_profile:instructor_id(id, full_name, avatar_url))`
      )
      .eq('member_id', user.id)
      .in('status', ['booked', 'waitlisted'])
      .gte('classes.scheduled_at', now.toISOString())
      .order('booked_at', { ascending: true })
      .limit(3),
    supabase
      .from('trainer_sessions')
      .select('*, trainer:trainer_id(id, profiles:id(id, full_name, avatar_url))')
      .eq('member_id', user.id)
      .eq('status', 'scheduled')
      .gte('scheduled_at', now.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(2),
    supabase
      .from('checkins')
      .select('*')
      .eq('member_id', user.id)
      .order('checked_in_at', { ascending: false })
      .limit(5),
    supabase
      .from('checkins')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', user.id)
      .gte('checked_in_at', monthStart),
    supabase
      .from('class_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', user.id)
      .in('status', ['booked', 'attended'])
      .gte('booked_at', monthStart),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileData = (profileResult as any).data as ProfileRow | null
  if (profileResult.error || !profileData) throw new Error('Profile not found')

  return {
    profile: profileData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeMembership: ((membershipResult as any).data as MembershipWithPackage | null) ?? null,
    upcomingBookings: ((bookingsResult.data ?? []) as unknown as BookingWithClass[]).filter(
      (b) => b.classes && new Date(b.classes.scheduled_at) >= now
    ),
    upcomingPTSessions: (ptSessionsResult.data ?? []) as unknown as TrainerSessionWithTrainer[],
    recentCheckins: (checkinsResult.data ?? []) as CheckinRow[],
    classesThisMonth: monthBookingsResult.count ?? 0,
    checkinsThisMonth: monthCheckinsResult.count ?? 0,
  }
}

function getTimeOfDay(): string {
  const hours = new Date().getHours()
  if (hours < 12) return 'morning'
  if (hours < 17) return 'afternoon'
  return 'evening'
}

function formatCheckinTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (isToday) {
    return (
      'Today ' +
      date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    )
  }

  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatClassDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return (
    date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' +
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  )
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'frozen':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'expired':
    case 'cancelled':
      return 'bg-red-100 text-red-700 border-red-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getDaysRemaining(expiresAt: string | null): number {
  if (!expiresAt) return 0
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function getTotalDays(startsAt: string, expiresAt: string | null): number {
  if (!expiresAt) return 0
  const diff = new Date(expiresAt).getTime() - new Date(startsAt).getTime()
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

// ─── Skeleton ────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Greeting */}
      <Skeleton className="h-8 w-72" />

      {/* Membership card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full mt-2" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two panels */}
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[0, 1, 2].map((j) => (
                <div key={j} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Check-ins */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────

export default function MemberDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['member-dashboard'],
    queryFn: fetchDashboardData,
    staleTime: 60 * 1000,
  })

  if (isLoading) return <DashboardSkeleton />

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground text-sm">
          {error instanceof Error ? error.message : 'Failed to load dashboard.'}
        </p>
      </div>
    )
  }

  const {
    profile,
    activeMembership,
    upcomingBookings,
    upcomingPTSessions,
    recentCheckins,
    classesThisMonth,
    checkinsThisMonth,
  } = data

  const firstName = profile.full_name.split(' ')[0]
  const timeOfDay = getTimeOfDay()

  const membership = activeMembership
  const pkg = membership?.membership_packages ?? null
  const daysRemaining = membership ? getDaysRemaining(membership.expires_at) : 0
  const totalDays = membership ? getTotalDays(membership.starts_at, membership.expires_at) : 0
  const progressPct = totalDays > 0 ? Math.round((daysRemaining / totalDays) * 100) : 0
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7
  const isExpired = !membership || membership.status === 'expired'

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <h1 className="text-2xl font-bold tracking-tight">
        Good {timeOfDay}, {firstName}!
      </h1>

      {/* Membership Status Card */}
      <Card className="border-l-4" style={{ borderLeftColor: 'var(--brand-primary, #6366f1)' }}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Avatar + info */}
            <div className="flex items-center gap-4 flex-1">
              <Avatar className="h-16 w-16 flex-shrink-0">
                <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
                <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-lg leading-tight truncate">{profile.full_name}</p>
                  {pkg && (
                    <Badge variant="outline" className="text-xs capitalize shrink-0">
                      {pkg.type.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
                {membership ? (
                  <>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {membership.expires_at
                            ? `Expires ${new Date(membership.expires_at).toLocaleDateString(
                                'en-US',
                                { month: 'short', day: 'numeric', year: 'numeric' }
                              )}`
                            : 'No expiry date'}
                        </span>
                        <span className="font-medium text-sm">{daysRemaining} days left</span>
                      </div>
                      <Progress value={progressPct} className="h-2" />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">No active membership</p>
                )}
              </div>
            </div>

            {/* Right side: status badge + renew */}
            <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
              {membership ? (
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize',
                    getStatusBadgeClass(membership.status)
                  )}
                >
                  {membership.status}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700 border-red-200">
                  No Membership
                </span>
              )}
              {(isExpiringSoon || isExpired) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-400 text-amber-700 hover:bg-amber-50 text-xs"
                  asChild
                >
                  <Link href="/member/billing">Renew Now</Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Ticket className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">
              {membership?.sessions_remaining ?? '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Sessions Left</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{classesThisMonth}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Classes This Month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <ScanLine className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{checkinsThisMonth}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Check-ins This Month</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Classes + PT Sessions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Upcoming Classes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Upcoming Classes</CardTitle>
            <Link
              href="/member/classes"
              className="text-xs text-primary hover:underline font-medium"
            >
              View All →
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No upcoming class bookings. Browse the schedule to book a class.
              </p>
            ) : (
              <ul className="space-y-3">
                {upcomingBookings.map((booking) => {
                  const cls = booking.classes
                  if (!cls) return null
                  return (
                    <li key={booking.id} className="flex items-start gap-3">
                      <div
                        className="mt-0.5 h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: cls.class_types?.color
                            ? cls.class_types.color + '20'
                            : '#6366f120',
                        }}
                      >
                        <Calendar
                          className="h-4 w-4"
                          style={{ color: cls.class_types?.color ?? '#6366f1' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {cls.class_types?.name ?? 'Class'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatClassDateTime(cls.scheduled_at)}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          {cls.instructor_profile && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {cls.instructor_profile.full_name}
                            </span>
                          )}
                          {cls.room && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {cls.room}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Upcoming PT Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Upcoming PT Sessions</CardTitle>
            <Link
              href="/member/pt-booking"
              className="text-xs text-primary hover:underline font-medium"
            >
              View All →
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingPTSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No upcoming PT sessions. Book a session with a trainer.
              </p>
            ) : (
              <ul className="space-y-3">
                {upcomingPTSessions.map((session) => {
                  const trainerProfile = session.trainer?.profiles
                  return (
                    <li key={session.id} className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarImage
                          src={trainerProfile?.avatar_url ?? undefined}
                          alt={trainerProfile?.full_name ?? 'Trainer'}
                        />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {trainerProfile ? getInitials(trainerProfile.full_name) : 'TR'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {trainerProfile?.full_name ?? 'Personal Trainer'}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatClassDateTime(session.scheduled_at)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Check-ins */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recent Check-ins</CardTitle>
        </CardHeader>
        <CardContent>
          {recentCheckins.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No check-ins recorded yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {recentCheckins.map((checkin) => (
                <li
                  key={checkin.id}
                  className="flex items-center justify-between py-1 border-b last:border-b-0"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <ScanLine className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">
                      {formatCheckinTime(checkin.checked_in_at)}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs capitalize',
                      checkin.method === 'qr'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : checkin.method === 'staff'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    )}
                  >
                    {checkin.method.toUpperCase()}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
