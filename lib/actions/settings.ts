'use server'

import { cookies } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getBrandSettings() {
  const supabase = createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { data: null, error: 'Unauthorized' }
  }

  // Resolve brand_id from the cookie set by middleware
  const brandIdFromCookie = cookies().get('__fp_brand_id')?.value ?? null

  if (!brandIdFromCookie) {
    return { data: null, error: 'Could not resolve brand for this request' }
  }

  const profile = { brand_id: brandIdFromCookie }

  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('id', profile.brand_id)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function updateBrandGeneral(
  brandId: string,
  data: {
    name: string
    business_email?: string
    phone?: string
    address?: string
    timezone: string
    currency: string
  }
) {
  const supabase = createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('brands')
    .update({
      name: data.name,
      business_email: data.business_email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      timezone: data.timezone,
      currency: data.currency,
      updated_at: new Date().toISOString(),
    })
    .eq('id', brandId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/settings')
  return { error: null }
}

export async function updateBrandAppearance(
  brandId: string,
  data: {
    logo_url?: string
    primary_color?: string
    secondary_color?: string
  }
) {
  const supabase = createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  const updatePayload: Record<string, string> = {
    updated_at: new Date().toISOString(),
  }

  if (data.logo_url !== undefined) updatePayload.logo_url = data.logo_url
  if (data.primary_color !== undefined) updatePayload.primary_color = data.primary_color
  if (data.secondary_color !== undefined) updatePayload.secondary_color = data.secondary_color

  const { error } = await supabase
    .from('brands')
    .update(updatePayload)
    .eq('id', brandId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/settings')
  revalidatePath('/admin', 'layout')
  return { error: null }
}

export async function uploadBrandLogo(brandId: string, formData: FormData) {
  const supabase = createClient()
  const serviceClient = createServiceClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { url: null, error: 'Unauthorized' }
  }

  const file = formData.get('logo') as File | null

  if (!file) {
    return { url: null, error: 'No file provided' }
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  if (!allowedTypes.includes(file.type)) {
    return { url: null, error: 'Invalid file type. Please upload JPEG, PNG, WebP, or SVG.' }
  }

  if (file.size > 2 * 1024 * 1024) {
    return { url: null, error: 'File size must be less than 2MB.' }
  }

  const fileExt = file.name.split('.').pop()
  const filePath = `${brandId}/logo.${fileExt}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { error: uploadError } = await serviceClient.storage
    .from('brand-assets')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    return { url: null, error: uploadError.message }
  }

  const { data: urlData } = serviceClient.storage
    .from('brand-assets')
    .getPublicUrl(filePath)

  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

  return { url: publicUrl, error: null }
}
