import { z } from 'zod'

export const registerMemberSchema = z.object({
  brandId: z.string().uuid('Invalid brand ID'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  packageId: z.string().uuid('Invalid package ID').optional(),
  paymentMethod: z.enum(['cash', 'transfer']).optional(),
  paymentNotes: z.string().optional(),
  amountPaid: z.number().positive('Amount must be positive').optional(),
  sendWelcomeEmail: z.boolean().default(true),
})

export type RegisterMemberInput = z.infer<typeof registerMemberSchema>
