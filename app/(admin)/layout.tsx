import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/layouts/admin-sidebar'
import { TopBar } from '@/components/layouts/topbar'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from 'sonner'
import { BrandThemeProvider } from '@/components/shared/brand-theme-provider'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const brandId = cookies().get('__fp_brand_id')?.value ?? null

  // Resolve role from the per-brand profile (supports multi-brand users)
  let profileRole: string | null = null
  if (brandId) {
    const profileResult = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .eq('brand_id', brandId)
      .maybeSingle()
    profileRole = ((profileResult.data as unknown) as { role: string } | null)?.role ?? null
  }

  // Fall back to JWT role for superadmin (no brand context)
  const role = profileRole ?? (user.app_metadata?.role as string | undefined) ?? ''

  if (role !== 'admin' && role !== 'superadmin') {
    redirect('/no-access')
  }

  // Fetch brand settings for theme + display
  type BrandTheme = {
    name: string
    logo_url: string | null
    primary_color: string | null
    secondary_color: string | null
    is_multi_branch: boolean
  }
  let brand: BrandTheme | null = null
  if (brandId) {
    const brandResult = await supabase
      .from('brands')
      .select('name, logo_url, primary_color, secondary_color, is_multi_branch')
      .eq('id', brandId)
      .maybeSingle()
    brand = (brandResult.data as unknown) as BrandTheme | null
  }

  return (
    <BrandThemeProvider
      primaryColor={brand?.primary_color}
      secondaryColor={brand?.secondary_color}
    >
      <div className="flex h-screen bg-background">
        <AdminSidebar
          userName={user.user_metadata?.full_name}
          userEmail={user.email}
          userRole={role}
          isMultiBranch={brand?.is_multi_branch ?? false}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar
            userName={user.user_metadata?.full_name}
            userEmail={user.email}
            userRole={role}
            brandName={brand?.name}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <QueryProvider>{children}</QueryProvider>
          </main>
        </div>
      </div>
      <Toaster richColors />
    </BrandThemeProvider>
  )
}
