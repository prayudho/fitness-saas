import { Skeleton } from '@/components/ui/skeleton'

export default function AdminLoading() {
  return (
    <div className="flex h-screen">
      <div className="w-60 h-full bg-card border-r p-4 flex flex-col gap-3">
        <Skeleton className="h-8 w-32" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-md" />
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b px-6 flex items-center gap-4">
          <Skeleton className="h-6 w-40" />
          <div className="ml-auto">
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
