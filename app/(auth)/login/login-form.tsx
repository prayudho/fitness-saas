'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

import { signIn } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormValues = z.infer<typeof schema>

interface LoginFormProps {
  brandName: string | null
  brandLogo: string | null
  brandColor: string | null
}

export default function LoginForm({ brandName, brandLogo, brandColor }: LoginFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('email', values.email)
      formData.append('password', values.password)

      const result = await signIn(formData)

      if (result.error) {
        toast.error(result.error)
        return
      }

      const role = result.role ?? 'member'
      const destinations: Record<string, string> = {
        superadmin: '/superadmin/dashboard',
        admin: '/admin/dashboard',
        staff: '/staff/checkin',
        trainer: '/trainer/schedule',
        branch_manager: '/branch-manager',
        member: '/member',
      }

      router.push(destinations[role] ?? '/member')
    })
  }

  const handleGoogleSignIn = async () => {
    setOauthLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/api/auth/callback' },
    })
    if (error) {
      toast.error(error.message)
      setOauthLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-3 text-center">
        {brandLogo && (
          <div className="flex justify-center">
            <Image
              src={brandLogo}
              alt={brandName ?? 'Brand logo'}
              width={64}
              height={64}
              className="rounded-xl object-contain"
            />
          </div>
        )}
        {brandColor && !brandLogo && (
          <div
            className="mx-auto h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
            style={{ backgroundColor: brandColor }}
          >
            {brandName?.[0]?.toUpperCase() ?? 'G'}
          </div>
        )}
        <div>
          <CardTitle className="text-2xl font-bold">
            {brandName ? `Welcome to ${brandName}` : 'Welcome back'}
          </CardTitle>
          <CardDescription>
            {brandName ? `Sign in to your ${brandName} account` : 'Sign in to your account'}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
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

          <Button
            type="submit"
            className="w-full"
            disabled={isPending}
            style={brandColor ? { backgroundColor: brandColor } : undefined}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sign In
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={oauthLoading}
        >
          {oauthLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <span className="mr-2 font-bold text-blue-500">G</span>
          )}
          Continue with Google
        </Button>

        {!brandName && (
          <p className="text-center text-sm text-muted-foreground">
            New gym?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Register here
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
