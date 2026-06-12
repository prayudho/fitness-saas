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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateTrainer } from '@/lib/hooks/use-trainers'

const schema = z.object({
  bio: z.string().optional(),
  specialties: z.string().optional(),
  certifications: z.string().optional(),
  commission_model: z.enum(['flat', 'percent', 'per_session']),
  commission_value: z.coerce.number().min(0, 'Must be 0 or greater'),
})

type FormData = z.infer<typeof schema>

interface TrainerFormProps {
  trainer: {
    id: string
    bio?: string | null
    specialties?: string[] | null
    certifications?: string[] | null
    commission_model?: string | null
    commission_value?: number | null
  }
  onSuccess: () => void
}

export function TrainerForm({ trainer, onSuccess }: TrainerFormProps) {
  const mutation = useUpdateTrainer()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      bio: trainer.bio ?? '',
      specialties: (trainer.specialties ?? []).join(', '),
      certifications: (trainer.certifications ?? []).join(', '),
      commission_model: (trainer.commission_model as 'flat' | 'percent' | 'per_session') ?? 'flat',
      commission_value: trainer.commission_value ?? 0,
    },
  })

  async function onSubmit(data: FormData) {
    const specialtiesArray = data.specialties
      ? data.specialties.split(',').map((s) => s.trim()).filter(Boolean)
      : []
    const certificationsArray = data.certifications
      ? data.certifications.split(',').map((s) => s.trim()).filter(Boolean)
      : []

    await mutation.mutateAsync({
      id: trainer.id,
      input: {
        bio: data.bio,
        specialties: specialtiesArray,
        certifications: certificationsArray,
        commission_model: data.commission_model,
        commission_value: data.commission_value,
      },
    })
    onSuccess()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Trainer bio and background..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="specialties"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specialties</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Yoga, HIIT, Strength Training" {...field} />
              </FormControl>
              <p className="text-xs text-muted-foreground">Separate multiple with commas</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="certifications"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Certifications</FormLabel>
              <FormControl>
                <Input placeholder="e.g. ACE CPT, NASM, CrossFit L1" {...field} />
              </FormControl>
              <p className="text-xs text-muted-foreground">Separate multiple with commas</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="commission_model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Commission Model</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="flat">Flat Rate</SelectItem>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="per_session">Per Session</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="commission_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Commission Value</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={mutation.isPending} className="w-full">
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  )
}
