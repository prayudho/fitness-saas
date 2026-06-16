'use client'

import { useState } from 'react'
import { Building2, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { BranchCard } from '@/components/branches/branch-card'
import { BranchForm } from '@/components/branches/branch-form'
import { useBranches, useUpdateBranch } from '@/lib/hooks/use-branches'
import type { BranchWithStats } from '@/lib/actions/branches.actions'

export default function BranchesPage() {
  const [sheetOpen, setSheetOpen]           = useState(false)
  const [editing, setEditing]               = useState<BranchWithStats | null>(null)
  const [toggleTarget, setToggleTarget]     = useState<BranchWithStats | null>(null)

  const { data, isLoading } = useBranches()
  const update = useUpdateBranch()

  const branches = data?.data ?? []

  function handleEdit(branch: BranchWithStats) {
    setEditing(branch)
    setSheetOpen(true)
  }

  function handleAddNew() {
    setEditing(null)
    setSheetOpen(true)
  }

  function handleSheetClose() {
    setSheetOpen(false)
    setEditing(null)
  }

  async function handleToggleActive() {
    if (!toggleTarget) return
    await update.mutateAsync({
      id: toggleTarget.id,
      input: { is_active: !toggleTarget.is_active },
    })
    setToggleTarget(null)
  }

  return (
    <div>
      <PageHeader
        title="Branches"
        description="Manage your physical gym locations"
        action={
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Branch
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold">No branches yet</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            Add your first branch to start organizing members, staff, and check-ins by location.
          </p>
          <Button className="mt-4" onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Branch
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              onEdit={handleEdit}
              onToggleActive={(b) => setToggleTarget(b)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) handleSheetClose() }}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Branch' : 'Add Branch'}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <BranchForm
              branch={editing ?? undefined}
              onSuccess={handleSheetClose}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Activate / Deactivate Confirm */}
      {toggleTarget && (
        <ConfirmDialog
          title={toggleTarget.is_active ? 'Deactivate Branch' : 'Activate Branch'}
          description={
            toggleTarget.is_active
              ? `Deactivating "${toggleTarget.name}" will prevent new check-ins at this location. Existing memberships are not affected.`
              : `Activate "${toggleTarget.name}" to allow check-ins and bookings at this location.`
          }
          onConfirm={handleToggleActive}
          isPending={update.isPending}
          variant={toggleTarget.is_active ? 'destructive' : 'default'}
        >
          <span className="hidden" />
        </ConfirmDialog>
      )}
    </div>
  )
}
