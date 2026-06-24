'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Camera } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import {
  getBrandSettings,
  updateBrandGeneral,
  updateBrandAppearance,
  uploadBrandLogo,
  updateCommissionSettings,
} from '@/lib/actions/settings'

// ─── Schemas ────────────────────────────────────────────────────────────────

const generalSchema = z.object({
  brandName: z.string().min(2, 'Brand name must be at least 2 characters'),
  businessEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  timezone: z.string().min(1, 'Timezone is required'),
  currency: z.string().min(1, 'Currency is required'),
})

type GeneralFormValues = z.infer<typeof generalSchema>

// ─── Constants ───────────────────────────────────────────────────────────────

const TIMEZONES = [
  { value: 'Asia/Jakarta', label: 'Asia/Jakarta' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore' },
  { value: 'Asia/Kuala_Lumpur', label: 'Asia/Kuala_Lumpur' },
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok' },
  { value: 'America/New_York', label: 'America/New_York' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'UTC', label: 'UTC' },
]

const CURRENCIES = [
  { value: 'IDR', label: 'IDR - Indonesian Rupiah' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'SGD', label: 'SGD - Singapore Dollar' },
  { value: 'MYR', label: 'MYR - Malaysian Ringgit' },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()

  // Brand ID state
  const [brandId, setBrandId] = useState<string>('')
  const [loadingBrand, setLoadingBrand] = useState(true)

  // Appearance state
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#6366f1')
  const [secondaryColor, setSecondaryColor] = useState('#8b5cf6')
  const [savingAppearance, setSavingAppearance] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Commission state
  const [graceDays, setGraceDays] = useState(14)
  const [salesCommissionEnabled, setSalesCommissionEnabled] = useState(true)
  const [salesCommissionPercent, setSalesCommissionPercent] = useState(10)
  const [savingCommission, setSavingCommission] = useState(false)

  // Notifications state
  const [notifications, setNotifications] = useState({
    newMemberSignup: false,
    paymentReceived: false,
    dailyAttendanceReport: false,
    membershipExpiryAlerts: false,
  })
  const [savingNotifications, setSavingNotifications] = useState(false)

  // General form
  const generalForm = useForm<GeneralFormValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      brandName: '',
      businessEmail: '',
      phone: '',
      address: '',
      timezone: 'Asia/Jakarta',
      currency: 'IDR',
    },
  })

  // Load brand settings on mount
  useEffect(() => {
    async function loadSettings() {
      setLoadingBrand(true)
      const { data, error } = await getBrandSettings()
      if (error || !data) {
        toast.error('Failed to load brand settings')
        setLoadingBrand(false)
        return
      }

      setBrandId(data.id)
      setLogoUrl(data.logo_url ?? null)
      setLogoPreview(data.logo_url ?? null)
      setPrimaryColor(data.primary_color ?? '#6366f1')
      setSecondaryColor(data.secondary_color ?? '#8b5cf6')
      const brandAny = data as unknown as Record<string, unknown>
      setGraceDays((brandAny.pt_assignment_grace_days as number | undefined) ?? 14)
      setSalesCommissionEnabled((brandAny.pt_sales_commission_enabled as boolean | undefined) ?? true)
      setSalesCommissionPercent((brandAny.pt_sales_commission_percent as number | undefined) ?? 10)

      generalForm.reset({
        brandName: data.name ?? '',
        businessEmail: data.business_email ?? '',
        phone: data.phone ?? '',
        address: data.address ?? '',
        timezone: data.timezone ?? 'Asia/Jakarta',
        currency: data.currency ?? 'IDR',
      })

      setLoadingBrand(false)
    }

    loadSettings()
  }, [generalForm])

  // ── General submit ──────────────────────────────────────────────────────────
  async function onGeneralSubmit(values: GeneralFormValues) {
    if (!brandId) return
    const { error } = await updateBrandGeneral(brandId, {
      name: values.brandName,
      business_email: values.businessEmail || undefined,
      phone: values.phone || undefined,
      address: values.address || undefined,
      timezone: values.timezone,
      currency: values.currency,
    })

    if (error) {
      toast.error(error)
    } else {
      toast.success('General settings saved successfully')
    }
  }

  // ── Logo upload ─────────────────────────────────────────────────────────────
  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !brandId) return

    const objectUrl = URL.createObjectURL(file)
    setLogoPreview(objectUrl)

    setUploadingLogo(true)
    const formData = new FormData()
    formData.append('logo', file)

    const { url, error } = await uploadBrandLogo(brandId, formData)
    setUploadingLogo(false)

    if (error) {
      toast.error(error)
      setLogoPreview(logoUrl)
    } else if (url) {
      setLogoUrl(url)
      setLogoPreview(url)
      toast.success('Logo uploaded successfully')
    }
  }

  // ── Appearance submit ───────────────────────────────────────────────────────
  async function handleAppearanceSave() {
    if (!brandId) return
    setSavingAppearance(true)

    const payload: { logo_url?: string; primary_color?: string; secondary_color?: string } = {
      primary_color: primaryColor,
      secondary_color: secondaryColor,
    }
    if (logoUrl) payload.logo_url = logoUrl

    const { error } = await updateBrandAppearance(brandId, payload)
    setSavingAppearance(false)

    if (error) {
      toast.error(error)
    } else {
      toast.success('Appearance settings saved successfully')
      router.refresh()
    }
  }

  // ── Commission submit ───────────────────────────────────────────────────────
  async function handleCommissionSave() {
    if (!brandId) return
    setSavingCommission(true)
    const { error } = await updateCommissionSettings(brandId, {
      pt_assignment_grace_days: graceDays,
      pt_sales_commission_enabled: salesCommissionEnabled,
      pt_sales_commission_percent: salesCommissionPercent,
    })
    setSavingCommission(false)
    if (error) {
      toast.error(error)
    } else {
      toast.success('Commission settings saved')
    }
  }

  // ── Notifications submit ────────────────────────────────────────────────────
  async function handleNotificationsSave() {
    setSavingNotifications(true)
    // Simulate save — extend with real action when notification preferences table exists
    await new Promise((r) => setTimeout(r, 500))
    setSavingNotifications(false)
    toast.success('Notification settings saved successfully')
  }

  // ── Color sync helpers ──────────────────────────────────────────────────────
  function handlePrimaryColorPicker(e: React.ChangeEvent<HTMLInputElement>) {
    setPrimaryColor(e.target.value)
  }

  function handlePrimaryHexInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
      setPrimaryColor(val)
    }
  }

  function handleSecondaryColorPicker(e: React.ChangeEvent<HTMLInputElement>) {
    setSecondaryColor(e.target.value)
  }

  function handleSecondaryHexInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
      setSecondaryColor(val)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  if (loadingBrand) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading settings…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your brand configuration and preferences.</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="commission">Commission</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* ═══ GENERAL TAB ═══════════════════════════════════════════════════ */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Update your brand information and regional preferences.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...generalForm}>
                <form onSubmit={generalForm.handleSubmit(onGeneralSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FormField
                      control={generalForm.control}
                      name="brandName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Gerak" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={generalForm.control}
                      name="businessEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="hello@yourgym.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={generalForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+62 812 3456 7890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={generalForm.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Timezone</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TIMEZONES.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                  {tz.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={generalForm.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Currency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CURRENCIES.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={generalForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Jl. Sudirman No. 1, Jakarta Pusat"
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={generalForm.formState.isSubmitting}
                  >
                    {generalForm.formState.isSubmitting ? 'Saving…' : 'Save General Settings'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ APPEARANCE TAB ════════════════════════════════════════════════ */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize your brand logo and color scheme.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>Brand Logo</Label>
                <div
                  className="w-[200px] h-[200px] border-2 border-dashed border-muted-foreground/40 rounded-lg flex items-center justify-center cursor-pointer hover:border-muted-foreground/70 transition-colors overflow-hidden bg-muted/30"
                  onClick={() => logoInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && logoInputRef.current?.click()}
                  aria-label="Upload brand logo"
                >
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoPreview}
                      alt="Brand logo"
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Camera className="w-10 h-10" />
                      <span className="text-sm text-center px-2">
                        {uploadingLogo ? 'Uploading…' : 'Click to upload logo'}
                      </span>
                    </div>
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, WebP, or SVG. Max 2MB.
                </p>
              </div>

              {/* Color Pickers */}
              <div className="space-y-4">
                {/* Primary Color */}
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={handlePrimaryColorPicker}
                      className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                      title="Pick primary color"
                    />
                    <Input
                      value={primaryColor}
                      onChange={handlePrimaryHexInput}
                      className="w-28 font-mono text-sm"
                      maxLength={7}
                      placeholder="#6366f1"
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="space-y-2">
                  <Label>Secondary Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={handleSecondaryColorPicker}
                      className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                      title="Pick secondary color"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={handleSecondaryHexInput}
                      className="w-28 font-mono text-sm"
                      maxLength={7}
                      placeholder="#8b5cf6"
                    />
                  </div>
                </div>
              </div>

              {/* Preview Card */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="w-48 rounded-lg overflow-hidden shadow">
                  <div
                    className="p-2 text-xs font-semibold"
                    style={{ backgroundColor: primaryColor, color: '#ffffff' }}
                  >
                    Gerak
                  </div>
                  <div className="bg-white p-2 text-xs space-y-1">
                    <div
                      className="cursor-pointer rounded px-1 py-0.5 font-medium"
                      style={{ color: primaryColor }}
                    >
                      Dashboard
                    </div>
                    <div className="text-gray-600 px-1 py-0.5">Members</div>
                    <div className="text-gray-600 px-1 py-0.5">Packages</div>
                  </div>
                </div>
              </div>

              <Button onClick={handleAppearanceSave} disabled={savingAppearance}>
                {savingAppearance ? 'Saving…' : 'Save Appearance'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ COMMISSION TAB ════════════════════════════════════════════════ */}
        <TabsContent value="commission">
          <Card>
            <CardHeader>
              <CardTitle>PT Commission Settings</CardTitle>
              <CardDescription>
                Configure how personal trainer commissions are calculated and when assignments
                auto-release after a membership expires.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Grace period */}
              <div className="space-y-2">
                <Label htmlFor="grace-days">Assignment Grace Period (days)</Label>
                <Input
                  id="grace-days"
                  type="number"
                  min={0}
                  max={90}
                  value={graceDays}
                  onChange={(e) => setGraceDays(Number(e.target.value))}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  After a PT membership expires or sessions run out, the trainer assignment stays
                  active for this many days before auto-releasing.
                </p>
              </div>

              {/* Sales commission toggle */}
              <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Sales Commission</Label>
                  <p className="text-sm text-muted-foreground">
                    Award a one-time commission to the trainer who closes a PT package sale
                  </p>
                </div>
                <Switch
                  checked={salesCommissionEnabled}
                  onCheckedChange={setSalesCommissionEnabled}
                />
              </div>

              {/* Sales commission % */}
              {salesCommissionEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="sales-percent">Default Sales Commission (%)</Label>
                  <Input
                    id="sales-percent"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={salesCommissionPercent}
                    onChange={(e) => setSalesCommissionPercent(Number(e.target.value))}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentage of the package price paid to the trainer. Can be overridden per package.
                  </p>
                </div>
              )}

              <Button onClick={handleCommissionSave} disabled={savingCommission}>
                {savingCommission ? 'Saving…' : 'Save Commission Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ NOTIFICATIONS TAB ═════════════════════════════════════════════ */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose which events trigger notifications for your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {/* New Member Signup */}
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">New Member Signup</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when a new member registers
                    </p>
                  </div>
                  <Switch
                    checked={notifications.newMemberSignup}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, newMemberSignup: checked }))
                    }
                  />
                </div>

                {/* Payment Received */}
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Payment Received</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when a payment is completed
                    </p>
                  </div>
                  <Switch
                    checked={notifications.paymentReceived}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, paymentReceived: checked }))
                    }
                  />
                </div>

                {/* Daily Attendance Report */}
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Daily Attendance Report</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive a daily email with check-in summary
                    </p>
                  </div>
                  <Switch
                    checked={notifications.dailyAttendanceReport}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, dailyAttendanceReport: checked }))
                    }
                  />
                </div>

                {/* Membership Expiry Alerts */}
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Membership Expiry Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about expiring memberships
                    </p>
                  </div>
                  <Switch
                    checked={notifications.membershipExpiryAlerts}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, membershipExpiryAlerts: checked }))
                    }
                  />
                </div>
              </div>

              <Button onClick={handleNotificationsSave} disabled={savingNotifications}>
                {savingNotifications ? 'Saving…' : 'Save Notification Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
