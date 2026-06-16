import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** Service-role client — bypasses RLS, used for seeding and cleanup only. */
export function serviceClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Anon client — subject to RLS, impersonates the given user via JWT. */
export function anonClient(accessToken?: string) {
  const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers },
  })
}

/** Sign up a test user and return their access token. */
export async function createTestUser(email: string, password = 'TestPass1!'): Promise<string> {
  const svc = serviceClient()
  // Delete if exists so tests are idempotent
  const { data: existing } = await svc.auth.admin.listUsers()
  const found = existing?.users?.find((u) => u.email === email)
  if (found) await svc.auth.admin.deleteUser(found.id)

  const { data, error } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) throw new Error(`createTestUser: ${error?.message}`)

  // Sign in as that user to get an access token subject to RLS
  const { data: session, error: signInErr } = await svc.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (signInErr || !session) throw new Error(`generateLink: ${signInErr?.message}`)

  // Use password sign-in instead for a real JWT
  const anonCl = anonClient()
  const { data: pwData, error: pwErr } = await anonCl.auth.signInWithPassword({ email, password })
  if (pwErr || !pwData.session) throw new Error(`signInWithPassword: ${pwErr?.message}`)
  return pwData.session.access_token
}

/** Clean up all rows inserted during a test by IDs. */
export async function cleanup(table: string, ids: string[]) {
  if (ids.length === 0) return
  const svc = serviceClient()
  await (svc.from(table as never) as ReturnType<typeof svc.from>)
    .delete()
    .in('id', ids)
}
