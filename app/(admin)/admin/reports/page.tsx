'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { KpiCards } from '@/components/reports/kpi-cards'
import { RevenueChart } from '@/components/reports/revenue-chart'
import { PackageBreakdownChart } from '@/components/reports/package-breakdown-chart'
import { PaymentMethodChart } from '@/components/reports/payment-method-chart'
import { MemberGrowthChart } from '@/components/reports/member-growth-chart'
import { ClassPerformanceTable } from '@/components/reports/class-performance-table'
import { TrainerPerformanceTable } from '@/components/reports/trainer-performance-table'
import {
  useDashboardStats,
  useRevenueByMonth,
  usePackageBreakdown,
  usePaymentMethodBreakdown,
  useMemberGrowth,
  useClassPerformance,
  useTrainerPerformance,
} from '@/lib/hooks/use-reports'

type Period = 'month' | 'quarter' | 'year'

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('month')

  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: revenue, isLoading: revLoading } = useRevenueByMonth(6)
  const { data: pkgData, isLoading: pkgLoading } = usePackageBreakdown()
  const { data: pmData, isLoading: pmLoading } = usePaymentMethodBreakdown()
  const { data: growth, isLoading: growthLoading } = useMemberGrowth(6)
  const { data: classPerfData, isLoading: classLoading } = useClassPerformance()
  const { data: trainerPerfData, isLoading: trainerLoading } = useTrainerPerformance()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Insights and performance metrics for your gym"
        action={
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Row 1: KPI Cards */}
      <KpiCards stats={stats} isLoading={statsLoading} />

      {/* Row 2: Revenue Chart (2/3) + Package Breakdown (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={revenue} isLoading={revLoading} />
        </div>
        <div className="lg:col-span-1">
          <PackageBreakdownChart data={pkgData} isLoading={pkgLoading} />
        </div>
      </div>

      {/* Row 3: Member Growth (full width) */}
      <MemberGrowthChart data={growth} isLoading={growthLoading} />

      {/* Row 4: Payment Method (1/3) + Class Performance (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <PaymentMethodChart data={pmData} isLoading={pmLoading} />
        </div>
        <div className="lg:col-span-2">
          <ClassPerformanceTable data={classPerfData} isLoading={classLoading} />
        </div>
      </div>

      {/* Row 5: Trainer Performance (full width) */}
      <TrainerPerformanceTable data={trainerPerfData} isLoading={trainerLoading} />
    </div>
  )
}
