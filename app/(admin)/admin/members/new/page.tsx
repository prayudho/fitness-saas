'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { registerMemberByAdmin } from '@/lib/actions/membership.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
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
} from '@/components/ui/form'
import { PageHeader } from '@/components/shared/page-header'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Banknote,
  Building2,
  Plus,
  Minus,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Database } from '@/types/database'
import { useBranchList } from '@/lib/hooks/use-branches'
import type { BranchRow } from '@/lib/actions/branches.actions'

// ─── Types ───────────────────────────────────────────────────────────────────

type PackageRow = Database['public']['Tables']['membership_packages']['Row']

type Flow = 'register-only' | 'register-activate'

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const step1Schema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  homeBranchId: z.string().optional(),
})

const step2ActivateSchema = z.object({
  packageId: z.string().uuid('Please select a package'),
  paymentMethod: z.enum(['cash', 'transfer'], { required_error: 'Please select a payment method' }),
  paymentNotes: z.string().optional(),
  amountPaid: z.number({ invalid_type_error: 'Enter a valid amount' }).positive('Amount must be positive'),
})

type Step1Values = z.infer<typeof step1Schema>
type Step2ActivateValues = z.infer<typeof step2ActivateSchema>

// ─── Success result type ─────────────────────────────────────────────────────

interface SuccessResult {
  memberId: string
  membershipId: string | null
  invoiceId: string | null
  memberName: string
  email: string
  packageName?: string
  expiresAt?: string
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-2.5 rounded-full transition-all duration-300',
            i + 1 === current
              ? 'w-8 bg-primary'
              : i + 1 < current
                ? 'w-2.5 bg-primary/60'
                : 'w-2.5 bg-muted'
          )}
        />
      ))}
    </div>
  )
}

// ─── Flow selector ───────────────────────────────────────────────────────────

function FlowSelector({ value, onChange }: { value: Flow; onChange: (v: Flow) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-8">
      {(
        [
          {
            id: 'register-only' as Flow,
            title: 'Register Only',
            description: 'Add member details and assign a package later.',
          },
          {
            id: 'register-activate' as Flow,
            title: 'Register + Activate Membership',
            description: 'Register the member and activate a membership package now.',
          },
        ] as { id: Flow; title: string; description: string }[]
      ).map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            'rounded-xl border-2 p-5 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            value === option.id
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:border-muted-foreground/40'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold text-sm">{option.title}</span>
            <div
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-all',
                value === option.id
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/50'
              )}
            >
              {value === option.id && (
                <div className="m-auto mt-0.5 h-1.5 w-1.5 rounded-full bg-white" />
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
        </button>
      ))}
    </div>
  )
}

// ─── Packages query ──────────────────────────────────────────────────────────

function getBrandIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)__fp_brand_id=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

function useActivePackages() {
  return useQuery({
    queryKey: ['packages', 'active'],
    queryFn: async (): Promise<PackageRow[]> => {
      const brandId = getBrandIdFromCookie()
      if (!brandId) throw new Error('No brand context')

      const supabase = createClient()
      const { data, error } = await supabase
        .from('membership_packages')
        .select('*')
        .eq('brand_id', brandId)
        .eq('is_active', true)
        .order('price', { ascending: true })

      if (error) throw error
      return data ?? []
    },
  })
}

// ─── Brand ID query ───────────────────────────────────────────────────────────

function useBrandId() {
  return useQuery({
    queryKey: ['my-brand-id'],
    queryFn: async (): Promise<string> => {
      const brandId = getBrandIdFromCookie()
      if (!brandId) throw new Error('No brand context')
      return brandId
    },
  })
}

// ─── Step 1: Personal Info ────────────────────────────────────────────────────

function Step1Form({
  defaultValues,
  onNext,
  isMultiBranch = false,
  branches = [],
}: {
  defaultValues: Partial<Step1Values>
  onNext: (data: Step1Values) => void
  isMultiBranch?: boolean
  branches?: BranchRow[]
}) {
  const [showEmergency, setShowEmergency] = useState(
    !!(defaultValues.emergencyContactName || defaultValues.emergencyContactPhone)
  )

  const form = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      fullName: defaultValues.fullName ?? '',
      email: defaultValues.email ?? '',
      phone: defaultValues.phone ?? '',
      dateOfBirth: defaultValues.dateOfBirth ?? '',
      gender: defaultValues.gender,
      emergencyContactName: defaultValues.emergencyContactName ?? '',
      emergencyContactPhone: defaultValues.emergencyContactPhone ?? '',
      homeBranchId: defaultValues.homeBranchId ?? '',
    },
  })

  const handleNext = async () => {
    const valid = await form.trigger(['fullName', 'email', 'phone'])
    if (!valid) return
    const values = form.getValues()
    onNext(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => { e.preventDefault(); handleNext() }} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="Jane Doe" {...field} />
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
                <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input type="email" placeholder="jane@example.com" {...field} />
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
                <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="08123456789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Emergency contact collapsible */}
        <div>
          <button
            type="button"
            onClick={() => setShowEmergency((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showEmergency ? (
              <Minus className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Emergency Contact (optional)
          </button>

          {showEmergency && (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="emergencyContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="08123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        {branches.length > 0 && (
          <FormField
            control={form.control}
            name="homeBranchId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Home Branch</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="No specific branch (can check in anywhere)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end">
          <Button type="submit">
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  )
}

// ─── Step 2 (Register+Activate): Membership ──────────────────────────────────

function Step2MembershipForm({
  defaultValues,
  onBack,
  onNext,
}: {
  defaultValues: Partial<Step2ActivateValues>
  onBack: () => void
  onNext: (data: Step2ActivateValues) => void
}) {
  const { data: packages, isLoading } = useActivePackages()

  const form = useForm<Step2ActivateValues>({
    resolver: zodResolver(step2ActivateSchema),
    defaultValues: {
      packageId: defaultValues.packageId ?? '',
      paymentMethod: defaultValues.paymentMethod,
      paymentNotes: defaultValues.paymentNotes ?? '',
      amountPaid: defaultValues.amountPaid,
    },
  })

  const selectedPackageId = form.watch('packageId')
  const selectedPackage = packages?.find((p) => p.id === selectedPackageId)

  // Auto-fill amount when package changes
  const handlePackageSelect = (pkg: PackageRow) => {
    form.setValue('packageId', pkg.id, { shouldValidate: true })
    if (!form.getValues('amountPaid')) {
      form.setValue('amountPaid', pkg.price ?? 0, { shouldValidate: true })
    }
  }

  const handleNext = async () => {
    const valid = await form.trigger()
    if (!valid) return
    onNext(form.getValues())
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => { e.preventDefault(); handleNext() }} className="space-y-6">
        {/* Package selector */}
        <div>
          <p className="mb-3 text-sm font-medium">
            Package <span className="text-destructive">*</span>
          </p>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : packages && packages.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => handlePackageSelect(pkg)}
                  className={cn(
                    'rounded-xl border-2 p-4 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    selectedPackageId === pkg.id
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/40'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-sm">{pkg.name}</span>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {pkg.type}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pkg.duration_days} days
                  </p>
                  <p className="mt-1 font-bold text-sm">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: pkg.currency ?? 'IDR',
                      maximumFractionDigits: 0,
                    }).format(pkg.price ?? 0)}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active packages found. Please create a package first.
            </p>
          )}
          <FormField
            control={form.control}
            name="packageId"
            render={() => (
              <FormItem className="mt-1">
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Payment method */}
        <div>
          <p className="mb-3 text-sm font-medium">
            Payment Method <span className="text-destructive">*</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { value: 'cash', label: 'Cash', Icon: Banknote },
                { value: 'transfer', label: 'Bank Transfer', Icon: Building2 },
              ] as { value: 'cash' | 'transfer'; label: string; Icon: React.ElementType }[]
            ).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => form.setValue('paymentMethod', value, { shouldValidate: true })}
                className={cn(
                  'flex items-center gap-3 rounded-xl border-2 p-4 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  form.watch('paymentMethod') === value
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/40'
                )}
              >
                <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
          <FormField
            control={form.control}
            name="paymentMethod"
            render={() => (
              <FormItem className="mt-1">
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Amount paid */}
        <FormField
          control={form.control}
          name="amountPaid"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Amount Paid <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder={selectedPackage ? String(selectedPackage.price ?? 0) : '0'}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Payment notes */}
        <FormField
          control={form.control}
          name="paymentNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference / Notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Transfer reference number, cash receipt ID, etc."
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <Button type="submit">
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  )
}

// ─── Info summary row ─────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-2 py-1.5 text-sm border-b last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

// ─── Step 2 (Register-only): Review & Confirm ────────────────────────────────

function Step2ReviewRegisterOnly({
  step1Data,
  onBack,
  onSubmit,
  isPending,
}: {
  step1Data: Step1Values
  onBack: () => void
  onSubmit: () => void
  isPending: boolean
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Personal Info
          </p>
          <SummaryRow label="Full Name" value={step1Data.fullName} />
          <SummaryRow label="Email" value={step1Data.email} />
          <SummaryRow label="Phone" value={step1Data.phone} />
          <SummaryRow label="Date of Birth" value={step1Data.dateOfBirth} />
          <SummaryRow
            label="Gender"
            value={
              step1Data.gender
                ? step1Data.gender.charAt(0).toUpperCase() + step1Data.gender.slice(1)
                : undefined
            }
          />
          <SummaryRow label="Emergency Contact" value={step1Data.emergencyContactName} />
          <SummaryRow label="Emergency Phone" value={step1Data.emergencyContactPhone} />
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-4">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          A welcome email with login credentials will be sent to{' '}
          <strong>{step1Data.email}</strong>.
        </p>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack} disabled={isPending}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button type="button" onClick={onSubmit} disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Confirm & Register
        </Button>
      </div>
    </div>
  )
}

// ─── Step 3 (Register+Activate): Review & Confirm ────────────────────────────

function Step3ReviewActivate({
  step1Data,
  step2Data,
  packages,
  onBack,
  onSubmit,
  isPending,
}: {
  step1Data: Step1Values
  step2Data: Step2ActivateValues
  packages: PackageRow[]
  onBack: () => void
  onSubmit: () => void
  isPending: boolean
}) {
  const selectedPackage = packages.find((p) => p.id === step2Data.packageId)
  const formattedPrice = selectedPackage
    ? new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: selectedPackage.currency ?? 'IDR',
        maximumFractionDigits: 0,
      }).format(step2Data.amountPaid)
    : String(step2Data.amountPaid)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Personal Info
            </p>
            <SummaryRow label="Full Name" value={step1Data.fullName} />
            <SummaryRow label="Email" value={step1Data.email} />
            <SummaryRow label="Phone" value={step1Data.phone} />
            <SummaryRow label="Date of Birth" value={step1Data.dateOfBirth} />
            <SummaryRow
              label="Gender"
              value={
                step1Data.gender
                  ? step1Data.gender.charAt(0).toUpperCase() + step1Data.gender.slice(1)
                  : undefined
              }
            />
            <SummaryRow label="Emergency Contact" value={step1Data.emergencyContactName} />
            <SummaryRow label="Emergency Phone" value={step1Data.emergencyContactPhone} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Membership
            </p>
            <SummaryRow label="Package" value={selectedPackage?.name} />
            <SummaryRow
              label="Duration"
              value={selectedPackage ? `${selectedPackage.duration_days} days` : undefined}
            />
            <SummaryRow label="Package Price" value={formattedPrice} />
            <SummaryRow
              label="Payment"
              value={
                step2Data.paymentMethod === 'cash' ? 'Cash' : 'Bank Transfer'
              }
            />
            <SummaryRow label="Notes" value={step2Data.paymentNotes} />
          </CardContent>
        </Card>
      </div>

      <div className="flex items-start gap-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-4">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          A welcome email with login credentials will be sent to{' '}
          <strong>{step1Data.email}</strong>.
        </p>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack} disabled={isPending}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button type="button" onClick={onSubmit} disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Confirm & Activate
        </Button>
      </div>
    </div>
  )
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({
  result,
  flow,
  packages,
  onRegisterAnother,
}: {
  result: SuccessResult
  flow: Flow
  packages: PackageRow[]
  onRegisterAnother: () => void
}) {
  const router = useRouter()
  const selectedPackage = packages.find((p) => p.id === result.membershipId)

  const expiresFormatted = result.expiresAt
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
        new Date(result.expiresAt)
      )
    : null

  return (
    <div className="flex flex-col items-center py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 mb-6">
        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>

      <h2 className="text-2xl font-bold mb-1">
        {flow === 'register-activate' ? 'Membership Activated!' : 'Member Registered!'}
      </h2>
      <p className="text-muted-foreground mb-6 text-sm">
        {result.memberName} has been successfully registered.
      </p>

      <Card className="w-full max-w-sm mb-8">
        <CardContent className="pt-4">
          <SummaryRow label="Name" value={result.memberName} />
          <SummaryRow label="Email" value={result.email} />
          {flow === 'register-activate' && (
            <>
              {selectedPackage && (
                <SummaryRow label="Package" value={selectedPackage.name} />
              )}
              {expiresFormatted && (
                <SummaryRow label="Expires" value={expiresFormatted} />
              )}
              {result.invoiceId && (
                <SummaryRow
                  label="Invoice"
                  value={`#${result.invoiceId.slice(0, 8).toUpperCase()}`}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 w-full max-w-sm sm:flex-row">
        <Button variant="outline" className="flex-1" onClick={onRegisterAnother}>
          Register Another
        </Button>
        <Button
          className="flex-1"
          onClick={() => router.push(`/admin/members/${result.memberId}`)}
        >
          View Profile
        </Button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewMemberPage() {
  const [flow, setFlow] = useState<Flow>('register-only')
  const [step, setStep] = useState(1)
  const [step1Data, setStep1Data] = useState<Step1Values | null>(null)
  const [step2Data, setStep2Data] = useState<Step2ActivateValues | null>(null)
  const [successResult, setSuccessResult] = useState<SuccessResult | null>(null)
  const [isPending, startTransition] = useTransition()

  const { data: brandId } = useBrandId()
  const { data: packages = [] } = useActivePackages()
  const { data: branchData } = useBranchList()

  const totalSteps = flow === 'register-only' ? 2 : 3

  const handleFlowChange = (newFlow: Flow) => {
    setFlow(newFlow)
    setStep(1)
    setStep1Data(null)
    setStep2Data(null)
  }

  const handleStep1Next = (data: Step1Values) => {
    setStep1Data(data)
    setStep(2)
  }

  const handleStep2MembershipNext = (data: Step2ActivateValues) => {
    setStep2Data(data)
    setStep(3)
  }

  const handleSubmitRegisterOnly = () => {
    if (!step1Data || !brandId) return

    startTransition(async () => {
      const result = await registerMemberByAdmin({
        brandId,
        fullName: step1Data.fullName,
        email: step1Data.email,
        phone: step1Data.phone,
        dateOfBirth: step1Data.dateOfBirth || undefined,
        gender: step1Data.gender,
        emergencyContactName: step1Data.emergencyContactName || undefined,
        emergencyContactPhone: step1Data.emergencyContactPhone || undefined,
        homeBranchId: step1Data.homeBranchId || undefined,
        sendWelcomeEmail: true,
      })

      if (result.error) {
        // Inline email-already-exists is shown by parent — we just toast generic errors
        toast.error(result.error)
        return
      }

      if (result.data) {
        setSuccessResult({
          memberId: result.data.memberId,
          membershipId: result.data.membershipId,
          invoiceId: result.data.invoiceId,
          memberName: step1Data.fullName,
          email: step1Data.email,
        })
      }
    })
  }

  const handleSubmitActivate = () => {
    if (!step1Data || !step2Data || !brandId) return

    startTransition(async () => {
      const result = await registerMemberByAdmin({
        brandId,
        fullName: step1Data.fullName,
        email: step1Data.email,
        phone: step1Data.phone,
        dateOfBirth: step1Data.dateOfBirth || undefined,
        gender: step1Data.gender,
        emergencyContactName: step1Data.emergencyContactName || undefined,
        emergencyContactPhone: step1Data.emergencyContactPhone || undefined,
        homeBranchId: step1Data.homeBranchId || undefined,
        packageId: step2Data.packageId,
        paymentMethod: step2Data.paymentMethod,
        paymentNotes: step2Data.paymentNotes || undefined,
        amountPaid: step2Data.amountPaid,
        sendWelcomeEmail: true,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      if (result.data) {
        const selectedPkg = packages.find((p) => p.id === step2Data.packageId)
        const expiresAt = selectedPkg?.duration_days
          ? new Date(Date.now() + selectedPkg.duration_days * 86400000).toISOString()
          : undefined

        setSuccessResult({
          memberId: result.data.memberId,
          membershipId: result.data.membershipId,
          invoiceId: result.data.invoiceId,
          memberName: step1Data.fullName,
          email: step1Data.email,
          packageName: selectedPkg?.name,
          expiresAt,
        })
      }
    })
  }

  const handleRegisterAnother = () => {
    setSuccessResult(null)
    setStep(1)
    setStep1Data(null)
    setStep2Data(null)
    setFlow('register-only')
  }

  // Success screen
  if (successResult) {
    return (
      <div className="mx-auto max-w-2xl">
        <SuccessScreen
          result={successResult}
          flow={flow}
          packages={packages}
          onRegisterAnother={handleRegisterAnother}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Register New Member"
        description="Add a new member to your gym."
      />

      <FlowSelector value={flow} onChange={handleFlowChange} />

      <StepIndicator current={step} total={totalSteps} />

      {/* Step labels */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Step {step} of {totalSteps} &mdash;{' '}
          {step === 1
            ? 'Personal Info'
            : flow === 'register-only'
              ? 'Review & Confirm'
              : step === 2
                ? 'Membership'
                : 'Review & Confirm'}
        </p>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <Step1Form
          defaultValues={step1Data ?? {}}
          onNext={handleStep1Next}
          isMultiBranch={branchData?.isMultiBranch ?? false}
          branches={branchData?.data ?? []}
        />
      )}

      {/* Step 2 — Register only: Review */}
      {step === 2 && flow === 'register-only' && step1Data && (
        <Step2ReviewRegisterOnly
          step1Data={step1Data}
          onBack={() => setStep(1)}
          onSubmit={handleSubmitRegisterOnly}
          isPending={isPending}
        />
      )}

      {/* Step 2 — Register+Activate: Membership */}
      {step === 2 && flow === 'register-activate' && (
        <Step2MembershipForm
          defaultValues={step2Data ?? {}}
          onBack={() => setStep(1)}
          onNext={handleStep2MembershipNext}
        />
      )}

      {/* Step 3 — Register+Activate: Review */}
      {step === 3 && flow === 'register-activate' && step1Data && step2Data && (
        <Step3ReviewActivate
          step1Data={step1Data}
          step2Data={step2Data}
          packages={packages}
          onBack={() => setStep(2)}
          onSubmit={handleSubmitActivate}
          isPending={isPending}
        />
      )}
    </div>
  )
}
