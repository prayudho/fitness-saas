'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/shared/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useTrainer } from '@/lib/hooks/use-trainers'
import { formatCurrency } from '@/lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function BranchManagerTrainerDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { data: trainer, isLoading } = useTrainer(params.id)

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!trainer) {
    return (
      <div className="space-y-4">
        <Link href="/branch-manager/trainers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <p className="text-muted-foreground">Trainer not found.</p>
      </div>
    )
  }

  const name = trainer.profiles?.full_name ?? 'Unknown'
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/branch-manager/trainers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <PageHeader title={name} description="Trainer profile" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={trainer.profiles?.avatar_url ?? undefined} alt={name} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="font-semibold text-lg">{name}</p>
              {trainer.profiles?.phone && (
                <p className="text-sm text-muted-foreground">{trainer.profiles.phone}</p>
              )}
              <StatusBadge status={trainer.is_active ? 'active' : 'inactive'} />
            </div>
          </div>

          {trainer.bio && (
            <div>
              <p className="text-sm font-medium mb-1">Bio</p>
              <p className="text-sm text-muted-foreground">{trainer.bio}</p>
            </div>
          )}

          {(trainer.specialties ?? []).length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Specialties</p>
              <div className="flex flex-wrap gap-1">
                {(trainer.specialties ?? []).map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {(trainer.certifications ?? []).length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Certifications</p>
              <div className="flex flex-wrap gap-1">
                {(trainer.certifications ?? []).map((c) => (
                  <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commission</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Model</p>
            <p className="font-medium capitalize">{trainer.commission_model?.replace('_', ' ') ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Value</p>
            <p className="font-medium">
              {trainer.commission_model === 'percent'
                ? `${trainer.commission_value ?? 0}%`
                : formatCurrency(trainer.commission_value ?? 0, 'IDR')}
            </p>
          </div>
        </CardContent>
      </Card>

      {(trainer.trainer_availability ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(trainer.trainer_availability ?? [])
                .sort((a, b) => a.day_of_week - b.day_of_week)
                .map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between py-1 border-b last:border-0">
                    <span className="text-sm font-medium w-12">{DAYS[slot.day_of_week]}</span>
                    <span className="text-sm text-muted-foreground">
                      {slot.start_time} – {slot.end_time}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
