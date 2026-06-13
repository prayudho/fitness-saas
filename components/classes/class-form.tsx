'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCreateClass, useClassTypes } from '@/lib/hooks/use-classes'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { ClassInput } from '@/lib/actions/classes'

const schema = z.object({
  class_type_id: z.string().min(1, 'Class type is required'),
  instructor_id: z.string().optional(),
  room: z.string().optional(),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
  duration_minutes: z.coerce.number().int().min(1, 'Duration is required'),
  // Stored as 'YYYY-MM-DDTHH:MM' in local time — combined from the date picker + time input
  scheduled_at: z.string().min(1, 'Date and time is required'),
})

type FormData = z.infer<typeof schema>

interface Instructor {
  id: string
  full_name: string
}

interface ClassFormProps {
  onSuccess: () => void
  defaultValues?: Partial<ClassInput>
}

const DURATION_OPTIONS = [
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '60 minutes', value: 60 },
  { label: '90 minutes', value: 90 },
]

// Convert a UTC ISO string from the DB to 'YYYY-MM-DDTHH:MM' in local time
function utcToLocalDatetimeString(isoString: string): string {
  const d = new Date(isoString)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ClassForm({ onSuccess, defaultValues }: ClassFormProps) {
  const { data: classTypes, isLoading: loadingTypes } = useClassTypes()
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loadingInstructors, setLoadingInstructors] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const createClass = useCreateClass()

  // Separate time state so the user can set the time before picking a date
  const [timeValue, setTimeValue] = useState<string>(() => {
    if (defaultValues?.scheduled_at) {
      const d = new Date(defaultValues.scheduled_at)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    return '09:00'
  })

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      class_type_id: defaultValues?.class_type_id ?? '',
      instructor_id: defaultValues?.instructor_id ?? undefined,
      room: defaultValues?.room ?? '',
      capacity: defaultValues?.capacity ?? 20,
      duration_minutes: defaultValues?.duration_minutes ?? 60,
      scheduled_at: defaultValues?.scheduled_at
        ? utcToLocalDatetimeString(defaultValues.scheduled_at)
        : '',
    },
  })

  // Derive the picked date from the current form value for Calendar display
  const scheduledAtValue = form.watch('scheduled_at')
  const pickedDate: Date | undefined = scheduledAtValue
    ? (() => {
        const [y, m, d] = scheduledAtValue.slice(0, 10).split('-').map(Number)
        return new Date(y, m - 1, d)
      })()
    : undefined

  function handleDateSelect(date: Date | undefined) {
    if (!date) return
    const dateStr = format(date, 'yyyy-MM-dd')
    form.setValue('scheduled_at', `${dateStr}T${timeValue}`, { shouldValidate: true })
    setCalendarOpen(false)
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const time = e.target.value
    setTimeValue(time)
    const current = form.getValues('scheduled_at')
    if (current) {
      form.setValue('scheduled_at', `${current.slice(0, 10)}T${time}`, { shouldValidate: true })
    }
  }

  useEffect(() => {
    async function loadInstructors() {
      setLoadingInstructors(true)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('role', ['trainer', 'staff', 'admin'])
          .order('full_name')
        setInstructors((data ?? []) as Instructor[])
      } finally {
        setLoadingInstructors(false)
      }
    }
    loadInstructors()
  }, [])

  async function onSubmit(data: FormData) {
    // Construct Date from local-time parts to correctly convert to UTC
    const [datePart, timePart] = data.scheduled_at.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hours, minutes] = timePart.split(':').map(Number)
    const scheduledDate = new Date(year, month - 1, day, hours, minutes, 0)

    const input: ClassInput = {
      class_type_id: data.class_type_id,
      instructor_id: data.instructor_id && data.instructor_id !== 'none' ? data.instructor_id : null,
      room: data.room || null,
      capacity: data.capacity,
      duration_minutes: data.duration_minutes,
      scheduled_at: scheduledDate.toISOString(),
    }
    await createClass.mutateAsync(input)
    onSuccess()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Class Type */}
        <FormField
          control={form.control}
          name="class_type_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Class Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={loadingTypes}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(classTypes ?? []).map((ct) => (
                    <SelectItem key={ct.id} value={ct.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: ct.color }}
                        />
                        {ct.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Instructor */}
        <FormField
          control={form.control}
          name="instructor_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instructor (optional)</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={loadingInstructors}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select instructor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No instructor</SelectItem>
                  {instructors.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Room + Capacity */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="room"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Room (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Studio A" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Duration */}
        <FormField
          control={form.control}
          name="duration_minutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration</FormLabel>
              <Select
                onValueChange={(v) => field.onChange(parseInt(v))}
                value={String(field.value)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date & Time — full-width row with Calendar popover + time input */}
        <FormField
          control={form.control}
          name="scheduled_at"
          render={() => (
            <FormItem>
              <FormLabel>Date &amp; Time</FormLabel>
              <div className="flex gap-2">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'flex-1 justify-start text-left font-normal',
                        !pickedDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      {pickedDate ? format(pickedDate, 'd MMM yyyy') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={pickedDate}
                      onSelect={handleDateSelect}
                      disabled={(date) => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        return date < today
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Input
                  type="time"
                  className="w-32"
                  value={timeValue}
                  onChange={handleTimeChange}
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={createClass.isPending}>
            {createClass.isPending ? 'Saving...' : 'Create Class'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
