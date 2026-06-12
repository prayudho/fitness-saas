'use server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type User = { id: string; email?: string }

export async function getAuthedProfile(supabase: ReturnType<typeof createClient>): Promise<{ user: User; profile: Profile }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')
  const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profileError || !profile) throw new Error('Profile not found')
  return { user, profile }
}
