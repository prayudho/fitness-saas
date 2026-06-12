import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getMember } from '@/lib/actions/members'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { EditMemberClient } from './edit-member-client'

interface PageProps {
  params: { id: string }
}

export default async function EditMemberPage({ params }: PageProps) {
  const { data: member, error } = await getMember(params.id)

  if (error || !member) {
    notFound()
  }

  return (
    <div>
      <div className="mb-4">
        <Link
          href={`/admin/members/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Member
        </Link>
      </div>

      <PageHeader
        title="Edit Member"
        description={`Editing profile for ${member.full_name}`}
      />

      <div className="max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <EditMemberClient
              member={{
                id: member.id,
                full_name: member.full_name,
                phone: member.phone,
                gender: member.gender,
                date_of_birth: member.date_of_birth,
                emergency_contact_name: member.emergency_contact_name,
                emergency_contact_phone: member.emergency_contact_phone,
              }}
              redirectTo={`/admin/members/${params.id}`}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
