'use client'

import { useRouter } from 'next/navigation'
import { MemberForm } from '@/components/members/member-form'

interface EditMemberClientProps {
  member: {
    id: string
    full_name: string
    phone?: string | null
    gender?: string | null
    date_of_birth?: string | null
    emergency_contact_name?: string | null
    emergency_contact_phone?: string | null
  }
  redirectTo: string
}

export function EditMemberClient({ member, redirectTo }: EditMemberClientProps) {
  const router = useRouter()

  return (
    <MemberForm
      member={member}
      onSuccess={() => router.push(redirectTo)}
    />
  )
}
