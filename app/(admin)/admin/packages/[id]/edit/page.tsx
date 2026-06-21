import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getServerBrandId } from '@/lib/actions/utils'
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
  const brandId = getServerBrandId()
  if (!brandId) notFound()

  const supabase = createClient()

  const { data: pkg, error } = await supabase
    .from('membership_packages')
    .select('*')
    .eq('id', params.id)
    .eq('brand_id', brandId)
    .single()

  if (error || !pkg) {
    notFound()
  }

  return <EditPackageClient pkg={pkg} />
}
