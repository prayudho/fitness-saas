'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, ClipboardList } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { ExercisePicker } from '@/components/shared/ExercisePicker'
import { WorkoutSetEditor } from '@/components/shared/WorkoutSetEditor'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { useTrainerSessionWithLog, useSaveWorkoutLog } from '@/lib/hooks/use-workout'
import type { WorkoutExercise } from '@/lib/validations/workout.validations'
import type { Exercise } from '@/lib/actions/workout.actions'

interface PageProps {
  params: { id: string }
}

export default function WorkoutLogPage({ params }: PageProps) {
  const router  = useRouter()
  const { data, isLoading } = useTrainerSessionWithLog(params.id)
  const saveMutation = useSaveWorkoutLog()

  const [exercises, setExercises]       = useState<WorkoutExercise[]>([])
  const [durationMin, setDurationMin]   = useState<string>('')
  const [notes, setNotes]               = useState('')
  const [pickerOpen, setPickerOpen]     = useState(false)
  const [initialized, setInitialized]   = useState(false)

  // Populate form from existing log on load
  useEffect(() => {
    if (!initialized && data) {
      setInitialized(true)
      if (data.log) {
        setExercises((data.log.exercises ?? []) as WorkoutExercise[])
        setDurationMin(data.log.duration_minutes ? String(data.log.duration_minutes) : '')
        setNotes(data.log.notes ?? '')
      } else if (data.session.duration_minutes) {
        setDurationMin(String(data.session.duration_minutes))
      }
    }
  }, [data, initialized])

  function addExercise(ex: Exercise) {
    const newEntry: WorkoutExercise = {
      exercise_id:   ex.id,
      name:          ex.name,
      muscle_groups: ex.muscle_groups,
      category:      ex.category,
      sets:          [{ reps: 10, weight: 0 }],
      order:         exercises.length + 1,
    }
    setExercises((prev) => [...prev, newEntry])
  }

  async function handleSave() {
    const session = data?.session
    if (!session) return

    const member = session.member as { id: string } | null
    if (!member) return

    await saveMutation.mutateAsync({
      trainer_session_id: params.id,
      member_id:          member.id,
      exercises,
      duration_minutes:   durationMin ? parseInt(durationMin, 10) : undefined,
      notes:              notes || undefined,
    })

    router.push(`/trainer/sessions/${params.id}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!data) return (
    <div className="p-6 text-center text-muted-foreground">
      Session not found or could not be loaded.
    </div>
  )

  const { session } = data
  const member      = session.member as { id: string; full_name: string | null } | null
  const alreadyAdded = exercises.map((e) => e.exercise_id)

  if (session.status !== 'completed') {
    return (
      <div className="space-y-4">
        <Link
          href={`/trainer/sessions/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Session
        </Link>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Workout can only be logged for completed sessions.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href={`/trainer/sessions/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Session
        </Link>
      </div>

      <PageHeader
        title="Log Workout"
        description={member?.full_name ?? 'Client'}
      />

      {/* Duration field */}
      <div className="flex items-center gap-3">
        <div className="w-36">
          <label className="text-xs text-muted-foreground mb-1 block">Duration (min)</label>
          <Input
            type="number"
            min="1"
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            placeholder={String(session.duration_minutes)}
          />
        </div>
      </div>

      {/* Exercise list */}
      <WorkoutSetEditor exercises={exercises} onChange={setExercises} />

      {/* Add exercise button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setPickerOpen(true)}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Exercise
      </Button>

      {/* Session notes */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Session notes (optional)</label>
        <Textarea
          placeholder="Overall session notes, client feedback, etc."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[80px]"
        />
      </div>

      {/* Save */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending || exercises.length === 0}
          className="flex-1"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save Workout Log'}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/trainer/sessions/${params.id}`}>Cancel</Link>
        </Button>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={addExercise}
        alreadyAdded={alreadyAdded}
      />
    </div>
  )
}
