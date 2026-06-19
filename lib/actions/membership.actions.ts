'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { renderWelcomeEmail } from '@/lib/email/templates'
import { registerMemberSchema, type RegisterMemberInput } from '@/lib/validations/membership'
import type { Database } from '@/types/database'

// Migration 002 adds must_change_password and is_active to profiles.
// Extend the typed update payload to include these runtime columns.
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'] & {
  must_change_password?: boolean
  is_active?: boolean
}

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export type MemberAccessStatus = {
  canEnterGym: boolean
  gymAccessStatus: string
  gymExpiresAt: string | null
  daysUntilGymExpiry: number | null
  hasPTSessions: boolean
  ptSessionsRemaining: number | null
  ptSessionsExpiresAt: string | null
  daysUntilPTExpiry: number | null
  warningMessage: string | null
}

export type ExpiryReportRow = {
  brand_id: string
  member_id: string
  member_name: string
  member_phone: string | null
  package_name: string
  package_category: string
  membership_id: string
  gym_access_expires_at: string | null
  days_until_gym_expiry: number | null
  pt_sessions_expires_at: string | null
  days_until_pt_expiry: number | null
  pt_sessions_remaining: number | null
  gym_access_status: string
  pt_sessions_status: string
  is_gym_expiring_soon: boolean
  is_pt_expiring_soon: boolean
  is_pt_sessions_low: boolean
  is_pt_expiring_before_gym: boolean
}

// ──────────────────────────────────────────────────────────────────────────
// activateMembership
// ──────────────────────────────────────────────────────────────────────────

export async function activateMembership(
  brandId: string,
  memberId: string,
  packageId: string,
  startDate: Date = new Date()
): Promise<{ data: { membershipId: string } | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data: pkg, error: pkgError } = await supabase
    .from('membership_packages')
    .select(
      'name, package_category, duration_days, gym_access_days, pt_session_credits, pt_session_expiry_days, price, currency'
    )
    .eq('id', packageId)
    .single()

  if (pkgError || !pkg) {
    return { data: null, error: pkgError?.message ?? 'Package not found' }
  }

  const category = (pkg.package_category as string) ?? 'gym_access'
  const startMs = startDate.getTime()

  // Gym access expiry
  const gymDays = pkg.gym_access_days ?? pkg.duration_days ?? 0
  const gymAccessExpiresAt =
    category === 'pt_sessions' ? null
      : gymDays > 0
        ? new Date(startMs + gymDays * 86400000).toISOString()
        : null

  // PT session expiry
  const ptDays = pkg.pt_session_expiry_days
  const ptSessionsExpiresAt =
    category === 'gym_access' ? null
      : ptDays && ptDays > 0
        ? new Date(startMs + ptDays * 86400000).toISOString()
        : null

  // PT session credits
  const ptSessionsRemaining =
    category === 'gym_access' ? null : (pkg.pt_session_credits ?? null)

  // Canonical expires_at (gym access for gym/bundled, PT expiry for pt_sessions)
  const expiresAt =
    category === 'pt_sessions' ? ptSessionsExpiresAt : gymAccessExpiresAt

  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .insert({
      brand_id:              brandId,
      member_id:             memberId,
      package_id:            packageId,
      status:                'active',
      starts_at:             startDate.toISOString(),
      expires_at:            expiresAt,
      auto_renew:            false,
      package_category:      category,
      gym_access_expires_at: gymAccessExpiresAt,
      pt_sessions_expires_at: ptSessionsExpiresAt,
      pt_sessions_remaining: ptSessionsRemaining,
      gym_access_status:     'active',
      pt_sessions_status:    'active',
    })
    .select('id')
    .single()

  if (membershipError || !membership) {
    return { data: null, error: membershipError?.message ?? 'Failed to create membership' }
  }

  return { data: { membershipId: membership.id }, error: null }
}

// ──────────────────────────────────────────────────────────────────────────
// consumePTSession
// ──────────────────────────────────────────────────────────────────────────

export async function consumePTSession(
  membershipId: string
): Promise<{ data: { remaining: number } | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data: membership, error: fetchError } = await supabase
    .from('memberships')
    .select('pt_sessions_remaining, pt_sessions_expires_at, pt_sessions_status')
    .eq('id', membershipId)
    .single()

  if (fetchError || !membership) {
    return { data: null, error: fetchError?.message ?? 'Membership not found' }
  }

  const remaining = membership.pt_sessions_remaining ?? 0

  if (remaining <= 0) {
    return { data: null, error: 'No PT sessions remaining' }
  }

  // Check if PT credits are expired
  if (
    membership.pt_sessions_expires_at &&
    new Date(membership.pt_sessions_expires_at) < new Date()
  ) {
    await supabase
      .from('memberships')
      .update({ pt_sessions_status: 'expired' })
      .eq('id', membershipId)
    return { data: null, error: 'PT session credits have expired' }
  }

  const newRemaining = remaining - 1
  const newStatus = newRemaining === 0 ? 'exhausted' : membership.pt_sessions_status ?? 'active'

  const { error: updateError } = await supabase
    .from('memberships')
    .update({
      pt_sessions_remaining: newRemaining,
      pt_sessions_status:    newStatus,
    })
    .eq('id', membershipId)

  if (updateError) {
    return { data: null, error: updateError.message }
  }

  return { data: { remaining: newRemaining }, error: null }
}

// ──────────────────────────────────────────────────────────────────────────
// checkMemberAccessStatus
// ──────────────────────────────────────────────────────────────────────────

export async function checkMemberAccessStatus(
  membershipId: string
): Promise<{ data: MemberAccessStatus | null; error: string | null }> {
  const supabase = createServiceClient()

  const { data: membership, error: fetchError } = await supabase
    .from('memberships')
    .select(
      'package_category, gym_access_expires_at, pt_sessions_expires_at, pt_sessions_remaining, gym_access_status, pt_sessions_status, expires_at, status'
    )
    .eq('id', membershipId)
    .single()

  if (fetchError || !membership) {
    return { data: null, error: fetchError?.message ?? 'Membership not found' }
  }

  const now = new Date()

  // ── Gym access ────────────────────────────────────────────
  const gymExpiresAt = membership.gym_access_expires_at ?? membership.expires_at
  const gymExpiredByDate = gymExpiresAt ? new Date(gymExpiresAt) < now : false
  const gymAccessStatus =
    membership.status === 'cancelled'
      ? 'cancelled'
      : membership.status === 'frozen'
        ? 'frozen'
        : gymExpiredByDate
          ? 'expired'
          : 'active'

  const daysUntilGymExpiry = gymExpiresAt
    ? Math.ceil((new Date(gymExpiresAt).getTime() - now.getTime()) / 86400000)
    : null

  const canEnterGym =
    gymAccessStatus === 'active' &&
    membership.package_category !== 'pt_sessions'

  // ── PT sessions ───────────────────────────────────────────
  const ptExpiresAt = membership.pt_sessions_expires_at
  const ptExpiredByDate = ptExpiresAt ? new Date(ptExpiresAt) < now : false
  const ptCreditsExhausted =
    membership.pt_sessions_remaining !== null &&
    membership.pt_sessions_remaining <= 0

  const hasPTSessions =
    membership.package_category !== 'gym_access' &&
    !ptExpiredByDate &&
    !ptCreditsExhausted &&
    (membership.pt_sessions_remaining ?? 0) > 0

  const daysUntilPTExpiry = ptExpiresAt
    ? Math.ceil((new Date(ptExpiresAt).getTime() - now.getTime()) / 86400000)
    : null

  // ── Warning message ───────────────────────────────────────
  let warningMessage: string | null = null

  if (gymAccessStatus === 'expired' && hasPTSessions) {
    warningMessage = `Gym access expired. PT sessions still active: ${membership.pt_sessions_remaining} remaining.`
  } else if (daysUntilGymExpiry !== null && daysUntilGymExpiry <= 7 && daysUntilGymExpiry >= 0) {
    warningMessage = `Gym access expires in ${daysUntilGymExpiry} day${daysUntilGymExpiry === 1 ? '' : 's'}.`
  } else if (
    hasPTSessions &&
    daysUntilPTExpiry !== null &&
    daysUntilPTExpiry <= 7 &&
    daysUntilPTExpiry >= 0
  ) {
    warningMessage = `PT session credits expire in ${daysUntilPTExpiry} day${daysUntilPTExpiry === 1 ? '' : 's'}.`
  } else if (
    membership.pt_sessions_remaining !== null &&
    membership.pt_sessions_remaining <= 3 &&
    hasPTSessions
  ) {
    warningMessage = `Only ${membership.pt_sessions_remaining} PT session${membership.pt_sessions_remaining === 1 ? '' : 's'} remaining.`
  }

  const result: MemberAccessStatus = {
    canEnterGym,
    gymAccessStatus,
    gymExpiresAt: gymExpiresAt ?? null,
    daysUntilGymExpiry,
    hasPTSessions,
    ptSessionsRemaining: membership.pt_sessions_remaining ?? null,
    ptSessionsExpiresAt: ptExpiresAt ?? null,
    daysUntilPTExpiry,
    warningMessage,
  }

  return { data: result, error: null }
}

// ──────────────────────────────────────────────────────────────────────────
// getExpiryReport
// ──────────────────────────────────────────────────────────────────────────

export async function getExpiryReport(
  brandId: string,
  filters?: {
    withinDays?: number
    lowPTSessions?: boolean
    ptBeforeGym?: boolean
    category?: 'gym_access' | 'pt_sessions' | 'bundled' | 'all'
    search?: string
    page?: number
  }
): Promise<{ data: ExpiryReportRow[]; total: number; error: string | null }> {
  const supabase = createServiceClient()

  const limit = 25
  const page = filters?.page ?? 1
  const offset = (page - 1) * limit

  let query = supabase
    .from('v_expiry_report')
    .select('*', { count: 'exact' })
    .eq('brand_id', brandId)

  if (filters?.withinDays) {
    const cutoff = new Date(Date.now() + filters.withinDays * 86400000).toISOString()
    query = query.or(
      `gym_access_expires_at.lte.${cutoff},pt_sessions_expires_at.lte.${cutoff}`
    )
  }

  if (filters?.lowPTSessions) {
    query = query.eq('is_pt_sessions_low', true)
  }

  if (filters?.ptBeforeGym) {
    query = query.eq('is_pt_expiring_before_gym', true)
  }

  if (filters?.category && filters.category !== 'all') {
    query = query.eq('package_category', filters.category)
  }

  if (filters?.search) {
    query = query.or(
      `member_name.ilike.%${filters.search}%,member_phone.ilike.%${filters.search}%`
    )
  }

  query = query
    .order('gym_access_expires_at', { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return { data: [], total: 0, error: error.message }
  }

  return { data: (data ?? []) as ExpiryReportRow[], total: count ?? 0, error: null }
}

// ──────────────────────────────────────────────────────────────────────────
// registerMemberByAdmin (unchanged core logic, now uses activateMembership)
// ──────────────────────────────────────────────────────────────────────────

export async function registerMemberByAdmin(input: RegisterMemberInput): Promise<{
  data: { memberId: string; membershipId: string | null; invoiceId: string | null } | null
  error: string | null
}> {
  const parsed = registerMemberSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }
  const validated = parsed.data

  const supabase = createServiceClient()

  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('name, slug')
    .eq('id', validated.brandId)
    .single()

  if (brandError || !brand) {
    return { data: null, error: brandError?.message ?? 'Brand not found' }
  }

  let tempPassword: string | undefined

  // Check if an auth account already exists for this email
  const { data: existingAuthUserId } = await supabase
    .rpc('get_auth_user_id_by_email', { p_email: validated.email })

  let authUserId: string
  let mustChangePassword: boolean

  if (existingAuthUserId) {
    // Existing global user — check they don't already have a profile at this brand
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', existingAuthUserId as string)
      .eq('brand_id', validated.brandId)
      .maybeSingle()

    if (existingProfile) {
      return { data: null, error: 'This person already has an account at this gym' }
    }

    authUserId         = existingAuthUserId as string
    mustChangePassword = false  // they already have their own password
  } else {
    // New user — create auth account (trigger will create the profile)
    tempPassword = crypto.randomUUID().slice(0, 8) + 'A1'

    const { data: authData, error: createUserError } = await supabase.auth.admin.createUser({
      email: validated.email,
      password: tempPassword,
      email_confirm: true,
      app_metadata: {
        role:                 'member',
        brand_id:             validated.brandId,
        must_change_password: true,
      },
      user_metadata: { full_name: validated.fullName },
    })

    if (createUserError || !authData.user) {
      return { data: null, error: createUserError?.message ?? 'Failed to create user' }
    }

    authUserId         = authData.user.id
    mustChangePassword = true
  }

  const profileFields: ProfileUpdate = {
    full_name:            validated.fullName,
    role:                 'member',
    brand_id:             validated.brandId,
    phone:                validated.phone,
    must_change_password: mustChangePassword,
    is_active:            true,
    ...(validated.dateOfBirth !== undefined && { date_of_birth: validated.dateOfBirth }),
    ...(validated.gender !== undefined && { gender: validated.gender }),
    ...(validated.emergencyContactName !== undefined && {
      emergency_contact_name: validated.emergencyContactName,
    }),
    ...(validated.emergencyContactPhone !== undefined && {
      emergency_contact_phone: validated.emergencyContactPhone,
    }),
  }

  const homeBranchPatch = validated.homeBranchId ? { home_branch_id: validated.homeBranchId } : {}

  if (existingAuthUserId) {
    // Existing user: INSERT a new profile row for this brand
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: authUserId, ...profileFields, ...homeBranchPatch } as never)

    if (profileError) {
      return { data: null, error: profileError.message }
    }
  } else {
    // New user: trigger created a profile; UPDATE with correct fields.
    // NOTE: Do NOT filter by brand_id — GoTrue fires the DB trigger before
    // raw_app_meta_data is populated, so the profile may have brand_id=NULL.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ ...profileFields, ...homeBranchPatch } as never)
      .eq('id', authUserId)

    if (profileError) {
      await supabase.auth.admin.deleteUser(authUserId)
      return { data: null, error: profileError.message }
    }
  }

  let membershipId: string | null = null
  let invoiceId: string | null = null
  let packageName: string | undefined
  let expiresAt: string | undefined

  if (validated.packageId) {
    // Use activateMembership for consistent field population
    const { data: activationData, error: activationError } = await activateMembership(
      validated.brandId,
      authUserId,
      validated.packageId
    )

    if (activationError || !activationData) {
      // Only delete the auth user if we just created them (not for existing users)
      if (!existingAuthUserId) await supabase.auth.admin.deleteUser(authUserId)
      return { data: null, error: activationError ?? 'Failed to create membership' }
    }

    membershipId = activationData.membershipId

    // Fetch package details for email
    const { data: pkg } = await supabase
      .from('membership_packages')
      .select('name, price, currency, expires_at:gym_access_days, gym_access_expires_at:gym_access_days')
      .eq('id', validated.packageId)
      .single()

    packageName = pkg?.name

    // Get expires_at from the created membership
    const { data: mem } = await supabase
      .from('memberships')
      .select('expires_at')
      .eq('id', membershipId)
      .single()

    expiresAt = mem?.expires_at ?? undefined

    // Fetch full package for invoice amount
    const { data: fullPkg } = await supabase
      .from('membership_packages')
      .select('price, currency')
      .eq('id', validated.packageId)
      .single()

    if (validated.paymentMethod && fullPkg) {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          brand_id:       validated.brandId,
          member_id:      authUserId,
          membership_id:  membershipId,
          amount:         validated.amountPaid ?? fullPkg.price,
          currency:       fullPkg.currency,
          status:         'paid',
          payment_method: validated.paymentMethod,
          notes:          validated.paymentNotes ?? null,
          paid_at:        new Date().toISOString(),
        })
        .select('id')
        .single()

      if (invoiceError || !invoice) {
        await supabase.auth.admin.deleteUser(authUserId)
        return { data: null, error: invoiceError?.message ?? 'Failed to create invoice' }
      }

      invoiceId = invoice.id
    }
  }

  if (validated.sendWelcomeEmail && tempPassword) {
    const { subject, html } = renderWelcomeEmail({
      memberName:  validated.fullName,
      brandName:   brand.name,
      email:       validated.email,
      tempPassword,
      loginUrl:    `https://${brand.slug}.gerak.online/login`,
      packageName,
      expiryDate:  expiresAt,
    })
    await sendEmail(validated.email, subject, html)
  }

  revalidatePath('/admin/members')

  return {
    data: { memberId: authUserId, membershipId, invoiceId },
    error: null,
  }
}
