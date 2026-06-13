'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

type PermissionMap = Record<string, boolean>

const BUILT_IN_PERMISSIONS: Record<string, PermissionMap> = {
  superadmin: {
    view_members: true,
    edit_members: true,
    view_billing: true,
    edit_billing: true,
    checkin: true,
    view_classes: true,
    edit_classes: true,
    view_trainers: true,
    edit_trainers: true,
    view_reports: true,
    manage_team: true,
  },
  admin: {
    view_members: true,
    edit_members: true,
    view_billing: true,
    edit_billing: true,
    checkin: true,
    view_classes: true,
    edit_classes: true,
    view_trainers: true,
    edit_trainers: true,
    view_reports: true,
    manage_team: true,
  },
  staff: {
    view_members: true,
    edit_members: false,
    view_billing: false,
    edit_billing: false,
    checkin: true,
    view_classes: true,
    edit_classes: false,
    view_trainers: true,
    edit_trainers: false,
    view_reports: false,
    manage_team: false,
  },
  trainer: {
    view_members: true,
    edit_members: false,
    view_billing: false,
    edit_billing: false,
    checkin: false,
    view_classes: true,
    edit_classes: false,
    view_trainers: false,
    edit_trainers: false,
    view_reports: false,
    manage_team: false,
  },
  support: {},
  member: {
    view_members: false,
    edit_members: false,
    view_billing: false,
    edit_billing: false,
    checkin: false,
    view_classes: true,
    edit_classes: false,
    view_trainers: true,
    edit_trainers: false,
    view_reports: false,
    manage_team: false,
  },
}

interface PermissionsQueryResult {
  role: string | null
  permissions: PermissionMap
}

async function fetchPermissions(): Promise<PermissionsQueryResult> {
  const supabase = createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { role: null, permissions: {} }
  }

  const role = (user.app_metadata?.role as string | undefined) ?? null

  // For built-in roles that are not 'support', return static permissions
  if (role !== null && role !== 'support' && role in BUILT_IN_PERMISSIONS) {
    return { role, permissions: BUILT_IN_PERMISSIONS[role] ?? {} }
  }

  // For 'support' role or any role that may have a custom_role_id, fetch
  // the profile and join the custom_role permissions
  const brandId = typeof document !== 'undefined'
    ? (document.cookie.match(/(?:^|;\s*)__fp_brand_id=([^;]+)/)?.[1] ?? null)
    : null

  const profileRaw = brandId
    ? await supabase.from('profiles').select('custom_role_id, role').eq('id', user.id).eq('brand_id', brandId).maybeSingle()
    : await supabase.from('profiles').select('custom_role_id, role').eq('id', user.id).is('brand_id', null).maybeSingle()
  const profileData = (profileRaw.data as unknown) as { custom_role_id: string | null; role: string } | null
  const profileError = profileRaw.error

  if (profileError || !profileData) {
    return { role, permissions: BUILT_IN_PERMISSIONS[role ?? ''] ?? {} }
  }

  const resolvedRole = (profileData.role as string | null) ?? role

  if (!profileData.custom_role_id) {
    return {
      role: resolvedRole,
      permissions: BUILT_IN_PERMISSIONS[resolvedRole ?? ''] ?? {},
    }
  }

  // Fetch custom role permissions from custom_roles table.
  // custom_roles is added by migration 002 and not in the generated Database type,
  // so we use the untyped client escape hatch via casting.
  const untypedClient = supabase as unknown as SupabaseClient
  const { data: customRole, error: customRoleError } = await (
    untypedClient
      .from('custom_roles')
      .select('permissions')
      .eq('id', profileData.custom_role_id)
      .single() as unknown as Promise<{ data: { permissions: unknown } | null; error: { message: string } | null }>
  )

  if (customRoleError || !customRole) {
    return {
      role: resolvedRole,
      permissions: BUILT_IN_PERMISSIONS[resolvedRole ?? ''] ?? {},
    }
  }

  const rawPermissions: unknown = customRole.permissions
  const customPermissions: PermissionMap =
    rawPermissions !== null &&
    typeof rawPermissions === 'object' &&
    !Array.isArray(rawPermissions)
      ? (Object.fromEntries(
          Object.entries(rawPermissions as Record<string, unknown>).filter(
            ([, v]) => typeof v === 'boolean'
          )
        ) as PermissionMap)
      : {}

  return { role: resolvedRole, permissions: customPermissions }
}

export function usePermissions(): {
  can: (key: string) => boolean
  role: string | null
  isLoading: boolean
} {
  const { data, isLoading } = useQuery<PermissionsQueryResult>({
    queryKey: ['current-user-permissions'],
    queryFn: fetchPermissions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    can: (key: string) => data?.permissions[key] ?? false,
    role: data?.role ?? null,
    isLoading,
  }
}
