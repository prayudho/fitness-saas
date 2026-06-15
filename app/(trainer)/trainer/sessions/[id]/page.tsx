'use client'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ClipboardList, CheckCircle, Clock, User } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useTrainerSessionWithLog } from '@/lib/hooks/use-workout'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { WorkoutExercise } from '@/lib/validations/workout.validations'

interface PageProps {
  params: { id: string }
}

function ExerciseSummary({ exercises }: { exercises: WorkoutExercise[] }) {
  return (
    <div className="space-y-3">
      {exercises.map((ex, i) => (
        <div key={i} className="border rounded-lg p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="font-medium text-sm">{ex.name}</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {ex.muscle_groups.slice(0, 3).map((m) => (
                  <Badge key={m} variant="secondary" className="text-xs px-1.5 py-0">{m}</Badge>
                ))}
              </div>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{ex.sets.length} sets</span>
          </div>

          <div className="hidden sm:grid sm:grid-cols-[40px_1fr_1fr] gap-x-2 text-xs text-muted-foreground font-medium mb-1 px-1">
            <span>Set</span><span>Reps</span><span>Weight</span>
          </div>
          {ex.sets.map((s, si) => (
            <div key={si} className="grid grid-cols-[40px_1fr_1fr] gap-x-2 text-sm px-1 py-0.5">
              <span className="text-muted-foreground text-center">{si + 1}</span>
              <span>{s.reps} reps</span>
              <span>{s.weight > 0 ? `${s.weight} kg` : 'BW'}</span>
            </div>
          ))}
          {ex.notes && (
            <p className="text-xs text-muted-foreground mt-2 italic">{ex.notes}</p>
          )}
        </div>
      ))}
    </div>
  )
}

export default function TrainerSessionDetailPage({ params }: PageProps) {
  const { data, isLoading } = useTrainerSessionWithLog(params.id)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!data) notFound()

  const { session, log } = data
  const member = session.member as { id: string; full_name: string | null } | null
  const canLog = session.status === 'completed'
  const exercises = (log?.exercises ?? []) as WorkoutExercise[]

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/trainer/sessions"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Sessions
        </Link>
      </div>

      <PageHeader
        title="Session Detail"
        description={member?.full_name ?? 'Client'}
        action={
          canLog ? (
            <Button asChild>
              <Link href={`/trainer/sessions/${params.id}/log`}>
                <ClipboardList className="mr-2 h-4 w-4" />
                {log ? 'Edit Workout Log' : 'Log Workout'}
              </Link>
            </Button>
          ) : undefined
        }
      />

      {/* Session info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session Info</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> Client
              </dt>
              <dd className="text-sm font-medium mt-0.5">{member?.full_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" /> Status
              </dt>
              <dd className="mt-0.5">
                <StatusBadge status={session.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Date &amp; Time
              </dt>
              <dd className="text-sm font-medium mt-0.5">
                {formatDate(session.scheduled_at)}{' '}
                <span className="text-muted-foreground font-normal">
                  {new Date(session.scheduled_at).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Duration</dt>
              <dd className="text-sm font-medium mt-0.5">{session.duration_minutes} min</dd>
            </div>
            {session.session_fee != null && (
              <div>
                <dt className="text-xs text-muted-foreground">Session Fee</dt>
                <dd className="text-sm font-medium mt-0.5">{formatCurrency(session.session_fee)}</dd>
              </div>
            )}
            {session.notes && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Notes</dt>
                <dd className="text-sm mt-0.5">{session.notes}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Workout log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Workout Log</CardTitle>
          {canLog && exercises.length > 0 && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/trainer/sessions/${params.id}/log`}>Edit</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!canLog ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Workout can only be logged for completed sessions.
            </p>
          ) : exercises.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-muted-foreground">No workout logged yet.</p>
              <Button asChild size="sm">
                <Link href={`/trainer/sessions/${params.id}/log`}>
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Log Workout
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {log?.duration_minutes && (
                <p className="text-sm text-muted-foreground">
                  Duration: <span className="text-foreground font-medium">{log.duration_minutes} min</span>
                </p>
              )}
              <ExerciseSummary exercises={exercises} />
              {log?.notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Session notes</p>
                  <p className="text-sm">{log.notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
