'use client'

import Link from 'next/link'
import { Users, Package, Calendar, BarChart2, CheckCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { KpiCards } from '@/components/reports/kpi-cards'
import { RevenueChart } from '@/components/reports/revenue-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardStats, useRevenueByMonth, useRecentCheckins } from '@/lib/hooks/use-reports'
import { formatRelativeTime } from '@/lib/utils'

const METHOD_LABEL: Record<string, string> = {
  qr: 'QR',
  staff: 'Staff',
  gate: 'Gate',
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: revenue, isLoading: revLoading } = useRevenueByMonth(3)
  const { data: checkins, isLoading: checkinsLoading } = useRecentCheckins(5)

  const quickActions = [
    { label: 'Members', href: '/admin/members', icon: Users, color: 'text-blue-600' },
    { label: 'Packages', href: '/admin/packages', icon: Package, color: 'text-purple-600' },
    { label: 'Classes', href: '/admin/classes', icon: Calendar, color: 'text-teal-600' },
    { label: 'Reports', href: '/admin/reports', icon: BarChart2, color: 'text-orange-600' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Your gym at a glance" />

      {/* KPI Cards */}
      <KpiCards stats={stats} isLoading={statsLoading} />

      {/* Revenue Chart */}
      <RevenueChart data={revenue} isLoading={revLoading} />

      {/* Bottom: Recent Check-ins + Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Check-ins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Recent Check-ins
            </CardTitle>
          </CardHeader>
          <CardContent>
            {checkinsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : !checkins || checkins.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent check-ins.</p>
            ) : (
              <ul className="space-y-3">
                {checkins.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate max-w-[60%]">
                      {c.member_name ?? 'Unknown'}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {METHOD_LABEL[c.method] ?? c.method}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {formatRelativeTime(c.checked_in_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map(({ label, href, icon: Icon, color }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex flex-col items-center justify-center rounded-lg border bg-card p-4 gap-2 hover:bg-accent hover:border-accent-foreground/20 transition-colors cursor-pointer"
                >
                  <Icon className={`h-6 w-6 ${color}`} />
                  <span className="text-sm font-medium">{label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
