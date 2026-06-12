'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useFreezeMembership } from '@/lib/hooks/use-members'
import { Snowflake } from 'lucide-react'

const schema = z
  .object({
    frozen_from: z.string().min(1, 'Start date is required'),
    frozen_until: z.string().min(1, 'End date is required'),
    reason: z.string().optional(),
  })
  .refine((data) => data.frozen_until > data.frozen_from, {
    message: 'End date must be after start date',
    path: ['frozen_until'],
  })

type FormData = z.infer<typeof schema>

interface FreezeDialogProps {
  membershipId: string
  onSuccess?: () => void
}

export function FreezeDialog({ membershipId, onSuccess }: FreezeDialogProps) {
  const [open, setOpen] = useState(false)
  const freeze = useFreezeMembership()
  const today = new Date().toISOString().split('T')[0]

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      frozen_from: today,
      frozen_until: '',
      reason: '',
    },
  })

  async function onSubmit(data: FormData) {
    await freeze.mutateAsync({
      membershipId,
      input: {
        frozen_from: data.frozen_from,
        frozen_until: data.frozen_until,
        reason: data.reason || undefined,
      },
    })
    setOpen(false)
    form.reset()
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Snowflake className="mr-2 h-4 w-4" />
          Freeze
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Freeze Membership</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="frozen_from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Freeze From</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frozen_until"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Freeze Until</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. travelling, injury, personal reasons..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={freeze.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={freeze.isPending}>
                {freeze.isPending ? 'Freezing...' : 'Confirm Freeze'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
