'use client'

import { Users, TrendingUp, Calendar, Dumbbell, UserPlus, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsSkeleton } from '@/components/shared/skeleton-loaders'
import { formatCurrency } from '@/lib/utils'
import type { DashboardStats } from '@/lib/actions/reports'

interface KpiCardsProps {
  stats?: DashboardStats
  isLoading: boolean
}

interface KpiCardItemProps {
  title: string
  value: string | number
  icon: React.ReactNode
  iconBg: string
  description?: string
}

function KpiCardItem({ title, value, icon, iconBg, description }: KpiCardItemProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-full ${iconBg}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  )
}

export function KpiCards({ stats, isLoading }: KpiCardsProps) {
  if (isLoading) {
    return <StatsSkeleton />
  }

  const cards: KpiCardItemProps[] = [
    {
      title: 'Active Members',
      value: stats?.activeMembersCount ?? 0,
      icon: <Users className="h-4 w-4 text-green-600" />,
      iconBg: 'bg-green-100 dark:bg-green-900',
      description: 'Currently active memberships',
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(stats?.mrr ?? 0, 'IDR'),
      icon: <TrendingUp className="h-4 w-4 text-blue-600" />,
      iconBg: 'bg-blue-100 dark:bg-blue-900',
      description: 'Revenue this month',
    },
    {
      title: 'Classes This Week',
      value: stats?.classesThisWeek ?? 0,
      icon: <Calendar className="h-4 w-4 text-purple-600" />,
      iconBg: 'bg-purple-100 dark:bg-purple-900',
      description: 'Scheduled classes',
    },
    {
      title: 'PT Sessions',
      value: stats?.ptSessionsThisWeek ?? 0,
      icon: <Dumbbell className="h-4 w-4 text-orange-600" />,
      iconBg: 'bg-orange-100 dark:bg-orange-900',
      description: 'Personal training this week',
    },
    {
      title: 'New Members',
      value: stats?.newMembersThisMonth ?? 0,
      icon: <UserPlus className="h-4 w-4 text-teal-600" />,
      iconBg: 'bg-teal-100 dark:bg-teal-900',
      description: 'Joined this month',
    },
    {
      title: 'Expiring Soon',
      value: stats?.expiringThisWeek ?? 0,
      icon: (
        <AlertTriangle
          className={`h-4 w-4 ${(stats?.expiringThisWeek ?? 0) > 0 ? 'text-red-600' : 'text-gray-400'}`}
        />
      ),
      iconBg:
        (stats?.expiringThisWeek ?? 0) > 0
          ? 'bg-red-100 dark:bg-red-900'
          : 'bg-gray-100 dark:bg-gray-800',
      description: 'Memberships expiring in 7 days',
    },
  ]

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <KpiCardItem key={card.title} {...card} />
      ))}
    </div>
  )
}
