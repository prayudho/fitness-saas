'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TableSkeleton } from '@/components/shared/skeleton-loaders'
import { formatCurrency } from '@/lib/utils'
import type { TrainerPerformanceItem } from '@/lib/actions/reports'

interface TrainerPerformanceTableProps {
  data?: TrainerPerformanceItem[]
  isLoading: boolean
}

export function TrainerPerformanceTable({ data, isLoading }: TrainerPerformanceTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trainer Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No completed trainer sessions this month.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trainer</TableHead>
                <TableHead className="text-center">Sessions</TableHead>
                <TableHead className="text-right">Revenue (IDR)</TableHead>
                <TableHead className="text-right">Commission (IDR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">
                    {row.trainer_name ?? 'Unknown Trainer'}
                  </TableCell>
                  <TableCell className="text-center">{row.session_count}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.total_revenue, 'IDR')}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.total_commission, 'IDR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
