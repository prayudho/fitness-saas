'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Plus, Dumbbell } from 'lucide-react'
import { useExercises } from '@/lib/hooks/use-workout'
import type { Exercise } from '@/lib/actions/workout.actions'

const CATEGORIES = [
  { id: 'all',         label: 'All' },
  { id: 'strength',    label: 'Strength' },
  { id: 'cardio',      label: 'Cardio' },
  { id: 'plyometric',  label: 'Plyometric' },
  { id: 'flexibility', label: 'Flexibility' },
  { id: 'full_body',   label: 'Full Body' },
] as const

interface ExercisePickerProps {
  open:          boolean
  onOpenChange:  (v: boolean) => void
  onSelect:      (exercise: Exercise) => void
  alreadyAdded?: string[]
}

export function ExercisePicker({ open, onOpenChange, onSelect, alreadyAdded = [] }: ExercisePickerProps) {
  const [category, setCategory] = useState<string>('all')
  const [search, setSearch]     = useState('')

  const { data: exercises = [], isLoading } = useExercises(
    open ? { category: category === 'all' ? undefined : category, search: search || undefined } : undefined
  )

  function handleSelect(exercise: Exercise) {
    onSelect(exercise)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Add Exercise</DialogTitle>
        </DialogHeader>

        <div className="px-4 pt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search exercises…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Tabs value={category} onValueChange={setCategory}>
            <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
              {CATEGORIES.map((c) => (
                <TabsTrigger
                  key={c.id}
                  value={c.id}
                  className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1 border"
                >
                  {c.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 mt-3 space-y-1 min-h-0">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))
          ) : exercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <Dumbbell className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No exercises found</p>
            </div>
          ) : (
            exercises.map((ex) => {
              const added = alreadyAdded.includes(ex.id)
              return (
                <button
                  key={ex.id}
                  onClick={() => !added && handleSelect(ex)}
                  disabled={added}
                  className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-start justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ex.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ex.muscle_groups.slice(0, 3).map((m) => (
                        <Badge key={m} variant="secondary" className="text-xs px-1.5 py-0">
                          {m}
                        </Badge>
                      ))}
                      {ex.equipment && (
                        <span className="text-xs text-muted-foreground">{ex.equipment}</span>
                      )}
                    </div>
                  </div>
                  {added ? (
                    <span className="text-xs text-muted-foreground shrink-0 mt-0.5">Added</span>
                  ) : (
                    <Plus className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
