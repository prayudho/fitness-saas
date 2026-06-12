import { cn } from '@/lib/utils'
import type { DashboardStat } from '@/types'

export function StatCard({ label, value, change, changeType }: DashboardStat) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {change !== undefined && (
        <p className={cn(
          'mt-1 text-xs font-medium',
          changeType === 'increase' && 'text-green-600',
          changeType === 'decrease' && 'text-red-600',
          changeType === 'neutral' && 'text-muted-foreground',
        )}>
          {changeType === 'increase' ? '+' : changeType === 'decrease' ? '-' : ''}
          {Math.abs(change)}% from last month
        </p>
      )}
    </div>
  )
}
