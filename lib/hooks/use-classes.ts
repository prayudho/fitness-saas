'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  getClassTypes,
  getClass,
  createClass,
  updateClass,
  cancelClass,
  bookClass,
  cancelBooking,
  getMemberBookings,
  getClassAttendees,
  checkInAttendee,
  createClassType,
  updateClassType,
  deleteClassType,
  type ClassWithDetails,
} from '@/lib/actions/classes'

// ─────────────────────────────────────────────
// CLASS TYPES
// ─────────────────────────────────────────────

export function useClassTypes() {
  return useQuery({
    queryKey: ['class-types'],
    queryFn: async () => {
      const result = await getClassTypes()
      if (result.error) throw new Error(result.error)
      return result.data
    },
  })
}

export function useCreateClassType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Parameters<typeof createClassType>[0]) => {
      const r = await createClassType(input)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class-types'] })
      toast.success('Class type created')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateClassType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: Parameters<typeof updateClassType>[1]
    }) => {
      const r = await updateClassType(id, input)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class-types'] })
      toast.success('Class type updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteClassType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await deleteClassType(id)
      if (r.error) throw new Error(r.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class-types'] })
      toast.success('Class type deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ─────────────────────────────────────────────
// CLASSES
// ─────────────────────────────────────────────

export function useClasses(filters?: { weekStart?: string; classTypeId?: string }) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['classes', filters],
    queryFn: async (): Promise<ClassWithDetails[]> => {
      // Calculate week range
      let weekStartDate: Date
      if (filters?.weekStart) {
        weekStartDate = new Date(filters.weekStart)
      } else {
        weekStartDate = new Date()
        const day = weekStartDate.getDay()
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
          instructor_profile:profiles!instructor_id(id, full_name, avatar_url),
          class_bookings(id, status)
        `)
        .gte('scheduled_at', weekStartDate.toISOString())
        .lt('scheduled_at', weekEndDate.toISOString())
        .order('scheduled_at')

      if (filters?.classTypeId) {
        query = query.eq('class_type_id', filters.classTypeId)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)

      return (data ?? []).map((cls) => {
        const bookings = (cls.class_bookings ?? []) as { id: string; status: string }[]
        const bookedCount = bookings.filter(
          (b) => b.status === 'booked' || b.status === 'attended'
        ).length

        return {
          id: cls.id,
          brand_id: cls.brand_id,
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
    },
  })
}

export function useClass(id: string | null) {
  return useQuery({
    queryKey: ['classes', id],
    queryFn: async () => {
      if (!id) return null
      const result = await getClass(id)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: Boolean(id),
  })
}

export function useCreateClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Parameters<typeof createClass>[0]) => {
      const r = await createClass(input)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] })
      toast.success('Class created successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: Parameters<typeof updateClass>[1]
    }) => {
      const r = await updateClass(id, input)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['classes'] })
      qc.invalidateQueries({ queryKey: ['classes', id] })
      toast.success('Class updated successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useCancelClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await cancelClass(id)
      if (r.error) throw new Error(r.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] })
      toast.success('Class cancelled')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ─────────────────────────────────────────────
// BOOKINGS
// ─────────────────────────────────────────────

export function useBookClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (classId: string) => {
      const r = await bookClass(classId)
      if (r.error) throw new Error(r.error)
      return r.data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['classes'] })
      qc.invalidateQueries({ queryKey: ['member-bookings'] })
      if (data?.status === 'waitlisted') {
        toast.success('Added to waitlist')
      } else {
        toast.success('Class booked successfully')
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useCancelBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const r = await cancelBooking(bookingId)
      if (r.error) throw new Error(r.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] })
      qc.invalidateQueries({ queryKey: ['member-bookings'] })
      toast.success('Booking cancelled')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useMemberBookings() {
  return useQuery({
    queryKey: ['member-bookings'],
    queryFn: async () => {
      const result = await getMemberBookings()
      if (result.error) throw new Error(result.error)
      return result.data
    },
  })
}

export function useClassAttendees(classId: string | null) {
  return useQuery({
    queryKey: ['class-attendees', classId],
    queryFn: async () => {
      if (!classId) return []
      const result = await getClassAttendees(classId)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: Boolean(classId),
  })
}

export function useCheckInAttendee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const r = await checkInAttendee(bookingId)
      if (r.error) throw new Error(r.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] })
      qc.invalidateQueries({ queryKey: ['class-attendees'] })
      toast.success('Attendee checked in')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
