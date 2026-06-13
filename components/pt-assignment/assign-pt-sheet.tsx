'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
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
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useAssignPT, useReassignPT, useReleasePT } from '@/lib/hooks/use-pt-assignments'
import { useTrainers } from '@/lib/hooks/use-trainers'

const schema = z.object({
  trainer_id: z.string().min(1, 'Please select a trainer'),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface AssignPTSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string
  membershipId: string
  mode: 'assign' | 'reassign'
  currentAssignmentId?: string
}

export function AssignPTSheet({
  open,
  onOpenChange,
  memberId,
  membershipId,
  mode,
  currentAssignmentId,
}: AssignPTSheetProps) {
  const assignMutation  = useAssignPT()
  const reassignMutation = useReassignPT()
  const { data: trainers = [], isLoading: loadingTrainers } = useTrainers()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { trainer_id: '', notes: '' },
  })

  async function onSubmit(data: FormData) {
    if (mode === 'assign') {
      await assignMutation.mutateAsync({
        member_id: memberId,
        trainer_id: data.trainer_id,
        membership_id: membershipId,
        notes: data.notes,
      })
    } else if (currentAssignmentId) {
      await reassignMutation.mutateAsync({
        assignment_id: currentAssignmentId,
        new_trainer_id: data.trainer_id,
        notes: data.notes,
      })
    }
    form.reset()
    onOpenChange(false)
  }

  const isPending = assignMutation.isPending || reassignMutation.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{mode === 'assign' ? 'Assign Personal Trainer' : 'Reassign Trainer'}</SheetTitle>
          <SheetDescription>
            {mode === 'assign'
              ? 'Select a trainer for this membership. A sales commission will be recorded for the trainer.'
              : 'The current assignment will be closed and a new one created.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5">
            <FormField
              control={form.control}
              name="trainer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Trainer</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingTrainers ? 'Loading…' : 'Choose a trainer'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {trainers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.profiles?.full_name ?? 'Unknown'}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any notes about this assignment…"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? 'Saving…' : mode === 'assign' ? 'Assign Trainer' : 'Reassign Trainer'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => { form.reset(); onOpenChange(false) }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

// ─── Release confirm button ─────────────────────────────────────────────────

export function ReleasePTButton({
  assignmentId,
  onDone,
}: {
  assignmentId: string
  onDone?: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const release = useReleasePT()

  if (!confirm) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirm(true)}>
        Release Trainer
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-destructive">Are you sure?</span>
      <Button
        size="sm"
        variant="destructive"
        disabled={release.isPending}
        onClick={async () => {
          await release.mutateAsync(assignmentId)
          setConfirm(false)
          onDone?.()
        }}
      >
        {release.isPending ? 'Releasing…' : 'Yes, Release'}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
        Cancel
      </Button>
    </div>
  )
}
