'use client'

import { useEffect, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { SessionForm } from '@/components/trainers/session-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Dumbbell } from 'lucide-react'
import { useMemberPTBookings } from '@/lib/hooks/use-trainers'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import type { TrainerSessionWithTrainer } from '@/lib/actions/trainers'
import { formatCurrency, formatDate } from '@/lib/utils'

type TrainerRow = Database['public']['Tables']['trainers']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

type TrainerWithProfile = TrainerRow & {
  profiles: Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url'> | null
}

const sessionColumns: ColumnDef<TrainerSessionWithTrainer>[] = [
  {
    id: 'trainer',
    header: 'Trainer',
    cell: ({ row }) => {
      const trainerData = row.original.trainer as (TrainerRow & { profiles: Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url'> | null }) | null
      const name = trainerData?.profiles?.full_name ?? 'Unknown'
      const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={trainerData?.profiles?.avatar_url ?? undefined} />
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
      const val = getValue() as number | null
      return <span className="text-sm">{val != null ? formatCurrency(val) : '—'}</span>
    },
  },
]

function TrainerCard({
  trainer,
  onBook,
}: {
  trainer: TrainerWithProfile
  onBook: (trainer: TrainerWithProfile) => void
}) {
  const name = trainer.profiles?.full_name ?? 'Unknown Trainer'
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <Card className="flex flex-col">
      <CardContent className="p-5 flex flex-col flex-1">
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarImage src={trainer.profiles?.avatar_url ?? undefined} alt={name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{name}</p>
            <StatusBadge status={trainer.is_active ? 'active' : 'inactive'} />
          </div>
        </div>

        {trainer.specialties?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {trainer.specialties.slice(0, 3).map((s) => (
              <Badge key={s} variant="secondary" className="text-xs">
                {s}
              </Badge>
            ))}
            {trainer.specialties.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{trainer.specialties.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {trainer.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">{trainer.bio}</p>
        )}

        <Button
          onClick={() => onBook(trainer)}
          disabled={!trainer.is_active}
          className="w-full mt-auto"
          size="sm"
        >
          <Dumbbell className="mr-2 h-4 w-4" />
          Book Session
        </Button>
      </CardContent>
    </Card>
  )
}

export default function PTBookingPage() {
  const { user } = useAuth()
  const { data: myBookings, isLoading: bookingsLoading } = useMemberPTBookings(user?.id ?? '')

  const [trainers, setTrainers] = useState<TrainerWithProfile[]>([])
  const [loadingTrainers, setLoadingTrainers] = useState(true)
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerWithProfile | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    async function fetchTrainers() {
      try {
        const supabase = createClient()
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('brand_id')
          .eq('id', currentUser.id)
          .single()

        if (!profile?.brand_id) return

        const { data } = await supabase
          .from('trainers')
          .select(`
            *,
            profiles!trainers_id_fkey (id, full_name, avatar_url)
          `)
          .eq('brand_id', profile.brand_id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        setTrainers((data ?? []) as TrainerWithProfile[])
      } finally {
        setLoadingTrainers(false)
      }
    }
    fetchTrainers()
  }, [])

  function handleBook(trainer: TrainerWithProfile) {
    setSelectedTrainer(trainer)
    setSheetOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personal Training"
        description="Book sessions with our certified personal trainers"
      />

      <Tabs defaultValue="find">
        <TabsList>
          <TabsTrigger value="find">Find Trainers</TabsTrigger>
          <TabsTrigger value="my-sessions">My Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="find" className="mt-6">
          {loadingTrainers ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : trainers.length === 0 ? (
            <div className="rounded-lg border bg-card p-10 text-center">
              <Dumbbell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No trainers available</p>
              <p className="text-sm text-muted-foreground mt-1">
                Check back later for available personal trainers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trainers.map((trainer) => (
                <TrainerCard key={trainer.id} trainer={trainer} onBook={handleBook} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-sessions" className="mt-6">
          <DataTable
            data={(myBookings ?? []) as TrainerSessionWithTrainer[]}
            columns={sessionColumns}
            isLoading={bookingsLoading}
            emptyTitle="No sessions booked"
            emptyDescription="Your personal training sessions will appear here once booked."
          />
        </TabsContent>
      </Tabs>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Book Session with {selectedTrainer?.profiles?.full_name ?? 'Trainer'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {selectedTrainer && (
              <SessionForm
                trainerId={selectedTrainer.id}
                onSuccess={() => setSheetOpen(false)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
