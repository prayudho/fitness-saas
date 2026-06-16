'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Shield } from 'lucide-react'
import { toast } from 'sonner'

import { createCustomRoleSchema } from '@/lib/validations/team'
import type { CreateCustomRoleInput, UpdateCustomRoleInput } from '@/lib/validations/team'
import { useRole } from '@/lib/hooks/use-role'
import {
  useCustomRoles,
  useCreateCustomRole,
  useUpdateCustomRole,
  useDeleteCustomRole,
  type CustomRole,
} from '@/lib/hooks/use-team'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { EmptyState } from '@/components/shared/empty-state'

// ----------------------------------------------------------------
// Permission definitions
// ----------------------------------------------------------------
type PermissionKey =
  | 'view_members'
  | 'edit_members'
  | 'view_billing'
  | 'edit_billing'
  | 'checkin'
  | 'view_classes'
  | 'edit_classes'
  | 'view_trainers'
  | 'edit_trainers'
  | 'view_reports'
  | 'manage_team'

const DEFAULT_PERMISSIONS: Record<PermissionKey, boolean> = {
  view_members: false,
  edit_members: false,
  view_billing: false,
  edit_billing: false,
  checkin: false,
  view_classes: false,
  edit_classes: false,
  view_trainers: false,
  edit_trainers: false,
  view_reports: false,
  manage_team: false,
}

interface PermissionGroup {
  label: string
  keys: PermissionKey[]
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: 'Members',
    keys: ['view_members', 'edit_members'],
  },
  {
    label: 'Billing',
    keys: ['view_billing', 'edit_billing'],
  },
  {
    label: 'Operations',
    keys: ['checkin', 'view_classes', 'edit_classes', 'view_trainers', 'edit_trainers'],
  },
  {
    label: 'Settings',
    keys: ['view_reports', 'manage_team'],
  },
]

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  view_members: 'View Members',
  edit_members: 'Edit Members',
  view_billing: 'View Billing',
  edit_billing: 'Edit Billing',
  checkin: 'Check-in Access',
  view_classes: 'View Classes',
  edit_classes: 'Edit Classes',
  view_trainers: 'View Trainers',
  edit_trainers: 'Edit Trainers',
  view_reports: 'View Reports',
  manage_team: 'Manage Team',
}

// ----------------------------------------------------------------
// RoleForm — used for both create and update
// ----------------------------------------------------------------
interface RoleFormValues {
  name: string
  permissions: Record<PermissionKey, boolean>
}

interface RoleFormProps {
  defaultValues?: RoleFormValues
  onSubmit: (data: RoleFormValues) => Promise<void>
  isPending: boolean
  brandId: string
}

function RoleForm({ defaultValues, onSubmit, isPending, brandId }: RoleFormProps) {
  const form = useForm<CreateCustomRoleInput>({
    resolver: zodResolver(createCustomRoleSchema),
    defaultValues: defaultValues
      ? { brandId, name: defaultValues.name, permissions: defaultValues.permissions }
      : { brandId, name: '', permissions: { ...DEFAULT_PERMISSIONS } },
  })

  useEffect(() => {
    if (brandId) form.setValue('brandId', brandId)
  }, [brandId, form])

  async function handleSubmit(data: CreateCustomRoleInput) {
    await onSubmit({ name: data.name, permissions: data.permissions as Record<PermissionKey, boolean> })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Front Desk, Marketing" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-5">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                {group.label}
              </p>
              <div className="space-y-2 rounded-lg border p-3">
                {group.keys.map((key) => (
                  <FormField
                    key={key}
                    control={form.control}
                    name={`permissions.${key}`}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel className="cursor-pointer font-normal">
                          {PERMISSION_LABELS[key]}
                        </FormLabel>
                        <FormControl>
                          <Switch
                            checked={!!field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Role
        </Button>
      </form>
    </Form>
  )
}

// ----------------------------------------------------------------
// CustomRoleCard
// ----------------------------------------------------------------
interface CustomRoleCardProps {
  role: CustomRole
  onEdit: (role: CustomRole) => void
}

function CustomRoleCard({ role, onEdit }: CustomRoleCardProps) {
  const deleteMutation = useDeleteCustomRole()

  const activePerms = Object.entries(role.permissions)
    .filter(([, v]) => v)
    .map(([k]) => PERMISSION_LABELS[k as PermissionKey] ?? k)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <CardTitle className="text-base truncate">{role.name}</CardTitle>
            <Badge variant="secondary" className="flex-shrink-0 text-xs">
              {role.member_count} {role.member_count === 1 ? 'member' : 'members'}
            </Badge>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(role)}
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    {role.member_count > 0 ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        disabled
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    ) : (
                      <ConfirmDialog
                        title="Delete Custom Role"
                        description={`Delete the "${role.name}" role? This cannot be undone.`}
                        onConfirm={async () => {
                          await deleteMutation.mutateAsync(role.id)
                        }}
                        isPending={deleteMutation.isPending}
                        variant="destructive"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </ConfirmDialog>
                    )}
                  </span>
                </TooltipTrigger>
                {role.member_count > 0 && (
                  <TooltipContent>
                    <p>
                      Cannot delete — {role.member_count}{' '}
                      {role.member_count === 1 ? 'member' : 'members'} assigned
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activePerms.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {activePerms.map((perm) => (
              <Badge key={perm} variant="outline" className="text-xs">
                {perm}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No permissions assigned</p>
        )}
      </CardContent>
    </Card>
  )
}

// ----------------------------------------------------------------
// Main page
// ----------------------------------------------------------------
export default function CustomRolesPage() {
  const { brandId } = useRole()
  const { data: customRoles, isLoading } = useCustomRoles(brandId ?? '')
  const createMutation = useCreateCustomRole()
  const updateMutation = useUpdateCustomRole()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null)

  function openCreate() {
    setEditingRole(null)
    setSheetOpen(true)
  }

  function openEdit(role: CustomRole) {
    setEditingRole(role)
    setSheetOpen(true)
  }

  async function handleSubmit(data: { name: string; permissions: Record<PermissionKey, boolean> }) {
    if (editingRole) {
      await updateMutation.mutateAsync({
        id: editingRole.id,
        input: { name: data.name, permissions: data.permissions },
      })
    } else {
      await createMutation.mutateAsync({
        brandId: brandId ?? '',
        name: data.name,
        permissions: data.permissions,
      })
    }
    setSheetOpen(false)
    setEditingRole(null)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/team">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Team
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Custom Roles"
        description="Define granular permission sets for your team members"
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : (customRoles ?? []).length === 0 ? (
        <EmptyState
          title="No custom roles"
          description="Create one to define granular permissions for your team."
          action={{ label: 'Create Role', onClick: openCreate }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(customRoles ?? []).map((role) => (
            <CustomRoleCard key={role.id} role={role} onEdit={openEdit} />
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingRole ? 'Edit Role' : 'Create Custom Role'}</SheetTitle>
            <SheetDescription>
              {editingRole
                ? `Update permissions for the "${editingRole.name}" role.`
                : 'Define a new role with specific permissions for your team.'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <RoleForm
              key={editingRole?.id ?? 'create'}
              defaultValues={
                editingRole
                  ? {
                      name: editingRole.name,
                      permissions: editingRole.permissions as Record<PermissionKey, boolean>,
                    }
                  : undefined
              }
              onSubmit={handleSubmit}
              isPending={isPending}
              brandId={brandId ?? ''}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
