'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { User, UserPlus } from 'lucide-react'
import { usePTAssignment } from '@/lib/hooks/use-pt-assignments'
import { AssignPTSheet, ReleasePTButton } from './assign-pt-sheet'
import { formatDate } from '@/lib/utils'

interface PTAssignmentCardProps {
  memberId: string
  membershipId: string
  packageName: string
  canAssignPT: boolean
}

export function PTAssignmentCard({ memberId, membershipId, packageName, canAssignPT }: PTAssignmentCardProps) {
  const { data: assignment, isLoading } = usePTAssignment(memberId, membershipId)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState<'assign' | 'reassign'>('assign')

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">Personal Trainer Assignment</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-16 w-full" /></CardContent>
      </Card>
    )
  }

  const hasAssignment = Boolean(assignment)
  const trainerName = (assignment as { trainer_profile?: { full_name?: string } | null } | undefined | null)
    ?.trainer_profile?.full_name ?? 'Unknown'
  const trainerAvatar = (assignment as { trainer_profile?: { avatar_url?: string | null } | null } | undefined | null)
    ?.trainer_profile?.avatar_url ?? null
  const initials = trainerName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">Personal Trainer — {packageName}</CardTitle>
          {!hasAssignment && canAssignPT && (
            <Button
              size="sm"
              onClick={() => { setSheetMode('assign'); setSheetOpen(true) }}
            >
              <UserPlus className="mr-1.5 h-4 w-4" />
              Assign PT
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!hasAssignment ? (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              {canAssignPT
                ? 'No trainer assigned to this membership yet.'
                : 'PT assignment is unavailable — membership is inactive or invoice is unpaid.'}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={trainerAvatar ?? undefined} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{trainerName}</p>
                  <p className="text-xs text-muted-foreground">
                    Assigned {formatDate(assignment!.assigned_at)}
                  </p>
                </div>
                <Badge
                  variant={assignment!.status === 'grace_period' ? 'secondary' : 'default'}
                  className="capitalize text-xs"
                >
                  {assignment!.status === 'grace_period' ? 'Grace Period' : 'Active'}
                </Badge>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSheetMode('reassign'); setSheetOpen(true) }}
                >
                  Reassign
                </Button>
                <ReleasePTButton assignmentId={assignment!.id} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AssignPTSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        memberId={memberId}
        membershipId={membershipId}
        mode={sheetMode}
        currentAssignmentId={assignment?.id}
      />
    </>
  )
}
