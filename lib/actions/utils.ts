import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type User    = { id: string; email?: string }

export async function getAuthedProfile(
  supabase: ReturnType<typeof createClient>
): Promise<{ user: User; profile: Profile }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const brandId = cookies().get('__fp_brand_id')?.value ?? null

  let profile: Profile | null = null
  let profileError: unknown = null

  if (brandId) {
    const { data, error } = await supabase
      .from('profiles').select('*').eq('id', user.id).eq('brand_id', brandId).maybeSingle()
    profile = data; profileError = error
  } else {
    // Try superadmin (brand_id IS NULL) first
    const { data: sa } = await supabase
      .from('profiles').select('*').eq('id', user.id).is('brand_id', null).maybeSingle()
    if (sa) {
      profile = sa
    } else {
      // Fall back to first branded profile (members/staff/trainers on main domain)
      const { data: bp, error: bpErr } = await supabase
        .from('profiles').select('*').eq('id', user.id).not('brand_id', 'is', null).limit(1).maybeSingle()
      profile = bp; profileError = bpErr
    }
  }

  if (profileError || !profile) throw new Error('Profile not found for this brand')
  return { user, profile }
}

export function getServerBrandId(): string | null {
  return cookies().get('__fp_brand_id')?.value ?? null
}

/**
 * Returns the branch_id that should be used as the context for the current user.
 * - branch_manager: reads profiles.branch_id
 * - staff: reads staff_branches WHERE is_primary = true
 * - all others: null
 */
export async function getBranchContext(
  supabase: ReturnType<typeof createClient>
): Promise<{ branchId: string | null }> {
  try {
    const { profile } = await getAuthedProfile(supabase)
    const role = profile.role as string

    if (role === 'branch_manager') {
      const { data } = await supabase
        .from('profiles')
        .select('branch_id' as never)
        .eq('id', profile.id)
        .single()
      const branchId = data ? (data as unknown as { branch_id: string | null }).branch_id : null
      return { branchId }
    }

    if (role === 'staff' || role === 'admin') {
      const { data } = await (supabase.from('staff_branches' as never) as ReturnType<typeof supabase.from>)
        .select('branch_id')
        .eq('profile_id', profile.id)
        .eq('is_primary', true)
        .maybeSingle()
      const branchId = data ? (data as unknown as { branch_id: string }).branch_id : null
      return { branchId }
    }

    return { branchId: null }
  } catch {
    return { branchId: null }
  }
}
