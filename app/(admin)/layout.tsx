import { redirect } from 'next/navigation'
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const role: string = user.app_metadata?.role ?? ''

  if (role !== 'admin' && role !== 'superadmin') {
    redirect('/login')
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('name,logo_url,primary_color,secondary_color')
    .eq('owner_id', user.id)
    .single()

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
