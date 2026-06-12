'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { PackageForm } from '@/components/packages/package-form'

export default function NewPackagePage() {
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
        title="New Package"
        description="Create a new membership package for your gym"
      />
      <PackageForm onSuccess={() => router.push('/admin/packages')} />
    </div>
  )
}
