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

export async function registerMemberByAdmin(input: RegisterMemberInput): Promise<{
  data: { memberId: string; membershipId: string | null; invoiceId: string | null } | null
  error: string | null
}> {
  // 1. Validate input
  const parsed = registerMemberSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }
  const validated = parsed.data

  // 2. Create service client
  const supabase = createServiceClient()

  // 3. Fetch brand
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('name, slug')
    .eq('id', validated.brandId)
    .single()

  if (brandError || !brand) {
    return { data: null, error: brandError?.message ?? 'Brand not found' }
  }

  // 4. Check if email already exists
  const { data: existingUsersData, error: listUsersError } = await supabase.auth.admin.listUsers()
  if (listUsersError) {
    return { data: null, error: listUsersError.message }
  }
  const existingUser = existingUsersData.users.find(
    (u) => u.email?.toLowerCase() === validated.email.toLowerCase()
  )
  if (existingUser) {
    return { data: null, error: 'This email is already registered' }
  }

  // 5. Generate temp password
  const tempPassword = crypto.randomUUID().slice(0, 8) + 'A1'

  // 6. Create auth user
  const { data: authData, error: createUserError } = await supabase.auth.admin.createUser({
    email: validated.email,
    password: tempPassword,
    email_confirm: true,
    app_metadata: {
      role: 'member',
      brand_id: validated.brandId,
      must_change_password: true,
    },
    user_metadata: {
      full_name: validated.fullName,
    },
  })

  if (createUserError || !authData.user) {
    return { data: null, error: createUserError?.message ?? 'Failed to create user' }
  }

  const authUserId = authData.user.id

  // 7. Update auto-created profile (includes migration-002 columns cast via ProfileUpdate)
  const profileUpdate: ProfileUpdate = {
    full_name: validated.fullName,
    role: 'member',
    brand_id: validated.brandId,
    phone: validated.phone,
    must_change_password: true,
    is_active: true,
    ...(validated.dateOfBirth !== undefined && { date_of_birth: validated.dateOfBirth }),
    ...(validated.gender !== undefined && { gender: validated.gender }),
    ...(validated.emergencyContactName !== undefined && {
      emergency_contact_name: validated.emergencyContactName,
    }),
    ...(validated.emergencyContactPhone !== undefined && {
      emergency_contact_phone: validated.emergencyContactPhone,
    }),
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profileUpdate as Database['public']['Tables']['profiles']['Update'])
    .eq('id', authUserId)

  if (profileError) {
    // Rollback: delete auth user
    await supabase.auth.admin.deleteUser(authUserId)
    return { data: null, error: profileError.message }
  }

  let membershipId: string | null = null
  let invoiceId: string | null = null
  let packageName: string | undefined
  let expiresAt: string | undefined

  // 8. If packageId provided
  if (validated.packageId) {
    // a. Fetch package
    const { data: pkg, error: pkgError } = await supabase
      .from('membership_packages')
      .select('name, duration_days, price, currency')
      .eq('id', validated.packageId)
      .single()

    if (pkgError || !pkg) {
      await supabase.auth.admin.deleteUser(authUserId)
      return { data: null, error: pkgError?.message ?? 'Package not found' }
    }

    packageName = pkg.name

    // b. Compute expires_at
    const durationDays = pkg.duration_days ?? 0
    expiresAt = new Date(Date.now() + durationDays * 86400000).toISOString()

    // c. Insert membership
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .insert({
        brand_id: validated.brandId,
        member_id: authUserId,
        package_id: validated.packageId,
        status: 'active',
        starts_at: new Date().toISOString(),
        expires_at: expiresAt,
        auto_renew: false,
      })
      .select('id')
      .single()

    if (membershipError || !membership) {
      await supabase.auth.admin.deleteUser(authUserId)
      return { data: null, error: membershipError?.message ?? 'Failed to create membership' }
    }

    membershipId = membership.id

    // d. If paymentMethod provided, insert invoice
    if (validated.paymentMethod) {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          brand_id: validated.brandId,
          member_id: authUserId,
          membership_id: membershipId,
          amount: validated.amountPaid ?? pkg.price,
          currency: pkg.currency,
          status: 'paid',
          payment_method: validated.paymentMethod,
          notes: validated.paymentNotes ?? null,
          paid_at: new Date().toISOString(),
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

  // 9. Send welcome email
  if (validated.sendWelcomeEmail) {
    const { subject, html } = renderWelcomeEmail({
      memberName: validated.fullName,
      brandName: brand.name,
      email: validated.email,
      tempPassword,
      loginUrl: `https://${brand.slug}.gerak.online/login`,
      packageName,
      expiryDate: expiresAt,
    })
    // Fire-and-forget — email failure should not block registration
    await sendEmail(validated.email, subject, html)
  }

  // 10. Revalidate members list
  revalidatePath('/admin/members')

  // 11. Return result
  return {
    data: {
      memberId: authUserId,
      membershipId,
      invoiceId,
    },
    error: null,
  }
}
