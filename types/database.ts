// ============================================================
// FitnessPlace SaaS — Generated Database Types
// Source of truth: supabase/migrations/001_initial_schema.sql
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================
// ENUM TYPES
// ============================================================

export type UserRole        = 'superadmin' | 'admin' | 'staff' | 'trainer' | 'member'
export type SubscriptionPlan = 'starter' | 'growth' | 'enterprise'
export type MembershipType  = 'monthly' | 'annual' | 'sessions' | 'day_pass'
export type MembershipStatus = 'active' | 'frozen' | 'expired' | 'cancelled'
export type InvoiceStatus   = 'pending' | 'paid' | 'failed' | 'refunded'
export type PaymentMethod   = 'gateway' | 'cash' | 'transfer'
export type DiscountType    = 'percent' | 'fixed'
export type CommissionModel = 'flat' | 'percent' | 'per_session'
export type SessionStatus   = 'scheduled' | 'completed' | 'cancelled' | 'no_show'
export type ClassStatus     = 'scheduled' | 'cancelled' | 'completed'
export type BookingStatus   = 'booked' | 'waitlisted' | 'attended' | 'cancelled' | 'no_show'
export type CheckinMethod   = 'qr' | 'staff' | 'gate'

// ============================================================
// DATABASE SCHEMA TYPE
// ============================================================

export interface Database {
  public: {
    Tables: {

      // --------------------------------
      brands
      // --------------------------------
      brands: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          primary_color: string
          owner_user_id: string | null
          subscription_plan: SubscriptionPlan
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          primary_color?: string
          owner_user_id?: string | null
          subscription_plan?: SubscriptionPlan
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['brands']['Insert']>
        Relationships: [
          { foreignKeyName: 'brands_owner_user_id_fkey'; columns: ['owner_user_id']; referencedRelation: 'users'; referencedColumns: ['id'] }
        ]
      }

      // --------------------------------
      profiles
      // --------------------------------
      profiles: {
        Row: {
          id: string
          brand_id: string | null
          role: UserRole
          full_name: string
          phone: string | null
          avatar_url: string | null
          date_of_birth: string | null
          gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          brand_id?: string | null
          role?: UserRole
          full_name: string
          phone?: string | null
          avatar_url?: string | null
          date_of_birth?: string | null
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: [
          { foreignKeyName: 'profiles_id_fkey'; columns: ['id']; referencedRelation: 'users'; referencedColumns: ['id'] },
          { foreignKeyName: 'profiles_brand_id_fkey'; columns: ['brand_id']; referencedRelation: 'brands'; referencedColumns: ['id'] }
        ]
      }

      // --------------------------------
      membership_packages
      // --------------------------------
      membership_packages: {
        Row: {
          id: string
          brand_id: string
          name: string
          description: string | null
          type: MembershipType
          duration_days: number | null
          session_credits: number | null
          price: number
          currency: string
          is_active: boolean
          allow_freeze: boolean
          max_freeze_days: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          name: string
          description?: string | null
          type: MembershipType
          duration_days?: number | null
          session_credits?: number | null
          price: number
          currency?: string
          is_active?: boolean
          allow_freeze?: boolean
          max_freeze_days?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['membership_packages']['Insert']>
        Relationships: [
          { foreignKeyName: 'membership_packages_brand_id_fkey'; columns: ['brand_id']; referencedRelation: 'brands'; referencedColumns: ['id'] }
        ]
      }

      // --------------------------------
      memberships
      // --------------------------------
      memberships: {
        Row: {
          id: string
          brand_id: string
          member_id: string
          package_id: string
          status: MembershipStatus
          starts_at: string
          expires_at: string | null
          sessions_remaining: number | null
          auto_renew: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          member_id: string
          package_id: string
          status?: MembershipStatus
          starts_at: string
          expires_at?: string | null
          sessions_remaining?: number | null
          auto_renew?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['memberships']['Insert']>
        Relationships: [
          { foreignKeyName: 'memberships_brand_id_fkey'; columns: ['brand_id']; referencedRelation: 'brands'; referencedColumns: ['id'] },
          { foreignKeyName: 'memberships_member_id_fkey'; columns: ['member_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'memberships_package_id_fkey'; columns: ['package_id']; referencedRelation: 'membership_packages'; referencedColumns: ['id'] }
        ]
      }

      // --------------------------------
      membership_freezes
      // --------------------------------
      membership_freezes: {
        Row: {
          id: string
          membership_id: string
          frozen_from: string
          frozen_until: string
          reason: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          membership_id: string
          frozen_from: string
          frozen_until: string
          reason?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['membership_freezes']['Insert']>
        Relationships: [
          { foreignKeyName: 'membership_freezes_membership_id_fkey'; columns: ['membership_id']; referencedRelation: 'memberships'; referencedColumns: ['id'] },
          { foreignKeyName: 'membership_freezes_created_by_fkey'; columns: ['created_by']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }

      // --------------------------------
      invoices
      // --------------------------------
      invoices: {
        Row: {
          id: string
          brand_id: string
          member_id: string
          membership_id: string | null
          amount: number
          currency: string
          status: InvoiceStatus
          payment_method: PaymentMethod | null
          gateway_ref: string | null
          notes: string | null
          created_at: string
          paid_at: string | null
        }
        Insert: {
          id?: string
          brand_id: string
          member_id: string
          membership_id?: string | null
          amount: number
          currency?: string
          status?: InvoiceStatus
          payment_method?: PaymentMethod | null
          gateway_ref?: string | null
          notes?: string | null
          created_at?: string
          paid_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
        Relationships: [
          { foreignKeyName: 'invoices_brand_id_fkey'; columns: ['brand_id']; referencedRelation: 'brands'; referencedColumns: ['id'] },
          { foreignKeyName: 'invoices_member_id_fkey'; columns: ['member_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'invoices_membership_id_fkey'; columns: ['membership_id']; referencedRelation: 'memberships'; referencedColumns: ['id'] }
        ]
      }

      // --------------------------------
      promo_codes
      // --------------------------------
      promo_codes: {
        Row: {
          id: string
          brand_id: string
          code: string
          discount_type: DiscountType
          discount_value: number
          max_uses: number | null
          used_count: number
          valid_from: string
          valid_until: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          code: string
          discount_type: DiscountType
          discount_value: number
          max_uses?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['promo_codes']['Insert']>
        Relationships: [
          { foreignKeyName: 'promo_codes_brand_id_fkey'; columns: ['brand_id']; referencedRelation: 'brands'; referencedColumns: ['id'] }
        ]
      }

      // --------------------------------
      trainers
      // --------------------------------
      trainers: {
        Row: {
          id: string
          brand_id: string
          bio: string | null
          specialties: string[]
          certifications: string[]
          commission_model: CommissionModel
          commission_value: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          brand_id: string
          bio?: string | null
          specialties?: string[]
          certifications?: string[]
          commission_model?: CommissionModel
          commission_value?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['trainers']['Insert']>
        Relationships: [
          { foreignKeyName: 'trainers_id_fkey'; columns: ['id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'trainers_brand_id_fkey'; columns: ['brand_id']; referencedRelation: 'brands'; referencedColumns: ['id'] }
        ]
      }

      // --------------------------------
      trainer_availability
      // --------------------------------
      trainer_availability: {
        Row: {
          id: string
          trainer_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_recurring: boolean
        }
        Insert: {
          id?: string
          trainer_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_recurring?: boolean
        }
        Update: Partial<Database['public']['Tables']['trainer_availability']['Insert']>
        Relationships: [
          { foreignKeyName: 'trainer_availability_trainer_id_fkey'; columns: ['trainer_id']; referencedRelation: 'trainers'; referencedColumns: ['id'] }
        ]
      }

      // --------------------------------
      trainer_sessions
      // --------------------------------
      trainer_sessions: {
        Row: {
          id: string
          brand_id: string
          trainer_id: string
          member_id: string
          scheduled_at: string
          duration_minutes: number
          status: SessionStatus
          notes: string | null
          session_fee: number | null
          commission_earned: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          trainer_id: string
          member_id: string
          scheduled_at: string
          duration_minutes?: number
          status?: SessionStatus
          notes?: string | null
          session_fee?: number | null
          commission_earned?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['trainer_sessions']['Insert']>
        Relationships: [
          { foreignKeyName: 'trainer_sessions_brand_id_fkey'; columns: ['brand_id']; referencedRelation: 'brands'; referencedColumns: ['id'] },
          { foreignKeyName: 'trainer_sessions_trainer_id_fkey'; columns: ['trainer_id']; referencedRelation: 'trainers'; referencedColumns: ['id'] },
          { foreignKeyName: 'trainer_sessions_member_id_fkey'; columns: ['member_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }

      // --------------------------------
      class_types
      // --------------------------------
      class_types: {
        Row: {
          id: string
          brand_id: string
          name: string
          description: string | null
          color: string
          icon: string | null
          created_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          name: string
          description?: string | null
          color?: string
          icon?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['class_types']['Insert']>
        Relationships: [
          { foreignKeyName: 'class_types_brand_id_fkey'; columns: ['brand_id']; referencedRelation: 'brands'; referencedColumns: ['id'] }
        ]
      }

      // --------------------------------
      classes
      // --------------------------------
      classes: {
        Row: {
          id: string
          brand_id: string
          class_type_id: string
          instructor_id: string | null
          room: string | null
          capacity: number
          duration_minutes: number
          scheduled_at: string
          status: ClassStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          class_type_id: string
          instructor_id?: string | null
          room?: string | null
          capacity?: number
          duration_minutes?: number
          scheduled_at: string
          status?: ClassStatus
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['classes']['Insert']>
        Relationships: [
          { foreignKeyName: 'classes_brand_id_fkey'; columns: ['brand_id']; referencedRelation: 'brands'; referencedColumns: ['id'] },
          { foreignKeyName: 'classes_class_type_id_fkey'; columns: ['class_type_id']; referencedRelation: 'class_types'; referencedColumns: ['id'] },
          { foreignKeyName: 'classes_instructor_id_fkey'; columns: ['instructor_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }

      // --------------------------------
      class_bookings
      // --------------------------------
      class_bookings: {
        Row: {
          id: string
          class_id: string
          member_id: string
          status: BookingStatus
          booked_at: string
          checked_in_at: string | null
        }
        Insert: {
          id?: string
          class_id: string
          member_id: string
          status?: BookingStatus
          booked_at?: string
          checked_in_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['class_bookings']['Insert']>
        Relationships: [
          { foreignKeyName: 'class_bookings_class_id_fkey'; columns: ['class_id']; referencedRelation: 'classes'; referencedColumns: ['id'] },
          { foreignKeyName: 'class_bookings_member_id_fkey'; columns: ['member_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }

      // --------------------------------
      checkins
      // --------------------------------
      checkins: {
        Row: {
          id: string
          brand_id: string
          member_id: string
          membership_id: string | null
          method: CheckinMethod
          checked_in_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          brand_id: string
          member_id: string
          membership_id?: string | null
          method?: CheckinMethod
          checked_in_at?: string
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['checkins']['Insert']>
        Relationships: [
          { foreignKeyName: 'checkins_brand_id_fkey'; columns: ['brand_id']; referencedRelation: 'brands'; referencedColumns: ['id'] },
          { foreignKeyName: 'checkins_member_id_fkey'; columns: ['member_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'checkins_membership_id_fkey'; columns: ['membership_id']; referencedRelation: 'memberships'; referencedColumns: ['id'] }
        ]
      }
    }

    Views: {
      v_active_members: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          gender: string | null
          brand_id: string
          brand_name: string
          brand_slug: string
          membership_id: string | null
          membership_status: MembershipStatus | null
          starts_at: string | null
          expires_at: string | null
          sessions_remaining: number | null
          auto_renew: boolean | null
          package_name: string | null
          package_type: MembershipType | null
          package_price: number | null
          currency: string | null
          days_until_expiry: number | null
        }
      }
      v_daily_revenue: {
        Row: {
          brand_id: string
          revenue_date: string
          payment_method: PaymentMethod | null
          currency: string
          transaction_count: number
          total_amount: number
          avg_transaction: number
        }
      }
      v_class_attendance_summary: {
        Row: {
          brand_id: string
          class_id: string
          class_type_name: string
          class_type_color: string
          instructor_name: string | null
          room: string | null
          scheduled_at: string
          capacity: number
          class_status: ClassStatus
          duration_minutes: number
          total_bookings: number
          booked_count: number
          waitlist_count: number
          attended_count: number
          no_show_count: number
          cancelled_count: number
          fill_rate_pct: number | null
        }
      }
      v_trainer_commission_summary: {
        Row: {
          brand_id: string
          trainer_id: string
          trainer_name: string
          month: string
          total_sessions: number
          sessions_completed: number
          sessions_cancelled: number
          sessions_no_show: number
          total_revenue: number
          total_commission: number
        }
      }
    }

    Functions: {
      get_my_brand_id: {
        Args: Record<string, never>
        Returns: string | null
      }
      get_my_role: {
        Args: Record<string, never>
        Returns: UserRole | null
      }
      is_superadmin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_brand_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }

    Enums: {
      user_role:         UserRole
      subscription_plan: SubscriptionPlan
      membership_type:   MembershipType
      membership_status: MembershipStatus
      invoice_status:    InvoiceStatus
      payment_method:    PaymentMethod
      discount_type:     DiscountType
      commission_model:  CommissionModel
      session_status:    SessionStatus
      class_status:      ClassStatus
      booking_status:    BookingStatus
      checkin_method:    CheckinMethod
    }

    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ============================================================
// CONVENIENCE HELPER TYPES
// ============================================================

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row']

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']

export type Views<T extends keyof PublicSchema['Views']> =
  PublicSchema['Views'][T]['Row']

export type Enums<T extends keyof PublicSchema['Enums']> =
  PublicSchema['Enums'][T]

// ============================================================
// TYPED ROW ALIASES (import directly instead of Tables<'...'>)
// ============================================================

export type Brand              = Tables<'brands'>
export type Profile            = Tables<'profiles'>
export type MembershipPackage  = Tables<'membership_packages'>
export type Membership         = Tables<'memberships'>
export type MembershipFreeze   = Tables<'membership_freezes'>
export type Invoice            = Tables<'invoices'>
export type PromoCode          = Tables<'promo_codes'>
export type Trainer            = Tables<'trainers'>
export type TrainerAvailability = Tables<'trainer_availability'>
export type TrainerSession     = Tables<'trainer_sessions'>
export type ClassType          = Tables<'class_types'>
export type Class              = Tables<'classes'>
export type ClassBooking       = Tables<'class_bookings'>
export type Checkin            = Tables<'checkins'>

// Insert aliases
export type BrandInsert              = TablesInsert<'brands'>
export type ProfileInsert            = TablesInsert<'profiles'>
export type MembershipPackageInsert  = TablesInsert<'membership_packages'>
export type MembershipInsert         = TablesInsert<'memberships'>
export type InvoiceInsert            = TablesInsert<'invoices'>
export type TrainerInsert            = TablesInsert<'trainers'>
export type TrainerSessionInsert     = TablesInsert<'trainer_sessions'>
export type ClassInsert              = TablesInsert<'classes'>
export type ClassBookingInsert       = TablesInsert<'class_bookings'>
export type CheckinInsert            = TablesInsert<'checkins'>

// View row aliases
export type ActiveMember             = Views<'v_active_members'>
export type DailyRevenue             = Views<'v_daily_revenue'>
export type ClassAttendanceSummary   = Views<'v_class_attendance_summary'>
export type TrainerCommissionSummary = Views<'v_trainer_commission_summary'>

// ============================================================
// JOINED / COMPOSED TYPES (useful for queries with .select())
// ============================================================

export type ProfileWithBrand = Profile & {
  brand: Pick<Brand, 'id' | 'name' | 'slug' | 'primary_color'> | null
}

export type MembershipWithPackage = Membership & {
  package: MembershipPackage
}

export type ClassWithType = Class & {
  class_type: ClassType
  instructor: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

export type ClassBookingWithClass = ClassBooking & {
  class: ClassWithType
}

export type TrainerWithProfile = Trainer & {
  profile: Pick<Profile, 'id' | 'full_name' | 'phone' | 'avatar_url'>
}

export type TrainerSessionWithParties = TrainerSession & {
  trainer: TrainerWithProfile
  member: Pick<Profile, 'id' | 'full_name' | 'phone'>
}
