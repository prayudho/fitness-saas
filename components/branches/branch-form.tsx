'use client'

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
import { useCreateBranch, useUpdateBranch } from '@/lib/hooks/use-branches'
import type { BranchWithStats } from '@/lib/actions/branches.actions'

const schema = z.object({
  name:     z.string().min(1, 'Branch name is required').max(100),
  address:  z.string().max(255).optional(),
  phone:    z.string().max(50).optional(),
  timezone: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface BranchFormProps {
  branch?: BranchWithStats
  onSuccess: () => void
}

export function BranchForm({ branch, onSuccess }: BranchFormProps) {
  const create = useCreateBranch()
  const update = useUpdateBranch()
  const isPending = create.isPending || update.isPending

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:     branch?.name     ?? '',
      address:  branch?.address  ?? '',
      phone:    branch?.phone    ?? '',
      timezone: branch?.timezone ?? '',
    },
  })

  async function onSubmit(values: FormData) {
    const input = {
      name:     values.name,
      address:  values.address || undefined,
      phone:    values.phone   || undefined,
      timezone: values.timezone || undefined,
    }

    if (branch) {
      await update.mutateAsync({ id: branch.id, input })
    } else {
      await create.mutateAsync(input)
    }
    onSuccess()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Branch Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Main Branch, Kemang, Sudirman" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Jl. Contoh No. 123, Jakarta" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="+62 21 xxxxxxx" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone (optional)</FormLabel>
              <FormControl>
                <Input placeholder="Asia/Jakarta — leave blank to use brand default" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Saving…' : branch ? 'Save Changes' : 'Create Branch'}
        </Button>
      </form>
    </Form>
  )
}
