'use server'

import { cookies } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signIn(
  formData: FormData
): Promise<{ error: string | null; role: string | null }> {
  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message, role: null }

  // Resolve brand context from the cookie set by middleware
  const brandId = cookies().get('__fp_brand_id')?.value ?? null

  if (brandId) {
    const profileResult = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .eq('brand_id', brandId)
      .maybeSingle()
    const profile = (profileResult.data as unknown) as { role: string } | null

    if (!profile) {
      // Valid auth account but no profile at this brand
      await supabase.auth.signOut()
      return {
        error: 'You do not have an account at this gym. Please contact the gym admin.',
        role: null,
      }
    }

    return { error: null, role: profile.role }
  }

  // No brand context — main domain (superadmin or brand owner registration)
  return { error: null, role: (data.user.app_metadata?.role as string | null) ?? 'member' }
}

export async function signUp(
  formData: FormData
): Promise<{ error: string | null }> {
  const brandName = formData.get('brandName') as string
  const brandSlug = formData.get('brandSlug') as string
  const ownerName = formData.get('ownerName') as string
  const email     = formData.get('email') as string
  const password  = formData.get('password') as string

  if (!/^[a-z0-9-]+$/.test(brandSlug)) {
    return { error: 'Brand slug may only contain lowercase letters, numbers, and hyphens.' }
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  const serviceClient = createServiceClient()

  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'admin' },
    user_metadata: { full_name: ownerName },
  })

  if (authError) return { error: authError.message }

  const userId = authData.user.id

  const { data: brand, error: brandError } = await serviceClient
    .from('brands')
    .insert({
      name:              brandName,
      slug:              brandSlug,
      owner_user_id:     userId,
      is_active:         true,
      subscription_plan: 'starter',
    })
    .select()
    .single()

  if (brandError) {
    await serviceClient.auth.admin.deleteUser(userId)
    return { error: brandError.message }
  }

  // The trigger created a NULL-brand shell profile. Update it to the real brand.
  await serviceClient
    .from('profiles')
    .update({ full_name: ownerName, role: 'admin', brand_id: brand.id })
    .eq('id', userId)
    .is('brand_id', null)

  return { error: null }
}

export async function signOut(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function requestPasswordReset(
  email: string
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const siteUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gerak.online'
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: siteUrl + '/reset-password',
  })
  return { error: error?.message ?? null }
}

export async function updatePassword(
  password: string
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ password })
  return { error: error?.message ?? null }
}

export async function getUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserRole(): Promise<string | null> {
  const user = await getUser()
  return (user?.app_metadata?.role as string | null) ?? null
}

export async function resetMemberPasswordByAdmin(
  profileId: string,
  newPassword: string
): Promise<{ error: string | null }> {
  if (newPassword.length < 8) {
    return { error: 'Password must be at least 8 characters' }
  }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const role = user.app_metadata?.role as string | undefined
  if (role !== 'admin' && role !== 'superadmin') {
    return { error: 'Not authorized to reset member passwords' }
  }

  const serviceClient = createServiceClient()
  const { error } = await serviceClient.auth.admin.updateUserById(profileId, {
    password: newPassword,
  })
  return { error: error?.message ?? null }
}

export async function setMustChangePasswordFalse(): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const serviceClient = createServiceClient()
  const brandId = cookies().get('__fp_brand_id')?.value ?? null

  // Update only the profile at the current brand (password flag is brand-scoped)
  const query = serviceClient.from('profiles').update({ must_change_password: false }).eq('id', user.id)
  const { error } = await (brandId ? query.eq('brand_id', brandId) : query.is('brand_id', null))

  return { error: error?.message ?? null }
}
