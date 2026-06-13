'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { TrainerForm } from '@/components/trainers/trainer-form'
import { AvailabilityEditor } from '@/components/trainers/availability-editor'
import { TrainerStatsCard } from '@/components/trainers/trainer-stats-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, MoreHorizontal, Pencil } from 'lucide-react'
import { useTrainer, useUpdateSessionStatus } from '@/lib/hooks/use-trainers'
import type { TrainerSessionWithMember } from '@/lib/actions/trainers'
import { formatCurrency, formatDate } from '@/lib/utils'

function SessionActions({ session }: { session: TrainerSessionWithMember }) {
  const mutation = useUpdateSessionStatus()
  if (session.status !== 'scheduled') return <StatusBadge status={session.status} />
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => mutation.mutate({ id: session.id, status: 'completed' })}
        >
          Mark Complete
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => mutation.mutate({ id: session.id, status: 'no_show' })}
        >
          No Show
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => mutation.mutate({ id: session.id, status: 'cancelled' })}
        >
          Cancel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const sessionColumns: ColumnDef<TrainerSessionWithMember>[] = [
  {
    id: 'member',
    header: 'Member',
    cell: ({ row }) => {
      const name = row.original.member?.full_name ?? 'Unknown'
      return <span className="font-medium text-sm">{name}</span>
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
    id: 'actions',
    header: '',
    cell: ({ row }) => <SessionActions session={row.original} />,
  },
]

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value ?? '—'}</p>
    </div>
  )
}

interface PageProps {
  params: { id: string }
}

export default function TrainerDetailPage({ params }: PageProps) {
  const { id } = params
  const { data: trainer, isLoading } = useTrainer(id)
  const [isEditOpen, setIsEditOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!trainer) {
    return (
      <div className="space-y-4">
        <Link href="/admin/trainers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Trainers
          </Button>
        </Link>
        <p className="text-muted-foreground">Trainer not found.</p>
      </div>
    )
  }

  const name = trainer.profiles?.full_name ?? 'Unknown Trainer'
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const sessions = trainer.sessions ?? []
  const totalRevenue = sessions.reduce((s, ss) => s + (ss.session_fee ?? 0), 0)
  const totalCommission = sessions.reduce((s, ss) => s + (ss.commission_earned ?? 0), 0)

  const commissionLabel =
    trainer.commission_model === 'percent'
      ? `${trainer.commission_value}%`
      : trainer.commission_model === 'per_session'
      ? `${formatCurrency(trainer.commission_value)} / session`
      : `${formatCurrency(trainer.commission_value)} flat`

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/admin/trainers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Trainers
        </Link>
      </div>

      <PageHeader
        title={name}
        description={trainer.specialties?.join(', ') || 'Personal Trainer'}
        action={
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column — Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="profile">
            <TabsList className="mb-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="availability">Availability</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
            </TabsList>

            {/* Profile Tab — read-only */}
            <TabsContent value="profile">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Trainer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {trainer.bio && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Bio</p>
                        <p className="text-sm leading-relaxed">{trainer.bio}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Specialties</p>
                        {trainer.specialties && trainer.specialties.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {trainer.specialties.map((s) => (
                              <Badge key={s} variant="secondary" className="text-xs">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">—</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Certifications</p>
                        {trainer.certifications && trainer.certifications.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {trainer.certifications.map((c) => (
                              <Badge key={c} variant="outline" className="text-xs">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">—</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Commission</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoRow
                        label="Commission Model"
                        value={
                          trainer.commission_model === 'flat' ? 'Flat Rate'
                          : trainer.commission_model === 'percent' ? 'Percentage'
                          : 'Per Session'
                        }
                      />
                      <InfoRow label="Commission Rate" value={commissionLabel} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Availability Tab */}
            <TabsContent value="availability">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Weekly Availability</CardTitle>
                </CardHeader>
                <CardContent>
                  <AvailabilityEditor trainerId={trainer.id} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sessions Tab */}
            <TabsContent value="sessions">
              <DataTable
                data={sessions}
                columns={sessionColumns}
                isLoading={false}
                emptyTitle="No sessions this month"
                emptyDescription="Sessions will appear here once booked."
              />
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats" className="space-y-6">
              <TrainerStatsCard
                sessions={sessions.length}
                revenue={totalRevenue}
                commission={totalCommission}
              />
              <DataTable
                data={sessions}
                columns={sessionColumns}
                isLoading={false}
                emptyTitle="No sessions this month"
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column — Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-3 pb-4 border-b">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={trainer.profiles?.avatar_url ?? undefined} alt={name} />
                  <AvatarFallback className="text-xl font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-base">{name}</p>
                  {trainer.profiles?.phone && (
                    <p className="text-sm text-muted-foreground">{trainer.profiles.phone}</p>
                  )}
                </div>
                <StatusBadge status={trainer.is_active ? 'active' : 'inactive'} />
              </div>

              <div className="pt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sessions this month</span>
                  <span className="font-medium">{sessions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revenue this month</span>
                  <span className="font-medium">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commission earned</span>
                  <span className="font-medium text-green-600">{formatCurrency(totalCommission)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Sheet */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Trainer Profile</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <TrainerForm
              trainer={{
                id: trainer.id,
                bio: trainer.bio,
                specialties: trainer.specialties,
                certifications: trainer.certifications,
                commission_model: trainer.commission_model,
                commission_value: trainer.commission_value,
              }}
              onSuccess={() => setIsEditOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
