import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const role: string = user.app_metadata?.role ?? ''

  if (role !== 'member') {
    redirect('/login')
  }

  // Fetch member profile
  const { data: member } = await supabase
    .from('profiles')
    .select('full_name,avatar_url')
    .eq('id', user.id)
    .single()

  // Fetch brand from x-tenant-subdomain header
  const headersList = headers()
  const subdomain = headersList.get('x-tenant-subdomain')

  let brand: {
    name: string
    primary_color: string
    logo_url?: string | null
  } | null = null

  if (subdomain) {
    const { data } = await supabase
      .from('brands')
      .select('name,logo_url,primary_color')
      .eq('slug', subdomain)
      .eq('is_active', true)
      .single()
    brand = data
  }

  const displayName = member?.full_name ?? user.user_metadata?.full_name ?? undefined
  const displayEmail = user.email ?? undefined
  const avatarUrl = member?.avatar_url ?? null

  return (
    <div
      style={
        {
          '--brand-primary': brand?.primary_color ?? '#6366f1',
        } as React.CSSProperties
      }
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
