'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTrainerAvailability, useSetAvailability } from '@/lib/hooks/use-trainers'

const DAYS = [
  { label: 'Monday', value: 0 },
  { label: 'Tuesday', value: 1 },
  { label: 'Wednesday', value: 2 },
  { label: 'Thursday', value: 3 },
  { label: 'Friday', value: 4 },
  { label: 'Saturday', value: 5 },
  { label: 'Sunday', value: 6 },
]

interface DaySlot {
  enabled: boolean
  start_time: string
  end_time: string
}

type AvailabilityState = Record<number, DaySlot>

function buildDefaultState(): AvailabilityState {
  return Object.fromEntries(
    DAYS.map((d) => [d.value, { enabled: false, start_time: '09:00', end_time: '17:00' }])
  ) as AvailabilityState
}

interface AvailabilityEditorProps {
  trainerId: string
}

export function AvailabilityEditor({ trainerId }: AvailabilityEditorProps) {
  const { data: availability, isLoading } = useTrainerAvailability(trainerId)
  const mutation = useSetAvailability()
  const [slots, setSlots] = useState<AvailabilityState>(buildDefaultState())

  useEffect(() => {
    if (!availability) return
    const state = buildDefaultState()
    for (const slot of availability) {
      state[slot.day_of_week] = {
        enabled: true,
        start_time: slot.start_time.slice(0, 5),
        end_time: slot.end_time.slice(0, 5),
      }
    }
    setSlots(state)
  }, [availability])

  function toggleDay(day: number, enabled: boolean) {
    setSlots((prev) => ({ ...prev, [day]: { ...prev[day], enabled } }))
  }

  function updateTime(day: number, field: 'start_time' | 'end_time', value: string) {
    setSlots((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  async function handleSave() {
    const activeSlots = DAYS.filter((d) => slots[d.value].enabled).map((d) => ({
      day_of_week: d.value,
      start_time: slots[d.value].start_time,
      end_time: slots[d.value].end_time,
    }))

    await mutation.mutateAsync({ trainerId, slots: activeSlots })
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {DAYS.map((d) => (
          <Skeleton key={d.value} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {DAYS.map((day) => {
          const slot = slots[day.value]
          return (
            <Card key={day.value} className={slot.enabled ? '' : 'opacity-60'}>
              <CardContent className="flex items-center gap-4 p-4">
                <Switch
                  id={`day-${day.value}`}
                  checked={slot.enabled}
                  onCheckedChange={(checked) => toggleDay(day.value, checked)}
                />
                <Label htmlFor={`day-${day.value}`} className="w-24 font-medium cursor-pointer">
                  {day.label}
                </Label>
                {slot.enabled ? (
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">From</span>
                      <Input
                        type="time"
                        value={slot.start_time}
                        onChange={(e) => updateTime(day.value, 'start_time', e.target.value)}
                        className="w-32"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">To</span>
                      <Input
                        type="time"
                        value={slot.end_time}
                        onChange={(e) => updateTime(day.value, 'end_time', e.target.value)}
                        className="w-32"
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Not available</span>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Button onClick={handleSave} disabled={mutation.isPending} className="w-full sm:w-auto">
        {mutation.isPending ? 'Saving...' : 'Save Availability'}
      </Button>
    </div>
  )
}
