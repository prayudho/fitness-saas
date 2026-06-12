'use client'

import { Users } from 'lucide-react'
import { useOccupancy } from '@/lib/hooks/use-checkins'
import { cn } from '@/lib/utils'

interface OccupancyCounterProps {
  className?: string
}

export function OccupancyCounter({ className }: OccupancyCounterProps) {
  const { data: count, isLoading } = useOccupancy()

  return (
    <div className={cn('flex items-center gap-3 bg-card border rounded-lg px-4 py-2', className)}>
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-xs font-medium text-green-600 uppercase tracking-wide">Live</span>
      </div>

      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <div className="text-right">
          {isLoading ? (
            <div className="h-7 w-8 bg-muted animate-pulse rounded" />
          ) : (
            <span className="text-2xl font-bold leading-none">{count ?? 0}</span>
          )}
          <p className="text-xs text-muted-foreground leading-none mt-0.5">today</p>
        </div>
      </div>
    </div>
  )
}
