'use client'

import * as React from 'react'
import { Plus, Tag } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CardSkeleton } from '@/components/shared/skeleton-loaders'
import { EmptyState } from '@/components/shared/empty-state'
import { DataTable } from '@/components/shared/data-table'
import { PackageCard } from '@/components/packages/package-card'
import { PackageForm } from '@/components/packages/package-form'
import { PromoCodeForm } from '@/components/packages/promo-code-form'
import { getPromoColumns } from '@/components/packages/promo-code-columns'
import {
  usePackages,
  useDeletePackage,
  usePromoCodes,
  useDeletePromoCode,
} from '@/lib/hooks/use-packages'
import type { Database } from '@/types/database'

type PackageRow = Database['public']['Tables']['membership_packages']['Row']
type PromoCodeRow = Database['public']['Tables']['promo_codes']['Row']
type CategoryFilter = 'all' | 'gym_access' | 'pt_sessions' | 'bundled'

export default function PackagesPage() {
  const [packageSheetOpen, setPackageSheetOpen] = React.useState(false)
  const [editingPackage, setEditingPackage] = React.useState<PackageRow | null>(null)
  const [promoSheetOpen, setPromoSheetOpen] = React.useState(false)
  const [editingPromo, setEditingPromo] = React.useState<PromoCodeRow | null>(null)
  const [categoryFilter, setCategoryFilter] = React.useState<CategoryFilter>('all')

  const { data: packages, isLoading: packagesLoading } = usePackages()
  const { data: promoCodes, isLoading: promoLoading } = usePromoCodes()
  const deletePackageMutation = useDeletePackage()
  const deletePromoMutation = useDeletePromoCode()

  const filteredPackages = React.useMemo(() => {
    if (!packages) return []
    if (categoryFilter === 'all') return packages
    return packages.filter(
      (p) => ((p as unknown as Record<string, unknown>).package_category ?? 'gym_access') === categoryFilter
    )
  }, [packages, categoryFilter])

  function openEditPackage(pkg: PackageRow) {
    setEditingPackage(pkg)
    setPackageSheetOpen(true)
  }

  function openAddPackage() {
    setEditingPackage(null)
    setPackageSheetOpen(true)
  }

  function closePackageSheet() {
    setPackageSheetOpen(false)
    setEditingPackage(null)
  }

  function openEditPromo(promo: PromoCodeRow) {
    setEditingPromo(promo)
    setPromoSheetOpen(true)
  }

  function openAddPromo() {
    setEditingPromo(null)
    setPromoSheetOpen(true)
  }

  function closePromoSheet() {
    setPromoSheetOpen(false)
    setEditingPromo(null)
  }

  const promoColumns = getPromoColumns({
    onEdit: openEditPromo,
    onDelete: (id) => deletePromoMutation.mutate(id),
  })

  return (
    <div>
      <PageHeader
        title="Membership Packages"
        description="Manage membership packages and promotional codes"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openAddPromo}>
              <Tag className="mr-2 h-4 w-4" />
              Add Promo Code
            </Button>
            <Button size="sm" onClick={openAddPackage}>
              <Plus className="mr-2 h-4 w-4" />
              Add Package
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="packages">
        <TabsList className="mb-6">
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="promo-codes">Promo Codes</TabsTrigger>
        </TabsList>

        {/* Packages Tab */}
        <TabsContent value="packages">
          {/* Category filter tabs */}
          <div className="flex gap-2 mb-4">
            {(
              [
                { value: 'all',         label: 'All' },
                { value: 'gym_access',  label: 'Gym Access' },
                { value: 'pt_sessions', label: 'PT Sessions' },
                { value: 'bundled',     label: 'Bundled' },
              ] as { value: CategoryFilter; label: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCategoryFilter(opt.value)}
                className={
                  categoryFilter === opt.value
                    ? 'rounded-full border border-primary bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground'
                    : 'rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground transition-colors'
                }
              >
                {opt.label}
                {opt.value !== 'all' && packages && (
                  <span className="ml-1.5 opacity-60">
                    {packages.filter(
                      (p) =>
                        ((p as unknown as Record<string, unknown>).package_category ?? 'gym_access') === opt.value
                    ).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {packagesLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : !filteredPackages || filteredPackages.length === 0 ? (
            <EmptyState
              title={categoryFilter === 'all' ? 'No packages yet' : `No ${categoryFilter.replace('_', ' ')} packages`}
              description={
                categoryFilter === 'all'
                  ? 'Create your first membership package to get started.'
                  : `Create a ${categoryFilter.replace('_', ' ')} package to see it here.`
              }
              action={{ label: 'Add Package', onClick: openAddPackage }}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPackages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  onEdit={() => openEditPackage(pkg)}
                  onDelete={() => deletePackageMutation.mutate(pkg.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Promo Codes Tab */}
        <TabsContent value="promo-codes">
          <DataTable
            data={promoCodes ?? []}
            columns={promoColumns}
            isLoading={promoLoading}
            searchKey="code"
            searchPlaceholder="Search promo codes..."
            emptyTitle="No promo codes yet"
            emptyDescription="Create your first promo code to offer discounts."
          />
        </TabsContent>
      </Tabs>

      {/* Package Sheet */}
      <Sheet open={packageSheetOpen} onOpenChange={setPackageSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingPackage ? 'Edit Package' : 'New Package'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <PackageForm
              package={editingPackage ?? undefined}
              onSuccess={closePackageSheet}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Promo Code Sheet */}
      <Sheet open={promoSheetOpen} onOpenChange={setPromoSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingPromo ? 'Edit Promo Code' : 'New Promo Code'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <PromoCodeForm
              code={editingPromo ?? undefined}
              onSuccess={closePromoSheet}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
