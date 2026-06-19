'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAuthedProfile } from '@/lib/actions/utils'
import type { Database } from '@/types/database'

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

export type ClassTypeRow = Row<'class_types'>
export type ClassRow = Row<'classes'>
export type ClassBookingRow = Row<'class_bookings'>

export type ClassTypeInput = {
  name: string
  color?: string
  icon?: string
}

export type ClassInput = {
  class_type_id: string
  instructor_id?: string | null
  room?: string | null
  capacity: number
  duration_minutes: number
  scheduled_at: string
  branch_id?: string | null
}

export type ClassWithDetails = ClassRow & {
  class_types: Pick<ClassTypeRow, 'id' | 'name' | 'color' | 'icon'> | null
  instructor_profile: Pick<Row<'profiles'>, 'id' | 'full_name' | 'avatar_url'> | null
  booked_count: number
}

export type ClassBookingWithMember = ClassBookingRow & {
  member_profile: Pick<Row<'profiles'>, 'id' | 'full_name' | 'avatar_url' | 'phone'> | null
}

export type ClassDetail = ClassRow & {
  class_types: Pick<ClassTypeRow, 'id' | 'name' | 'color' | 'icon'> | null
  instructor_profile: Pick<Row<'profiles'>, 'id' | 'full_name' | 'avatar_url'> | null
  class_bookings: ClassBookingWithMember[]
}

export type MemberBookingWithClass = ClassBookingRow & {
  classes: (ClassRow & {
    class_types: Pick<ClassTypeRow, 'id' | 'name' | 'color'> | null
  }) | null
}

// ─────────────────────────────────────────────
// CLASS TYPES
// ─────────────────────────────────────────────

export async function getClassTypes(): Promise<{ data: ClassTypeRow[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: [], error: 'No brand context' }
    const brandId = profile.brand_id

    const { data: rawData, error } = await supabase
      .from('class_types')
      .select('*')
      .eq('brand_id', brandId)
      .order('name')

    const data = rawData as ClassTypeRow[] | null
    if (error) return { data: [], error: error.message }
    return { data: data ?? [] }
  } catch (e) {
    return { data: [], error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function createClassType(
  input: ClassTypeInput
): Promise<{ data?: ClassTypeRow; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }
    const brandId = profile.brand_id

    const { data: rawData, error } = await supabase
      .from('class_types')
      .insert({
        brand_id: brandId,
        name: input.name,
        color: input.color ?? '#6366f1',
        icon: input.icon ?? null,
      } as never)
      .select()
      .single()

    const data = rawData as ClassTypeRow | null
    if (error) return { error: error.message }
    revalidatePath('/admin/classes')
    return { data: data ?? undefined }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function updateClassType(
  id: string,
  input: Partial<ClassTypeInput>
): Promise<{ data?: ClassTypeRow; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }
    const brandId = profile.brand_id

    const { data: rawData, error } = await supabase
      .from('class_types')
      .update({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.color !== undefined && { color: input.color }),
        ...(input.icon !== undefined && { icon: input.icon }),
      } as never)
      .eq('id', id)
      .eq('brand_id', brandId)
      .select()
      .single()

    const data = rawData as ClassTypeRow | null
    if (error) return { error: error.message }
    revalidatePath('/admin/classes')
    return { data: data ?? undefined }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function deleteClassType(id: string): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }
    const brandId = profile.brand_id

    // Check if any classes use this type
    const { count, error: countError } = await supabase
      .from('classes')
      .select('id', { count: 'exact', head: true })
      .eq('class_type_id', id)
      .eq('brand_id', brandId)

    if (countError) return { error: countError.message }
    if ((count ?? 0) > 0) {
      return { error: 'Cannot delete class type that has associated classes' }
    }

    const { error } = await supabase
      .from('class_types')
      .delete()
      .eq('id', id)
      .eq('brand_id', brandId)

    if (error) return { error: error.message }
    revalidatePath('/admin/classes')
    return {}
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

// ─────────────────────────────────────────────
// CLASSES
// ─────────────────────────────────────────────

export async function getClasses(filters?: {
  weekStart?: string
  classTypeId?: string
  branchId?: string
}): Promise<{ data: ClassWithDetails[]; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: [], error: 'No brand context' }
    const brandId = profile.brand_id

    // Default weekStart = Monday of current week
    let weekStartDate: Date
    if (filters?.weekStart) {
      weekStartDate = new Date(filters.weekStart)
    } else {
      weekStartDate = new Date()
      const day = weekStartDate.getDay()
      // Convert Sunday=0 to Monday=0 offset
      const diff = day === 0 ? -6 : 1 - day
      weekStartDate.setDate(weekStartDate.getDate() + diff)
      weekStartDate.setHours(0, 0, 0, 0)
    }

    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekEndDate.getDate() + 7)

    let query = supabase
      .from('classes')
      .select(`
        *,
        class_types!class_type_id(id, name, color, icon),
        instructor_profile:profiles!classes_instructor_brand_fkey(id, full_name, avatar_url),
        class_bookings(id, status)
      `)
      .eq('brand_id', brandId)
      .gte('scheduled_at', weekStartDate.toISOString())
      .lt('scheduled_at', weekEndDate.toISOString())
      .order('scheduled_at')

    if (filters?.classTypeId) {
      query = query.eq('class_type_id', filters.classTypeId)
    }

    if (filters?.branchId) {
      query = query.eq('branch_id' as never, filters.branchId)
    }

    const { data: rawData, error } = await query

    if (error) return { data: [], error: error.message }

    type RawClass = ClassRow & {
      class_bookings: { id: string; status: string }[] | null
      class_types: ClassWithDetails['class_types']
      instructor_profile: ClassWithDetails['instructor_profile']
    }
    const data = rawData as RawClass[] | null

    const result: ClassWithDetails[] = (data ?? []).map((cls) => {
      const bookings = (cls.class_bookings ?? []) as { id: string; status: string }[]
      const bookedCount = bookings.filter(
        (b) => b.status === 'booked' || b.status === 'attended'
      ).length

      return {
        id: cls.id,
        brand_id: cls.brand_id,
        branch_id: cls.branch_id,
        class_type_id: cls.class_type_id,
        instructor_id: cls.instructor_id,
        room: cls.room,
        capacity: cls.capacity,
        duration_minutes: cls.duration_minutes,
        scheduled_at: cls.scheduled_at,
        status: cls.status,
        created_at: cls.created_at,
        updated_at: cls.updated_at,
        class_types: cls.class_types as ClassWithDetails['class_types'],
        instructor_profile: cls.instructor_profile as ClassWithDetails['instructor_profile'],
        booked_count: bookedCount,
      }
    })

    return { data: result }
  } catch (e) {
    return { data: [], error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function getClass(id: string): Promise<{ data?: ClassDetail; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }
    const brandId = profile.brand_id

    const { data: rawData, error } = await supabase
      .from('classes')
      .select(`
        *,
        class_types!class_type_id(id, name, color, icon),
        instructor_profile:profiles!classes_instructor_brand_fkey(id, full_name, avatar_url),
        class_bookings(*)
      `)
      .eq('id', id)
      .eq('brand_id', brandId)
      .single()

    type RawClassDetail = ClassRow & {
      class_bookings: ClassBookingRow[] | null
      class_types: ClassDetail['class_types']
      instructor_profile: ClassDetail['instructor_profile']
    }
    const data = rawData as RawClassDetail | null

    if (error) return { error: error.message }
    if (!data) return { error: 'Class not found' }

    // class_bookings has no brand_id column — fetch member profiles separately
    const rawBookings = (data.class_bookings ?? []) as ClassBookingRow[]
    const memberIds = [...new Set(rawBookings.map((b) => b.member_id))]
    const profileMap: Record<string, Pick<Row<'profiles'>, 'id' | 'full_name' | 'avatar_url' | 'phone'>> = {}
    if (memberIds.length > 0) {
      const { data: rawMemberProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone')
        .eq('brand_id', brandId)
        .in('id', memberIds)
      type MemberProfileResult = Pick<Row<'profiles'>, 'id' | 'full_name' | 'avatar_url' | 'phone'>
      const memberProfiles = rawMemberProfiles as MemberProfileResult[] | null
      for (const p of memberProfiles ?? []) profileMap[p.id] = p as typeof profileMap[string]
    }

    const result: ClassDetail = {
      id: data.id,
      brand_id: data.brand_id,
      branch_id: data.branch_id,
      class_type_id: data.class_type_id,
      instructor_id: data.instructor_id,
      room: data.room,
      capacity: data.capacity,
      duration_minutes: data.duration_minutes,
      scheduled_at: data.scheduled_at,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
      class_types: data.class_types as ClassDetail['class_types'],
      instructor_profile: data.instructor_profile as ClassDetail['instructor_profile'],
      class_bookings: rawBookings.map((b) => ({
        ...b,
        member_profile: profileMap[b.member_id] ?? null,
      })) as ClassBookingWithMember[],
    }

    return { data: result }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function createClass(
  input: ClassInput
): Promise<{ data?: ClassRow; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }
    const brandId = profile.brand_id

    // Resolve branch_id: use provided value or fall back to the brand's first branch
    let branchId = input.branch_id ?? null
    if (!branchId) {
      const { data: firstBranch } = await supabase
        .from('branches' as never)
        .select('id')
        .eq('brand_id', brandId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()
      branchId = firstBranch ? (firstBranch as { id: string }).id : null
    }
    if (!branchId) return { error: 'No branch found for this brand. Please create a branch first.' }

    const { data: rawData, error } = await supabase
      .from('classes')
      .insert({
        brand_id: brandId,
        branch_id: branchId,
        class_type_id: input.class_type_id,
        instructor_id: input.instructor_id ?? null,
        room: input.room ?? null,
        capacity: input.capacity,
        duration_minutes: input.duration_minutes,
        scheduled_at: input.scheduled_at,
        status: 'scheduled',
      } as never)
      .select()
      .single()

    const data = rawData as ClassRow | null
    if (error) return { error: error.message }
    revalidatePath('/admin/classes')
    return { data: data ?? undefined }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function updateClass(
  id: string,
  input: Partial<ClassInput>
): Promise<{ data?: ClassRow; error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }
    const brandId = profile.brand_id

    const { data: rawData, error } = await supabase
      .from('classes')
      .update({
        ...(input.class_type_id !== undefined && { class_type_id: input.class_type_id }),
        ...(input.instructor_id !== undefined && { instructor_id: input.instructor_id }),
        ...(input.room !== undefined && { room: input.room }),
        ...(input.capacity !== undefined && { capacity: input.capacity }),
        ...(input.duration_minutes !== undefined && { duration_minutes: input.duration_minutes }),
        ...(input.scheduled_at !== undefined && { scheduled_at: input.scheduled_at }),
      } as never)
      .eq('id', id)
      .eq('brand_id', brandId)
      .select()
      .single()

    const data = rawData as ClassRow | null
    if (error) return { error: error.message }
    revalidatePath('/admin/classes')
    return { data: data ?? undefined }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function cancelClass(id: string): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }
    const brandId = profile.brand_id

    const { error } = await supabase
      .from('classes')
      .update({ status: 'cancelled' } as never)
      .eq('id', id)
      .eq('brand_id', brandId)

    if (error) return { error: error.message }
    revalidatePath('/admin/classes')
    revalidatePath('/member/classes')
    return {}
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

// ─────────────────────────────────────────────
// BOOKINGS
// ─────────────────────────────────────────────

export async function bookClass(
  classId: string
): Promise<{ data?: { bookingId: string; status: string }; error?: string }> {
  try {
    const supabase = createClient()
    const { user, profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    // Get class details
    const { data: rawCls, error: clsError } = await supabase
      .from('classes')
      .select('capacity, status')
      .eq('id', classId)
      .single()

    type ClsResult = { capacity: number; status: string }
    const cls = rawCls as ClsResult | null

    if (clsError || !cls) return { error: 'Class not found' }
    if (cls.status === 'cancelled') return { error: 'This class has been cancelled' }

    // Check for existing booking
    const { data: rawExistingBooking } = await supabase
      .from('class_bookings')
      .select('id, status')
      .eq('class_id', classId)
      .eq('member_id', user.id)
      .not('status', 'eq', 'cancelled')
      .maybeSingle()

    const existingBooking = rawExistingBooking as { id: string; status: string } | null
    if (existingBooking) return { error: 'You already have a booking for this class' }

    // Count booked (not cancelled/waitlisted)
    const { count: bookedCount, error: countError } = await supabase
      .from('class_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .in('status', ['booked', 'attended'])

    if (countError) return { error: countError.message }

    const isFull = (bookedCount ?? 0) >= cls.capacity
    const bookingStatus = isFull ? 'waitlisted' : 'booked'

    const { data: rawBooking, error: bookingError } = await supabase
      .from('class_bookings')
      .insert({
        class_id: classId,
        member_id: user.id,
        status: bookingStatus,
      } as never)
      .select()
      .single()

    const booking = rawBooking as { id: string } | null
    if (bookingError || !booking) return { error: bookingError?.message ?? 'Failed to book class' }

    revalidatePath('/member/classes')
    return { data: { bookingId: booking.id, status: bookingStatus } }
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function cancelBooking(bookingId: string): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { user } = await getAuthedProfile(supabase)

    // Get the booking to find class_id
    const { data: rawBookingData, error: bookingError } = await supabase
      .from('class_bookings')
      .select('class_id, status')
      .eq('id', bookingId)
      .eq('member_id', user.id)
      .single()

    type BookingData = { class_id: string; status: string }
    const booking = rawBookingData as BookingData | null
    if (bookingError || !booking) return { error: 'Booking not found' }

    // Cancel the booking
    const { error: cancelError } = await supabase
      .from('class_bookings')
      .update({ status: 'cancelled' } as never)
      .eq('id', bookingId)
      .eq('member_id', user.id)

    if (cancelError) return { error: cancelError.message }

    // If the cancelled booking was 'booked', promote first waitlisted
    if (booking.status === 'booked') {
      const { data: rawFirstWaitlisted } = await supabase
        .from('class_bookings')
        .select('id')
        .eq('class_id', booking.class_id)
        .eq('status', 'waitlisted')
        .order('booked_at')
        .limit(1)
        .maybeSingle()

      const firstWaitlisted = rawFirstWaitlisted as { id: string } | null
      if (firstWaitlisted) {
        await supabase
          .from('class_bookings')
          .update({ status: 'booked' } as never)
          .eq('id', firstWaitlisted.id)
      }
    }

    revalidatePath('/member/classes')
    return {}
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function getMemberBookings(): Promise<{
  data: MemberBookingWithClass[]
  error?: string
}> {
  try {
    const supabase = createClient()
    const { user } = await getAuthedProfile(supabase)

    const { data, error } = await supabase
      .from('class_bookings')
      .select(`
        *,
        classes(
          *,
          class_types!class_type_id(id, name, color)
        )
      `)
      .eq('member_id', user.id)
      .order('booked_at', { ascending: false })

    if (error) return { data: [], error: error.message }
    return { data: (data ?? []) as MemberBookingWithClass[] }
  } catch (e) {
    return { data: [], error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function getClassAttendees(classId: string): Promise<{
  data: ClassBookingWithMember[]
  error?: string
}> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { data: [], error: 'No brand context' }
    const brandId = profile.brand_id

    const { data: bookingsData, error } = await supabase
      .from('class_bookings')
      .select('*')
      .eq('class_id', classId)
      .order('booked_at')

    if (error) return { data: [], error: error.message }

    const rawBookings = (bookingsData ?? []) as ClassBookingRow[]
    const memberIds = [...new Set(rawBookings.map((b) => b.member_id))]
    const profileMap: Record<string, Pick<Row<'profiles'>, 'id' | 'full_name' | 'avatar_url' | 'phone'>> = {}
    if (memberIds.length > 0) {
      const { data: rawMemberProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone')
        .eq('brand_id', brandId)
        .in('id', memberIds)
      type MemberProfileResult = Pick<Row<'profiles'>, 'id' | 'full_name' | 'avatar_url' | 'phone'>
      const memberProfiles = rawMemberProfiles as MemberProfileResult[] | null
      for (const p of memberProfiles ?? []) profileMap[p.id] = p as typeof profileMap[string]
    }

    return {
      data: rawBookings.map((b) => ({
        ...b,
        member_profile: profileMap[b.member_id] ?? null,
      })) as ClassBookingWithMember[],
    }
  } catch (e) {
    return { data: [], error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}

export async function checkInAttendee(bookingId: string): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { profile } = await getAuthedProfile(supabase)
    if (!profile.brand_id) return { error: 'No brand context' }

    const { error } = await supabase
      .from('class_bookings')
      .update({
        status: 'attended',
        checked_in_at: new Date().toISOString(),
      } as never)
      .eq('id', bookingId)

    if (error) return { error: error.message }
    revalidatePath('/admin/classes')
    revalidatePath('/staff/checkin')
    return {}
  } catch (e) {
    return { error: e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'An error occurred' }
  }
}
