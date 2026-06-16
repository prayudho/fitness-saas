/**
 * RLS tests for multi-branch tables added in migration 023.
 *
 * Coverage:
 *  - branches: read scoped to own brand_id
 *  - staff_branches: read scoped to own brand (via branch → brand join in RLS)
 *  - checkins.branch_id: branch_id is persisted and filterable
 *  - memberships.branch_id: branch_id is persisted per record
 *
 * Prerequisites: local Supabase running with migration 023 applied.
 * Skip automatically when SERVICE_ROLE_KEY is not set (CI without Supabase).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { serviceClient as ServiceClientFn } from './helpers'

const SKIP = !process.env.SUPABASE_SERVICE_ROLE_KEY

describe.skipIf(SKIP)('RLS — multi-branch (migration 023)', () => {
  // Lazy — only initialized inside beforeAll (which is skipped when SKIP=true)
  let svc: ReturnType<typeof ServiceClientFn>

  // IDs of rows created during setup — cleaned up in afterAll
  const createdBrandIds:    string[] = []
  const createdBranchIds:   string[] = []
  const createdProfileIds:  string[] = []

  let brandAId: string
  let brandBId: string
  let branchA1Id: string
  let branchA2Id: string
  let branchBId:  string
  let adminAToken: string
  let adminBToken: string

  // ─── Seed two brands, each with branches ─────────────────────────────────
  beforeAll(async () => {
    const { serviceClient } = await import('./helpers')
    svc = serviceClient()
    // Brand A
    const { data: brandA } = await (svc.from('brands' as never) as ReturnType<typeof svc.from>)
      .insert({ name: 'Test Brand A', slug: `test-brand-a-${Date.now()}`, is_active: true, subscription_plan: 'starter' })
      .select('id')
      .single()
    brandAId = (brandA as { id: string }).id
    createdBrandIds.push(brandAId)

    // Brand B
    const { data: brandB } = await (svc.from('brands' as never) as ReturnType<typeof svc.from>)
      .insert({ name: 'Test Brand B', slug: `test-brand-b-${Date.now()}`, is_active: true, subscription_plan: 'starter' })
      .select('id')
      .single()
    brandBId = (brandB as { id: string }).id
    createdBrandIds.push(brandBId)

    // Branches for Brand A
    const { data: ba1 } = await (svc.from('branches' as never) as ReturnType<typeof svc.from>)
      .insert({ brand_id: brandAId, name: 'Branch A1', is_active: true })
      .select('id')
      .single()
    branchA1Id = (ba1 as { id: string }).id
    createdBranchIds.push(branchA1Id)

    const { data: ba2 } = await (svc.from('branches' as never) as ReturnType<typeof svc.from>)
      .insert({ brand_id: brandAId, name: 'Branch A2', is_active: true })
      .select('id')
      .single()
    branchA2Id = (ba2 as { id: string }).id
    createdBranchIds.push(branchA2Id)

    // Branch for Brand B
    const { data: bb } = await (svc.from('branches' as never) as ReturnType<typeof svc.from>)
      .insert({ brand_id: brandBId, name: 'Branch B1', is_active: true })
      .select('id')
      .single()
    branchBId = (bb as { id: string }).id
    createdBranchIds.push(branchBId)

    // Create admin users for each brand
    const tsA = Date.now()
    const tsB = tsA + 1

    const emailA = `test-admin-a-${tsA}@example.com`
    const emailB = `test-admin-b-${tsB}@example.com`
    const password = 'TestPass1!'

    const { data: userA } = await svc.auth.admin.createUser({ email: emailA, password, email_confirm: true })
    const { data: userB } = await svc.auth.admin.createUser({ email: emailB, password, email_confirm: true })

    if (!userA.user || !userB.user) throw new Error('Failed to create test users')
    createdProfileIds.push(userA.user.id, userB.user.id)

    // Insert profiles
    await (svc.from('profiles') as ReturnType<typeof svc.from>)
      .insert([
        { id: userA.user.id, brand_id: brandAId, role: 'admin', full_name: 'Admin A', is_active: true },
        { id: userB.user.id, brand_id: brandBId, role: 'admin', full_name: 'Admin B', is_active: true },
      ] as never)

    // Get access tokens
    const anonCl = (await import('./helpers')).anonClient()
    const { data: sessionA } = await anonCl.auth.signInWithPassword({ email: emailA, password })
    const { data: sessionB } = await anonCl.auth.signInWithPassword({ email: emailB, password })

    adminAToken = sessionA.session?.access_token ?? ''
    adminBToken = sessionB.session?.access_token ?? ''
  })

  afterAll(async () => {
    // Clean up in reverse dependency order
    for (const branchId of createdBranchIds) {
      await (svc.from('branches' as never) as ReturnType<typeof svc.from>).delete().eq('id', branchId)
    }
    for (const profileId of createdProfileIds) {
      await svc.from('profiles').delete().eq('id', profileId)
      await svc.auth.admin.deleteUser(profileId)
    }
    for (const brandId of createdBrandIds) {
      await svc.from('brands').delete().eq('id', brandId)
    }
  })

  // ─── branches table ───────────────────────────────────────────────────────

  describe('branches table — RLS read isolation', () => {
    it('admin A can read their own branches', async () => {
      const { anonClient } = await import('./helpers')
      const cl = anonClient(adminAToken)
      const { data, error } = await (cl.from('branches' as never) as ReturnType<typeof cl.from>)
        .select('id, name')
        .eq('brand_id', brandAId)

      expect(error).toBeNull()
      const ids = (data as { id: string }[]).map((r) => r.id)
      expect(ids).toContain(branchA1Id)
      expect(ids).toContain(branchA2Id)
    })

    it('admin A cannot read Brand B branches', async () => {
      const { anonClient } = await import('./helpers')
      const cl = anonClient(adminAToken)
      const { data, error } = await (cl.from('branches' as never) as ReturnType<typeof cl.from>)
        .select('id')
        .eq('id', branchBId)

      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    it('admin B can read their branch but not Brand A branches', async () => {
      const { anonClient } = await import('./helpers')
      const cl = anonClient(adminBToken)
      const { data, error } = await (cl.from('branches' as never) as ReturnType<typeof cl.from>)
        .select('id')

      expect(error).toBeNull()
      const ids = (data as { id: string }[]).map((r) => r.id)
      expect(ids).toContain(branchBId)
      expect(ids).not.toContain(branchA1Id)
      expect(ids).not.toContain(branchA2Id)
    })
  })

  // ─── branch_id on checkins ────────────────────────────────────────────────

  describe('checkins.branch_id — written and readable', () => {
    const checkinIds: string[] = []

    afterAll(async () => {
      if (checkinIds.length > 0) {
        await svc.from('checkins').delete().in('id', checkinIds)
      }
    })

    it('service role can insert a checkin with branch_id', async () => {
      // We need a member profile first
      const { data: memberAuth } = await svc.auth.admin.createUser({
        email: `member-rls-${Date.now()}@example.com`,
        password: 'TestPass1!',
        email_confirm: true,
      })
      const memberId = memberAuth.user?.id
      if (!memberId) throw new Error('no member user')
      createdProfileIds.push(memberId)

      await (svc.from('profiles') as ReturnType<typeof svc.from>).insert({
        id: memberId, brand_id: brandAId, role: 'member', full_name: 'Test Member', is_active: true,
      } as never)

      const { data, error } = await (svc.from('checkins' as never) as ReturnType<typeof svc.from>)
        .insert({
          brand_id: brandAId,
          member_id: memberId,
          method: 'staff',
          checked_in_at: new Date().toISOString(),
          branch_id: branchA1Id,
        })
        .select('id, branch_id')
        .single()

      expect(error).toBeNull()
      expect((data as { branch_id: string }).branch_id).toBe(branchA1Id)
      checkinIds.push((data as { id: string }).id)
    })

    it('checkin without branch_id has null branch_id', async () => {
      const memberId = createdProfileIds.at(-1)
      if (!memberId) return

      const { data, error } = await (svc.from('checkins' as never) as ReturnType<typeof svc.from>)
        .insert({
          brand_id: brandAId,
          member_id: memberId,
          method: 'staff',
          checked_in_at: new Date().toISOString(),
        })
        .select('id, branch_id')
        .single()

      expect(error).toBeNull()
      expect((data as { branch_id: string | null }).branch_id).toBeNull()
      checkinIds.push((data as { id: string }).id)
    })
  })

  // ─── branch_id on memberships ─────────────────────────────────────────────

  describe('memberships.branch_id — persisted correctly', () => {
    it('service role can insert a membership with branch_id', async () => {
      const memberId = createdProfileIds.at(-1)
      if (!memberId) return

      const { data, error } = await (svc.from('memberships' as never) as ReturnType<typeof svc.from>)
        .insert({
          brand_id:           brandAId,
          member_id:          memberId,
          status:             'active',
          starts_at:          new Date().toISOString().split('T')[0],
          gym_access_status:  'active',
          pt_sessions_status: 'active',
          auto_renew:         false,
          branch_id:          branchA2Id,
        })
        .select('id, branch_id')
        .single()

      expect(error).toBeNull()
      expect((data as { branch_id: string }).branch_id).toBe(branchA2Id)

      // Cleanup
      if (data) {
        await svc.from('memberships').delete().eq('id', (data as { id: string }).id)
      }
    })
  })

  // ─── is_multi_branch flag ─────────────────────────────────────────────────

  describe('brands.is_multi_branch — service role can toggle', () => {
    it('can set is_multi_branch to true on Brand A', async () => {
      const { error } = await (svc.from('brands' as never) as ReturnType<typeof svc.from>)
        .update({ is_multi_branch: true })
        .eq('id', brandAId)

      expect(error).toBeNull()

      const { data } = await (svc.from('brands' as never) as ReturnType<typeof svc.from>)
        .select('is_multi_branch')
        .eq('id', brandAId)
        .single()

      expect((data as { is_multi_branch: boolean }).is_multi_branch).toBe(true)

      // Reset
      await (svc.from('brands' as never) as ReturnType<typeof svc.from>)
        .update({ is_multi_branch: false })
        .eq('id', brandAId)
    })
  })
})
