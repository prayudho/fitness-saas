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
import { Ticket, Calendar, ScanLine, MapPin, Clock, User, Dumbbell, AlertCircle } from 'lucide-react'
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

interface ClassWithType extends ClassRow {
  class_types: ClassTypeRow | null
  instructor_profile: Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url'> | null
}

interface BookingWithClass extends ClassBookingRow {
  classes: ClassWithType | null
}

interface AssignedTrainer {
  assignment_id: string
  trainer_id: string
  trainer_name: string
  trainer_avatar_url: string | null
  status: string
}

interface DashboardData {
  profile: ProfileRow
  activeMemberships: MembershipWithPackage[]
  upcomingBookings: BookingWithClass[]
  upcomingPTSessions: TrainerSessionWithTrainer[]
  recentCheckins: CheckinRow[]
  classesThisMonth: number
  checkinsThisMonth: number
  assignedTrainer: AssignedTrainer | null
}

async function fetchDashboardData(): Promise<DashboardData> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    profileResult,
    membershipsResult,
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
      .order('created_at', { ascending: false }),
    supabase
      .from('class_bookings')
      .select(`*, classes(*, class_types(*), instructor_profile:instructor_id(id, full_name, avatar_url))`)
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

  const activeMemberships = (membershipsResult.data ?? []) as unknown as MembershipWithPackage[]

  // Fetch PT assignment for first active PT/bundled membership
  let assignedTrainer: AssignedTrainer | null = null
  const ptMem = activeMemberships.find((m) => {
    const cat = ((m as unknown as Record<string, unknown>).package_category as string | undefined) ?? ''
    return cat === 'pt_sessions' || cat === 'bundled'
  })

  if (ptMem) {
    const assignmentResult = await supabase
      .from('pt_assignments')
      .select('id, trainer_id, status')
      .eq('member_id', user.id)
      .eq('membership_id', ptMem.id)
      .in('status', ['active', 'grace_period'])
      .maybeSingle()

    const assignment = assignmentResult.data as {
      id: string; trainer_id: string; status: string
    } | null

    if (assignment) {
      const trainerResult = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', assignment.trainer_id)
        .maybeSingle()

      const trainerProfile = trainerResult.data as {
        full_name: string; avatar_url: string | null
      } | null

      assignedTrainer = {
        assignment_id:      assignment.id,
        trainer_id:         assignment.trainer_id,
        trainer_name:       trainerProfile?.full_name ?? 'Unknown',
        trainer_avatar_url: trainerProfile?.avatar_url ?? null,
        status:             assignment.status,
      }
    }
  }

  return {
    profile: profileData,
    activeMemberships,
    upcomingBookings: ((bookingsResult.data ?? []) as unknown as BookingWithClass[]).filter(
      (b) => b.classes && new Date(b.classes.scheduled_at) >= now
    ),
    upcomingPTSessions: (ptSessionsResult.data ?? []) as unknown as TrainerSessionWithTrainer[],
    recentCheckins: (checkinsResult.data ?? []) as CheckinRow[],
    classesThisMonth: monthBookingsResult.count ?? 0,
    checkinsThisMonth: monthCheckinsResult.count ?? 0,
    assignedTrainer,
  }
}

function getTimeOfDay(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
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
    return 'Today ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
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

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function getDaysRemaining(expiresAt: string | null): number {
  if (!expiresAt) return 0
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000))
}

function getTotalDays(startsAt: string, expiresAt: string | null): number {
  if (!expiresAt) return 0
  return Math.max(1, Math.ceil((new Date(expiresAt).getTime() - new Date(startsAt).getTime()) / 86400000))
}

function progressColor(daysRemaining: number): string {
  if (daysRemaining <= 7)  return 'bg-red-500'
  if (daysRemaining <= 30) return 'bg-amber-500'
  return 'bg-green-500'
}

// ── Gym Access Card ──────────────────────────────────────────────────────────

function GymAccessCard({ membership }: { membership: MembershipWithPackage }) {
  const m = membership as unknown as Record<string, unknown>
  const gymExpiresAt = (m.gym_access_expires_at as string | null) ?? membership.expires_at
  const gymStatus = (m.gym_access_status as string | undefined) ?? 'active'

  const daysRemaining = getDaysRemaining(gymExpiresAt)
  const totalDays = getTotalDays(membership.starts_at, gymExpiresAt)
  const progressPct = totalDays > 0 ? Math.round((daysRemaining / totalDays) * 100) : 0
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7

  let badgeClass = 'bg-green-100 text-green-700 border-green-200'
  let badgeLabel = 'Active'
  if (gymStatus === 'expired' || daysRemaining === 0) {
    badgeClass = 'bg-red-100 text-red-700 border-red-200'
    badgeLabel = 'Expired'
  } else if (isExpiringSoon) {
    badgeClass = 'bg-amber-100 text-amber-700 border-amber-200'
    badgeLabel = 'Expiring Soon'
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Gym Access</span>
          </div>
          <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', badgeClass)}>
            {badgeLabel}
          </span>
        </div>

        <p className="font-semibold text-sm mb-3">{membership.membership_packages?.name ?? 'Membership'}</p>

        {gymExpiresAt ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Expires {new Date(gymExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="font-medium">{daysRemaining} days left</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', progressColor(daysRemaining))}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No expiry date</p>
        )}

        {isExpiringSoon && (
          <Button size="sm" variant="outline" className="mt-3 w-full border-amber-400 text-amber-700 text-xs hover:bg-amber-50" asChild>
            <Link href="/member/billing">Renew Now</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// ── PT Sessions Card ─────────────────────────────────────────────────────────

function PTSessionsCard({ membership, assignedTrainer }: {
  membership: MembershipWithPackage
  assignedTrainer?: AssignedTrainer | null
}) {
  const m = membership as unknown as Record<string, unknown>
  const ptExpiresAt = m.pt_sessions_expires_at as string | null
  const ptRemaining = m.pt_sessions_remaining as number | null
  const ptStatus = (m.pt_sessions_status as string | undefined) ?? 'active'

  const daysUntilPT = getDaysRemaining(ptExpiresAt)
  const isExpiringSoon = daysUntilPT > 0 && daysUntilPT <= 7
  const isLow = ptRemaining !== null && ptRemaining <= 3

  let badgeClass = 'bg-green-100 text-green-700 border-green-200'
  let badgeLabel = 'Active'
  if (ptStatus === 'expired' || daysUntilPT === 0) {
    badgeClass = 'bg-red-100 text-red-700 border-red-200'
    badgeLabel = 'Expired'
  } else if (ptStatus === 'exhausted' || ptRemaining === 0) {
    badgeClass = 'bg-red-100 text-red-700 border-red-200'
    badgeLabel = 'Exhausted'
  } else if (isLow) {
    badgeClass = 'bg-amber-100 text-amber-700 border-amber-200'
    badgeLabel = 'Low'
  } else if (isExpiringSoon) {
    badgeClass = 'bg-amber-100 text-amber-700 border-amber-200'
    badgeLabel = 'Expiring Soon'
  }

  // Session circles (max 10 shown)
  const totalCredits = m.pt_session_credits as number | undefined
  const displayMax = 10
  const circleCount = Math.min(totalCredits ?? ptRemaining ?? 10, displayMax)
  const overflowCount = totalCredits && totalCredits > displayMax ? totalCredits - displayMax : 0
  const filledCount = Math.min(ptRemaining ?? 0, displayMax)

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">PT Sessions</span>
          </div>
          <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', badgeClass)}>
            {badgeLabel}
          </span>
        </div>

        <p className="font-semibold text-sm mb-3">{membership.membership_packages?.name ?? 'PT Package'}</p>

        {/* Large remaining count */}
        <div className="mb-3">
          <span className="text-3xl font-bold text-purple-600">{ptRemaining ?? '—'}</span>
          <span className="text-sm text-muted-foreground ml-1">sessions remaining</span>
        </div>

        {/* Session circles */}
        {totalCredits != null && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Array.from({ length: circleCount }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-4 w-4 rounded-full border-2',
                  i < filledCount
                    ? 'bg-purple-500 border-purple-500'
                    : 'bg-background border-muted-foreground/30'
                )}
              />
            ))}
            {overflowCount > 0 && (
              <span className="text-xs text-muted-foreground self-center">+{overflowCount} more</span>
            )}
          </div>
        )}

        {ptExpiresAt && (
          <p className="text-xs text-muted-foreground">
            Credits expire {new Date(ptExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {daysUntilPT > 0 ? ` · ${daysUntilPT} days left` : ' · Expired'}
          </p>
        )}

        {/* My Personal Trainer */}
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-2">My Personal Trainer</p>
          {assignedTrainer ? (
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8">
                <AvatarImage src={assignedTrainer.trainer_avatar_url ?? undefined} />
                <AvatarFallback className="text-xs bg-purple-100 text-purple-700">
                  {assignedTrainer.trainer_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{assignedTrainer.trainer_name}</p>
                {assignedTrainer.status === 'grace_period' && (
                  <p className="text-xs text-amber-600">Grace period</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No trainer assigned yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Membership section ────────────────────────────────────────────────────────

function MembershipsSection({ memberships, assignedTrainer }: { memberships: MembershipWithPackage[]; assignedTrainer?: AssignedTrainer | null }) {
  if (memberships.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-semibold">No active membership</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Contact the gym to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const cards: React.ReactNode[] = []

  for (const m of memberships) {
    const category = ((m as unknown as Record<string, unknown>).package_category as string | undefined) ?? 'gym_access'

    if (category === 'gym_access' || category === 'bundled') {
      cards.push(<GymAccessCard key={`gym-${m.id}`} membership={m} />)
    }
    if (category === 'pt_sessions' || category === 'bundled') {
      cards.push(<PTSessionsCard key={`pt-${m.id}`} membership={m} assignedTrainer={assignedTrainer} />)
    }
    // Fallback for pre-migration memberships (no category set)
    if (category !== 'gym_access' && category !== 'pt_sessions' && category !== 'bundled') {
      cards.push(<GymAccessCard key={`legacy-${m.id}`} membership={m} />)
    }
  }

  return <div className="grid gap-3 sm:grid-cols-2">{cards}</div>
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-72" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Card><CardContent className="p-4 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-40" /><Skeleton className="h-2 w-full rounded-full" /></CardContent></Card>
        <Card><CardContent className="p-4 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-40" /><Skeleton className="h-8 w-16" /></CardContent></Card>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <Card key={i}><CardContent className="p-4 space-y-2"><Skeleton className="h-7 w-12" /><Skeleton className="h-3 w-24" /></CardContent></Card>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

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
    activeMemberships,
    upcomingBookings,
    upcomingPTSessions,
    recentCheckins,
    classesThisMonth,
    checkinsThisMonth,
    assignedTrainer,
  } = data

  const firstName = profile.full_name.split(' ')[0]

  // For the "Sessions Left" stat, find a pt-sessions membership
  const ptMembership = activeMemberships.find(
    (m) => {
      const cat = ((m as unknown as Record<string, unknown>).package_category as string | undefined) ?? ''
      return cat === 'pt_sessions' || cat === 'bundled'
    }
  )
  const ptRemaining = ptMembership
    ? ((ptMembership as unknown as Record<string, unknown>).pt_sessions_remaining as number | null)
    : null

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
          <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
            {getInitials(profile.full_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Good {getTimeOfDay()}, {firstName}!
          </h1>
        </div>
      </div>

      {/* Memberships Section */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-3">Your Memberships</p>
        <MembershipsSection memberships={activeMemberships} assignedTrainer={assignedTrainer} />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Ticket className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{ptRemaining ?? '—'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">PT Sessions Left</p>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Upcoming Classes</CardTitle>
            <Link href="/member/classes" className="text-xs text-primary hover:underline font-medium">
              View All →
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No upcoming class bookings.</p>
            ) : (
              <ul className="space-y-3">
                {upcomingBookings.map((booking) => {
                  const cls = booking.classes
                  if (!cls) return null
                  return (
                    <li key={booking.id} className="flex items-start gap-3">
                      <div
                        className="mt-0.5 h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: (cls.class_types?.color ?? '#6366f1') + '20' }}
                      >
                        <Calendar className="h-4 w-4" style={{ color: cls.class_types?.color ?? '#6366f1' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{cls.class_types?.name ?? 'Class'}</p>
                        <p className="text-xs text-muted-foreground">{formatClassDateTime(cls.scheduled_at)}</p>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Upcoming PT Sessions</CardTitle>
            <Link href="/member/pt-booking" className="text-xs text-primary hover:underline font-medium">
              View All →
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingPTSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No upcoming PT sessions.</p>
            ) : (
              <ul className="space-y-3">
                {upcomingPTSessions.map((session) => {
                  const trainerProfile = session.trainer?.profiles
                  return (
                    <li key={session.id} className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarImage src={trainerProfile?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {trainerProfile ? getInitials(trainerProfile.full_name) : 'TR'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{trainerProfile?.full_name ?? 'Personal Trainer'}</p>
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
                <li key={checkin.id} className="flex items-center justify-between py-1 border-b last:border-b-0">
                  <div className="flex items-center gap-2 text-sm">
                    <ScanLine className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">{formatCheckinTime(checkin.checked_in_at)}</span>
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
