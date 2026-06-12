'use client'

import { useState, useCallback } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { MemberForm } from '@/components/members/member-form'
import { getMemberColumns, type MemberRow } from '@/components/members/member-columns'
import { FreezeDialog } from '@/components/members/freeze-dialog'
import { useMembers, useUnfreezeMembership, useCancelMembership } from '@/lib/hooks/use-members'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { UserPlus } from 'lucide-react'

export default function MembersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null)
  const [freezeDialogMembershipId, setFreezeDialogMembershipId] = useState<string | null>(null)
  const [cancelMemberName, setCancelMemberName] = useState<string | null>(null)
  const [cancelMembershipId, setCancelMembershipId] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 300)
  const unfreeze = useUnfreezeMembership()
  const cancel = useCancelMembership()

  const { data: membersData, isLoading } = useMembers({
    search: debouncedSearch || undefined,
    status: status !== 'all' ? status : undefined,
    page: 1,
  })

  const members = (membersData?.data ?? []) as MemberRow[]

  const handleEdit = useCallback(
    (id: string) => {
      const member = members.find((m) => m.id === id)
      if (member) {
        setSelectedMember(member)
        setSheetOpen(true)
      }
    },
    [members]
  )

  const handleFreeze = useCallback(
    (m: MemberRow) => {
      const frozenMembership = m.memberships.find((ms) => ms.status === 'frozen')
      const activeMembership = m.memberships.find((ms) => ms.status === 'active')

      if (frozenMembership) {
        unfreeze.mutate(frozenMembership.id)
      } else if (activeMembership) {
        setFreezeDialogMembershipId(activeMembership.id)
      }
    },
    [unfreeze]
  )

  const handleCancel = useCallback((m: MemberRow) => {
    const targetMembership = m.memberships.find(
      (ms) => ms.status === 'active' || ms.status === 'frozen'
    )
    if (targetMembership) {
      setCancelMembershipId(targetMembership.id)
      setCancelMemberName(m.full_name ?? 'this member')
    }
  }, [])

  const columns = getMemberColumns({
    onEdit: handleEdit,
    onFreeze: handleFreeze,
    onCancel: handleCancel,
  })

  return (
    <div>
      <PageHeader
        title="Members"
        description="Manage your gym members and their memberships"
        action={
          <Button
            onClick={() => {
              setSelectedMember(null)
              setSheetOpen(true)
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="frozen">Frozen</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={members}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No members found"
        emptyDescription="Add your first member or adjust the search filters."
        pageSize={25}
      />

      {/* Edit Member Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedMember ? 'Edit Member' : 'Add Member'}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {selectedMember ? (
              <MemberForm
                member={{
                  id: selectedMember.id,
                  full_name: selectedMember.full_name ?? '',
                  phone: selectedMember.phone,
                }}
                onSuccess={() => {
                  setSheetOpen(false)
                  setSelectedMember(null)
                }}
              />
            ) : (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  New members are added by sending them an invitation. They will receive an email
                  link to create their account.
                </p>
                <p>Once they sign up, their profile will appear here automatically.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Freeze Dialog */}
      {freezeDialogMembershipId && (
        <FreezeDialog
          membershipId={freezeDialogMembershipId}
          onSuccess={() => setFreezeDialogMembershipId(null)}
        />
      )}

      {/* Cancel Confirm Dialog */}
      {cancelMembershipId && (
        <ConfirmDialog
          title="Cancel Membership"
          description={`Cancel ${cancelMemberName ?? 'this member'}'s current membership? This cannot be undone.`}
          onConfirm={async () => {
            await cancel.mutateAsync(cancelMembershipId)
            setCancelMembershipId(null)
            setCancelMemberName(null)
          }}
          isPending={cancel.isPending}
          variant="destructive"
        >
          <span className="hidden" />
        </ConfirmDialog>
      )}
    </div>
  )
}
