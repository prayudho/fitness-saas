'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { updatePassword, setMustChangePasswordFalse } from '@/lib/actions/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const changePasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

interface ChangePasswordFormProps {
  brandName: string | null
}

export function ChangePasswordForm({ brandName }: ChangePasswordFormProps) {
  const router = useRouter()
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  })

  const { isSubmitting } = form.formState

  async function onSubmit(values: ChangePasswordFormValues) {
    const { error: updateError } = await updatePassword(values.newPassword)

    if (updateError) {
      toast.error(updateError)
      return
    }

    const { error: flagError } = await setMustChangePasswordFalse()

    if (flagError) {
      toast.error(flagError)
      return
    }

    toast.success('Password updated!')

    // Determine redirect based on role
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const role = user?.app_metadata?.role as string | undefined

    switch (role) {
      case 'superadmin':
        router.push('/superadmin/dashboard')
        break
      case 'admin':
        router.push('/admin/dashboard')
        break
      case 'staff':
        router.push('/staff/checkin')
        break
      case 'trainer':
        router.push('/trainer/schedule')
        break
      case 'member':
      default:
        router.push('/member')
        break
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Set your password</CardTitle>
          {brandName ? (
            <CardDescription>
              Welcome to <span className="font-medium">{brandName}</span>. Please set a new password
              to continue.
            </CardDescription>
          ) : (
            <CardDescription>
              Your account requires a new password before you can continue.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showNew ? 'text' : 'password'}
                          placeholder="Minimum 8 characters"
                          disabled={isSubmitting}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showConfirm ? 'text' : 'password'}
                          placeholder="Re-enter your new password"
                          disabled={isSubmitting}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showConfirm ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Set Password
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
