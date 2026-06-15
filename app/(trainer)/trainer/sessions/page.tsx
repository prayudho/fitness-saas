'use client'

import { useState, useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { TrainerStatsCard } from '@/components/trainers/trainer-stats-card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { CalendarPlus, MoreHorizontal, CheckCircle, XCircle, AlertCircle, ClipboardList } from 'lucide-react'
import {
  useTrainerSessions,
  useUpdateSessionStatus,
  useBookSessionByTrainer,
  useAvailableSlots,
} from '@/lib/hooks/use-trainers'
import { useTrainerActiveMembers } from '@/lib/hooks/use-pt-assignments'
import { useAuth } from '@/lib/hooks/use-auth'
import type { TrainerSessionWithMember } from '@/lib/actions/trainers'
import type { TrainerActiveMember } from '@/lib/actions/pt-assignment.actions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ── Booking sheet ─────────────────────────────────────────────────────────────

const bookingSchema = z.object({
  member_id:        z.string().min(1, 'Select a client'),
  date:             z.string().min(1, 'Select a date'),
  scheduled_at:     z.string().min(1, 'Select a time slot'),
  duration_minutes: z.coerce.number().min(15),
  notes:            z.string().optional(),
})
type BookingForm = z.infer<typeof bookingSchema>

function BookSessionSheet({
  open,
  onOpenChange,
  clients,
  trainerId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  clients: TrainerActiveMember[]
  trainerId: string
}) {
  const mutation = useBookSessionByTrainer()

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      member_id:        '',
      date:             '',
      scheduled_at:     '',
      duration_minutes: 60,
      notes:            '',
    },
  })

  const watchDate     = form.watch('date')
  const watchDuration = form.watch('duration_minutes')
  const watchSlot     = form.watch('scheduled_at')

  const { data: slots = [], isFetching: slotsLoading } = useAvailableSlots(
    trainerId,
    watchDate,
    watchDuration
  )

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate())
  const minDate = tomorrow.toISOString().slice(0, 10)

  function handleSubmit(values: BookingForm) {
    mutation.mutate(
      {
        member_id:        values.member_id,
        scheduled_at:     values.scheduled_at,
        duration_minutes: values.duration_minutes,
        notes:            values.notes || undefined,
      },
      {
        onSuccess: () => {
          form.reset()
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Book a Session</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">

              {/* Client selector */}
              <FormField
                control={form.control}
                name="member_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.member_id} value={c.member_id}>
                            <span>{c.member_name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({c.pt_sessions_remaining ?? 0} sessions left)
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Duration */}
              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <Select
                      onValueChange={(v) => {
                        field.onChange(Number(v))
                        form.setValue('scheduled_at', '') // reset slot when duration changes
                      }}
                      value={String(field.value)}
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

              {/* Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        min={minDate}
                        {...field}
                        onChange={(e) => {
                          field.onChange(e)
                          form.setValue('scheduled_at', '') // reset slot when date changes
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Available time slots */}
              {watchDate && (
                <FormField
                  control={form.control}
                  name="scheduled_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available Time Slots</FormLabel>
                      {slotsLoading ? (
                        <div className="grid grid-cols-3 gap-2 mt-1">
                          {[...Array(6)].map((_, i) => (
                            <Skeleton key={i} className="h-9" />
                          ))}
                        </div>
                      ) : slots.length === 0 ? (
                        <p className="text-sm text-muted-foreground mt-1">
                          No availability on this date.
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 mt-1">
                          {slots.map((s) => (
                            <button
                              key={s.time}
                              type="button"
                              onClick={() => field.onChange(s.time)}
                              className={cn(
                                'px-2 py-2 rounded-md text-sm border transition-colors',
                                field.value === s.time
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'border-input hover:bg-accent'
                              )}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Session goals, focus areas, any special requirements…"
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
                disabled={mutation.isPending || !watchSlot}
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

// ── Session actions dropdown ──────────────────────────────────────────────────

function SessionActions({ session }: { session: TrainerSessionWithMember }) {
  const { mutate, isPending } = useUpdateSessionStatus()

  if (session.status !== 'scheduled') return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isPending}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => mutate({ id: session.id, status: 'completed' })}
          className="text-green-600 focus:text-green-700"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Mark Completed
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => mutate({ id: session.id, status: 'no_show' })}
          className="text-yellow-600 focus:text-yellow-700"
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          No Show
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => mutate({ id: session.id, status: 'cancelled' })}
          className="text-destructive focus:text-destructive"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Cancel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function generateMonthOptions() {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    options.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
    })
  }
  return options
}

export default function TrainerSessionsPage() {
  const { user } = useAuth()
  const monthOptions = useMemo(() => generateMonthOptions(), [])
  const [selectedMonth, setSelectedMonth]   = useState(monthOptions[0].value)
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [bookOpen, setBookOpen]             = useState(false)

  const { data: sessions = [], isLoading } = useTrainerSessions(user?.id ?? '', {
    month:  selectedMonth,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
  })

  const { data: clients = [] } = useTrainerActiveMembers(user?.id ?? '')

  const filteredSessions = sessions ?? []
  const totalRevenue    = filteredSessions.reduce((sum, s) => sum + (s.session_fee ?? 0), 0)
  const totalCommission = filteredSessions.reduce((sum, s) => sum + (s.commission_earned ?? 0), 0)

  const columns: ColumnDef<TrainerSessionWithMember>[] = [
    {
      id: 'member',
      header: 'Client',
      cell: ({ row }) => (
        <span className="font-medium text-sm">{row.original.member?.full_name ?? 'Unknown'}</span>
      ),
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
        const val = getValue() as number | null
        return <span className="text-sm">{val != null ? formatCurrency(val) : '—'}</span>
      },
    },
    {
      accessorKey: 'commission_earned',
      header: 'Commission',
      cell: ({ getValue }) => {
        const val = getValue() as number | null
        return (
          <span className="text-sm text-green-600">
            {val != null ? formatCurrency(val) : '—'}
          </span>
        )
      },
    },
    {
      id: 'log',
      header: '',
      cell: ({ row }) => {
        if (row.original.status !== 'completed') return null
        return (
          <Button asChild variant="ghost" size="sm" title="Log workout">
            <Link href={`/trainer/sessions/${row.original.id}/log`}>
              <ClipboardList className="h-4 w-4" />
            </Link>
          </Button>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => <SessionActions session={row.original} />,
    },
  ]

  const activeClients = clients.filter((c) => c.status === 'active' || c.status === 'grace_period')

  return (
    <div className="space-y-6">
      <PageHeader
        title="PT Sessions"
        description="Manage your personal training sessions"
        action={
          <Button
            onClick={() => setBookOpen(true)}
            disabled={activeClients.length === 0}
            title={activeClients.length === 0 ? 'No active clients assigned yet' : undefined}
          >
            <CalendarPlus className="mr-2 h-4 w-4" />
            Book Session
          </Button>
        }
      />

      <TrainerStatsCard
        sessions={filteredSessions.length}
        revenue={totalRevenue}
        commission={totalCommission}
      />

      <div className="flex gap-3 flex-wrap">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={filteredSessions}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No sessions found"
        emptyDescription="No sessions match your current filters."
      />

      {user?.id && (
        <BookSessionSheet
          open={bookOpen}
          onOpenChange={setBookOpen}
          clients={activeClients}
          trainerId={user.id}
        />
      )}
    </div>
  )
}
