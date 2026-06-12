'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Eye, PowerOff, Power } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useBrandsList, useSuspendBrand, useActivateBrand } from '@/lib/hooks/use-superadmin'
import { useDebounce } from '@/lib/hooks/use-debounce'
import type { BrandWithOwner } from '@/lib/actions/superadmin'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function BrandsPage() {
  const router = useRouter()
  const [search, setSearch] = React.useState('')
  const [status, setStatus] = React.useState('all')
  const [page, setPage] = React.useState(1)
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useBrandsList({
    search: debouncedSearch || undefined,
    status: status === 'all' ? undefined : status,
    page,
  })

  const suspendBrand = useSuspendBrand()
  const activateBrand = useActivateBrand()

  const brands = data?.data ?? []

  const columns: ColumnDef<BrandWithOwner>[] = [
    {
      accessorKey: 'name',
      header: 'Brand',
      cell: ({ row }) => {
        const brand = row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={brand.logo_url ?? undefined} alt={brand.name} />
              <AvatarFallback className="text-xs bg-indigo-100 text-indigo-800">
                {getInitials(brand.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{brand.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{brand.slug}</p>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'slug',
      header: 'Subdomain',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">
          {row.original.slug}.fitnessplace.com
        </span>
      ),
    },
    {
      accessorKey: 'owner_email',
      header: 'Owner Email',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.owner_email ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'member_count',
      header: 'Members',
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.member_count ?? 0}</span>
      ),
    },
    {
      accessorKey: 'subscription_plan',
      header: 'Plan',
      cell: ({ row }) => (
        <Badge variant="secondary" className="capitalize">
          {row.original.subscription_plan}
        </Badge>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
        ) : (
          <Badge variant="destructive">Suspended</Badge>
        ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const brand = row.original
        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild title="View details">
              <Link href={`/superadmin/brands/${brand.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>

            {brand.is_active ? (
              <ConfirmDialog
                title="Suspend Brand"
                description={`Are you sure you want to suspend "${brand.name}"? Members will lose access until reactivated.`}
                variant="destructive"
                onConfirm={() => suspendBrand.mutate(brand.id)}
                isPending={suspendBrand.isPending}
              >
                <Button variant="ghost" size="icon" title="Suspend brand">
                  <PowerOff className="h-4 w-4 text-red-500" />
                </Button>
              </ConfirmDialog>
            ) : (
              <ConfirmDialog
                title="Activate Brand"
                description={`Reactivate "${brand.name}"? Members will regain access.`}
                onConfirm={() => activateBrand.mutate(brand.id)}
                isPending={activateBrand.isPending}
              >
                <Button variant="ghost" size="icon" title="Activate brand">
                  <Power className="h-4 w-4 text-green-600" />
                </Button>
              </ConfirmDialog>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Brands"
        description="Manage all fitness brands on the platform"
        action={
          <Button asChild>
            <Link href="/superadmin/brands/new">
              <Plus className="mr-2 h-4 w-4" />
              Onboard New Brand
            </Link>
          </Button>
        }
      />

      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search brands..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        {data && (
          <span className="text-sm text-muted-foreground ml-auto">
            {data.total} brand{data.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <DataTable
        data={brands}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No brands found"
        emptyDescription="Adjust your search filters or onboard a new brand."
        pageSize={25}
      />

      {data && data.total > 25 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {Math.ceil(data.total / 25)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(data.total / 25)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
