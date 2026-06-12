'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { PackageForm } from '@/components/packages/package-form'
import type { Database } from '@/types/database'

type PackageRow = Database['public']['Tables']['membership_packages']['Row']

interface EditPackageClientProps {
  pkg: PackageRow
}

export function EditPackageClient({ pkg }: EditPackageClientProps) {
  const router = useRouter()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/packages">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Packages
          </Link>
        </Button>
      </div>
      <PageHeader
        title="Edit Package"
        description={`Editing "${pkg.name}"`}
      />
      <PackageForm
        package={pkg}
        onSuccess={() => router.push('/admin/packages')}
      />
    </div>
  )
}
