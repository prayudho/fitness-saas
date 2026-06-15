'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, GripVertical, X } from 'lucide-react'
import type { WorkoutExercise, ExerciseSet } from '@/lib/validations/workout.validations'

interface WorkoutSetEditorProps {
  exercises:  WorkoutExercise[]
  onChange:   (exercises: WorkoutExercise[]) => void
}

export function WorkoutSetEditor({ exercises, onChange }: WorkoutSetEditorProps) {
  function updateExercise(index: number, patch: Partial<WorkoutExercise>) {
    const next = exercises.map((ex, i) => (i === index ? { ...ex, ...patch } : ex))
    onChange(next)
  }

  function removeExercise(index: number) {
    onChange(
      exercises
        .filter((_, i) => i !== index)
        .map((ex, i) => ({ ...ex, order: i + 1 }))
    )
  }

  function addSet(exIndex: number) {
    const ex  = exercises[exIndex]
    const last = ex.sets[ex.sets.length - 1]
    const newSet: ExerciseSet = last ? { reps: last.reps, weight: last.weight } : { reps: 10, weight: 0 }
    updateExercise(exIndex, { sets: [...ex.sets, newSet] })
  }

  function removeSet(exIndex: number, setIndex: number) {
    const ex = exercises[exIndex]
    if (ex.sets.length === 1) return
    updateExercise(exIndex, { sets: ex.sets.filter((_, i) => i !== setIndex) })
  }

  function updateSet(exIndex: number, setIndex: number, field: keyof ExerciseSet, value: string) {
    const num = parseFloat(value)
    if (isNaN(num) || num < 0) return
    const ex    = exercises[exIndex]
    const sets  = ex.sets.map((s, i) =>
      i === setIndex ? { ...s, [field]: field === 'reps' ? Math.floor(num) : num } : s
    )
    updateExercise(exIndex, { sets })
  }

  if (exercises.length === 0) return null

  return (
    <div className="space-y-4">
      {exercises.map((ex, exIndex) => (
        <div key={`${ex.exercise_id}-${exIndex}`} className="border rounded-lg overflow-hidden">
          {/* Exercise header */}
          <div className="flex items-start gap-2 px-3 py-2.5 bg-muted/40 border-b">
            <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{ex.name}</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {ex.muscle_groups.slice(0, 3).map((m) => (
                  <Badge key={m} variant="secondary" className="text-xs px-1.5 py-0">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeExercise(exIndex)}
              className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Sets — table on desktop, cards on mobile */}
          <div className="p-3 space-y-2">

            {/* Desktop table header */}
            <div className="hidden sm:grid sm:grid-cols-[40px_1fr_1fr_32px] gap-2 text-xs text-muted-foreground font-medium px-1">
              <span>Set</span>
              <span>Reps</span>
              <span>Weight (kg)</span>
              <span />
            </div>

            {ex.sets.map((set, setIndex) => (
              <div key={setIndex}>
                {/* Desktop row */}
                <div className="hidden sm:grid sm:grid-cols-[40px_1fr_1fr_32px] gap-2 items-center">
                  <span className="text-sm text-muted-foreground text-center">{setIndex + 1}</span>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={set.reps}
                    onChange={(e) => updateSet(exIndex, setIndex, 'reps', e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={set.weight}
                    onChange={(e) => updateSet(exIndex, setIndex, 'weight', e.target.value)}
                    className="h-8 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeSet(exIndex, setIndex)}
                    disabled={ex.sets.length === 1}
                    className="text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Mobile card */}
                <div className="sm:hidden bg-background border rounded-md p-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Set {setIndex + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeSet(exIndex, setIndex)}
                      disabled={ex.sets.length === 1}
                      className="text-muted-foreground hover:text-destructive disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Reps</p>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={set.reps}
                        onChange={(e) => updateSet(exIndex, setIndex, 'reps', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Weight (kg)</p>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={set.weight}
                        onChange={(e) => updateSet(exIndex, setIndex, 'weight', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addSet(exIndex)}
              className="w-full text-xs h-7 mt-1"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Set
            </Button>

            {/* Per-exercise notes */}
            <Textarea
              placeholder="Exercise notes (optional)…"
              value={ex.notes ?? ''}
              onChange={(e) => updateExercise(exIndex, { notes: e.target.value || undefined })}
              className="text-sm min-h-[60px] resize-none"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
