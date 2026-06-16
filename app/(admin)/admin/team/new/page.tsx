'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Eye, EyeOff, Info } from 'lucide-react'

import { inviteTeamMemberSchema, type InviteTeamMemberInput } from '@/lib/validations/team'
import { useRole } from '@/lib/hooks/use-role'
import { useCustomRoles } from '@/lib/hooks/use-team'
import { useBranchList } from '@/lib/hooks/use-branches'
import { inviteTeamMember } from '@/lib/actions/team.actions'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewTeamMemberPage() {
  const router = useRouter()
  const { brandId } = useRole()
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const { data: customRoles } = useCustomRoles(brandId ?? '')
  const { data: branchData } = useBranchList()

  const form = useForm<InviteTeamMemberInput>({
    resolver: zodResolver(inviteTeamMemberSchema),
    defaultValues: {
      brandId: brandId ?? '',
      fullName: '',
      email: '',
      phone: '',
      role: 'staff',
      customRoleId: undefined,
      branchId: undefined,
      tempPassword: '',
    },
  })

  const watchedRole = useWatch({ control: form.control, name: 'role' })
  const watchedEmail = useWatch({ control: form.control, name: 'email' })

  const hasCustomRoles = (customRoles ?? []).length > 0
  const showCustomRoleSelect = watchedRole === 'support' && hasCustomRoles
  const isMultiBranch = branchData?.isMultiBranch ?? false
  const branches = branchData?.data ?? []
  const showBranchSelect = isMultiBranch && ['staff', 'trainer', 'branch_manager'].includes(watchedRole)

  async function onSubmit(data: InviteTeamMemberInput) {
    setIsPending(true)
    try {
      const result = await inviteTeamMember({ ...data, brandId: brandId ?? '' })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Invitation sent to ${data.fullName}`)
      router.push('/admin/team')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/team">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Team
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Team Member</h1>
        <p className="text-muted-foreground mt-1">
          Create an account and send login credentials to a new team member.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Member Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="budi@gym.com" {...field} />
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
                    <FormLabel>
                      Phone{' '}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="+62 812 3456 7890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val)
                        if (val !== 'support') {
                          form.setValue('customRoleId', undefined)
                        }
                        if (!['staff', 'trainer', 'branch_manager'].includes(val)) {
                          form.setValue('branchId', undefined)
                        }
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="trainer">Trainer</SelectItem>
                        {isMultiBranch && (
                          <SelectItem value="branch_manager">Branch Manager</SelectItem>
                        )}
                        <SelectItem value="support">Support</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showCustomRoleSelect && (
                <FormField
                  control={form.control}
                  name="customRoleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select custom role (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(customRoles ?? []).map((cr) => (
                            <SelectItem key={cr.id} value={cr.id}>
                              Custom: {cr.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {showBranchSelect && (
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {watchedRole === 'branch_manager' ? 'Managed Branch' : 'Home Branch'}
                        {watchedRole !== 'branch_manager' && (
                          <span className="text-muted-foreground font-normal"> (optional)</span>
                        )}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="tempPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temporary Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Minimum 8 characters"
                          {...field}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showPassword ? (
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

              {watchedEmail && (
                <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    A welcome email with these login credentials will be sent to{' '}
                    <strong>{watchedEmail}</strong>. They will be prompted to change their password
                    on first login.
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Invite
                </Button>
                <Button variant="outline" type="button" asChild>
                  <Link href="/admin/team">Cancel</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
