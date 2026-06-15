'use client'

import { useState, useEffect } from 'react'
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
  FormDescription,
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
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  trainer_id: z.string().min(1, 'Please select a trainer'),
  sales_person_id: z.string().optional(),
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
  const [salesPeople, setSalesPeople] = useState<{ id: string; name: string; role: string }[]>([])

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { trainer_id: '', sales_person_id: '', notes: '' },
  })

  // Fetch staff/trainer/admin profiles for the "Sold By" selector
  useEffect(() => {
    async function fetchSalesPeople() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: rawProfileRow } = await supabase
        .from('profiles')
        .select('brand_id')
        .eq('id', user.id)
        .maybeSingle()
      const profileRow = rawProfileRow as { brand_id: string | null } | null
      if (!profileRow?.brand_id) return
      const brandId = profileRow.brand_id
      const { data: rawData } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('brand_id', brandId)
        .in('role', ['staff', 'trainer', 'admin'])
        .order('full_name')
      const data = rawData as { id: string; full_name: string | null; role: string | null }[] | null
      setSalesPeople((data ?? []).map((p) => ({ id: p.id, name: p.full_name ?? 'Unknown', role: p.role ?? '' })))
    }
    if (open) fetchSalesPeople()
  }, [open])

  // Auto-populate "Sold By" with the selected trainer when it changes (if not already set)
  const watchedTrainerId = form.watch('trainer_id')
  useEffect(() => {
    if (watchedTrainerId && !form.getValues('sales_person_id')) {
      form.setValue('sales_person_id', watchedTrainerId)
    }
  }, [watchedTrainerId, form])

  async function onSubmit(data: FormData) {
    if (mode === 'assign') {
      await assignMutation.mutateAsync({
        member_id:       memberId,
        trainer_id:      data.trainer_id,
        membership_id:   membershipId,
        notes:           data.notes,
        sales_person_id: data.sales_person_id || undefined,
      })
    } else if (currentAssignmentId) {
      await reassignMutation.mutateAsync({
        assignment_id:   currentAssignmentId,
        new_trainer_id:  data.trainer_id,
        notes:           data.notes,
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
              ? 'Select a trainer for this membership. A sales commission will be recorded for the sold-by person.'
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

            {mode === 'assign' && (
              <FormField
                control={form.control}
                name="sales_person_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sold By</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sales person…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {salesPeople.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                            {p.role ? ` (${p.role})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This person earns the sales commission for this package.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
