'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ClassWithDetails } from '@/lib/actions/classes'

interface WeekScheduleGridProps {
  classes: ClassWithDetails[]
  weekStart: Date
  onClassClick: (classId: string) => void
  onWeekChange: (newWeekStart: Date) => void
  isAdmin?: boolean
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const START_HOUR = 6
const END_HOUR = 22
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const SLOT_HEIGHT = 60 // px per hour

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(99,102,241,${alpha})`
  return `rgba(${r},${g},${b},${alpha})`
}

export function WeekScheduleGrid({
  classes,
  weekStart,
  onClassClick,
  onWeekChange,
  isAdmin = false,
}: WeekScheduleGridProps) {
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [weekStart])

  const weekLabel = useMemo(() => {
    const end = weekDates[6]
    const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${startStr} – ${endStr}`
  }, [weekStart, weekDates])

  // Group classes by day index (0=Mon ... 6=Sun)
  const classesByDay = useMemo(() => {
    const map = new Map<number, ClassWithDetails[]>()
    for (let i = 0; i < 7; i++) map.set(i, [])

    classes.forEach((cls) => {
      const clsDate = new Date(cls.scheduled_at)
      // Find which day of the week it falls on (0=Mon)
      const dayOfWeek = clsDate.getDay() === 0 ? 6 : clsDate.getDay() - 1
      const existing = map.get(dayOfWeek) ?? []
      map.set(dayOfWeek, [...existing, cls])
    })

    return map
  }, [classes])

  function getClassPosition(cls: ClassWithDetails) {
    const date = new Date(cls.scheduled_at)
    const hour = date.getHours() + date.getMinutes() / 60
    const top = (hour - START_HOUR) * SLOT_HEIGHT
    const height = Math.max((cls.duration_minutes / 60) * SLOT_HEIGHT, 28)
    return { top, height }
  }

  function navigateWeek(direction: -1 | 1) {
    const next = new Date(weekStart)
    next.setDate(next.getDate() + direction * 7)
    onWeekChange(next)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Navigation header */}
      <div className="flex items-center justify-between px-1 py-2">
        <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Prev
        </Button>
        <span className="text-sm font-medium text-muted-foreground">{weekLabel}</span>
        <Button variant="outline" size="sm" onClick={() => navigateWeek(1)}>
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Grid */}
      <div className="border rounded-lg overflow-auto">
        <div className="flex min-w-[700px]">
          {/* Time column */}
          <div className="w-14 flex-shrink-0 border-r">
            <div className="h-12 border-b" /> {/* Header spacer */}
            {HOURS.map((h) => (
              <div
                key={h}
                className="border-b text-xs text-muted-foreground text-right pr-2 pt-1"
                style={{ height: SLOT_HEIGHT }}
              >
                {h.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map((date, dayIdx) => {
            const isToday =
              date.toDateString() === new Date().toDateString()
            const dayClasses = classesByDay.get(dayIdx) ?? []

            return (
              <div key={dayIdx} className="flex-1 border-r last:border-r-0 min-w-0">
                {/* Day header */}
                <div
                  className={cn(
                    'h-12 border-b flex flex-col items-center justify-center sticky top-0 bg-background z-10',
                    isToday && 'bg-primary/5'
                  )}
                >
                  <span className="text-xs text-muted-foreground">{DAYS[dayIdx]}</span>
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      isToday && 'text-primary'
                    )}
                  >
                    {date.getDate()}
                  </span>
                </div>

                {/* Time slots with classes */}
                <div className="relative" style={{ height: HOURS.length * SLOT_HEIGHT }}>
                  {/* Hourly grid lines */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute w-full border-b border-dashed border-border/40"
                      style={{ top: (h - START_HOUR) * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                    />
                  ))}

                  {/* Classes */}
                  {dayClasses.map((cls) => {
                    const { top, height } = getClassPosition(cls)
                    const color = cls.class_types?.color ?? '#6366f1'
                    const isCancelled = cls.status === 'cancelled'

                    return (
                      <button
                        key={cls.id}
                        onClick={() => onClassClick(cls.id)}
                        className={cn(
                          'absolute left-0.5 right-0.5 rounded text-left px-1.5 py-0.5 text-xs overflow-hidden',
                          'transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary',
                          isCancelled && 'opacity-40'
                        )}
                        style={{
                          top,
                          height,
                          backgroundColor: hexToRgba(color, 0.2),
                          borderLeft: `3px solid ${color}`,
                        }}
                      >
                        <span
                          className={cn(
                            'font-semibold leading-tight block truncate',
                            isCancelled && 'line-through'
                          )}
                          style={{ color }}
                        >
                          {cls.class_types?.name ?? 'Class'}
                        </span>
                        {height >= 44 && (
                          <>
                            {cls.instructor_profile?.full_name && (
                              <span className="text-muted-foreground block truncate leading-tight">
                                {cls.instructor_profile.full_name}
                              </span>
                            )}
                            <span className="text-muted-foreground leading-tight">
                              {cls.booked_count}/{cls.capacity}
                              {cls.room ? ` · ${cls.room}` : ''}
                            </span>
                          </>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
