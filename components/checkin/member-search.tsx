'use client'

import { useState, useEffect } from 'react'
import { Search, LogIn, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/shared/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useSearchMember } from '@/lib/hooks/use-checkins'
import type { MemberSearchResult } from '@/lib/actions/checkins'

interface MemberSearchProps {
  onCheckin: (memberId: string) => void
  isProcessing?: boolean
}

export function MemberSearch({ onCheckin, isProcessing = false }: MemberSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MemberSearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const searchMutation = useSearchMember()

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setHasSearched(false)
      return
    }

    const timer = setTimeout(async () => {
      setHasSearched(true)
      const data = await searchMutation.mutateAsync(query.trim())
      if (data) setResults(data)
    }, 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function getActiveMembership(member: MemberSearchResult) {
    return member.memberships.find((m) => m.status === 'active') ?? member.memberships[0] ?? null
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

  const isLoading = searchMutation.isPending

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone number..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          disabled={isProcessing}
        />
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && hasSearched && results.length === 0 && (
        <EmptyState
          title="No members found"
          description={`No members match "${query}". Try a different name or phone number.`}
        />
      )}

      {!isLoading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((member) => {
            const activeMembership = getActiveMembership(member)
            return (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={member.avatar_url ?? undefined} />
                  <AvatarFallback className="text-sm font-semibold">
                    {getInitials(member.full_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{member.full_name}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {member.phone && (
                      <span className="text-xs text-muted-foreground">{member.phone}</span>
                    )}
                    {activeMembership ? (
                      <StatusBadge status={activeMembership.status} />
                    ) : (
                      <StatusBadge status="no membership" />
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => onCheckin(member.id)}
                  disabled={isProcessing}
                  className="shrink-0"
                >
                  <LogIn className="mr-1 h-3 w-3" />
                  Check In
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {!query && !hasSearched && (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <User className="h-8 w-8" />
          <p className="text-sm">Type a name or phone number to search</p>
        </div>
      )}
    </div>
  )
}
