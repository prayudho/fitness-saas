'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Pencil, Check, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanKey = 'free' | 'starter' | 'growth' | 'enterprise'

interface PlanRow {
  key: PlanKey
  name: string
  price: number
  maxMembers: number
  maxClasses: number
  features: string[]
}

interface FeatureFlag {
  key: string
  label: string
  description: string
  enabled: boolean
}

// ─── Default data ─────────────────────────────────────────────────────────────

const DEFAULT_PLANS: PlanRow[] = [
  {
    key: 'free',
    name: 'Free',
    price: 0,
    maxMembers: 20,
    maxClasses: 5,
    features: ['Basic check-in', 'Member management', 'Email support'],
  },
  {
    key: 'starter',
    name: 'Starter',
    price: 29,
    maxMembers: 50,
    maxClasses: 20,
    features: ['QR check-in', 'Member management', 'Basic reports', 'Email support'],
  },
  {
    key: 'growth',
    name: 'Growth',
    price: 79,
    maxMembers: 500,
    maxClasses: 100,
    features: ['All Starter features', 'Classes & trainers', 'Billing gateway', 'Priority support'],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 199,
    maxMembers: -1,
    maxClasses: -1,
    features: ['All Growth features', 'Unlimited branches', 'Custom integrations', 'Dedicated support'],
  },
]

const DEFAULT_FLAGS: FeatureFlag[] = [
  {
    key: 'enable_classes',
    label: 'Group Classes',
    description: 'Allow brands to create and manage group fitness classes with booking.',
    enabled: true,
  },
  {
    key: 'enable_personal_trainers',
    label: 'Personal Trainers',
    description: 'Enable personal trainer management, session booking, and commission tracking.',
    enabled: true,
  },
  {
    key: 'enable_billing_gateway',
    label: 'Billing Gateway',
    description: 'Allow brands to accept online payments via integrated payment gateway.',
    enabled: false,
  },
  {
    key: 'enable_qr_checkin',
    label: 'QR Code Check-in',
    description: 'Enable QR code generation for members and QR scanner at the front desk.',
    enabled: true,
  },
  {
    key: 'enable_multi_branch',
    label: 'Multi-Branch Support',
    description: 'Allow brands to operate multiple branches under a single account.',
    enabled: false,
  },
]

// ─── Inline editable plan row ─────────────────────────────────────────────────

interface EditablePlanRowProps {
  plan: PlanRow
  onSave: (updated: PlanRow) => void
}

function EditablePlanRow({ plan, onSave }: EditablePlanRowProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [draft, setDraft] = React.useState<PlanRow>(plan)

  function handleSave() {
    onSave(draft)
    setIsEditing(false)
  }

  function handleCancel() {
    setDraft(plan)
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <TableRow>
        <TableCell className="font-medium capitalize">
          <Badge
            variant="secondary"
            className={
              plan.key === 'enterprise'
                ? 'bg-purple-100 text-purple-800'
                : plan.key === 'growth'
                ? 'bg-blue-100 text-blue-800'
                : plan.key === 'starter'
                ? 'bg-indigo-100 text-indigo-800'
                : ''
            }
          >
            {plan.name}
          </Badge>
        </TableCell>
        <TableCell>
          {plan.price === 0 ? (
            <span className="text-muted-foreground">Free</span>
          ) : (
            <span>${plan.price}/mo</span>
          )}
        </TableCell>
        <TableCell>{plan.maxMembers === -1 ? 'Unlimited' : plan.maxMembers.toLocaleString()}</TableCell>
        <TableCell>{plan.maxClasses === -1 ? 'Unlimited' : plan.maxClasses.toLocaleString()}</TableCell>
        <TableCell className="max-w-xs">
          <span className="text-sm text-muted-foreground">{plan.features.join(', ')}</span>
        </TableCell>
        <TableCell>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(true)}
            title="Edit plan"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow className="bg-muted/30">
      <TableCell>
        <Badge variant="secondary" className="capitalize">
          {plan.name}
        </Badge>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={draft.price}
          onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
          className="w-24 h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={draft.maxMembers === -1 ? '' : draft.maxMembers}
          placeholder="-1 = unlimited"
          onChange={(e) =>
            setDraft({ ...draft, maxMembers: e.target.value === '' ? -1 : Number(e.target.value) })
          }
          className="w-28 h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={draft.maxClasses === -1 ? '' : draft.maxClasses}
          placeholder="-1 = unlimited"
          onChange={(e) =>
            setDraft({ ...draft, maxClasses: e.target.value === '' ? -1 : Number(e.target.value) })
          }
          className="w-28 h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          value={draft.features.join(', ')}
          onChange={(e) =>
            setDraft({
              ...draft,
              features: e.target.value.split(',').map((f) => f.trim()).filter(Boolean),
            })
          }
          className="h-8 min-w-[200px]"
          placeholder="Feature 1, Feature 2, ..."
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleSave} className="text-green-600">
            <Check className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleCancel} className="text-muted-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlatformSettingsPage() {
  const [plans, setPlans] = React.useState<PlanRow[]>(DEFAULT_PLANS)
  const [flags, setFlags] = React.useState<FeatureFlag[]>(DEFAULT_FLAGS)

  function handlePlanSave(updated: PlanRow) {
    setPlans((prev) => prev.map((p) => (p.key === updated.key ? updated : p)))
    toast.success(`${updated.name} plan updated.`)
  }

  function handleFlagToggle(key: string) {
    setFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f))
    )
  }

  function handleSaveFlags() {
    // In a real implementation this would persist to the DB
    toast.success('Feature flags saved.')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Settings"
        description="Configure subscription plans and feature flags across the platform."
      />

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          <TabsTrigger value="flags">Feature Flags</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Subscription Plans ── */}
        <TabsContent value="plans" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plans</CardTitle>
              <CardDescription>
                Edit plan limits and feature lists. Changes apply to new subscriptions.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Price / Month</TableHead>
                      <TableHead>Max Members</TableHead>
                      <TableHead>Max Classes</TableHead>
                      <TableHead>Features</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => (
                      <EditablePlanRow key={plan.key} plan={plan} onSave={handlePlanSave} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Feature Flags ── */}
        <TabsContent value="flags" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>
                Enable or disable platform-wide features. Changes take effect immediately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-0 divide-y">
                {flags.map((flag) => (
                  <div key={flag.key} className="flex items-center justify-between py-4">
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-medium">{flag.label}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{flag.description}</p>
                      <code className="text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded mt-1 inline-block">
                        {flag.key}
                      </code>
                    </div>
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={() => handleFlagToggle(flag.key)}
                      aria-label={`Toggle ${flag.label}`}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t">
                <Button onClick={handleSaveFlags}>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
