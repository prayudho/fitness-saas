import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = getStatusColor(status)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize',
        colorClass,
        className
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
    case 'paid':
    case 'completed':
    case 'attended':
    case 'confirmed':
      return 'bg-green-100 text-green-700 border-green-200'

    case 'frozen':
    case 'pending':
    case 'scheduled':
    case 'booked':
    case 'waitlisted':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'

    case 'expired':
    case 'failed':
    case 'cancelled':
    case 'no_show':
      return 'bg-red-100 text-red-700 border-red-200'

    case 'refunded':
    case 'day_pass':
      return 'bg-blue-100 text-blue-700 border-blue-200'

    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}
