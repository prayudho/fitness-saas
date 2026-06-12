export type UserRole = 'superadmin' | 'admin' | 'staff' | 'trainer' | 'member'

export interface UserProfile {
  id: string
  email: string
  fullName: string
  role: UserRole
  brandId: string | null
  avatarUrl: string | null
}

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface DashboardStat {
  label: string
  value: string | number
  change?: number
  changeType?: 'increase' | 'decrease' | 'neutral'
}
