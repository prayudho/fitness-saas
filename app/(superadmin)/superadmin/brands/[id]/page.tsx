'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  Users,
  DollarSign,
  CalendarDays,
  Dumbbell,
  Mail,
  ExternalLink,
  UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBrandDetail, useSuspendBrand, useActivateBrand } from '@/lib/hooks/use-superadmin'
import { getTeamMembers, inviteTeamMember } from '@/lib/actions/team.actions'
import type { TeamMember } from '@/lib/actions/team.actions'
import { inviteTeamMemberSchema, type InviteTeamMemberInput } from '@/lib/validations/team'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ----------------------------------------------------------------
// Invite team member sheet (inline, bound to this brand)
// ----------------------------------------------------------------
function InviteTeamMemberSheet({
  brandId,
  open,
  onOpenChange,
}: {
  brandId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const qc = useQueryClient()

  const form = useForm<InviteTeamMemberInput>({
    resolver: zodResolver(inviteTeamMemberSchema),
    defaultValues: {
      brandId,
      fullName: '',
      email: '',
      phone: '',
      role: 'staff',
      tempPassword: '',
    },
  })

  const invite = useMutation({
    mutationFn: async (data: InviteTeamMemberInput) => {
      const result = await inviteTeamMember(data)
      if (result.error) throw new Error(result.error)
      return result
    },
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['team-members', brandId] })
      toast.success('Team member invited successfully!')
      form.reset({ brandId, fullName: '', email: '', phone: '', role: 'staff', tempPassword: '' })
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Team Member</SheetTitle>
          <SheetDescription>
            Invite a new staff, trainer, or admin to this brand. They will receive a temporary
            password via email and be prompted to change it on first login.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => invite.mutate(v))}
            className="mt-6 space-y-4"
          >
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} disabled={invite.isPending} />
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
                    <Input
                      type="email"
                      placeholder="jane@example.com"
                      {...field}
                      disabled={invite.isPending}
                    />
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
                  <FormLabel>Phone (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+62 812 3456 7890"
                      {...field}
                      disabled={invite.isPending}
                    />
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
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={invite.isPending}
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
                      <SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tempPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporary password</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Min. 8 characters"
                      {...field}
                      disabled={invite.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={invite.isPending}>
              {invite.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Sending invite...
                </span>
              ) : (
                'Send Invite'
              )}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

// ----------------------------------------------------------------
// Team members table for the brand detail page
// ----------------------------------------------------------------
function BrandTeamSection({ brandId }: { brandId: string }) {
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['team-members', brandId],
    queryFn: async () => {
      const result = await getTeamMembers(brandId)
      if (result.error) throw new Error(result.error)
      return result
    },
    enabled: Boolean(brandId),
  })

  const members: TeamMember[] = data?.data ?? []

  function roleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
    if (role === 'admin') return 'default'
    if (role === 'trainer') return 'secondary'
    return 'outline'
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Team Members</CardTitle>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Team Member
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            No team members yet. Click &ldquo;Add Team Member&rdquo; to invite someone.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Date Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.full_name}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant(member.role)} className="capitalize">
                      {member.custom_role_name ?? member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.is_active ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {new Date(member.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <InviteTeamMemberSheet
        brandId={brandId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </Card>
  )
}

function BrandDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-lg" />
    </div>
  )
}

export default function BrandDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: brand, isLoading, isError } = useBrandDetail(id)
  const suspendBrand = useSuspendBrand()
  const activateBrand = useActivateBrand()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/superadmin/brands">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Brands
            </Link>
          </Button>
        </div>
        <BrandDetailSkeleton />
      </div>
    )
  }

  if (isError || !brand) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/superadmin/brands">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Brands
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Brand not found or failed to load.
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = [
    {
      label: 'Members',
      value: brand.member_count,
      icon: Users,
      colorClass: 'text-blue-600',
      bgClass: 'bg-blue-50',
    },
    {
      label: '30-Day Revenue',
      value: formatCurrency(brand.recent_revenue),
      icon: DollarSign,
      colorClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50',
    },
    {
      label: 'Active Memberships',
      value: brand.active_membership_count,
      icon: CalendarDays,
      colorClass: 'text-indigo-600',
      bgClass: 'bg-indigo-50',
    },
    {
      label: 'Classes',
      value: brand.class_count,
      icon: Dumbbell,
      colorClass: 'text-purple-600',
      bgClass: 'bg-purple-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/superadmin/brands">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Brands
        </Link>
      </Button>

      {/* Brand header card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={brand.logo_url ?? undefined} alt={brand.name} />
              <AvatarFallback className="text-xl font-bold bg-indigo-100 text-indigo-800">
                {getInitials(brand.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold">{brand.name}</h2>
                <Badge variant="outline" className="font-mono text-xs">
                  {brand.slug}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  {brand.subscription_plan}
                </Badge>
                {brand.is_active ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                ) : (
                  <Badge variant="destructive">Suspended</Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {brand.owner_email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {brand.owner_email}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  Created{' '}
                  {new Date(brand.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <div className={`rounded-md p-1.5 ${stat.bgClass}`}>
                  <Icon className={`h-4 w-4 ${stat.colorClass}`} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* View as Admin */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Brand Administration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Generate a magic link to access this brand&apos;s admin panel directly.
          </p>
          <Button
            variant="outline"
            onClick={() =>
              toast.info(
                'Impersonation via Supabase magic link — configure SUPABASE_SERVICE_ROLE_KEY'
              )
            }
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View as Admin
          </Button>
        </CardContent>
      </Card>

      {/* Team members */}
      <BrandTeamSection brandId={id} />

      {/* Danger zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-red-700">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {brand.is_active
              ? 'Suspending this brand will immediately block access for all admins, staff, trainers, and members.'
              : 'Reactivating this brand will restore access for all users.'}
          </p>

          {brand.is_active ? (
            <ConfirmDialog
              title="Suspend Brand"
              description={`Are you sure you want to suspend "${brand.name}"? All users will lose access immediately until the brand is reactivated.`}
              variant="destructive"
              onConfirm={async () => {
                await suspendBrand.mutateAsync(id)
              }}
              isPending={suspendBrand.isPending}
            >
              <Button variant="destructive">Suspend Brand</Button>
            </ConfirmDialog>
          ) : (
            <ConfirmDialog
              title="Activate Brand"
              description={`Reactivate "${brand.name}"? All users will regain access.`}
              onConfirm={async () => {
                await activateBrand.mutateAsync(id)
              }}
              isPending={activateBrand.isPending}
            >
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                Activate Brand
              </Button>
            </ConfirmDialog>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
