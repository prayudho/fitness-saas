'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useCreateClass } from '@/lib/hooks/use-classes'
import { useClassTypes } from '@/lib/hooks/use-classes'
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
import type { ClassInput } from '@/lib/actions/classes'

const schema = z.object({
  class_type_id: z.string().min(1, 'Class type is required'),
  instructor_id: z.string().optional(),
  room: z.string().optional(),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
  duration_minutes: z.coerce.number().int().min(1, 'Duration is required'),
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

export function ClassForm({ onSuccess, defaultValues }: ClassFormProps) {
  const { data: classTypes, isLoading: loadingTypes } = useClassTypes()
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loadingInstructors, setLoadingInstructors] = useState(false)
  const createClass = useCreateClass()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      class_type_id: defaultValues?.class_type_id ?? '',
      instructor_id: defaultValues?.instructor_id ?? undefined,
      room: defaultValues?.room ?? '',
      capacity: defaultValues?.capacity ?? 20,
      duration_minutes: defaultValues?.duration_minutes ?? 60,
      scheduled_at: defaultValues?.scheduled_at
        ? new Date(defaultValues.scheduled_at).toISOString().slice(0, 16)
        : '',
    },
  })

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
    const input: ClassInput = {
      class_type_id: data.class_type_id,
      instructor_id: data.instructor_id && data.instructor_id !== 'none' ? data.instructor_id : null,
      room: data.room || null,
      capacity: data.capacity,
      duration_minutes: data.duration_minutes,
      scheduled_at: new Date(data.scheduled_at).toISOString(),
    }
    await createClass.mutateAsync(input)
    onSuccess()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

        <div className="grid grid-cols-2 gap-4">
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

          <FormField
            control={form.control}
            name="scheduled_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date &amp; Time</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={createClass.isPending}>
            {createClass.isPending ? 'Saving...' : 'Create Class'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
