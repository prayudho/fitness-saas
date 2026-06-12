'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/shared/page-header'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Search, Check } from 'lucide-react'
import { useCreateTrainer } from '@/lib/hooks/use-trainers'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

const schema = z.object({
  bio: z.string().optional(),
  specialties: z.string().optional(),
  certifications: z.string().optional(),
  commission_model: z.enum(['flat', 'percent', 'per_session']),
  commission_value: z.coerce.number().min(0),
})

type FormData = z.infer<typeof schema>

export default function NewTrainerPage() {
  const router = useRouter()
  const mutation = useCreateTrainer()

  const [search, setSearch] = useState('')
  const [profiles, setProfiles] = useState<Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url' | 'phone' | 'role'>[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<typeof profiles[0] | null>(null)
  const [step, setStep] = useState<1 | 2>(1)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      bio: '',
      specialties: '',
      certifications: '',
      commission_model: 'flat',
      commission_value: 0,
    },
  })

  useEffect(() => {
    if (!search.trim()) {
      setProfiles([])
      return
    }
    const timeout = setTimeout(async () => {
      setLoadingProfiles(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: myProfile } = await supabase
          .from('profiles')
          .select('brand_id')
          .eq('id', user.id)
          .single()

        if (!myProfile?.brand_id) return

        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, phone, role')
          .eq('brand_id', myProfile.brand_id)
          .or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
          .limit(10)

        setProfiles(data ?? [])
      } finally {
        setLoadingProfiles(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [search])

  async function onSubmit(data: FormData) {
    if (!selectedProfile) return

    await mutation.mutateAsync({
      member_id: selectedProfile.id,
      bio: data.bio,
      specialties: data.specialties ? data.specialties.split(',').map((s) => s.trim()).filter(Boolean) : [],
      certifications: data.certifications ? data.certifications.split(',').map((s) => s.trim()).filter(Boolean) : [],
      commission_model: data.commission_model,
      commission_value: data.commission_value,
    })

    router.push('/admin/trainers')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/trainers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <PageHeader title="Add Trainer" description="Convert an existing member into a trainer" />
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Select Member Profile</CardTitle>
            <CardDescription>
              Trainers must already have a profile in your brand. Search by name or phone number.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {loadingProfiles && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            )}

            {!loadingProfiles && profiles.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {profiles.map((p) => {
                  const initials = p.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                  const isSelected = selectedProfile?.id === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProfile(p)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={p.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{p.full_name}</p>
                        {p.phone && (
                          <p className="text-xs text-muted-foreground">{p.phone}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                        {p.role}
                      </Badge>
                      {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}

            {!loadingProfiles && search.trim() && profiles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No profiles found. Make sure the person has a member profile first.
              </p>
            )}

            {selectedProfile && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Selected: {selectedProfile.full_name}</span>
                </div>
                <Button onClick={() => setStep(2)} size="sm">
                  Continue
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && selectedProfile && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Step 2: Trainer Details</CardTitle>
                <CardDescription>
                  Setting up trainer profile for{' '}
                  <span className="font-medium text-foreground">{selectedProfile.full_name}</span>
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                Change
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Trainer background and expertise..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specialties"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialties</FormLabel>
                      <FormControl>
                        <Input placeholder="Yoga, HIIT, Strength Training" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Separate with commas</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="certifications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certifications</FormLabel>
                      <FormControl>
                        <Input placeholder="ACE CPT, NASM, CrossFit L1" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Separate with commas</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="commission_model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commission Model</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="flat">Flat Rate</SelectItem>
                            <SelectItem value="percent">Percentage</SelectItem>
                            <SelectItem value="per_session">Per Session</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="commission_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commission Value</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" disabled={mutation.isPending} className="w-full">
                  {mutation.isPending ? 'Creating...' : 'Create Trainer'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
