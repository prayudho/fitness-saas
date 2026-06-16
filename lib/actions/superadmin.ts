'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type BrandWithOwner = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  owner_user_id: string | null
  subscription_plan: string
  is_active: boolean
  created_at: string
  updated_at: string
  owner_email: string | null
  owner_full_name: string | null
  member_count?: number
}

export type BrandDetail = BrandWithOwner & {
  member_count: number
  active_membership_count: number
  recent_revenue: number
  class_count: number
}

export type PlatformStats = {
  total_brands: number
  active_brands: number
  total_members: number
  estimated_mrr: number
}

export async function getBrandsList(opts: {
  search?: string
  status?: string
  page?: number
}): Promise<{ data: BrandWithOwner[]; total: number; page: number }> {
  try {
    const supabase = createServiceClient()
    const page = opts.page ?? 1
    const limit = 25
    const offset = (page - 1) * limit

    let query = supabase
      .from('brands')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (opts.search) {
      query = query.ilike('name', `%${opts.search}%`)
    }

    if (opts.status === 'active') {
      query = query.eq('is_active', true)
    } else if (opts.status === 'suspended') {
      query = query.eq('is_active', false)
    }

    const { data: brands, count, error } = await query

    if (error) throw error

    // Enrich with owner email via auth.users
    const enriched: BrandWithOwner[] = await Promise.all(
      (brands ?? []).map(async (brand) => {
        let owner_email: string | null = null
        let owner_full_name: string | null = null

        if (brand.owner_user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', brand.owner_user_id)
            .single()

          const { data: userResp } = await supabase.auth.admin.getUserById(brand.owner_user_id)
          owner_email = userResp?.user?.email ?? null
          owner_full_name = profile?.full_name ?? null
        }

        // Count members for this brand
        const { count: memberCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('brand_id', brand.id)
          .eq('role', 'member')

        return {
          ...brand,
          owner_email,
          owner_full_name,
          member_count: memberCount ?? 0,
        }
      })
    )

    return { data: enriched, total: count ?? 0, page }
  } catch (err) {
    console.error('getBrandsList error:', err)
    return { data: [], total: 0, page: opts.page ?? 1 }
  }
}

export async function getBrandDetail(id: string): Promise<BrandDetail | null> {
  try {
    const supabase = createServiceClient()

    const { data: brand, error } = await supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !brand) return null

    let owner_email: string | null = null
    let owner_full_name: string | null = null

    if (brand.owner_user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', brand.owner_user_id)
        .single()

      const { data: userResp } = await supabase.auth.admin.getUserById(brand.owner_user_id)
      owner_email = userResp?.user?.email ?? null
      owner_full_name = profile?.full_name ?? null
    }

    const { count: memberCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', id)
      .eq('role', 'member')

    const { count: activeMembershipCount } = await supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', id)
      .eq('status', 'active')

    const { count: classCount } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', id)

    // Sum revenue from paid invoices in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: invoices } = await supabase
      .from('invoices')
      .select('amount')
      .eq('brand_id', id)
      .eq('status', 'paid')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const recentRevenue = (invoices ?? []).reduce((sum, inv) => sum + (inv.amount ?? 0), 0)

    return {
      ...brand,
      owner_email,
      owner_full_name,
      member_count: memberCount ?? 0,
      active_membership_count: activeMembershipCount ?? 0,
      recent_revenue: recentRevenue,
      class_count: classCount ?? 0,
    }
  } catch (err) {
    console.error('getBrandDetail error:', err)
    return null
  }
}

export async function createBrand(data: {
  brandName: string
  brandSlug: string
  ownerName: string
  email: string
  password: string
  plan: string
}): Promise<{ error: string | null; brandId?: string }> {
  try {
    const supabase = createServiceClient()

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('brands')
      .select('id')
      .eq('slug', data.brandSlug)
      .single()

    if (existing) {
      return { error: 'A brand with this slug already exists.' }
    }

    // Create owner user account
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.ownerName },
      app_metadata: { role: 'admin' },
    })

    if (createUserError || !newUser?.user) {
      return { error: createUserError?.message ?? 'Failed to create user account.' }
    }

    const userId = newUser.user.id

    // Insert brand first (profile is auto-created by handle_new_user trigger)
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .insert({
        name: data.brandName,
        slug: data.brandSlug,
        owner_user_id: userId,
        subscription_plan: (data.plan as 'starter' | 'growth' | 'enterprise') ?? 'starter',
        is_active: true,
      })
      .select()
      .single()

    if (brandError || !brand) {
      await supabase.auth.admin.deleteUser(userId)
      return { error: brandError?.message ?? 'Failed to create brand.' }
    }

    // Update the auto-created profile: set role=admin and link to brand
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: data.ownerName, role: 'admin', brand_id: brand.id })
      .eq('id', userId)

    if (profileError) {
      await supabase.auth.admin.deleteUser(userId)
      await supabase.from('brands').delete().eq('id', brand.id)
      return { error: profileError.message }
    }

    // Seed the exercise library for this new brand (non-fatal if it fails)
    try { await supabase.rpc('seed_brand_exercises', { p_brand_id: brand.id }) } catch { /* ignore */ }

    revalidatePath('/superadmin/brands')
    return { error: null, brandId: brand.id }
  } catch (err) {
    console.error('createBrand error:', err)
    return { error: 'Unexpected error occurred.' }
  }
}

export async function suspendBrand(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('brands')
      .update({ is_active: false })
      .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath('/superadmin/brands')
    revalidatePath(`/superadmin/brands/${id}`)
    return { error: null }
  } catch (err) {
    console.error('suspendBrand error:', err)
    return { error: 'Unexpected error.' }
  }
}

export async function activateBrand(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('brands')
      .update({ is_active: true })
      .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath('/superadmin/brands')
    revalidatePath(`/superadmin/brands/${id}`)
    return { error: null }
  } catch (err) {
    console.error('activateBrand error:', err)
    return { error: 'Unexpected error.' }
  }
}

export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    const supabase = createServiceClient()

    const { count: totalBrands } = await supabase
      .from('brands')
      .select('*', { count: 'exact', head: true })

    const { count: activeBrands } = await supabase
      .from('brands')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    const { count: totalMembers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'member')

    // Estimated MRR: sum of package prices for active memberships
    const { data: activeMemberships } = await supabase
      .from('memberships')
      .select('membership_packages(price)')
      .eq('status', 'active')

    const estimatedMrr = (activeMemberships ?? []).reduce((sum, m: any) => {
      const price = m?.membership_packages?.price ?? 0
      return sum + price
    }, 0)

    return {
      total_brands: totalBrands ?? 0,
      active_brands: activeBrands ?? 0,
      total_members: totalMembers ?? 0,
      estimated_mrr: estimatedMrr,
    }
  } catch (err) {
    console.error('getPlatformStats error:', err)
    return {
      total_brands: 0,
      active_brands: 0,
      total_members: 0,
      estimated_mrr: 0,
    }
  }
}

export async function getRecentBrands(limit = 5): Promise<BrandWithOwner[]> {
  const result = await getBrandsList({ page: 1 })
  return result.data.slice(0, limit)
}
