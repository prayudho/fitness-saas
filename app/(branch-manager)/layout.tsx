import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BranchManagerSidebar } from '@/components/layouts/branch-manager-sidebar'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from '@/components/ui/sonner'
import type { Database } from '@/types/database'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

export default async function BranchManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role, brand_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as (Pick<ProfileRow, 'role' | 'brand_id'> & { branch_id?: string | null }) | null

  if (!profile || (profile.role as string) !== 'branch_manager') redirect('/login')

  // Fetch branch_id separately since column not yet in generated types
  const { data: profileExt } = await supabase
    .from('profiles')
    .select('branch_id' as never)
    .eq('id', user.id)
    .single()

  const branchId = profileExt ? (profileExt as unknown as { branch_id: string | null }).branch_id : null

  // Fetch branch name for sidebar header
  let branchName = 'My Branch'
  if (branchId) {
    const { data: branch } = await (supabase.from('branches' as never) as ReturnType<typeof supabase.from>)
      .select('name')
      .eq('id', branchId)
      .single()

    if (branch) {
      branchName = (branch as { name: string }).name
    }
  }

  return (
    <QueryProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <BranchManagerSidebar branchName={branchName} />
        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
      <Toaster />
    </QueryProvider>
  )
}
