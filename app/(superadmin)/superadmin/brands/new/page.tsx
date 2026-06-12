'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, ChevronRight, Copy, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useCreateBrand } from '@/lib/hooks/use-superadmin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'

// ─── Schemas ────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  brandName: z.string().min(2, 'Brand name must be at least 2 characters'),
  brandSlug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens'),
  plan: z.enum(['starter', 'growth', 'enterprise']),
})

const step2Schema = z.object({
  ownerName: z.string().min(2, 'Owner name required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const fullSchema = step1Schema.merge(step2Schema)
type FormValues = z.infer<typeof fullSchema>

// ─── Plan features ───────────────────────────────────────────────────────────

const PLANS = {
  starter: {
    label: 'Starter',
    price: 'Free',
    features: ['Up to 50 members', '1 branch', 'Basic check-in', 'Email support'],
  },
  growth: {
    label: 'Growth',
    price: '$29 / mo',
    features: ['Up to 500 members', '3 branches', 'QR check-in', 'Classes & trainers', 'Priority support'],
  },
  enterprise: {
    label: 'Enterprise',
    price: '$99 / mo',
    features: ['Unlimited members', 'Unlimited branches', 'All features', 'Dedicated support', 'Custom integrations'],
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$'
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: 'Brand Info' },
    { num: 2, label: 'Owner Account' },
    { num: 3, label: 'Confirm' },
  ]

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <React.Fragment key={step.num}>
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                currentStep > step.num
                  ? 'border-primary bg-primary text-primary-foreground'
                  : currentStep === step.num
                  ? 'border-primary text-primary'
                  : 'border-muted text-muted-foreground'
              )}
            >
              {currentStep > step.num ? <Check className="h-4 w-4" /> : step.num}
            </div>
            <span
              className={cn(
                'mt-1 text-xs font-medium',
                currentStep === step.num ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                'mx-2 mb-4 h-0.5 w-16 transition-colors',
                currentStep > step.num ? 'bg-primary' : 'bg-muted'
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NewBrandPage() {
  const router = useRouter()
  const [step, setStep] = React.useState(1)
  const [showPassword, setShowPassword] = React.useState(false)
  const createBrand = useCreateBrand()

  const form = useForm<FormValues>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      brandName: '',
      brandSlug: '',
      plan: 'starter',
      ownerName: '',
      email: '',
      password: generatePassword(),
    },
  })

  const { watch, setValue, trigger, getValues } = form

  const brandName = watch('brandName')
  const brandSlug = watch('brandSlug')
  const plan = watch('plan')
  const password = watch('password')

  // Auto-generate slug from brand name
  React.useEffect(() => {
    if (brandName && !form.formState.dirtyFields.brandSlug) {
      setValue('brandSlug', slugify(brandName), { shouldValidate: false })
    }
  }, [brandName, setValue, form.formState.dirtyFields.brandSlug])

  async function handleNext() {
    let valid = false
    if (step === 1) {
      valid = await trigger(['brandName', 'brandSlug', 'plan'])
    } else if (step === 2) {
      valid = await trigger(['ownerName', 'email', 'password'])
    }
    if (valid) setStep((s) => s + 1)
  }

  async function handleSubmit() {
    const values = getValues()
    await createBrand.mutateAsync(values)
    router.push('/superadmin/brands')
  }

  const values = getValues()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/superadmin/brands">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Brands
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Onboard New Brand</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create a new gym brand on the FitnessPlace platform.
        </p>
      </div>

      <div className="flex justify-center">
        <StepIndicator currentStep={step} />
      </div>

      <Form {...form}>
        <form>
          {/* ── Step 1: Brand Info ── */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Brand Information</CardTitle>
                <CardDescription>Set up the brand name, URL slug, and subscription plan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="brandName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Iron Gym Jakarta" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brandSlug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Slug</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. iron-gym-jakarta"
                          {...field}
                          onChange={(e) => {
                            field.onChange(slugify(e.target.value))
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Preview:{' '}
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          {brandSlug || 'your-slug'}.gerak.online
                        </span>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subscription Plan</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(PLANS).map(([key, p]) => (
                            <SelectItem key={key} value={key}>
                              {p.label} — {p.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {plan && (
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                    <p className="text-sm font-semibold capitalize">
                      {PLANS[plan as keyof typeof PLANS].label} plan includes:
                    </p>
                    <ul className="space-y-1">
                      {PLANS[plan as keyof typeof PLANS].features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Step 2: Owner Account ── */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Owner Account</CardTitle>
                <CardDescription>
                  Create the admin user who will manage this brand.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="ownerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Budi Santoso" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="owner@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temporary Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            {...field}
                            className="pr-20"
                          />
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setShowPassword((v) => !v)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                navigator.clipboard.writeText(password)
                                toast.success('Password copied to clipboard')
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        This password will be shared with the owner. They can change it after first login.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setValue('password', generatePassword())}
                >
                  Regenerate Password
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Confirm & Create</CardTitle>
                <CardDescription>Review the details before creating the brand.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border divide-y">
                  <div className="grid grid-cols-2 gap-2 p-4">
                    <span className="text-sm text-muted-foreground">Brand Name</span>
                    <span className="text-sm font-medium">{values.brandName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-4">
                    <span className="text-sm text-muted-foreground">URL Slug</span>
                    <span className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded w-fit">
                      {values.brandSlug}.gerak.online
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-4">
                    <span className="text-sm text-muted-foreground">Plan</span>
                    <Badge variant="secondary" className="capitalize w-fit">
                      {values.plan}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-4">
                    <span className="text-sm text-muted-foreground">Owner Name</span>
                    <span className="text-sm font-medium">{values.ownerName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-4">
                    <span className="text-sm text-muted-foreground">Owner Email</span>
                    <span className="text-sm font-medium">{values.email}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-4">
                    <span className="text-sm text-muted-foreground">Temporary Password</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
                        {values.password}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(values.password)
                          toast.success('Password copied')
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  A welcome email with login credentials will be sent to{' '}
                  <strong>{values.email}</strong>.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
            >
              Back
            </Button>

            {step < 3 ? (
              <Button type="button" onClick={handleNext}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={createBrand.isPending}
              >
                {createBrand.isPending ? 'Creating...' : 'Create Brand & Send Welcome Email'}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  )
}
