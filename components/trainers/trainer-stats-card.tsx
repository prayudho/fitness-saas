'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface TrainerStatsCardProps {
  sessions: number
  revenue: number
  commission: number
}

export function TrainerStatsCard({ sessions, revenue, commission }: TrainerStatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">This Month Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Sessions This Month</p>
            <p className="text-2xl font-bold">{sessions}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(revenue)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Commission Earned</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(commission)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
