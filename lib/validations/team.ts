import { z } from 'zod'

// ----------------------------------------------------------------
// Permission keys — used in both create and update schemas
// ----------------------------------------------------------------
const permissionsSchema = z.object({
  view_members:   z.boolean(),
  edit_members:   z.boolean(),
  view_billing:   z.boolean(),
  edit_billing:   z.boolean(),
  checkin:        z.boolean(),
  view_classes:   z.boolean(),
  edit_classes:   z.boolean(),
  view_trainers:  z.boolean(),
  edit_trainers:  z.boolean(),
  view_reports:   z.boolean(),
  manage_team:    z.boolean(),
})

// ----------------------------------------------------------------
// inviteTeamMemberSchema
// ----------------------------------------------------------------
export const inviteTeamMemberSchema = z.object({
  brandId:        z.string().uuid('Invalid brand ID'),
  fullName:       z.string().min(2, 'Full name must be at least 2 characters'),
  email:          z.string().email('Invalid email address'),
  phone:          z.string().optional(),
  role:           z.enum(['admin', 'staff', 'trainer', 'support', 'member', 'branch_manager']),
  customRoleId:   z.string().uuid('Invalid custom role ID').optional(),
  branchId:       z.string().uuid('Invalid branch ID').optional(),
  tempPassword:   z.string().min(8, 'Password must be at least 8 characters'),
})

export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>

// ----------------------------------------------------------------
// updateTeamMemberSchema
// ----------------------------------------------------------------
export const updateTeamMemberSchema = z.object({
  fullName:     z.string().min(2, 'Full name must be at least 2 characters').optional(),
  phone:        z.string().optional(),
  role:         z.enum(['admin', 'staff', 'trainer', 'support', 'member', 'branch_manager']).optional(),
  customRoleId: z.string().uuid('Invalid custom role ID').optional(),
  branchId:     z.string().uuid('Invalid branch ID').optional(),
})

export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>

// ----------------------------------------------------------------
// createCustomRoleSchema
// ----------------------------------------------------------------
export const createCustomRoleSchema = z.object({
  brandId:     z.string().uuid('Invalid brand ID'),
  name:        z.string().min(2, 'Role name must be at least 2 characters').max(50, 'Role name must be at most 50 characters'),
  permissions: permissionsSchema,
})

export type CreateCustomRoleInput = z.infer<typeof createCustomRoleSchema>

// ----------------------------------------------------------------
// updateCustomRoleSchema
// ----------------------------------------------------------------
export const updateCustomRoleSchema = z.object({
  name:        z.string().min(2, 'Role name must be at least 2 characters').max(50, 'Role name must be at most 50 characters').optional(),
  permissions: permissionsSchema.optional(),
})

export type UpdateCustomRoleInput = z.infer<typeof updateCustomRoleSchema>
