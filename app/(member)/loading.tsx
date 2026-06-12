import { Skeleton } from '@/components/ui/skeleton'

export default function MemberLoading() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm flex flex-col gap-4">
        <Skeleton className="h-8 w-36 mx-auto" />
        <Skeleton className="h-4 w-52 mx-auto" />
        <div className="flex flex-col gap-3 mt-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
        <Skeleton className="h-10 w-full rounded-md mt-2" />
      </div>
    </div>
  )
}
