'use client'

import { toast } from 'sonner'
import { CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useGetMidtransToken } from '@/lib/hooks/use-billing'

interface PayMidtransButtonProps {
  invoiceId: string
  label?: string
  className?: string
}

export function PayMidtransButton({
  invoiceId,
  label = 'Pay via Midtrans',
  className,
}: PayMidtransButtonProps) {
  const mutation = useGetMidtransToken()

  async function handleClick() {
    const result = await mutation.mutateAsync(invoiceId)
    if (result?.redirect_url) {
      window.open(result.redirect_url, '_blank')
    } else {
      toast.error('Midtrans not configured. Please contact your administrator.')
    }
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleClick}
      disabled={mutation.isPending}
      className={className}
    >
      <CreditCard className="mr-2 h-4 w-4" />
      {mutation.isPending ? 'Processing...' : label}
    </Button>
  )
}
