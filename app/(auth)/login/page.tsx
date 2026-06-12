import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import LoginForm from './login-form'

export default async function LoginPage() {
  const headersList = headers()
  const subdomain = headersList.get('x-tenant-subdomain')

  let brandName: string | null = null
  let brandLogo: string | null = null
  let brandColor: string | null = null

  if (subdomain) {
    const supabase = createServiceClient()
    const { data: brand } = await supabase
      .from('brands')
      .select('name, logo_url, primary_color')
      .eq('slug', subdomain)
      .eq('is_active', true)
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
