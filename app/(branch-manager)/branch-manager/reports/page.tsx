'use client'

import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useBranchManagerDashboard } from '@/lib/hooks/use-branches'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { CalendarClock } from 'lucide-react'

export default function BranchManagerReportsPage() {
  const { data, isLoading } = useBranchManagerDashboard()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Branch performance summary"
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/branch-manager/reports/expiry">
              <CalendarClock className="mr-2 h-4 w-4" />
              Expiry Report
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : data ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Members</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.stats.active_members}</p>
              <p className="text-xs text-muted-foreground mt-1">home branch members with active membership</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Check-ins (MTD)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.stats.checkins_this_month}</p>
              <p className="text-xs text-muted-foreground mt-1">{format(new Date(), 'MMMM yyyy')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Revenue (MTD)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(data.stats.revenue_this_month)}</p>
              <p className="text-xs text-muted-foreground mt-1">{format(new Date(), 'MMMM yyyy')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">PT Sessions (MTD)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.stats.sessions_this_month}</p>
              <p className="text-xs text-muted-foreground mt-1">completed sessions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Check-ins Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.stats.checkins_today}</p>
              <p className="text-xs text-muted-foreground mt-1">{data.stats.checkins_this_week} this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Expiring Memberships</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${data.stats.expiring_soon > 0 ? 'text-amber-600' : ''}`}>
                {data.stats.expiring_soon}
              </p>
              <p className="text-xs text-muted-foreground mt-1">expiring within 7 days</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No data available.</p>
      )}
    </div>
  )
}
