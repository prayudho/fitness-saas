import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TrainerSidebar } from '@/components/layouts/trainer-sidebar'
import { Navbar } from '@/components/shared/navbar'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from '@/components/ui/sonner'

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const role = user.app_metadata?.role as string | undefined

  if (role !== 'trainer' && role !== 'admin') {
    redirect('/login')
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
