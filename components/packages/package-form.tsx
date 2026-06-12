'use client'

import { useForm, useWatch } from 'react-hook-form'
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
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreatePackage, useUpdatePackage } from '@/lib/hooks/use-packages'
import type { Database } from '@/types/database'

type PackageRow = Database['public']['Tables']['membership_packages']['Row']

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['monthly', 'annual', 'sessions', 'day_pass']),
  duration_days: z.coerce.number().min(1, 'Must be at least 1 day'),
  session_credits: z.coerce.number().optional(),
  price: z.coerce.number().min(0, 'Price must be 0 or more'),
  currency: z.string().default('IDR'),
  allow_freeze: z.boolean().default(false),
  max_freeze_days: z.coerce.number().optional(),
})

type FormData = z.infer<typeof schema>

interface PackageFormProps {
  package?: PackageRow
  onSuccess: () => void
}

export function PackageForm({ package: pkg, onSuccess }: PackageFormProps) {
  const createMutation = useCreatePackage()
  const updateMutation = useUpdatePackage()
  const isPending = createMutation.isPending || updateMutation.isPending

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: pkg?.name ?? '',
      type: pkg?.type ?? 'monthly',
      duration_days: pkg?.duration_days ?? 30,
      session_credits: pkg?.session_credits ?? undefined,
      price: pkg?.price ?? 0,
      currency: pkg?.currency ?? 'IDR',
      allow_freeze: pkg?.allow_freeze ?? false,
      max_freeze_days: pkg?.max_freeze_days ?? undefined,
    },
  })

  const watchedType = useWatch({ control: form.control, name: 'type' })
  const watchedAllowFreeze = useWatch({ control: form.control, name: 'allow_freeze' })

  async function onSubmit(data: FormData) {
    const payload = {
      name: data.name,
      type: data.type,
      duration_days: data.duration_days,
      session_credits: data.type === 'sessions' ? data.session_credits : undefined,
      price: data.price,
      currency: data.currency,
      allow_freeze: data.allow_freeze,
      max_freeze_days: data.allow_freeze ? data.max_freeze_days : undefined,
    }

    if (pkg) {
      await updateMutation.mutateAsync({ id: pkg.id, input: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    onSuccess()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{pkg ? 'Edit Package' : 'New Package'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Row 1: Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Monthly Unlimited" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Row 2: Type + Duration */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="sessions">Sessions</SelectItem>
                        <SelectItem value="day_pass">Day Pass</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (days)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 3: Price + Currency */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input placeholder="IDR" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Session Credits (only for sessions type) */}
            {watchedType === 'sessions' && (
              <FormField
                control={form.control}
                name="session_credits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Credits</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="e.g. 10"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Allow Freeze */}
            <FormField
              control={form.control}
              name="allow_freeze"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel className="text-base">Allow Freeze</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Members can freeze this membership
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Max Freeze Days (only when allow_freeze) */}
            {watchedAllowFreeze && (
              <FormField
                control={form.control}
                name="max_freeze_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Freeze Days</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="e.g. 30"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Saving...' : pkg ? 'Update Package' : 'Create Package'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
