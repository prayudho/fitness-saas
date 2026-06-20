'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { ArrowLeft, Loader2, Mail, Phone, Calendar, ShieldCheck } from 'lucide-react'

import { updateTeamMemberSchema, type UpdateTeamMemberInput } from '@/lib/validations/team'
import { useRole } from '@/lib/hooks/use-role'
import {
  useTeamMember,
  useCustomRoles,
  useUpdateTeamMember,
  useDeactivateTeamMember,
  useReactivateTeamMember,
} from '@/lib/hooks/use-team'
import { useBranchList } from '@/lib/hooks/use-branches'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { StatusBadge } from '@/components/shared/status-badge'

function getRoleBadgeClass(role: string): string {
  switch (role) {
    case 'admin':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'staff':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'trainer':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'support':
      return 'bg-purple-100 text-purple-700 border-purple-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function TeamMemberDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { brandId } = useRole()

  const { data: member, isLoading } = useTeamMember(id)
  const { data: customRoles } = useCustomRoles(brandId ?? '')
  const { data: branchData } = useBranchList()
  const updateMutation = useUpdateTeamMember()
  const deactivate = useDeactivateTeamMember()
  const reactivate = useReactivateTeamMember()

  const isMultiBranch = branchData?.isMultiBranch ?? false
  const branches = branchData?.data ?? []

  const form = useForm<UpdateTeamMemberInput>({
    resolver: zodResolver(updateTeamMemberSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      role: undefined,
      customRoleId: undefined,
      branchId: undefined,
    },
  })

  const watchedRole = useWatch({ control: form.control, name: 'role' })

  useEffect(() => {
    if (member) {
      const branchId = member.branch_id ?? member.home_branch_id ?? undefined
      form.reset({
        fullName: member.full_name,
        phone: member.phone ?? '',
        role: member.role as UpdateTeamMemberInput['role'],
        customRoleId: member.custom_role_id ?? undefined,
        branchId,
      })
    }
  }, [member, form])

  async function onSubmit(data: UpdateTeamMemberInput) {
    await updateMutation.mutateAsync({ id, input: data })
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-5">
          <div className="md:col-span-2">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <div className="md:col-span-3">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    )
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground">Team member not found.</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/admin/team">Back to Team</Link>
        </Button>
      </div>
    )
  }

  const initials = member.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const hasCustomRoles = (customRoles ?? []).length > 0
  const showCustomRoleSelect = watchedRole === 'support' && hasCustomRoles
  const showBranchSelect = branches.length > 0 && ['staff', 'trainer', 'branch_manager'].includes(watchedRole ?? '')

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/team">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Team
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        {/* Left: Profile card */}
        <div className="md:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-bold">{member.full_name}</h2>
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${getRoleBadgeClass(member.role)}`}
                    >
                      {member.custom_role_name ? `Custom: ${member.custom_role_name}` : member.role}
                    </span>
                    <StatusBadge status={member.is_active ? 'active' : 'inactive'} />
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {member.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate text-muted-foreground">{member.email}</span>
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">{member.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">
                    Joined {format(new Date(member.created_at), 'dd MMM yyyy')}
                  </span>
                </div>
                {member.must_change_password && (
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <span className="text-amber-600 text-xs">Password change required</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Edit form */}
        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Edit Details</CardTitle>
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
                          <Input placeholder="Full name" {...field} />
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
                          key={field.value ?? 'role-empty'}
                          onValueChange={(val) => {
                            field.onChange(val)
                            if (val !== 'support') form.setValue('customRoleId', undefined)
                            if (!['staff', 'trainer', 'branch_manager'].includes(val)) {
                              form.setValue('branchId', undefined)
                            }
                          }}
                          value={field.value}
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
                            <SelectItem value="branch_manager">Branch Manager</SelectItem>
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
                          <Select key={field.value ?? 'branch-empty'} onValueChange={field.onChange} value={field.value ?? ''}>
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

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          {member.is_active ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Deactivate Member</p>
                <p className="text-muted-foreground text-sm">
                  Revoke this member&apos;s platform access immediately.
                </p>
              </div>
              <ConfirmDialog
                title="Deactivate Team Member"
                description="This will revoke their access immediately. You can reactivate them at any time."
                onConfirm={async () => {
                  await deactivate.mutateAsync(id)
                }}
                isPending={deactivate.isPending}
                variant="destructive"
              >
                <Button
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  disabled={deactivate.isPending}
                >
                  Deactivate Member
                </Button>
              </ConfirmDialog>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Reactivate Member</p>
                <p className="text-muted-foreground text-sm">
                  Restore this member&apos;s access to the platform.
                </p>
              </div>
              <ConfirmDialog
                title="Reactivate Team Member"
                description="This will restore their access to the platform."
                onConfirm={async () => {
                  await reactivate.mutateAsync(id)
                }}
                isPending={reactivate.isPending}
              >
                <Button
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                  disabled={reactivate.isPending}
                >
                  Reactivate Member
                </Button>
              </ConfirmDialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
