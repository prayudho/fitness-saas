import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { ChangePasswordForm } from './change-password-form'

export default async function ChangePasswordPage() {
  const brandId = cookies().get('__fp_brand_id')?.value ?? null

  let brandName: string | null = null

  if (brandId) {
    try {
      const supabase = createServiceClient()
      const { data: brand } = await supabase
        .from('brands')
        .select('name')
        .eq('id', brandId)
        .single()
      brandName = brand?.name ?? null
    } catch {
      // Non-fatal — proceed without brand name
    }
  }

  return <ChangePasswordForm brandName={brandName} />
}
