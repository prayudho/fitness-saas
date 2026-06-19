'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dumbbell, Clock, User } from 'lucide-react'
import { useMemberWorkoutHistory } from '@/lib/hooks/use-workout'
import { formatDate } from '@/lib/utils'
import type { WorkoutExercise } from '@/lib/validations/workout.validations'
import type { WorkoutLogWithDetails } from '@/lib/actions/workout.actions'

interface MemberWorkoutHistoryProps {
  memberId: string
}

function WorkoutLogCard({ log }: { log: WorkoutLogWithDetails }) {
  const exercises = (log.exercises ?? []) as WorkoutExercise[]
  const trainer   = log.trainer as { full_name: string | null } | null
  const session   = log.session as { scheduled_at: string } | null

  const totalSets   = exercises.reduce((s, e) => s + e.sets.length, 0)
  const totalVolume = exercises.reduce(
    (sum, e) => sum + e.sets.reduce((ss, s) => ss + s.reps * s.weight, 0),
    0
  )

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-medium">
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
          <p>{exercises.length} exercises · {totalSets} sets</p>
          {totalVolume > 0 && <p>{totalVolume.toLocaleString()} kg vol</p>}
          {log.duration_minutes && (
            <p className="flex items-center gap-1 justify-end">
              <Clock className="h-3 w-3" />
              {log.duration_minutes} min
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {exercises.map((ex, i) => (
          <div key={i} className="text-xs">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="truncate text-sm font-medium">{ex.name}</span>
              {ex.muscle_groups.slice(0, 1).map((m) => (
                <Badge key={m} variant="secondary" className="text-xs px-1.5 py-0 shrink-0">{m}</Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground pl-1">
              {ex.sets.map((set, si) => (
                <span key={si}>
                  Set {si + 1}: {set.reps} reps{set.weight ? ` @ ${set.weight}kg` : ''}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {log.notes && (
        <p className="text-xs text-muted-foreground italic mt-2 pt-2 border-t">{log.notes}</p>
      )}
    </div>
  )
}

export function MemberWorkoutHistory({ memberId }: MemberWorkoutHistoryProps) {
  const { data: logs = [], isLoading, isError } = useMemberWorkoutHistory(memberId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Workout History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Failed to load workout history.</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center">
            <Dumbbell className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No workout logs yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{logs.length} workout{logs.length !== 1 ? 's' : ''} logged</p>
            {logs.map((log) => (
              <WorkoutLogCard key={log.id} log={log} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
