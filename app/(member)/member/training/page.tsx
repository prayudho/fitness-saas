'use client'

import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dumbbell, Clock, User } from 'lucide-react'
import { useMemberWorkoutHistory } from '@/lib/hooks/use-workout'
import { useAuth } from '@/lib/hooks/use-auth'
import { formatDate } from '@/lib/utils'
import type { WorkoutExercise } from '@/lib/validations/workout.validations'
import type { WorkoutLogWithDetails } from '@/lib/actions/workout.actions'

function WorkoutCard({ log }: { log: WorkoutLogWithDetails }) {
  const exercises = (log.exercises ?? []) as WorkoutExercise[]
  const trainer   = log.trainer as { full_name: string | null } | null
  const session   = log.session as { scheduled_at: string } | null

  const totalSets   = exercises.reduce((s, e) => s + e.sets.length, 0)
  const totalVolume = exercises.reduce(
    (s, e) => s + e.sets.reduce((ss, set) => ss + set.reps * set.weight, 0),
    0
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-sm">
              {session ? formatDate(session.scheduled_at) : formatDate(log.created_at)}
            </p>
            {trainer?.full_name && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <User className="h-3 w-3" />
                {trainer.full_name}
              </p>
            )}
          </div>
          <div className="text-right text-xs text-muted-foreground space-y-0.5">
            <p>{exercises.length} exercises</p>
            <p>{totalSets} sets</p>
            {totalVolume > 0 && <p>{totalVolume.toLocaleString()} kg volume</p>}
            {log.duration_minutes && (
              <p className="flex items-center gap-1 justify-end">
                <Clock className="h-3 w-3" />
                {log.duration_minutes} min
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        {exercises.map((ex, i) => (
          <div key={i} className="text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium truncate">{ex.name}</span>
              <span className="text-muted-foreground shrink-0 text-xs">
                {ex.sets.length} × {ex.sets.map((s) => `${s.reps}`).join('/')} reps
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {ex.muscle_groups.slice(0, 2).map((m) => (
                <Badge key={m} variant="secondary" className="text-xs px-1.5 py-0">{m}</Badge>
              ))}
            </div>
          </div>
        ))}

        {log.notes && (
          <p className="text-xs text-muted-foreground italic border-t pt-2 mt-2">{log.notes}</p>
        )}
      </CardContent>
    </Card>
  )
}

export default function MemberTrainingPage() {
  const { user } = useAuth()
  const { data: logs = [], isLoading } = useMemberWorkoutHistory(user?.id ?? '')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training History"
        description="Your workout logs across all sessions"
      />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground text-sm">No workout logs yet.</p>
            <p className="text-muted-foreground text-xs mt-1">
              Your trainer will log exercises here after each PT session.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{logs.length} workout{logs.length !== 1 ? 's' : ''} logged</p>
          {logs.map((log) => (
            <WorkoutCard key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  )
}
