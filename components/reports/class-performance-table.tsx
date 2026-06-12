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
import { Progress } from '@/components/ui/progress'
import { TableSkeleton } from '@/components/shared/skeleton-loaders'
import type { ClassPerformanceItem } from '@/lib/actions/reports'

interface ClassPerformanceTableProps {
  data?: ClassPerformanceItem[]
  isLoading: boolean
}

export function ClassPerformanceTable({ data, isLoading }: ClassPerformanceTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No class data for this month.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead className="text-center">Bookings</TableHead>
                <TableHead className="w-40">Fill Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.class_name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.type_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.instructor_name ?? '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.booked_count} / {row.capacity}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={row.fill_rate} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {row.fill_rate}%
                      </span>
                    </div>
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
