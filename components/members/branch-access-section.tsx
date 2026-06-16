'use client'

import { GitBranch } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBranchList } from '@/lib/hooks/use-branches'
import { updateMemberHomeBranch } from '@/lib/actions/members'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

interface Props {
  memberId: string
  currentHomeBranchId: string | null
}

export function BranchAccessSection({ memberId, currentHomeBranchId }: Props) {
  const { data: branchData } = useBranchList()
  const [homeBranchId, setHomeBranchId] = useState(currentHomeBranchId ?? '')
  const [isPending, startTransition] = useTransition()

  if (!branchData?.isMultiBranch) return null

  const branches = branchData?.data ?? []

  function handleChange(branchId: string) {
    setHomeBranchId(branchId)
    startTransition(async () => {
      const { error } = await updateMemberHomeBranch(memberId, branchId || null)
      if (error) {
        toast.error(error)
        setHomeBranchId(currentHomeBranchId ?? '')
      } else {
        toast.success('Home branch updated')
      }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Branch Access
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Home branch — used for revenue attribution and member filtering.</p>
          <Select value={homeBranchId} onValueChange={handleChange} disabled={isPending}>
            <SelectTrigger>
              <SelectValue placeholder="No home branch (can check in anywhere)" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
