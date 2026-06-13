'use client'

import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dumbbell, User, Layers, Info } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { useCreatePackage, useUpdatePackage } from '@/lib/hooks/use-packages'
import type { Database } from '@/types/database'
import type { PackageCategory } from '@/lib/actions/packages'

type PackageRow = Database['public']['Tables']['membership_packages']['Row']

const schema = z
  .object({
    name:                  z.string().min(1, 'Name is required'),
    type:                  z.enum(['monthly', 'annual', 'sessions', 'day_pass']),
    package_category:      z.enum(['gym_access', 'pt_sessions', 'bundled']),
    gym_access_days:       z.coerce.number().min(1).optional(),
    pt_session_credits:    z.coerce.number().min(1).optional(),
    pt_session_expiry_days: z.coerce.number().min(1).optional(),
    price:                 z.coerce.number().min(0, 'Price must be 0 or more'),
    currency:              z.string().default('IDR'),
    allow_freeze:          z.boolean().default(false),
    max_freeze_days:       z.coerce.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.package_category === 'gym_access' || data.package_category === 'bundled') {
      if (!data.gym_access_days || data.gym_access_days < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Access duration is required',
          path: ['gym_access_days'],
        })
      }
    }
    if (data.package_category === 'pt_sessions' || data.package_category === 'bundled') {
      if (!data.pt_session_credits || data.pt_session_credits < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Number of sessions is required',
          path: ['pt_session_credits'],
        })
      }
      if (!data.pt_session_expiry_days || data.pt_session_expiry_days < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Session expiry days is required',
          path: ['pt_session_expiry_days'],
        })
      }
    }
  })

type FormData = z.infer<typeof schema>

interface PackageFormProps {
  package?: PackageRow
  onSuccess: () => void
}

const CATEGORY_OPTIONS: {
  value: PackageCategory
  label: string
  subtitle: string
  detail: string
  icon: React.ReactNode
  color: string
}[] = [
  {
    value:    'gym_access',
    label:    'Gym Access',
    subtitle: 'Entry + check-in',
    detail:   'Duration-based — grants a set number of access days.',
    icon:     <Dumbbell className="h-5 w-5" />,
    color:    'border-blue-500 bg-blue-50 text-blue-800',
  },
  {
    value:    'pt_sessions',
    label:    'PT Sessions',
    subtitle: 'Session credits',
    detail:   'Count + expiry — grants a fixed number of PT sessions.',
    icon:     <User className="h-5 w-5" />,
    color:    'border-purple-500 bg-purple-50 text-purple-800',
  },
  {
    value:    'bundled',
    label:    'Bundled',
    subtitle: 'Both together',
    detail:   'Gym access + PT session credits in one package.',
    icon:     <Layers className="h-5 w-5" />,
    color:    'border-teal-500 bg-teal-50 text-teal-800',
  },
]

function resolveCategory(pkg?: PackageRow): PackageCategory {
  if (!pkg) return 'gym_access'
  const cat = (pkg as unknown as { package_category?: string }).package_category
  if (cat === 'pt_sessions' || cat === 'bundled') return cat
  return 'gym_access'
}

export function PackageForm({ package: pkg, onSuccess }: PackageFormProps) {
  const createMutation = useCreatePackage()
  const updateMutation = useUpdatePackage()
  const isPending = createMutation.isPending || updateMutation.isPending

  const pkgAny = pkg as unknown as Record<string, unknown> | undefined

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:                  pkg?.name ?? '',
      type:                  pkg?.type ?? 'monthly',
      package_category:      resolveCategory(pkg),
      gym_access_days:       (pkgAny?.gym_access_days as number | undefined) ?? pkg?.duration_days ?? 30,
      pt_session_credits:    (pkgAny?.pt_session_credits as number | undefined) ?? undefined,
      pt_session_expiry_days: (pkgAny?.pt_session_expiry_days as number | undefined) ?? undefined,
      price:                 pkg?.price ?? 0,
      currency:              pkg?.currency ?? 'IDR',
      allow_freeze:          pkg?.allow_freeze ?? false,
      max_freeze_days:       pkg?.max_freeze_days ?? undefined,
    },
  })

  const category      = useWatch({ control: form.control, name: 'package_category' })
  const allowFreeze   = useWatch({ control: form.control, name: 'allow_freeze' })

  const showGymDays  = category === 'gym_access' || category === 'bundled'
  const showPTFields = category === 'pt_sessions' || category === 'bundled'

  async function onSubmit(data: FormData) {
    const payload = {
      name:                   data.name,
      type:                   data.type,
      package_category:       data.package_category,
      gym_access_days:        showGymDays ? data.gym_access_days : undefined,
      pt_session_credits:     showPTFields ? data.pt_session_credits : undefined,
      pt_session_expiry_days: showPTFields ? data.pt_session_expiry_days : undefined,
      duration_days:          showGymDays ? data.gym_access_days : undefined,
      price:                  data.price,
      currency:               data.currency,
      allow_freeze:           data.allow_freeze,
      max_freeze_days:        data.allow_freeze ? data.max_freeze_days : undefined,
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Category selector — card-style */}
            <FormField
              control={form.control}
              name="package_category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package Category</FormLabel>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {CATEGORY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-all hover:border-primary',
                          field.value === opt.value
                            ? opt.color + ' border-2'
                            : 'border-border bg-background text-muted-foreground'
                        )}
                      >
                        <span
                          className={cn(
                            'rounded-full p-1.5',
                            field.value === opt.value ? 'bg-white/60' : 'bg-muted'
                          )}
                        >
                          {opt.icon}
                        </span>
                        <span className="text-xs font-semibold leading-tight">{opt.label}</span>
                        <span className="text-[10px] leading-tight opacity-75">{opt.subtitle}</span>
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Bundled info callout */}
            {category === 'bundled' && (
              <div className="flex gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-700">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Gym access and PT session expiry dates are calculated independently from the
                  activation date.
                </span>
              </div>
            )}

            {/* Package Name */}
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

            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Type</FormLabel>
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

            {/* Gym Access Days (gym_access + bundled) */}
            {showGymDays && (
              <FormField
                control={form.control}
                name="gym_access_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Duration (days)</FormLabel>
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

            {/* PT Session Credits + expiry (pt_sessions + bundled) */}
            {showPTFields && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pt_session_credits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Sessions</FormLabel>
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
                <FormField
                  control={form.control}
                  name="pt_session_expiry_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sessions Expire After (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="e.g. 90"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Price + Currency */}
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

            {allowFreeze && (
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
