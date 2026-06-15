'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { updatePassword } from '@/lib/actions/auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Loader2, Camera, Eye, EyeOff } from 'lucide-react'
import type { Database } from '@/types/database'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

// ─── Schemas ─────────────────────────────────────────────────

const personalInfoSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  phone: z.string().nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).nullable().optional(),
  emergency_contact_name: z.string().nullable().optional(),
  emergency_contact_phone: z.string().nullable().optional(),
})

const securitySchema = z
  .object({
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type PersonalInfoValues = z.infer<typeof personalInfoSchema>
type SecurityValues = z.infer<typeof securitySchema>

// ─── Data fetching ────────────────────────────────────────────

async function fetchProfile(): Promise<{ profile: ProfileRow; email: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (supabase as any).from('profiles').select('*').eq('id', user.id).single()
  const data = result.data as ProfileRow | null
  const error = result.error

  if (error || !data) throw new Error('Profile not found')

  return { profile: data, email: user.email ?? '' }
}

// ─── Avatar Upload Section ────────────────────────────────────

interface AvatarUploadProps {
  avatarUrl: string | null
  fullName: string
  userId: string
  onUploadComplete: (url: string) => void
}

function AvatarUpload({ avatarUrl, fullName, userId, onUploadComplete }: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl)

  useEffect(() => {
    setPreviewUrl(avatarUrl)
  }, [avatarUrl])

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB')
      return
    }

    // Preview
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    setIsUploading(true)
    setUploadProgress(10)

    try {
      const supabase = createClient()
      const filePath = `${userId}/avatar.jpg`

      setUploadProgress(30)

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      setUploadProgress(70)

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)

      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`

      setUploadProgress(90)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', userId)

      if (updateError) throw updateError

      setUploadProgress(100)
      setPreviewUrl(publicUrl)
      onUploadComplete(urlData.publicUrl)
      toast.success('Profile photo updated')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      toast.error(msg)
      setPreviewUrl(avatarUrl)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        className="relative group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        aria-label="Change profile photo"
      >
        {/* Avatar circle */}
        <div className="h-40 w-40 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border-4 border-white shadow-lg">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={fullName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-4xl font-bold text-primary/60">{initials}</span>
          )}
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="h-8 w-8 text-white" />
        </div>
      </button>

      {isUploading && (
        <div className="w-40 space-y-1">
          <Progress value={uploadProgress} className="h-1.5" />
          <p className="text-xs text-center text-muted-foreground">Uploading…</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Click photo to change. Max 5MB.</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

// ─── Personal Info Tab ────────────────────────────────────────

interface PersonalInfoTabProps {
  profile: ProfileRow
  email: string
  onAvatarUpdate: (url: string) => void
}

function PersonalInfoTab({ profile, email, onAvatarUpdate }: PersonalInfoTabProps) {
  const queryClient = useQueryClient()

  const form = useForm<PersonalInfoValues>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      full_name: profile.full_name,
      phone: profile.phone ?? '',
      date_of_birth: profile.date_of_birth ?? '',
      gender: (profile.gender as 'male' | 'female' | 'other' | 'prefer_not_to_say' | null) ?? null,
      emergency_contact_name: profile.emergency_contact_name ?? '',
      emergency_contact_phone: profile.emergency_contact_phone ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: PersonalInfoValues) => {
      const supabase = createClient()
      const update: ProfileUpdate = {
        full_name: values.full_name,
        phone: values.phone || null,
        date_of_birth: values.date_of_birth || null,
        gender: values.gender || null,
        emergency_contact_name: values.emergency_contact_name || null,
        emergency_contact_phone: values.emergency_contact_phone || null,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('profiles').update(update).eq('id', profile.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      toast.success('Profile updated')
      queryClient.invalidateQueries({ queryKey: ['member-profile'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update profile')
    },
  })

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <Card>
        <CardContent className="pt-6">
          <AvatarUpload
            avatarUrl={profile.avatar_url}
            fullName={profile.full_name}
            userId={profile.id}
            onUploadComplete={onAvatarUpdate}
          />
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
              className="space-y-4"
            >
              {/* Full name */}
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email — readonly */}
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Email</label>
                <Input
                  value={email}
                  readOnly
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Contact support to change your email address.
                </p>
              </div>

              {/* Phone */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+62 812 3456 7890"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date of birth + Gender */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={(v) => field.onChange(v || null)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Emergency Contact */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-medium text-muted-foreground">Emergency Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="emergency_contact_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Emergency contact name"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergency_contact_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+62 812 0000 0000"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Security Tab ─────────────────────────────────────────────

function SecurityTab() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const form = useForm<SecurityValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      new_password: '',
      confirm_password: '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: SecurityValues) => {
      const result = await updatePassword(values.new_password)
      if (result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast.success('Password updated. Please sign in again.')
      form.reset()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update password')
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Change Password</CardTitle>
        <CardDescription>Update your account password</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4 max-w-md"
          >
            <FormField
              control={form.control}
              name="new_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="At least 8 characters"
                        className="pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowPassword((v) => !v)}
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Repeat new password"
                        className="pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowConfirm((v) => !v)}
                        tabIndex={-1}
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      >
                        {showConfirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-xs text-muted-foreground">
              You will need to sign in again after changing your password.
            </p>

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Password
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

// ─── Page ────────────────────────────────────────────────────

export default function ProfilePage() {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['member-profile'],
    queryFn: fetchProfile,
    staleTime: 5 * 60 * 1000,
  })

  function handleAvatarUpdate(url: string) {
    queryClient.setQueryData(['member-profile'], (old: typeof data) => {
      if (!old) return old
      return { ...old, profile: { ...old.profile, avatar_url: url } }
    })
    // Also invalidate dashboard so avatar refreshes there too
    queryClient.invalidateQueries({ queryKey: ['member-dashboard'] })
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="h-7 w-32 bg-muted rounded animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
        <div className="h-96 rounded-xl bg-muted animate-pulse" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground text-sm">
          {error instanceof Error ? error.message : 'Failed to load profile.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your personal information and account security
        </p>
      </div>

      <Tabs defaultValue="personal">
        <TabsList className="mb-4">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <PersonalInfoTab
            profile={data.profile}
            email={data.email}
            onAvatarUpdate={handleAvatarUpdate}
          />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
