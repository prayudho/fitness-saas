'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { signUp } from '@/lib/actions/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z
  .object({
    brandName: z.string().min(2, 'Brand name must be at least 2 characters'),
    brandSlug: z
      .string()
      .min(3, 'Slug must be at least 3 characters')
      .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens'),
    ownerName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

const step1Fields: (keyof FormValues)[] = ['brandName', 'brandSlug']
const step2Fields: (keyof FormValues)[] = ['ownerName', 'email', 'password', 'confirmPassword']

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export default function RegisterPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const brandName = watch('brandName', '')
  const brandSlug = watch('brandSlug', '')

  const handleBrandNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setValue('brandName', value)
    setValue('brandSlug', slugify(value))
  }

  const goToStep2 = async () => {
    const valid = await trigger(step1Fields)
    if (valid) setStep(2)
  }

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('brandName', values.brandName)
      formData.append('brandSlug', values.brandSlug)
      formData.append('ownerName', values.ownerName)
      formData.append('email', values.email)
      formData.append('password', values.password)

      const result = await signUp(formData)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Account created! Redirecting to dashboard...')
      router.push('/admin/dashboard')
    })
  }

  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">
          {step === 1 ? 'Your Gym' : 'Your Account'}
        </CardTitle>
        <CardDescription>
          {step === 1
            ? 'Tell us about your fitness brand'
            : 'Set up your owner account'}
        </CardDescription>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <div
            className={`h-2 w-16 rounded-full transition-colors ${
              step >= 1 ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          />
          <div
            className={`h-2 w-16 rounded-full transition-colors ${
              step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          />
        </div>
        <p className="text-xs text-muted-foreground">Step {step} of 2</p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Step 1 */}
          {step === 1 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="brandName">Brand Name</Label>
                <Input
                  id="brandName"
                  placeholder="CrossFit Downtown"
                  {...register('brandName')}
                  onChange={handleBrandNameChange}
                />
                {errors.brandName && (
                  <p className="text-xs text-destructive">{errors.brandName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="brandSlug">Brand Slug</Label>
                <Input
                  id="brandSlug"
                  placeholder="crossfit-downtown"
                  {...register('brandSlug')}
                />
                <p className="text-xs text-muted-foreground">
                  Your URL:{' '}
                  <span className="font-medium">
                    {brandSlug || 'yourbrand'}.gerak.online
                  </span>
                </p>
                {errors.brandSlug && (
                  <p className="text-xs text-destructive">{errors.brandSlug.message}</p>
                )}
              </div>

              <Button type="button" className="w-full" onClick={goToStep2}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="ownerName">Your Name</Label>
                <Input
                  id="ownerName"
                  placeholder="Jane Doe"
                  autoComplete="name"
                  {...register('ownerName')}
                />
                {errors.ownerName && (
                  <p className="text-xs text-destructive">{errors.ownerName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className="pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    className="pr-10"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                  disabled={isPending}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </div>
            </>
          )}
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
