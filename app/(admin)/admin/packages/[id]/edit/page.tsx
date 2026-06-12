import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getAuthedProfile } from '@/lib/actions/utils'
import { EditPackageClient } from './edit-package-client'

interface EditPackagePageProps {
  params: { id: string }
}

export async function generateMetadata({
  params,
}: EditPackagePageProps): Promise<Metadata> {
  return { title: `Edit Package` }
}

export default async function EditPackagePage({ params }: EditPackagePageProps) {
  const supabase = createClient()

  let profile
  try {
    const result = await getAuthedProfile(supabase)
    profile = result.profile
  } catch {
    notFound()
  }

  const { data: pkg, error } = await supabase
    .from('membership_packages')
    .select('*')
    .eq('id', params.id)
    .eq('brand_id', profile.brand_id!)
    .single()

  if (error || !pkg) {
    notFound()
  }

  return <EditPackageClient pkg={pkg} />
}
