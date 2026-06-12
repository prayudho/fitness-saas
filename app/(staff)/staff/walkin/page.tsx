'use client'

import { useState } from 'react'
import { Search, Package, CreditCard, CheckCircle2, ArrowLeft, Banknote, ArrowRightLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getPackages } from '@/lib/actions/packages'
import { createWalkinPass } from '@/lib/actions/checkins'
import { useSearchMember } from '@/lib/hooks/use-checkins'
import { formatCurrency } from '@/lib/utils'
import type { MemberSearchResult } from '@/lib/actions/checkins'
import type { Database } from '@/types/database'

type PackageRow = Database['public']['Tables']['membership_packages']['Row']
type InvoiceRow = Database['public']['Tables']['invoices']['Row']
type MembershipRow = Database['public']['Tables']['memberships']['Row']

type Step = 'search' | 'select-package' | 'confirm' | 'success'

type SuccessData = {
  membership: MembershipRow
  invoice: InvoiceRow
  member: MemberSearchResult
  pkg: PackageRow
}

function getInitials(name: string | null) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function WalkinPage() {
  const [step, setStep] = useState<Step>('search')
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<PackageRow | null>(null)
  const [successData, setSuccessData] = useState<SuccessData | null>(null)
  const searchMutation = useSearchMember()

  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ['packages', 'day_pass'],
    queryFn: async () => {
      const result = await getPackages()
      if (result.error) throw new Error(result.error)
      return (result.data ?? []).filter((p) => p.type === 'day_pass' && p.is_active)
    },
  })

  const walkinMutation = useMutation({
    mutationFn: async ({ memberId, packageId }: { memberId: string; packageId: string }) => {
      const result = await createWalkinPass(memberId, packageId)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    onSuccess: (data) => {
      if (data && selectedMember && selectedPackage) {
        setSuccessData({
          membership: data.membership,
          invoice: data.invoice,
          member: selectedMember,
          pkg: selectedPackage,
        })
        setStep('success')
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  async function handleSearch(value: string) {
    setQuery(value)
    if (!value.trim()) {
      setSearchResults([])
      setHasSearched(false)
      return
    }
    setHasSearched(true)
    const data = await searchMutation.mutateAsync(value.trim())
    if (data) setSearchResults(data)
  }

  function handleSelectMember(member: MemberSearchResult) {
    setSelectedMember(member)
    setStep('select-package')
  }

  function handleSelectPackage(pkg: PackageRow) {
    setSelectedPackage(pkg)
    setStep('confirm')
  }

  function handleConfirm() {
    if (!selectedMember || !selectedPackage) return
    walkinMutation.mutate({ memberId: selectedMember.id, packageId: selectedPackage.id })
  }

  function handleReset() {
    setStep('search')
    setQuery('')
    setSearchResults([])
    setHasSearched(false)
    setSelectedMember(null)
    setSelectedPackage(null)
    setSuccessData(null)
  }

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader
        title="Walk-in Day Pass"
        description="Register a walk-in visitor with a day pass"
      />

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['search', 'select-package', 'confirm', 'success'] as Step[]).map((s, i) => {
          const labels: Record<Step, string> = {
            search: 'Find Member',
            'select-package': 'Select Package',
            confirm: 'Confirm',
            success: 'Done',
          }
          const isActive = step === s
          const isPast =
            ['search', 'select-package', 'confirm', 'success'].indexOf(step) > i
          return (
            <span key={s} className="flex items-center gap-2">
              {i > 0 && <span className="text-muted-foreground">›</span>}
              <span
                className={
                  isActive
                    ? 'font-semibold text-primary'
                    : isPast
                    ? 'text-muted-foreground line-through'
                    : 'text-muted-foreground'
                }
              >
                {labels[s]}
              </span>
            </span>
          )
        })}
      </div>

      {/* Step 1: Search */}
      {step === 'search' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              Find Member
            </CardTitle>
            <CardDescription>Search for the member by name or phone number</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Name or phone number..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />

            {searchMutation.isPending && (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!searchMutation.isPending && hasSearched && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No members found for &quot;{query}&quot;
              </p>
            )}

            {!searchMutation.isPending && searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((member) => {
                  const activeMembership =
                    member.memberships.find((m) => m.status === 'active') ??
                    member.memberships[0] ??
                    null
                  return (
                    <button
                      key={member.id}
                      onClick={() => handleSelectMember(member)}
                      className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={member.avatar_url ?? undefined} />
                        <AvatarFallback className="text-sm font-semibold">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{member.full_name}</p>
                        <div className="flex items-center gap-2">
                          {member.phone && (
                            <span className="text-xs text-muted-foreground">{member.phone}</span>
                          )}
                          {activeMembership ? (
                            <StatusBadge status={activeMembership.status} />
                          ) : (
                            <Badge variant="outline" className="text-xs">No membership</Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Package */}
      {step === 'select-package' && selectedMember && (
        <div className="space-y-4">
          <button
            onClick={() => setStep('search')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Select Day Pass
              </CardTitle>
              <CardDescription>
                Checking in{' '}
                <span className="font-medium text-foreground">{selectedMember.full_name}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {packagesLoading && (
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              )}

              {!packagesLoading && (!packages || packages.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No day pass packages available. Please create one in Admin &gt; Packages.
                </p>
              )}

              {!packagesLoading &&
                packages?.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => handleSelectPackage(pkg)}
                    className="w-full flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 hover:border-primary transition-colors text-left"
                  >
                    <div>
                      <p className="font-medium text-sm">{pkg.name}</p>
                      {pkg.description && (
                        <p className="text-xs text-muted-foreground">{pkg.description}</p>
                      )}
                    </div>
                    <span className="font-semibold text-primary">
                      {formatCurrency(pkg.price, pkg.currency)}
                    </span>
                  </button>
                ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && selectedMember && selectedPackage && (
        <div className="space-y-4">
          <button
            onClick={() => setStep('select-package')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Confirm Check-in
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedMember.avatar_url ?? undefined} />
                  <AvatarFallback>{getInitials(selectedMember.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{selectedMember.full_name}</p>
                  {selectedMember.phone && (
                    <p className="text-xs text-muted-foreground">{selectedMember.phone}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">{selectedPackage.name}</p>
                  <p className="text-xs text-muted-foreground">Day Pass — valid today only</p>
                </div>
                <span className="font-bold text-lg">
                  {formatCurrency(selectedPackage.price, selectedPackage.currency)}
                </span>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                An invoice of{' '}
                <strong>{formatCurrency(selectedPackage.price, selectedPackage.currency)}</strong>{' '}
                will be created with status <strong>pending</strong>. Collect payment to mark it
                as paid.
              </div>

              <Button
                className="w-full"
                onClick={handleConfirm}
                disabled={walkinMutation.isPending}
              >
                {walkinMutation.isPending ? 'Processing...' : 'Confirm & Check In'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 'success' && successData && (
        <Card className="border-green-500 border-2">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>

              <div>
                <h3 className="text-lg font-semibold">Check-in Complete!</h3>
                <p className="text-sm text-muted-foreground">
                  {successData.member.full_name} has been checked in.
                </p>
              </div>

              <div className="w-full space-y-2 text-sm border rounded-lg p-4 bg-muted/30">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Package</span>
                  <span className="font-medium">{successData.pkg.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Due</span>
                  <span className="font-semibold">
                    {formatCurrency(successData.invoice.amount, successData.invoice.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Status</span>
                  <StatusBadge status={successData.invoice.status} />
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Collect Payment
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="flex gap-2">
                    <Banknote className="h-4 w-4" />
                    Cash
                  </Button>
                  <Button variant="outline" size="sm" className="flex gap-2">
                    <ArrowRightLeft className="h-4 w-4" />
                    Transfer
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mark invoice as paid in Admin &gt; Payments after collecting.
                </p>
              </div>

              <Button onClick={handleReset} className="w-full mt-2">
                New Walk-in
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
