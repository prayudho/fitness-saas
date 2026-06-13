import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  // Read brand UUID from cookie set by middleware so PostgREST can call
  // get_my_brand_id() correctly when evaluating RLS policies.
  const brandId =
    typeof document !== 'undefined'
      ? (document.cookie.match(/(?:^|;\s*)__fp_brand_id=([^;]+)/)?.[1] ?? null)
      : null

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    brandId ? { global: { headers: { 'x-brand-id': brandId } } } : undefined
  )
}
