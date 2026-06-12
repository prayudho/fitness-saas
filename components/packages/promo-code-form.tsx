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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreatePromoCode, useUpdatePromoCode } from '@/lib/hooks/use-packages'
import { formatCurrency } from '@/lib/utils'
import type { Database } from '@/types/database'

type PromoCodeRow = Database['public']['Tables']['promo_codes']['Row']

const schema = z
  .object({
    code: z.string().min(3, 'Code must be at least 3 characters').toUpperCase(),
    discount_type: z.enum(['percent', 'fixed'] as const),
    discount_value: z.coerce.number().min(0.01, 'Must be greater than 0'),
    max_uses: z.coerce.number().int().positive().optional().or(z.literal('')),
    valid_from: z.string().optional(),
    valid_until: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.discount_type === 'percent' && data.discount_value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: 100,
        type: 'number',
        inclusive: true,
        message: 'Percentage discount cannot exceed 100%',
        path: ['discount_value'],
      })
    }
  })

type FormData = z.infer<typeof schema>

interface PromoCodeFormProps {
  code?: PromoCodeRow
  onSuccess: () => void
}

export function PromoCodeForm({ code: promoCode, onSuccess }: PromoCodeFormProps) {
  const createMutation = useCreatePromoCode()
  const updateMutation = useUpdatePromoCode()
  const isPending = createMutation.isPending || updateMutation.isPending

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: promoCode?.code ?? '',
      discount_type: promoCode?.discount_type ?? 'percent',
      discount_value: promoCode?.discount_value ?? 0,
      max_uses: promoCode?.max_uses ?? '',
      valid_from: promoCode?.valid_from
        ? promoCode.valid_from.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      valid_until: promoCode?.valid_until ? promoCode.valid_until.slice(0, 10) : '',
    },
  })

  const watchedType = useWatch({ control: form.control, name: 'discount_type' })
  const watchedValue = useWatch({ control: form.control, name: 'discount_value' })
  const watchedCode = useWatch({ control: form.control, name: 'code' })

  function getPreviewText(): string {
    if (!watchedValue) return ''
    if (watchedType === 'percent') {
      return `e.g., ${watchedValue}% off any package`
    }
    return `${formatCurrency(watchedValue, 'IDR')} off`
  }

  async function onSubmit(data: FormData) {
    const payload = {
      code: data.code,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      max_uses: data.max_uses !== '' && data.max_uses !== undefined
        ? Number(data.max_uses)
        : undefined,
      valid_from: data.valid_from || undefined,
      valid_until: data.valid_until || undefined,
    }

    if (promoCode) {
      await updateMutation.mutateAsync({ id: promoCode.id, input: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    onSuccess()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{promoCode ? 'Edit Promo Code' : 'New Promo Code'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Code */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. SUMMER20"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.toUpperCase())
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Discount Type + Value */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="discount_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percent">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discount_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {watchedType === 'percent' ? 'Discount (%)' : 'Discount Amount'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={watchedType === 'percent' ? 100 : undefined}
                        step={watchedType === 'percent' ? 1 : 1000}
                        placeholder={watchedType === 'percent' ? '20' : '50000'}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Live Preview */}
            {watchedCode && watchedValue > 0 && (
              <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{watchedCode}</span>
                {' — '}
                {getPreviewText()}
              </div>
            )}

            {/* Max Uses */}
            <FormField
              control={form.control}
              name="max_uses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Uses (leave blank for unlimited)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Unlimited"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valid From / Until */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valid_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid From</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valid_until"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid Until (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Saving...' : promoCode ? 'Update Promo Code' : 'Create Promo Code'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
