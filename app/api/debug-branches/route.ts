import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const brandId = cookies().get('__fp_brand_id')?.value ?? null

  if (!brandId) {
    return Response.json({ error: 'no_cookie', brandId: null })
  }

  try {
    const svc = createServiceClient()
    const [branchesResult, brandResult] = await Promise.all([
      svc.from('branches').select('id, name, is_active').eq('brand_id', brandId).eq('is_active', true),
      svc.from('brands').select('id, name, is_multi_branch').eq('id', brandId).single(),
    ])

    return Response.json({
      brandId,
      branches: branchesResult.data,
      branchesError: branchesResult.error?.message ?? null,
      brand: brandResult.data,
      brandError: brandResult.error?.message ?? null,
    })
  } catch (e) {
    return Response.json({ error: String(e), brandId })
  }
}
