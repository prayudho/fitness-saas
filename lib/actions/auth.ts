'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function signIn(
  formData: FormData
): Promise<{ error: string | null; role: string | null }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message, role: null }
  }

  const role = data.user?.app_metadata?.role ?? 'member'

  return { error: null, role }
}

export async function signUp(
  formData: FormData
): Promise<{ error: string | null }> {
  const brandName = formData.get('brandName') as string
  const brandSlug = formData.get('brandSlug') as string
  const ownerName = formData.get('ownerName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

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

  if (authError) {
    return { error: authError.message }
  }

  const { error: brandError } = await serviceClient.from('brands').insert({
    name: brandName,
    subdomain: brandSlug,
    owner_id: authData.user.id,
    is_active: true,
    plan: 'starter',
  })

  if (brandError) {
    await serviceClient.auth.admin.deleteUser(authData.user.id)
    return { error: brandError.message }
  }

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getUserRole(): Promise<string | null> {
  const user = await getUser()
  return user?.app_metadata?.role ?? null
}
