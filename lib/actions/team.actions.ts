'use server'

import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getAuthedProfile } from '@/lib/actions/utils'
import { sendEmail } from '@/lib/email/send'
import { renderTeamInviteEmail } from '@/lib/email/templates'
import {
  inviteTeamMemberSchema,
  updateTeamMemberSchema,
  createCustomRoleSchema,
  updateCustomRoleSchema,
  type InviteTeamMemberInput,
  type UpdateTeamMemberInput,
  type CreateCustomRoleInput,
  type UpdateCustomRoleInput,
} from '@/lib/validations/team'

// ----------------------------------------------------------------
// Local shape types used as return payloads
// ----------------------------------------------------------------

export type TeamMember = {
  id: string
  full_name: string
  phone: string | null
  role: string
  custom_role_id: string | null
  custom_role_name: string | null
  is_active: boolean
  must_change_password: boolean
  created_at: string
  updated_at: string
}

export type CustomRole = {
  id: string
  brand_id: string
  name: string
  permissions: Record<string, boolean>
  created_at: string
  member_count: number
}

export type TeamMemberDetail = TeamMember & {
  email: string | null
  auth_created_at: string | null
}

// ----------------------------------------------------------------
// inviteTeamMember
// ----------------------------------------------------------------
export async function inviteTeamMember(
  input: InviteTeamMemberInput
): Promise<{ data: { userId: string; profileId: string } | null; error: string | null }> {
  const parsed = inviteTeamMemberSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0]?.message ?? 'Validation error' }
  }

  const { brandId, fullName, email, phone, role, customRoleId, branchId, tempPassword } = parsed.data
  const supabase = createServiceClient()

  // Fetch brand for name/slug
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('name, slug')
    .eq('id', brandId)
    .single()

  if (brandError || !brand) {
    return { data: null, error: brandError?.message ?? 'Brand not found' }
  }

  // Check if an auth account already exists for this email
  const { data: existingUserId } = await supabase
    .rpc('get_auth_user_id_by_email', { p_email: email })

  let userId: string

  if (existingUserId) {
    // ── Existing user: just INSERT a new profile row for this brand ──────
    userId = existingUserId as string

    // Guard: ensure they don't already have a profile at this brand
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .eq('brand_id', brandId)
      .maybeSingle()

    if (existingProfile) {
      return { data: null, error: 'This person already has an account at this gym' }
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id:                   userId,
        brand_id:             brandId,
        full_name:            fullName,
        role:                 role as Database['public']['Enums']['user_role'],
        custom_role_id:       customRoleId ?? null,
        branch_id:            role === 'branch_manager' ? (branchId ?? null) : null,
        home_branch_id:       (role === 'staff' || role === 'trainer') ? (branchId ?? null) : null,
        must_change_password: false,
        is_active:            true,
        phone:                phone ?? null,
      })
      .select('id')
      .single()

    if (profileError || !profileData) {
      return { data: null, error: profileError?.message ?? 'Failed to create profile' }
    }

    const { subject, html } = renderTeamInviteEmail({
      memberName: fullName,
      brandName:  brand.name,
      role,
      email,
      tempPassword: '(use your existing password)',
      loginUrl: `https://${brand.slug}.gerak.online/login`,
    })
    const { error: emailError } = await sendEmail(email, subject, html)
    if (emailError) console.error('[inviteTeamMember] email send failed:', emailError)

    return { data: { userId, profileId: profileData.id }, error: null }
  }

  // ── New user: create auth account + let trigger create the profile ───
  const { data: authData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    app_metadata: {
      role,
      brand_id:             brandId,
      must_change_password: true,
    },
    user_metadata: { full_name: fullName },
  })

  if (createError || !authData.user) {
    return { data: null, error: createError?.message ?? 'Failed to create user' }
  }

  userId = authData.user.id

  // Trigger created the profile with brand_id from app_metadata. Update extras.
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name:            fullName,
      custom_role_id:       customRoleId ?? null,
      branch_id:            role === 'branch_manager' ? (branchId ?? null) : null,
      home_branch_id:       (role === 'staff' || role === 'trainer') ? (branchId ?? null) : null,
      must_change_password: true,
      is_active:            true,
      phone:                phone ?? null,
    })
    .eq('id', userId)
    .eq('brand_id', brandId)
    .select('id')
    .single()

  if (profileError || !profileData) {
    await supabase.auth.admin.deleteUser(userId)
    return { data: null, error: profileError?.message ?? 'Failed to update profile' }
  }

  // Send invite email
  const { subject, html } = renderTeamInviteEmail({
    memberName: fullName,
    brandName: brand.name,
    role,
    email,
    tempPassword,
    loginUrl: `https://${brand.slug}.gerak.online/login`,
  })

  const { error: emailError } = await sendEmail(email, subject, html)

  if (emailError) {
    // Non-fatal: user was created successfully; log but do not rollback
    console.error('[inviteTeamMember] email send failed:', emailError)
  }

  return { data: { userId, profileId: profileData.id }, error: null }
}

// ----------------------------------------------------------------
// updateTeamMember
// ----------------------------------------------------------------
export async function updateTeamMember(
  id: string,
  input: UpdateTeamMemberInput
): Promise<{ data: null; error: string | null }> {
  const parsed = updateTeamMemberSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0]?.message ?? 'Validation error' }
  }

  const { fullName, phone, role, customRoleId } = parsed.data
  const supabase = createServiceClient()

  // Derive caller's brand so we scope the update to the correct profile row
  const authSupabase = createClient()
  const { profile: callerProfile } = await getAuthedProfile(authSupabase)
  if (!callerProfile.brand_id) return { data: null, error: 'No brand context' }

  const { error } = await supabase
    .from('profiles')
    .update({
      ...(fullName !== undefined && { full_name: fullName }),
      ...(phone !== undefined && { phone }),
      ...(role !== undefined && { role: role as 'admin' | 'staff' | 'trainer' | 'support' | 'member' }),
      ...(customRoleId !== undefined && { custom_role_id: customRoleId }),
    })
    .eq('id', id)
    .eq('brand_id', callerProfile.brand_id)

  if (error) {
    return { data: null, error: error.message }
  }

  revalidatePath('/admin/team')
  return { data: null, error: null }
}

// ----------------------------------------------------------------
// deactivateTeamMember
// ----------------------------------------------------------------
export async function deactivateTeamMember(
  id: string
): Promise<{ data: null; error: string | null }> {
  const supabase = createServiceClient()

  // Fetch the auth user ID (profile.id == auth.user.id by FK)
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', id)
    .single()

  if (fetchError || !profile) {
    return { data: null, error: fetchError?.message ?? 'Profile not found' }
  }

  const authSupabase = createClient()
  const { profile: callerProfile } = await getAuthedProfile(authSupabase)
  if (!callerProfile.brand_id) return { data: null, error: 'No brand context' }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', id)
    .eq('brand_id', callerProfile.brand_id)

  if (updateError) {
    return { data: null, error: updateError.message }
  }

  // Invalidate all existing sessions for the user
  await supabase.auth.admin.signOut(profile.id, 'others')

  revalidatePath('/admin/team')
  return { data: null, error: null }
}

// ----------------------------------------------------------------
// reactivateTeamMember
// ----------------------------------------------------------------
export async function reactivateTeamMember(
  id: string
): Promise<{ data: null; error: string | null }> {
  const supabase = createServiceClient()

  const authSupabase = createClient()
  const { profile: callerProfile } = await getAuthedProfile(authSupabase)
  if (!callerProfile.brand_id) return { data: null, error: 'No brand context' }

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: true })
    .eq('id', id)
    .eq('brand_id', callerProfile.brand_id)

  if (error) {
    return { data: null, error: error.message }
  }

  revalidatePath('/admin/team')
  return { data: null, error: null }
}

// ----------------------------------------------------------------
// createCustomRole
// ----------------------------------------------------------------
export async function createCustomRole(
  input: CreateCustomRoleInput
): Promise<{ data: { id: string } | null; error: string | null }> {
  const parsed = createCustomRoleSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0]?.message ?? 'Validation error' }
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('custom_roles')
    .insert({
      brand_id: parsed.data.brandId,
      name: parsed.data.name,
      permissions: parsed.data.permissions,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Failed to create custom role' }
  }

  return { data: { id: data.id }, error: null }
}

// ----------------------------------------------------------------
// updateCustomRole
// ----------------------------------------------------------------
export async function updateCustomRole(
  id: string,
  input: UpdateCustomRoleInput
): Promise<{ data: null; error: string | null }> {
  const parsed = updateCustomRoleSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0]?.message ?? 'Validation error' }
  }

  const { name, permissions } = parsed.data
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('custom_roles')
    .update({
      ...(name !== undefined && { name }),
      ...(permissions !== undefined && { permissions }),
    })
    .eq('id', id)

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: null, error: null }
}

// ----------------------------------------------------------------
// deleteCustomRole
// ----------------------------------------------------------------
export async function deleteCustomRole(
  id: string
): Promise<{ data: null; error: string | null }> {
  const supabase = createServiceClient()

  // Guard: count profiles currently assigned to this role
  const { count, error: countError } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('custom_role_id', id)

  if (countError) {
    return { data: null, error: countError.message }
  }

  if (count !== null && count > 0) {
    return {
      data: null,
      error: `Cannot delete role with active members assigned (${count} member${count === 1 ? '' : 's'}). Reassign them first.`,
    }
  }

  const { error } = await supabase
    .from('custom_roles')
    .delete()
    .eq('id', id)

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: null, error: null }
}

// ----------------------------------------------------------------
// getTeamMembers
// ----------------------------------------------------------------
export async function getTeamMembers(
  brandId?: string,
  opts?: {
    search?: string
    role?: string
    isActive?: boolean
    page?: number
  }
): Promise<{ data: TeamMember[]; total: number; error: string | null }> {
  // When brandId is not supplied, derive it from the authenticated user's profile
  let effectiveBrandId = brandId
  if (!effectiveBrandId) {
    try {
      const authSupabase = createClient()
      const { profile } = await getAuthedProfile(authSupabase)
      if (!profile.brand_id) return { data: [], total: 0, error: 'No brand context' }
      effectiveBrandId = profile.brand_id
    } catch {
      return { data: [], total: 0, error: 'Unauthorized' }
    }
  }

  const supabase = createServiceClient()

  const limit = 25
  const page = opts?.page ?? 1
  const offset = (page - 1) * limit

  type ProfileRow = {
    id: string
    full_name: string
    phone: string | null
    role: string
    custom_role_id: string | null
    is_active: boolean
    must_change_password: boolean
    created_at: string
    updated_at: string
  }

  // Query profiles without an embedded join to avoid PostgREST relationship
  // resolution issues that can cause INNER JOIN behaviour on nullable FKs.
  let query = supabase
    .from('profiles')
    .select('id, full_name, phone, role, custom_role_id, is_active, must_change_password, created_at, updated_at', { count: 'exact' })
    .eq('brand_id', effectiveBrandId)
    .neq('role', 'member')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (opts?.search) {
    query = query.or(
      `full_name.ilike.%${opts.search}%,phone.ilike.%${opts.search}%`
    )
  }

  if (opts?.role) {
    query = query.eq('role', opts.role as Database['public']['Enums']['user_role'])
  }

  if (opts?.isActive !== undefined) {
    query = query.eq('is_active', opts.isActive)
  }

  const { data, error, count } = await query

  if (error) {
    return { data: [], total: 0, error: error.message }
  }

  const rows = (data ?? []) as ProfileRow[]

  // Fetch custom role names in a separate query for any profiles that have one.
  const customRoleIds = [...new Set(rows.map((r) => r.custom_role_id).filter(Boolean))] as string[]
  const roleNameMap: Record<string, string> = {}
  if (customRoleIds.length > 0) {
    const { data: roleRows } = await supabase
      .from('custom_roles')
      .select('id, name')
      .in('id', customRoleIds)
    for (const r of roleRows ?? []) {
      roleNameMap[r.id] = r.name
    }
  }

  const members: TeamMember[] = rows.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    phone: p.phone,
    role: p.role,
    custom_role_id: p.custom_role_id,
    custom_role_name: p.custom_role_id ? (roleNameMap[p.custom_role_id] ?? null) : null,
    is_active: p.is_active,
    must_change_password: p.must_change_password,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }))

  return { data: members, total: count ?? 0, error: null }
}

// ----------------------------------------------------------------
// getCustomRoles
// ----------------------------------------------------------------
export async function getCustomRoles(
  brandId: string
): Promise<{ data: CustomRole[]; error: string | null }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('custom_roles')
    .select('id, brand_id, name, permissions, created_at')
    .eq('brand_id', brandId)
    .order('name', { ascending: true })

  if (error) {
    return { data: [], error: error.message }
  }

  // Count members per role — pull all at once for efficiency
  const roleIds = (data ?? []).map((r) => r.id)
  const countsMap: Record<string, number> = {}

  if (roleIds.length > 0) {
    const { data: profileCounts, error: countError } = await supabase
      .from('profiles')
      .select('custom_role_id')
      .in('custom_role_id', roleIds)

    if (!countError && profileCounts) {
      for (const p of profileCounts) {
        if (p.custom_role_id) {
          countsMap[p.custom_role_id] = (countsMap[p.custom_role_id] ?? 0) + 1
        }
      }
    }
  }

  const roles: CustomRole[] = (data ?? []).map((r) => ({
    id: r.id,
    brand_id: r.brand_id,
    name: r.name,
    permissions: (r.permissions as Record<string, boolean>) ?? {},
    created_at: r.created_at,
    member_count: countsMap[r.id] ?? 0,
  }))

  return { data: roles, error: null }
}

// ----------------------------------------------------------------
// getTeamMemberById
// ----------------------------------------------------------------
export async function getTeamMemberById(
  id: string
): Promise<{ data: TeamMemberDetail | null; error: string | null }> {
  const supabase = createServiceClient()

  type ProfileWithCustomRole = {
    id: string
    full_name: string
    phone: string | null
    role: string
    custom_role_id: string | null
    is_active: boolean
    must_change_password: boolean
    created_at: string
    updated_at: string
    custom_roles: { name: string } | null
  }

  const authSupabase = createClient()
  const { profile: callerProfile } = await getAuthedProfile(authSupabase)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, custom_role_id, is_active, must_change_password, created_at, updated_at, custom_roles!custom_role_id(name)')
    .eq('id', id)
    .eq('brand_id', callerProfile.brand_id ?? '')
    .single()

  if (profileError || !profile) {
    return { data: null, error: profileError?.message ?? 'Team member not found' }
  }

  const p = profile as ProfileWithCustomRole

  // Fetch auth user for email and auth-level created_at
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(id)

  const detail: TeamMemberDetail = {
    id: p.id,
    full_name: p.full_name,
    phone: p.phone,
    role: p.role,
    custom_role_id: p.custom_role_id,
    custom_role_name: p.custom_roles?.name ?? null,
    is_active: p.is_active,
    must_change_password: p.must_change_password,
    created_at: p.created_at,
    updated_at: p.updated_at,
    email: authError || !authUser?.user ? null : (authUser.user.email ?? null),
    auth_created_at: authError || !authUser?.user ? null : (authUser.user.created_at ?? null),
  }

  return { data: detail, error: null }
}
