import { z } from 'zod'

export const memberSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().min(8, 'Valid phone number required'),
  gender: z.enum(['male', 'female', 'other']),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  notes: z.string().optional(),
})

export const packageSchema = z.object({
  name: z.string().min(2, 'Package name is required'),
  description: z.string().optional(),
  price: z.coerce.number().positive('Price must be positive'),
  durationDays: z.coerce.number().int().positive('Duration must be positive'),
  visitLimit: z.coerce.number().int().positive().optional().nullable(),
})

export const checkinSchema = z.object({
  memberId: z.string().uuid('Invalid member'),
  notes: z.string().optional(),
})

export type MemberInput = z.infer<typeof memberSchema>
export type PackageInput = z.infer<typeof packageSchema>
export type CheckinInput = z.infer<typeof checkinSchema>
