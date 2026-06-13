import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'
import type { Database } from '@/types/database'

export function createClient() {
  const cookieStore  = cookies()
  const subdomain    = headers().get('x-tenant-subdomain')

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Forward the subdomain header so PostgREST exposes it as
      // current_setting('request.headers') inside SQL functions (e.g. get_my_brand_id).
      global: subdomain
        ? { headers: { 'x-tenant-subdomain': subdomain } }
        : undefined,
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {
            // Called from a Server Component — session refresh handled by middleware
          }
        },
      },
    }
  )
}

// Service client uses the service-role key and bypasses RLS.
// NEVER import or use this in client components.
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
