'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAssignPackage } from '@/lib/hooks/use-members'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { Plus } from 'lucide-react'
import type { Database } from '@/types/database'

type PackageRow = Database['public']['Tables']['membership_packages']['Row']

const schema = z.object({
  package_id: z.string().min(1, 'Please select a package'),
  starts_at: z.string().min(1, 'Start date is required'),
  promo_code: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface AssignPackageDialogProps {
  memberId: string
  onSuccess?: () => void
}

export function AssignPackageDialog({ memberId, onSuccess }: AssignPackageDialogProps) {
  const [open, setOpen] = useState(false)
  const [packages, setPackages] = useState<PackageRow[]>([])
  const [isLoadingPackages, setIsLoadingPackages] = useState(false)
  const assign = useAssignPackage()

  const today = new Date().toISOString().split('T')[0]

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      package_id: '',
      starts_at: today,
      promo_code: '',
    },
  })

  const selectedPackageId = form.watch('package_id')
  const selectedPackage = packages.find((p) => p.id === selectedPackageId)

  useEffect(() => {
    if (open) {
      setIsLoadingPackages(true)
      const supabase = createClient()
      supabase
        .from('membership_packages')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true })
        .then(({ data }) => {
          setPackages(data ?? [])
          setIsLoadingPackages(false)
        })
    }
  }, [open])

  async function onSubmit(data: FormData) {
    await assign.mutateAsync({
      member_id: memberId,
      package_id: data.package_id,
      starts_at: data.starts_at,
      promo_code: data.promo_code || undefined,
    })
    setOpen(false)
    form.reset({ package_id: '', starts_at: today, promo_code: '' })
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Assign Package
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Membership Package</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="package_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingPackages ? 'Loading packages...' : 'Select a package'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          <span className="font-medium">{pkg.name}</span>
                          <span className="ml-2 text-muted-foreground text-xs">
                            {formatCurrency(pkg.price, pkg.currency)}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedPackage && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {selectedPackage.type.replace('_', ' ')}
                  </Badge>
                  <span className="font-semibold">
                    {formatCurrency(selectedPackage.price, selectedPackage.currency)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground text-xs">
                  {selectedPackage.duration_days && (
                    <span>Duration: {selectedPackage.duration_days} days</span>
                  )}
                  {selectedPackage.session_credits && (
                    <span>Sessions: {selectedPackage.session_credits} credits</span>
                  )}
                  {(selectedPackage.pt_sessions_included ?? 0) > 0 && (
                    <span className="text-indigo-600 font-medium">
                      PT sessions: {selectedPackage.pt_sessions_included} included
                    </span>
                  )}
                  {selectedPackage.allow_freeze && (
                    <span>Freeze allowed: up to {selectedPackage.max_freeze_days ?? '?'} days</span>
                  )}
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="starts_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="promo_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Promo Code (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. SUMMER20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={assign.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={assign.isPending}>
                {assign.isPending ? 'Assigning...' : 'Assign Package'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
