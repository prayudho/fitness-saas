import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { TrainerSidebar } from '@/components/layouts/trainer-sidebar'
import { TopBar } from '@/components/layouts/topbar'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from 'sonner'

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const brandId = cookies().get('__fp_brand_id')?.value ?? null

  let profileRole: string | null = null
  let trainerFullName: string | null = null
  if (brandId) {
    const profileResult = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .eq('brand_id', brandId)
      .maybeSingle()
    const profile = (profileResult.data as unknown) as { role: string; full_name: string | null } | null
    profileRole = profile?.role ?? null
    trainerFullName = profile?.full_name ?? null
  }

  const role = profileRole ?? (user.app_metadata?.role as string | undefined) ?? ''

  if (role !== 'trainer' && role !== 'admin') {
    redirect('/no-access')
  }

  const displayName = trainerFullName ?? user.user_metadata?.full_name ?? undefined
  const displayEmail = user.email ?? undefined

  return (
    <QueryProvider>
      <div className="flex h-screen bg-background">
        <TrainerSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar
            userName={displayName}
            userEmail={displayEmail}
            userRole="trainer"
          />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
      <Toaster richColors />
    </QueryProvider>
  )
}
