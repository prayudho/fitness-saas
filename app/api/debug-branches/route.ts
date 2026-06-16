import { cookies } from 'next/headers'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { getBranchList } from '@/lib/actions/branches.actions'

export async function GET() {
  const brandId = cookies().get('__fp_brand_id')?.value ?? null

  // Test 1: Direct service client query (original approach)
  let svcResult: Record<string, unknown> = {}
  try {
    const svc = createServiceClient()
    const [branchesResult, brandResult] = await Promise.all([
      svc.from('branches').select('id, name, is_active').eq('brand_id', brandId ?? '').eq('is_active', true),
      svc.from('brands').select('id, name, is_multi_branch').eq('id', brandId ?? '').single(),
    ])
    svcResult = {
      branches: branchesResult.data,
      branchesError: branchesResult.error?.message ?? null,
      brand: brandResult.data,
      brandError: brandResult.error?.message ?? null,
    }
  } catch (e) { svcResult = { error: String(e) } }

  // Test 2: Anon client query (same as admin layout)
  let anonResult: Record<string, unknown> = {}
  try {
    const supabase = createClient()
    const { data: brand, error } = await supabase
      .from('brands')
      .select('id, name, is_multi_branch')
      .eq('id', brandId ?? '')
      .single()
    anonResult = { brand, error: error?.message ?? null }
  } catch (e) { anonResult = { error: String(e) } }

  // Test 3: Call getBranchList() directly (same function used by TanStack Query)
  let branchListResult: Record<string, unknown> = {}
  try {
    branchListResult = await getBranchList() as Record<string, unknown>
  } catch (e) { branchListResult = { error: String(e) } }

  return Response.json({
    brandId,
    svcResult,
    anonResult,
    branchListResult,
  })
}
