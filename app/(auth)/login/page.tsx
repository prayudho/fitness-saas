import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import LoginForm from './login-form'

export default async function LoginPage() {
  const brandId = cookies().get('__fp_brand_id')?.value ?? null

  let brandName: string | null = null
  let brandLogo: string | null = null
  let brandColor: string | null = null

  if (brandId) {
    const supabase = createServiceClient()
    const { data: brand } = await supabase
      .from('brands')
      .select('name, logo_url, primary_color')
      .eq('id', brandId)
      .single()

    brandName = brand?.name ?? null
    brandLogo = brand?.logo_url ?? null
    brandColor = brand?.primary_color ?? null
  }

  return (
    <LoginForm
      brandName={brandName}
      brandLogo={brandLogo}
      brandColor={brandColor}
    />
  )
}
