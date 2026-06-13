'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { getExpiryReport, type ExpiryReportRow } from '@/lib/actions/membership.actions'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { AlertTriangle, CalendarClock, Dumbbell, User } from 'lucide-react'
import { useDebounce } from '@/lib/hooks/use-debounce'

type CategoryFilter = 'all' | 'gym_access' | 'pt_sessions' | 'bundled'
type KpiSegment = 'all' | 'gym_expiring' | 'pt_expiring' | 'pt_low' | 'pt_before_gym'

const categoryBadge: Record<string, { label: string; className: string }> = {
  gym_access:  { label: 'Gym Access',  className: 'bg-blue-100 text-blue-700 border-blue-200' },
  pt_sessions: { label: 'PT Sessions', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  bundled:     { label: 'Bundled',     className: 'bg-teal-100 text-teal-700 border-teal-200' },
}

function daysLabel(days: number | null): string {
  if (days === null) return '—'
  if (days < 0) return `${Math.abs(days)}d ago`
  if (days === 0) return 'Today'
  return `in ${days}d`
}

function daysClass(days: number | null): string {
  if (days === null) return 'text-muted-foreground'
  if (days < 0) return 'text-red-600 font-medium'
  if (days <= 7) return 'text-red-600 font-medium'
  if (days <= 14) return 'text-amber-600 font-medium'
  return 'text-muted-foreground'
}

async function getBrandId(): Promise<string> {
  // Read brand_id from the __fp_brand_id cookie set by middleware
  const brandId = typeof document !== 'undefined'
    ? (document.cookie.match(/(?:^|;\s*)__fp_brand_id=([^;]+)/)?.[1] ?? null)
    : null
  if (!brandId) throw new Error('No brand context')
  return brandId
}

export default function ExpiryReportPage() {
  const [activeKpi, setActiveKpi] = useState<KpiSegment>('all')
  const [withinDays, setWithinDays] = useState<string>('7')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const { data: brandId } = useQuery({
    queryKey: ['brand-id'],
    queryFn: getBrandId,
    staleTime: Infinity,
  })

  const filters = {
    withinDays:     parseInt(withinDays) || undefined,
    lowPTSessions:  activeKpi === 'pt_low' || undefined,
    ptBeforeGym:    activeKpi === 'pt_before_gym' || undefined,
    category:       categoryFilter !== 'all' ? categoryFilter : undefined,
    search:         debouncedSearch || undefined,
  }

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['expiry-report', brandId, filters],
    queryFn: async () => {
      if (!brandId) throw new Error('No brand')
      return getExpiryReport(brandId, filters)
    },
    enabled: Boolean(brandId),
    staleTime: 60 * 1000,
  })

  // KPI counts — separate query without filters
  const { data: kpiData } = useQuery({
    queryKey: ['expiry-kpi', brandId],
    queryFn: async () => {
      if (!brandId) throw new Error('No brand')
      const [gym, pt, low, before] = await Promise.all([
        getExpiryReport(brandId, { withinDays: 7, category: 'gym_access' }),
        getExpiryReport(brandId, { withinDays: 7, category: 'pt_sessions' }),
        getExpiryReport(brandId, { lowPTSessions: true }),
        getExpiryReport(brandId, { ptBeforeGym: true }),
      ])
      return {
        gymExpiring: gym.total,
        ptExpiring:  pt.total,
        ptLow:       low.total,
        ptBeforeGym: before.total,
      }
    },
    enabled: Boolean(brandId),
    staleTime: 60 * 1000,
  })

  // Manual reminder email mutation
  const sendReminderMutation = useMutation({
    mutationFn: async (memberId: string) => {
      // Placeholder — wire to an actual edge function call
      await new Promise((r) => setTimeout(r, 600))
      return memberId
    },
    onSuccess: () => toast.success('Reminder sent'),
    onError: () => toast.error('Failed to send reminder'),
  })

  const handleKpiClick = useCallback((seg: KpiSegment) => {
    setActiveKpi((prev) => (prev === seg ? 'all' : seg))
  }, [])

  const rows = reportData?.data ?? []

  const columns: ColumnDef<ExpiryReportRow>[] = [
    {
      id: 'member',
      header: 'Member',
      cell: ({ row }) => {
        const r = row.original
        const initials = r.member_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        return (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
              {initials}
            </div>
            <div>
              <p className="font-medium text-sm">{r.member_name}</p>
              {r.member_phone && <p className="text-xs text-muted-foreground">{r.member_phone}</p>}
            </div>
          </div>
        )
      },
    },
    {
      id: 'package',
      header: 'Package',
      cell: ({ row }) => {
        const r = row.original
        const badge = categoryBadge[r.package_category] ?? categoryBadge.gym_access
        return (
          <div className="space-y-1">
            <p className="text-sm">{r.package_name}</p>
            <Badge variant="outline" className={cn('text-xs', badge.className)}>
              {badge.label}
            </Badge>
          </div>
        )
      },
    },
    {
      id: 'gym_expiry',
      header: 'Gym Access Expires',
      cell: ({ row }) => {
        const r = row.original
        if (!r.gym_access_expires_at) return <span className="text-muted-foreground text-xs">—</span>
        return (
          <div>
            <p className="text-sm">
              {new Date(r.gym_access_expires_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </p>
            <p className={cn('text-xs', daysClass(r.days_until_gym_expiry))}>
              {daysLabel(r.days_until_gym_expiry)}
            </p>
          </div>
        )
      },
    },
    {
      id: 'pt_expiry',
      header: 'PT Sessions Expires',
      cell: ({ row }) => {
        const r = row.original
        if (!r.pt_sessions_expires_at) return <span className="text-muted-foreground text-xs">—</span>
        return (
          <div>
            <p className="text-sm">
              {new Date(r.pt_sessions_expires_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </p>
            <p className={cn('text-xs', daysClass(r.days_until_pt_expiry))}>
              {daysLabel(r.days_until_pt_expiry)}
            </p>
          </div>
        )
      },
    },
    {
      id: 'pt_remaining',
      header: 'PT Remaining',
      cell: ({ row }) => {
        const r = row.original
        if (r.pt_sessions_remaining === null) return <span className="text-muted-foreground text-xs">—</span>
        return (
          <div className="flex items-center gap-1.5">
            <span className={cn('font-semibold', r.is_pt_sessions_low ? 'text-amber-600' : '')}>
              {r.pt_sessions_remaining}
            </span>
            {r.is_pt_sessions_low && (
              <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Low</Badge>
            )}
          </div>
        )
      },
    },
    {
      id: 'flags',
      header: '',
      cell: ({ row }) => {
        const r = row.original
        return (
          <div className="flex items-center gap-1">
            {r.is_pt_expiring_before_gym && (
              <span title="PT expires before gym access">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link href={`/admin/members/${row.original.member_id}`}>View</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            disabled={sendReminderMutation.isPending}
            onClick={() => sendReminderMutation.mutate(row.original.member_id)}
          >
            Remind
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Membership Expiry Report"
        description="Members with upcoming gym access or PT session expiry"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { seg: 'gym_expiring' as KpiSegment, label: 'Gym expiring this week', count: kpiData?.gymExpiring, icon: <Dumbbell className="h-5 w-5 text-blue-600" />, color: 'border-blue-200' },
          { seg: 'pt_expiring'  as KpiSegment, label: 'PT sessions expiring this week', count: kpiData?.ptExpiring, icon: <User className="h-5 w-5 text-purple-600" />, color: 'border-purple-200' },
          { seg: 'pt_low'       as KpiSegment, label: 'Low PT sessions (≤3)', count: kpiData?.ptLow, icon: <AlertTriangle className="h-5 w-5 text-amber-600" />, color: 'border-amber-200' },
          { seg: 'pt_before_gym' as KpiSegment, label: 'PT expires before gym', count: kpiData?.ptBeforeGym, icon: <CalendarClock className="h-5 w-5 text-rose-600" />, color: 'border-rose-200' },
        ].map(({ seg, label, count, icon, color }) => (
          <Card
            key={seg}
            className={cn('cursor-pointer transition-all hover:shadow-md border-2', activeKpi === seg ? color : 'border-transparent')}
            onClick={() => handleKpiClick(seg)}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <div className="shrink-0 mt-0.5">{icon}</div>
              <div>
                {count === undefined ? (
                  <Skeleton className="h-7 w-10 mb-1" />
                ) : (
                  <p className="text-2xl font-bold">{count}</p>
                )}
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search member name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={withinDays} onValueChange={setWithinDays}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Expiring within" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Within 7 days</SelectItem>
            <SelectItem value="14">Within 14 days</SelectItem>
            <SelectItem value="30">Within 30 days</SelectItem>
            <SelectItem value="90">Within 90 days</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="gym_access">Gym Access</SelectItem>
            <SelectItem value="pt_sessions">PT Sessions</SelectItem>
            <SelectItem value="bundled">Bundled</SelectItem>
          </SelectContent>
        </Select>
        {activeKpi !== 'all' && (
          <Button variant="outline" size="sm" onClick={() => setActiveKpi('all')}>
            Clear filter
          </Button>
        )}
      </div>

      {/* Table */}
      <DataTable
        data={rows}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No members match this filter"
        emptyDescription="Try adjusting the date range or clearing the active KPI filter."
        pageSize={25}
      />
    </div>
  )
}
