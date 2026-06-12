'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Share2, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type MembershipRow = Database['public']['Tables']['memberships']['Row']
type MembershipPackageRow = Database['public']['Tables']['membership_packages']['Row']
type BrandRow = Database['public']['Tables']['brands']['Row']

interface MembershipWithPackage extends MembershipRow {
  membership_packages: MembershipPackageRow | null
}

interface QRCardData {
  profile: ProfileRow
  activeMembership: MembershipWithPackage | null
  brand: Pick<BrandRow, 'name' | 'primary_color'> | null
  userId: string
}

async function fetchQRCardData(): Promise<QRCardData> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const [profileResult, membershipResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('memberships')
      .select('*, membership_packages(*)')
      .eq('member_id', user.id)
      .in('status', ['active', 'frozen'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileData = (profileResult as any).data as ProfileRow | null
  if (profileResult.error || !profileData) throw new Error('Profile not found')

  const brandId = profileData.brand_id
  let brand: Pick<BrandRow, 'name' | 'primary_color'> | null = null

  if (brandId) {
    const brandResult = await supabase
      .from('brands')
      .select('name, primary_color')
      .eq('id', brandId)
      .single()
    brand = brandResult.data ?? null
  }

  return {
    profile: profileData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeMembership: ((membershipResult as any).data as MembershipWithPackage | null) ?? null,
    brand,
    userId: user.id,
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatExpiry(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function CardSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl">
        <div className="h-56 bg-gray-300 animate-pulse" />
        <div className="bg-white p-6 space-y-4 flex flex-col items-center">
          <Skeleton className="h-[200px] w-[200px]" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-px w-full" />
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function QRCardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['member-qr-card'],
    queryFn: fetchQRCardData,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <CardSkeleton />

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <p className="text-muted-foreground text-sm">
          {error instanceof Error ? error.message : 'Failed to load membership card.'}
        </p>
      </div>
    )
  }

  const { profile, activeMembership, brand, userId } = data
  const pkg = activeMembership?.membership_packages ?? null
  const primaryColor = brand?.primary_color ?? '#6366f1'
  const isExpired =
    !activeMembership ||
    activeMembership.status === 'expired' ||
    activeMembership.status === 'cancelled'

  const memberIdShort = userId.slice(0, 8).toUpperCase()
  const qrValue = userId

  async function handleShare() {
    const shareData = {
      title: `${profile.full_name} — Member Card`,
      text: `Member ID: ${memberIdShort}`,
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled — do nothing
      }
    } else {
      try {
        await navigator.clipboard.writeText(`Member ID: ${memberIdShort}\nQR Code: ${qrValue}`)
        toast.success('Member ID copied to clipboard')
      } catch {
        toast.error('Could not copy to clipboard')
      }
    }
  }

  function handleSaveImage() {
    toast.info('Use a screenshot to save your membership card')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      {/* Card */}
      <div className="max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl relative">
        {/* Expired overlay */}
        {isExpired && (
          <div className="absolute inset-0 z-10 flex items-start justify-center pointer-events-none">
            <div className="w-full bg-red-600 text-white text-center text-sm font-bold py-2 tracking-wider">
              EXPIRED — Please renew your membership
            </div>
          </div>
        )}

        {/* Header */}
        <div
          className="p-6 text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium opacity-80">{brand?.name ?? 'FitnessPlace'}</span>
            <span className="text-xs font-semibold uppercase tracking-widest opacity-80">
              Membership Card
            </span>
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-24 w-24 rounded-full ring-4 ring-white/30 bg-white/20 flex items-center justify-center overflow-hidden"
            >
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-white/90">
                  {getInitials(profile.full_name)}
                </span>
              )}
            </div>

            <div className="text-center">
              <h2 className="text-xl font-bold leading-tight">{profile.full_name}</h2>
              {pkg && (
                <span className="mt-2 inline-block bg-white/20 text-white text-sm rounded-full px-3 py-1">
                  {pkg.name}
                </span>
              )}
              {!pkg && (
                <span className="mt-2 inline-block bg-white/20 text-white text-sm rounded-full px-3 py-1">
                  No Active Package
                </span>
              )}
            </div>
          </div>
        </div>

        {/* QR + info */}
        <div className="bg-white p-6 flex flex-col items-center gap-4">
          {/* QR Code */}
          <div className="rounded-xl border-2 border-gray-100 p-3 bg-white">
            <QRCodeSVG
              value={qrValue}
              size={200}
              level="H"
              includeMargin
            />
          </div>

          <p className="text-sm text-muted-foreground">Scan to Check In</p>

          {/* Divider */}
          <div className="w-full border-t" />

          {/* Member details grid */}
          <div className="grid grid-cols-2 gap-4 w-full text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Member ID</p>
              <p className="font-semibold font-mono">{memberIdShort}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Valid Until</p>
              <p
                className={cn(
                  'font-semibold',
                  isExpired ? 'text-red-600' : ''
                )}
              >
                {formatExpiry(activeMembership?.expires_at ?? null)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="max-w-sm w-full mt-4 flex items-center gap-3">
        <Button
          variant="outline"
          className="flex-1 bg-white"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
        <Button
          variant="outline"
          className="flex-1 bg-white"
          onClick={handleSaveImage}
        >
          <Download className="h-4 w-4 mr-2" />
          Save Image
        </Button>
      </div>
    </div>
  )
}
