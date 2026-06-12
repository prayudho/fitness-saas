import { Skeleton } from '@/components/ui/skeleton'

export default function TeamLoading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>

      {/* Filters row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-9 w-36 sm:ml-auto" />
      </div>

      {/* Table skeleton */}
      <div className="space-y-3">
        {/* Header row */}
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={`h-${i}`} className="h-8" />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={`r-${row}`} className="grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, col) => (
              <Skeleton key={`c-${row}-${col}`} className="h-12" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
