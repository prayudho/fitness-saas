'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dumbbell, UserX, CalendarPlus } from 'lucide-react'
import { toast } from 'sonner'
import {
  getMemberPTData,
  getMemberPTBookings,
  bookMemberPTSession,
} from '@/lib/actions/trainers'
import type { TrainerSessionWithTrainer } from '@/lib/actions/trainers'
import { useAuth } from '@/lib/hooks/use-auth'
import { formatDate, formatCurrency } from '@/lib/utils'

const bookingSchema = z.object({
  scheduled_at: z.string().min(1, 'Please select a date and time').refine(
    (val) => new Date(val) > new Date(),
    'Session must be scheduled in the future'
  ),
  duration_minutes: z.coerce.number().min(15),
  notes: z.string().optional(),
})

type BookingForm = z.infer<typeof bookingSchema>

const sessionColumns: ColumnDef<TrainerSessionWithTrainer>[] = [
  {
    id: 'trainer',
    header: 'Trainer',
    cell: ({ row }) => {
      const trainer = row.original.trainer
      const name = trainer?.profiles?.full_name ?? 'Unknown'
      const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={trainer?.profiles?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-sm">{name}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'scheduled_at',
    header: 'Date & Time',
    cell: ({ getValue }) => {
      const val = getValue() as string
      return (
        <div>
          <p className="text-sm">{formatDate(val)}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(val).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )
    },
  },
  {
    accessorKey: 'duration_minutes',
    header: 'Duration',
    cell: ({ getValue }) => <span className="text-sm">{getValue() as number} min</span>,
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'session_fee',
    header: 'Fee',
    cell: ({ getValue }) => {
      const v = getValue() as number | null
      return <span className="text-sm">{v != null ? formatCurrency(v) : '—'}</span>
    },
  },
]

function BookingSheet({
  open,
  onOpenChange,
  trainerName,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  trainerName: string
}) {
  const queryClient = useQueryClient()

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      scheduled_at: '',
      duration_minutes: 60,
      notes: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: BookingForm) =>
      bookMemberPTSession({
        scheduled_at: new Date(data.scheduled_at).toISOString(),
        duration_minutes: data.duration_minutes,
        notes: data.notes || undefined,
      }),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Session booked successfully!')
      queryClient.invalidateQueries({ queryKey: ['member-pt-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['member-pt-data'] })
      form.reset()
      onOpenChange(false)
    },
    onError: () => toast.error('Failed to book session. Please try again.'),
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Book Session with {trainerName}</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="scheduled_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date & Time</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(Number(v))}
                      defaultValue={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                        <SelectItem value="90">90 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Session goals or any notes for your trainer..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Booking…' : 'Confirm Booking'}
              </Button>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default function PTBookingPage() {
  const { user } = useAuth()
  const [sheetOpen, setSheetOpen] = useState(false)

  const { data: ptData, isLoading: ptLoading } = useQuery({
    queryKey: ['member-pt-data'],
    queryFn: async () => {
      const result = await getMemberPTData()
      if (result.error) throw new Error(result.error)
      return result.data
    },
  })

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['member-pt-bookings', user?.id],
    queryFn: async () => {
      const result = await getMemberPTBookings(user?.id ?? '')
      return result.data ?? []
    },
    enabled: Boolean(user?.id),
  })

  const trainer = ptData?.assignedTrainer ?? null
  const ptMem = ptData?.ptMembership ?? null
  const canBook =
    trainer !== null &&
    trainer.status === 'active' &&
    (ptMem?.pt_sessions_remaining ?? 0) > 0 &&
    ptMem?.pt_sessions_status === 'active'

  const trainerInitials = trainer
    ? trainer.trainer_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : ''

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personal Training"
        description="Book sessions with your assigned personal trainer"
      />

      <Tabs defaultValue="trainer">
        <TabsList>
          <TabsTrigger value="trainer">My Trainer</TabsTrigger>
          <TabsTrigger value="sessions">My Sessions</TabsTrigger>
        </TabsList>

        {/* ── My Trainer tab ── */}
        <TabsContent value="trainer" className="mt-6">
          {ptLoading ? (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ) : !trainer ? (
            <Card>
              <CardContent className="p-10 flex flex-col items-center gap-3 text-center">
                <UserX className="h-10 w-10 text-muted-foreground" />
                <p className="font-semibold">No trainer assigned yet</p>
                <p className="text-sm text-muted-foreground">
                  Contact your gym to get a personal trainer assigned to your package.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Trainer card */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="h-16 w-16 flex-shrink-0">
                      <AvatarImage src={trainer.trainer_avatar_url ?? undefined} />
                      <AvatarFallback className="text-lg font-semibold">
                        {trainerInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-lg truncate">{trainer.trainer_name}</p>
                      <Badge
                        variant={trainer.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs mt-1 capitalize"
                      >
                        {trainer.status === 'grace_period' ? 'Grace Period' : 'Active'}
                      </Badge>
                      {trainer.specialties && trainer.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {trainer.specialties.slice(0, 4).map((s) => (
                            <Badge key={s} variant="outline" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {trainer.bio && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {trainer.bio}
                    </p>
                  )}

                  <Button
                    className="w-full"
                    onClick={() => setSheetOpen(true)}
                    disabled={!canBook}
                  >
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    Book a Session
                  </Button>

                  {!canBook && trainer && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      {trainer.status === 'grace_period'
                        ? 'New bookings are paused — your trainer assignment is ending. Contact your gym.'
                        : (ptMem?.pt_sessions_remaining ?? 0) <= 0
                        ? 'No sessions remaining on your package.'
                        : ptMem?.pt_sessions_status !== 'active'
                        ? 'Your PT sessions are no longer active.'
                        : 'Booking unavailable.'}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* PT package summary */}
              {ptMem && (
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Dumbbell className="h-4 w-4 text-purple-600" />
                      <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">
                        PT Package
                      </span>
                    </div>
                    <p className="font-semibold text-sm mb-4">{ptMem.package_name}</p>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sessions remaining</span>
                        <span className="font-semibold text-purple-600">
                          {ptMem.pt_sessions_remaining ?? '—'}
                        </span>
                      </div>
                      {ptMem.pt_sessions_expires_at && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Credits expire</span>
                          <span className="font-medium">
                            {formatDate(ptMem.pt_sessions_expires_at)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <Badge
                          variant={
                            ptMem.pt_sessions_status === 'active'
                              ? 'default'
                              : 'destructive'
                          }
                          className="text-xs capitalize"
                        >
                          {ptMem.pt_sessions_status ?? 'active'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── My Sessions tab ── */}
        <TabsContent value="sessions" className="mt-6">
          <DataTable
            data={(sessions ?? []) as TrainerSessionWithTrainer[]}
            columns={sessionColumns}
            isLoading={sessionsLoading}
            emptyTitle="No sessions yet"
            emptyDescription="Your personal training sessions will appear here once booked."
          />
        </TabsContent>
      </Tabs>

      {trainer && (
        <BookingSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          trainerName={trainer.trainer_name}
        />
      )}
    </div>
  )
}
