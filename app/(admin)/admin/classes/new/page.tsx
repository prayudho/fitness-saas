'use client'

import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { ClassForm } from '@/components/classes/class-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewClassPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule New Class"
        description="Add a new group class to the schedule"
        action={
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        }
      />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Class Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ClassForm onSuccess={() => router.push('/admin/classes')} />
        </CardContent>
      </Card>
    </div>
  )
}
