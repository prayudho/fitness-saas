'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAuthedProfile } from '@/lib/actions/utils'
import type { Database } from '@/types/database'

type PackageRow = Database['public']['Tables']['membership_packages']['Row']
type PromoCodeRow = Database['public']['Tables']['promo_codes']['Row']
type MembershipType = Database['public']['Tables']['membership_packages']['Row']['type']
type DiscountType = Database['public']['Tables']['promo_codes']['Row']['discount_type']

export interface PackageInput {
  name: string
  type: MembershipType
  duration_days: number
  session_credits?: number
  price: number
  currency?: string
  allow_freeze?: boolean
  max_freeze_days?: number
}

export interface PromoCodeInput {
  code: string
  discount_type: DiscountType
  discount_value: number
  max_uses?: number
  valid_from?: string
  valid_until?: string
}

// ─── Packages ──────────────────────────────────────────────────────────────

export async function getPackages(): Promise<{ data?: PackageRow[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)

    const { data, error } = await supabase
      .from('membership_packages')
      .select('*')
      .eq('brand_id', profile.brand_id!)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data: data ?? [] }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

export async function getPackage(
  id: string
): Promise<{ data?: PackageRow & { active_memberships_count: number }; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)

    const { data: pkg, error: pkgError } = await supabase
      .from('membership_packages')
      .select('*')
      .eq('id', id)
      .eq('brand_id', profile.brand_id!)
      .single()

    if (pkgError) throw pkgError

    const { count, error: countError } = await supabase
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('package_id', id)
      .eq('status', 'active')

    if (countError) throw countError

    return { data: { ...pkg, active_memberships_count: count ?? 0 } }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

export async function createPackage(
  input: PackageInput
): Promise<{ data?: PackageRow; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)

    const { data, error } = await supabase
      .from('membership_packages')
      .insert({
        brand_id: profile.brand_id!,
        name: input.name,
        type: input.type,
        duration_days: input.duration_days,
        session_credits: input.session_credits ?? null,
        price: input.price,
        currency: input.currency ?? 'IDR',
        allow_freeze: input.allow_freeze ?? false,
        max_freeze_days: input.max_freeze_days ?? null,
      })
      .select()
      .single()

    if (error) throw error
    revalidatePath('/admin/packages')
    return { data }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

export async function updatePackage(
  id: string,
  input: Partial<PackageInput>
): Promise<{ data?: PackageRow; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)

    const updateData: Database['public']['Tables']['membership_packages']['Update'] = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.type !== undefined) updateData.type = input.type
    if (input.duration_days !== undefined) updateData.duration_days = input.duration_days
    if (input.session_credits !== undefined) updateData.session_credits = input.session_credits
    if (input.price !== undefined) updateData.price = input.price
    if (input.currency !== undefined) updateData.currency = input.currency
    if (input.allow_freeze !== undefined) updateData.allow_freeze = input.allow_freeze
    if (input.max_freeze_days !== undefined) updateData.max_freeze_days = input.max_freeze_days

    const { data, error } = await supabase
      .from('membership_packages')
      .update(updateData)
      .eq('id', id)
      .eq('brand_id', profile.brand_id!)
      .select()
      .single()

    if (error) throw error
    revalidatePath('/admin/packages')
    revalidatePath(`/admin/packages/${id}/edit`)
    return { data }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

export async function deletePackage(id: string): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)

    const { count, error: countError } = await supabase
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('package_id', id)
      .eq('brand_id', profile.brand_id!)
      .eq('status', 'active')

    if (countError) throw countError
    if (count && count > 0) {
      return { error: 'Cannot delete: package has active members' }
    }

    const { error } = await supabase
      .from('membership_packages')
      .delete()
      .eq('id', id)
      .eq('brand_id', profile.brand_id!)

    if (error) throw error
    revalidatePath('/admin/packages')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

export async function togglePackageActive(
  id: string,
  isActive: boolean
): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)

    const { error } = await supabase
      .from('membership_packages')
      .update({ is_active: isActive })
      .eq('id', id)
      .eq('brand_id', profile.brand_id!)

    if (error) throw error
    revalidatePath('/admin/packages')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

// ─── Promo Codes ───────────────────────────────────────────────────────────

export async function getPromoCodes(): Promise<{ data?: PromoCodeRow[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)

    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('brand_id', profile.brand_id!)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data: data ?? [] }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

export async function createPromoCode(
  input: PromoCodeInput
): Promise<{ data?: PromoCodeRow; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)

    const { data, error } = await supabase
      .from('promo_codes')
      .insert({
        brand_id: profile.brand_id!,
        code: input.code.toUpperCase(),
        discount_type: input.discount_type,
        discount_value: input.discount_value,
        max_uses: input.max_uses ?? null,
        valid_from: input.valid_from ?? new Date().toISOString(),
        valid_until: input.valid_until ?? null,
      })
      .select()
      .single()

    if (error) throw error
    revalidatePath('/admin/packages')
    return { data }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

export async function updatePromoCode(
  id: string,
  input: Partial<PromoCodeInput>
): Promise<{ data?: PromoCodeRow; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)

    const updateData: Database['public']['Tables']['promo_codes']['Update'] = {}
    if (input.code !== undefined) updateData.code = input.code.toUpperCase()
    if (input.discount_type !== undefined) updateData.discount_type = input.discount_type
    if (input.discount_value !== undefined) updateData.discount_value = input.discount_value
    if (input.max_uses !== undefined) updateData.max_uses = input.max_uses
    if (input.valid_from !== undefined) updateData.valid_from = input.valid_from
    if (input.valid_until !== undefined) updateData.valid_until = input.valid_until

    const { data, error } = await supabase
      .from('promo_codes')
      .update(updateData)
      .eq('id', id)
      .eq('brand_id', profile.brand_id!)
      .select()
      .single()

    if (error) throw error
    revalidatePath('/admin/packages')
    return { data }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}

export async function deletePromoCode(id: string): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)

    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', id)
      .eq('brand_id', profile.brand_id!)

    if (error) throw error
    revalidatePath('/admin/packages')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'An error occurred' }
  }
}
