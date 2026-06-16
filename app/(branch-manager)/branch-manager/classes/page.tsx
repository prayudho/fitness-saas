'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { WeekScheduleGrid } from '@/components/classes/week-schedule-grid'
import { ClassDetailSheet } from '@/components/classes/class-detail-sheet'
import { useClasses } from '@/lib/hooks/use-classes'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function BranchManagerClassesPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const { data: classes = [], isLoading } = useClasses({
    weekStart: weekStart.toISOString(),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Schedule"
        description="View group fitness classes at your branch"
      />

      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
          Loading schedule...
        </div>
      ) : (
        <WeekScheduleGrid
          classes={classes}
          weekStart={weekStart}
          onClassClick={(id) => { setSelectedClassId(id); setIsDetailOpen(true) }}
          onWeekChange={setWeekStart}
          isAdmin={false}
        />
      )}

      <ClassDetailSheet
        classId={selectedClassId}
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setSelectedClassId(null) }}
        isAdmin={false}
      />
    </div>
  )
}
