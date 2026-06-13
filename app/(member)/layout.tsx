import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { MemberSidebar } from '@/components/layouts/member-sidebar'
import { TopBar } from '@/components/layouts/topbar'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from 'sonner'

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const brandId = cookies().get('__fp_brand_id')?.value ?? null

  // Resolve profile for the current brand
  let profileRole: string | null = null
  let memberFullName: string | null = null
  let avatarUrl: string | null = null

  if (brandId) {
    const profileResult = await supabase
      .from('profiles')
      .select('role, full_name, avatar_url')
      .eq('id', user.id)
      .eq('brand_id', brandId)
      .maybeSingle()
    const profile = (profileResult.data as unknown) as { role: string; full_name: string | null; avatar_url: string | null } | null

    profileRole    = profile?.role ?? null
    memberFullName = profile?.full_name ?? null
    avatarUrl      = profile?.avatar_url ?? null
  }

  const role = profileRole ?? (user.app_metadata?.role as string | undefined) ?? ''

  if (role !== 'member') {
    redirect('/no-access')
  }

  // Fetch brand theme
  type BrandTheme = { name: string; primary_color: string; logo_url?: string | null }
  let brand: BrandTheme | null = null
  if (brandId) {
    const brandResult = await supabase
      .from('brands')
      .select('name, logo_url, primary_color')
      .eq('id', brandId)
      .maybeSingle()
    brand = (brandResult.data as unknown) as BrandTheme | null
  }

  const displayName  = memberFullName ?? user.user_metadata?.full_name ?? undefined
  const displayEmail = user.email ?? undefined

  return (
    <div
      style={{ '--brand-primary': brand?.primary_color ?? '#6366f1' } as React.CSSProperties}
    >
      <div className="flex h-screen bg-background">
        <MemberSidebar
          userName={displayName}
          userEmail={displayEmail}
          avatarUrl={avatarUrl}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar
            userName={displayName}
            userEmail={displayEmail}
            userRole="member"
            brandName={brand?.name}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <QueryProvider>{children}</QueryProvider>
          </main>
        </div>
      </div>
      <Toaster richColors />
    </div>
  )
}
