import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getMember } from '@/lib/actions/members'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/shared/status-badge'
import { MembershipCard } from '@/components/members/membership-card'
import { AssignPackageDialog } from '@/components/members/assign-package-dialog'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ArrowLeft, Pencil, Phone, Calendar, Shield, User } from 'lucide-react'
import type { MembershipWithPackage } from '@/lib/actions/members'
import { ResetPasswordDialog } from '@/components/members/reset-password-dialog'

interface PageProps {
  params: { id: string }
}

export default async function MemberDetailPage({ params }: PageProps) {
  const { data: member, error } = await getMember(params.id)

  if (error || !member) {
    notFound()
  }

  const initials = (member.full_name ?? 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const totalCheckins = member.checkins.length

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/admin/members"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Members
        </Link>
      </div>

      <PageHeader
        title={member.full_name ?? 'Unknown Member'}
        description={`Member since ${formatDate(member.created_at)}`}
        action={
          <div className="flex items-center gap-2">
            <ResetPasswordDialog
              memberId={params.id}
              memberName={member.full_name ?? 'Member'}
            />
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/members/${params.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column — Tabs (2/3 width) */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="profile">
            <TabsList className="mb-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="membership">Membership</TabsTrigger>
              <TabsTrigger value="checkins">Check-ins</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="pt-sessions">PT Sessions</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InfoRow icon={<User className="h-4 w-4" />} label="Full Name" value={member.full_name} />
                    <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={member.phone} />
                    <InfoRow
                      label="Gender"
                      value={member.gender ? member.gender.replace(/_/g, ' ') : null}
                    />
                    <InfoRow
                      icon={<Calendar className="h-4 w-4" />}
                      label="Date of Birth"
                      value={member.date_of_birth ? formatDate(member.date_of_birth) : null}
                    />
                  </div>
                  {(member.emergency_contact_name || member.emergency_contact_phone) && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-3 flex items-center gap-1.5">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        Emergency Contact
                      </p>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InfoRow label="Name" value={member.emergency_contact_name} />
                        <InfoRow label="Phone" value={member.emergency_contact_phone} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Membership Tab */}
            <TabsContent value="membership">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <AssignPackageDialog memberId={params.id} />
                </div>
                {member.memberships.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No memberships yet. Assign a package to get started.
                  </div>
                ) : (
                  member.memberships.map((m) => (
                    <MembershipCard
                      key={m.id}
                      membership={m as MembershipWithPackage & { membership_packages: { name: string; type: string; allow_freeze: boolean } | null }}
                      onRefresh={() => {}}
                    />
                  ))
                )}
              </div>
            </TabsContent>

            {/* Check-ins Tab */}
            <TabsContent value="checkins">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Check-ins</CardTitle>
                </CardHeader>
                <CardContent>
                  {member.checkins.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No check-ins yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="pb-2 pr-4 font-medium text-muted-foreground">Method</th>
                            <th className="pb-2 pr-4 font-medium text-muted-foreground">Date & Time</th>
                            <th className="pb-2 font-medium text-muted-foreground">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {member.checkins.map((c) => (
                            <tr key={c.id}>
                              <td className="py-2.5 pr-4 capitalize">
                                <StatusBadge status={c.method} />
                              </td>
                              <td className="py-2.5 pr-4 text-muted-foreground">
                                {new Date(c.checked_in_at).toLocaleString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-2.5 text-muted-foreground">{c.notes ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  {member.invoices.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No invoices yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="pb-2 pr-4 font-medium text-muted-foreground">Date</th>
                            <th className="pb-2 pr-4 font-medium text-muted-foreground">Amount</th>
                            <th className="pb-2 pr-4 font-medium text-muted-foreground">Status</th>
                            <th className="pb-2 font-medium text-muted-foreground">Paid At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {member.invoices.map((inv) => (
                            <tr key={inv.id}>
                              <td className="py-2.5 pr-4 text-muted-foreground">
                                {formatDate(inv.created_at)}
                              </td>
                              <td className="py-2.5 pr-4 font-medium">
                                {formatCurrency(inv.amount, inv.currency)}
                              </td>
                              <td className="py-2.5 pr-4">
                                <StatusBadge status={inv.status} />
                              </td>
                              <td className="py-2.5 text-muted-foreground">
                                {inv.paid_at ? formatDate(inv.paid_at) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* PT Sessions Tab */}
            <TabsContent value="pt-sessions">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Personal Training Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  {member.trainer_sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No PT sessions yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="pb-2 pr-4 font-medium text-muted-foreground">Trainer</th>
                            <th className="pb-2 pr-4 font-medium text-muted-foreground">Scheduled</th>
                            <th className="pb-2 pr-4 font-medium text-muted-foreground">Status</th>
                            <th className="pb-2 font-medium text-muted-foreground">Fee</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {member.trainer_sessions.map((s) => (
                            <tr key={s.id}>
                              <td className="py-2.5 pr-4">
                                {(s.trainer as { profiles?: { full_name?: string } | null } | null)?.profiles?.full_name ?? '—'}
                              </td>
                              <td className="py-2.5 pr-4 text-muted-foreground">
                                {new Date(s.scheduled_at).toLocaleString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-2.5 pr-4">
                                <StatusBadge status={s.status} />
                              </td>
                              <td className="py-2.5 text-muted-foreground">
                                {s.session_fee != null
                                  ? formatCurrency(s.session_fee)
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column — Quick Info (1/3 width) */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-3 pb-4 border-b">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-xl font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-base">{member.full_name}</p>
                  {member.phone && (
                    <p className="text-sm text-muted-foreground">{member.phone}</p>
                  )}
                </div>
                {member.memberships[0] && (
                  <StatusBadge status={member.memberships[0].status} />
                )}
              </div>

              <div className="pt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member since</span>
                  <span className="font-medium">{formatDate(member.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total check-ins</span>
                  <span className="font-medium">{totalCheckins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Memberships</span>
                  <span className="font-medium">{member.memberships.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PT Sessions</span>
                  <span className="font-medium">{member.trainer_sessions.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode
  label: string
  value?: string | null
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
        {icon}
        {label}
      </p>
      <p className="text-sm font-medium capitalize">{value ?? '—'}</p>
    </div>
  )
}
