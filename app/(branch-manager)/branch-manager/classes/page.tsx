'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { WeekScheduleGrid } from '@/components/classes/week-schedule-grid'
import { ClassDetailSheet } from '@/components/classes/class-detail-sheet'
import { ClassForm } from '@/components/classes/class-form'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  const [isAddClassOpen, setIsAddClassOpen] = useState(false)

  const { data: classes = [], isLoading } = useClasses({
    weekStart: weekStart.toISOString(),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Schedule"
        description="Manage group fitness classes at your branch"
        action={
          <Button size="sm" onClick={() => setIsAddClassOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Class
          </Button>
        }
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
          isAdmin={true}
        />
      )}

      <ClassDetailSheet
        classId={selectedClassId}
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setSelectedClassId(null) }}
        isAdmin={true}
      />

      <Sheet open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Schedule New Class</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <ClassForm onSuccess={() => setIsAddClassOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
