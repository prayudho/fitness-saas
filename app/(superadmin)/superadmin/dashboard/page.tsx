import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { Building2, Users, DollarSign, Activity, Plus } from 'lucide-react'
import { getPlatformStats, getRecentBrands } from '@/lib/actions/superadmin'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsSkeleton, TableSkeleton } from '@/components/shared/skeleton-loaders'

export const metadata: Metadata = { title: 'Platform Overview — Gerak' }

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

async function PlatformKPIs() {
  const stats = await getPlatformStats()

  const cards = [
    {
      label: 'Total Brands',
      value: stats.total_brands,
      icon: Building2,
      colorClass: 'text-indigo-600',
      bgClass: 'bg-indigo-50',
    },
    {
      label: 'Active Members',
      value: stats.total_members.toLocaleString(),
      icon: Users,
      colorClass: 'text-green-600',
      bgClass: 'bg-green-50',
    },
    {
      label: 'Estimated MRR',
      value: formatCurrency(stats.estimated_mrr),
      icon: DollarSign,
      colorClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50',
    },
    {
      label: 'Active Brands',
      value: stats.active_brands,
      icon: Activity,
      colorClass: 'text-blue-600',
      bgClass: 'bg-blue-50',
    },
  ]

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <div className={`rounded-lg p-2 ${card.bgClass}`}>
                <Icon className={`h-4 w-4 ${card.colorClass}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

async function RecentBrandsTable() {
  const brands = await getRecentBrands(5)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Recent Brands</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {brands.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">No brands registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Owner</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Members</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Plan</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((brand) => (
                  <tr key={brand.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-6 py-4 font-medium">
                      <Link
                        href={`/superadmin/brands/${brand.id}`}
                        className="hover:underline text-foreground"
                      >
                        {brand.name}
                      </Link>
                      <div className="text-xs text-muted-foreground font-mono">{brand.slug}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {brand.owner_email ?? '—'}
                    </td>
                    <td className="px-6 py-4">{brand.member_count ?? 0}</td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="capitalize">
                        {brand.subscription_plan}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {brand.is_active ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Suspended</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(brand.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function SuperadminDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Overview"
        description="Monitor all brands and platform health"
        action={
          <Button asChild>
            <Link href="/superadmin/brands/new">
              <Plus className="mr-2 h-4 w-4" />
              Onboard New Brand
            </Link>
          </Button>
        }
      />

      <Suspense fallback={<StatsSkeleton />}>
        <PlatformKPIs />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense
            fallback={
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Brands</CardTitle>
                </CardHeader>
                <CardContent>
                  <TableSkeleton rows={5} cols={6} />
                </CardContent>
              </Card>
            }
          >
            <RecentBrandsTable />
          </Suspense>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Platform Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
                <span className="text-sm font-medium text-green-700">All systems operational</span>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="text-muted-foreground">Uptime</p>
                <p className="font-semibold text-foreground">99.9%</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="text-muted-foreground">Database</p>
                <p className="font-semibold text-green-600">Healthy</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="text-muted-foreground">Auth Service</p>
                <p className="font-semibold text-green-600">Healthy</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/superadmin/brands/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Onboard New Brand
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/superadmin/brands">
                  <Building2 className="mr-2 h-4 w-4" />
                  View All Brands
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/superadmin/settings">
                  <Activity className="mr-2 h-4 w-4" />
                  Platform Settings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
