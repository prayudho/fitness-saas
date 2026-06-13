import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { TrainerSidebar } from '@/components/layouts/trainer-sidebar'
import { Navbar } from '@/components/shared/navbar'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from '@/components/ui/sonner'

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const brandId = cookies().get('__fp_brand_id')?.value ?? null

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

  const role = profileRole ?? (user.app_metadata?.role as string | undefined) ?? ''

  if (role !== 'trainer' && role !== 'admin') {
    redirect('/no-access')
  }

  return (
    <QueryProvider>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex flex-1">
          <TrainerSidebar />
          <main className="flex-1 overflow-auto p-6 bg-background">{children}</main>
        </div>
      </div>
      <Toaster />
    </QueryProvider>
  )
}
