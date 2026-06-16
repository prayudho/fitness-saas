'use client'

import {
  Users,
  ScanLine,
  TrendingUp,
  Dumbbell,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { useBranchManagerDashboard } from '@/lib/hooks/use-branches'
import { formatCurrency } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'

function StatCard({
  title,
  value,
  icon: Icon,
  sub,
  highlight,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  sub?: string
  highlight?: 'warning' | 'success'
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div
          className={
            highlight === 'warning'
              ? 'text-2xl font-bold text-amber-600'
              : highlight === 'success'
              ? 'text-2xl font-bold text-green-600'
              : 'text-2xl font-bold'
          }
        >
          {value}
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function CheckinMethodBadge({ method }: { method: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    qr:       { label: 'QR Code',   variant: 'default' },
    manual:   { label: 'Manual',    variant: 'secondary' },
    override: { label: 'Override',  variant: 'outline' },
  }
  const { label, variant } = map[method] ?? { label: method, variant: 'outline' }
  return <Badge variant={variant} className="text-xs">{label}</Badge>
}

export default function BranchManagerDashboardPage() {
  const { data, isLoading, error } = useBranchManagerDashboard()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-60" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <AlertTriangle className="h-10 w-10" />
        <p className="text-sm">{error?.message ?? 'Failed to load dashboard data'}</p>
      </div>
    )
  }

  const { branch, stats, recent_checkins } = data
  const today = new Date()

  return (
    <div className="space-y-6">
      <PageHeader
        title={branch.name}
        description={[branch.address, branch.phone].filter(Boolean).join(' · ') || 'Branch Manager Dashboard'}
      />

      {/* KPI Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="xl:col-span-1">
          <StatCard
            title="Active Members"
            value={stats.active_members}
            icon={Users}
            sub="with active membership"
          />
        </div>
        <div className="xl:col-span-1">
          <StatCard
            title="Check-ins Today"
            value={stats.checkins_today}
            icon={ScanLine}
            sub={`${stats.checkins_this_week} this week`}
          />
        </div>
        <div className="xl:col-span-1">
          <StatCard
            title="Check-ins This Month"
            value={stats.checkins_this_month}
            icon={Calendar}
            sub={format(today, 'MMMM yyyy')}
          />
        </div>
        <div className="xl:col-span-1">
          <StatCard
            title="Revenue MTD"
            value={formatCurrency(stats.revenue_this_month)}
            icon={TrendingUp}
            sub={format(today, 'MMMM yyyy')}
          />
        </div>
        <div className="xl:col-span-1">
          <StatCard
            title="PT Sessions MTD"
            value={stats.sessions_this_month}
            icon={Dumbbell}
            sub="completed sessions"
          />
        </div>
        <div className="xl:col-span-1">
          <StatCard
            title="Expiring Soon"
            value={stats.expiring_soon}
            icon={AlertTriangle}
            sub="memberships within 7 days"
            highlight={stats.expiring_soon > 0 ? 'warning' : undefined}
          />
        </div>
      </div>

      {/* Recent Check-ins */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ScanLine className="h-4 w-4" />
            Recent Check-ins
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recent_checkins.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <CheckCircle className="h-8 w-8" />
              <p className="text-sm">No check-ins yet today</p>
            </div>
          ) : (
            <ul className="divide-y">
              {recent_checkins.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {c.member_name ?? <span className="text-muted-foreground italic">Unknown member</span>}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(c.checked_in_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <CheckinMethodBadge method={c.method} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
