'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCreateSession } from '@/lib/hooks/use-trainers'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

const schema = z.object({
  member_id: z.string().min(1, 'Please select a member'),
  scheduled_at: z.string().min(1, 'Please select a date and time'),
  duration_minutes: z.coerce.number().min(15, 'Minimum 15 minutes'),
  session_fee: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface SessionFormProps {
  trainerId: string
  onSuccess?: () => void
}

export function SessionForm({ trainerId, onSuccess }: SessionFormProps) {
  const mutation = useCreateSession()
  const [members, setMembers] = useState<Pick<ProfileRow, 'id' | 'full_name'>[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      member_id: '',
      scheduled_at: '',
      duration_minutes: 60,
      session_fee: 0,
      notes: '',
    },
  })

  useEffect(() => {
    async function fetchMembers() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: rawProfile } = await supabase
          .from('profiles')
          .select('brand_id')
          .eq('id', user.id)
          .single()

        const profile = rawProfile as { brand_id: string | null } | null
        if (!profile?.brand_id) return
        const brandId = profile.brand_id

        const { data: rawData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('brand_id', brandId)
          .in('role', ['member', 'trainer'])
          .order('full_name')

        setMembers((rawData as Pick<ProfileRow, 'id' | 'full_name'>[] | null) ?? [])
      } finally {
        setLoadingMembers(false)
      }
    }
    fetchMembers()
  }, [])

  async function onSubmit(data: FormData) {
    await mutation.mutateAsync({
      trainer_id: trainerId,
      member_id: data.member_id,
      scheduled_at: new Date(data.scheduled_at).toISOString(),
      duration_minutes: data.duration_minutes,
      session_fee: data.session_fee,
      notes: data.notes,
    })
    form.reset()
    onSuccess?.()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="member_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Member</FormLabel>
              {loadingMembers ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="scheduled_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date & Time</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="duration_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(Number(v))}
                  defaultValue={String(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="session_fee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Session Fee</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="1000" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Session notes or goals..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={mutation.isPending} className="w-full">
          {mutation.isPending ? 'Booking...' : 'Book Session'}
        </Button>
      </form>
    </Form>
  )
}
