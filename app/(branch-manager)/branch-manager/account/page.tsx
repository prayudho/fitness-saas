'use client'

import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { KeyRound } from 'lucide-react'

export default function BranchManagerAccountPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Account"
        description="Manage your account settings"
      />
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Account Settings
          </CardTitle>
          <CardDescription>
            Manage your password and profile details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use the admin panel to update your profile. Contact your brand administrator
            to change your role or branch assignment.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
