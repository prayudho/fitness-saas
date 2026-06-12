'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardSkeleton } from '@/components/shared/skeleton-loaders'

interface PaymentMethodChartProps {
  data?: { name: string; value: number }[]
  isLoading: boolean
}

// cash=green, transfer=blue, gateway=purple, default=gray
const METHOD_COLORS: Record<string, string> = {
  Cash: '#10b981',
  'Bank Transfer': '#3b82f6',
  'Payment Gateway': '#8b5cf6',
}
const FALLBACK_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b']

export function PaymentMethodChart({ data, isLoading }: PaymentMethodChartProps) {
  if (isLoading) {
    return <CardSkeleton />
  }

  const getColor = (name: string, index: number) =>
    METHOD_COLORS[name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data ?? []}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {(data ?? []).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.name, index)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [value, name]}
              contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
            />
            <Legend
              formatter={(value: string) => (
                <span style={{ fontSize: '12px' }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
