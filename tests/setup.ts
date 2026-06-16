/**
 * Global test setup for Supabase RLS integration tests.
 *
 * Tests require a local Supabase instance with migration 023 applied.
 * Run with: supabase start && npx vitest run
 *
 * Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or
 * use the defaults printed by `supabase start`).
 */

// Suppress missing env-var noise when running without local Supabase
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= ''
process.env.SUPABASE_SERVICE_ROLE_KEY ??= ''
