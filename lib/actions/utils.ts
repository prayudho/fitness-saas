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

  const query = supabase.from('profiles').select('*').eq('id', user.id)
  const { data: profile, error: profileError } = await (
    brandId ? query.eq('brand_id', brandId) : query.is('brand_id', null)
  ).maybeSingle()

  if (profileError || !profile) throw new Error('Profile not found for this brand')
  return { user, profile }
}

export function getServerBrandId(): string | null {
  return cookies().get('__fp_brand_id')?.value ?? null
}
