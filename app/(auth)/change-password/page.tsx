import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { ChangePasswordForm } from './change-password-form'

export default async function ChangePasswordPage() {
  const headersList = headers()
  const subdomain = headersList.get('x-tenant-subdomain')

  let brandName: string | null = null

  if (subdomain) {
    try {
      const supabase = createServiceClient()
      const { data: brand } = await supabase
        .from('brands')
        .select('name')
        .eq('slug', subdomain)
        .single()
      brandName = brand?.name ?? null
    } catch {
      // Non-fatal — proceed without brand name
    }
  }

  return <ChangePasswordForm brandName={brandName} />
}
