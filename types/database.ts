export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      brands: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          primary_color: string
          secondary_color: string | null
          owner_user_id: string | null
          subscription_plan: Database['public']['Enums']['subscription_plan']
          is_active: boolean
          timezone: string | null
          currency: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string | null
          owner_user_id?: string | null
          subscription_plan?: Database['public']['Enums']['subscription_plan']
          is_active?: boolean
          timezone?: string | null
          currency?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string | null
          owner_user_id?: string | null
          subscription_plan?: Database['public']['Enums']['subscription_plan']
          is_active?: boolean
          timezone?: string | null
          currency?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          brand_id: string | null
          role: Database['public']['Enums']['user_role']
          full_name: string
          phone: string | null
          avatar_url: string | null
          date_of_birth: string | null
          gender: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          custom_role_id: string | null
          must_change_password: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          brand_id?: string | null
          role?: Database['public']['Enums']['user_role']
          full_name: string
          phone?: string | null
          avatar_url?: string | null
          date_of_birth?: string | null
          gender?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          custom_role_id?: string | null
          must_change_password?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string | null
          role?: Database['public']['Enums']['user_role']
          full_name?: string
          phone?: string | null
          avatar_url?: string | null
          date_of_birth?: string | null
          gender?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          custom_role_id?: string | null
          must_change_password?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_brand_id_fkey'
            columns: ['brand_id']
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profiles_custom_role_id_fkey'
            columns: ['custom_role_id']
            referencedRelation: 'custom_roles'
            referencedColumns: ['id']
          },
        ]
      }
      custom_roles: {
        Row: {
          id: string
          brand_id: string
          name: string
          permissions: Json
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          name: string
          permissions?: Json
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          name?: string
          permissions?: Json
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'custom_roles_brand_id_fkey'
            columns: ['brand_id']
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
        ]
      }
      membership_packages: {
        Row: {
          id: string
          brand_id: string
          name: string
          description: string | null
          type: Database['public']['Enums']['membership_type']
          duration_days: number | null
          session_credits: number | null
          pt_sessions_included: number
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
          type: Database['public']['Enums']['membership_type']
          duration_days?: number | null
          session_credits?: number | null
          pt_sessions_included?: number
          price: number
          currency?: string
          is_active?: boolean
          allow_freeze?: boolean
          max_freeze_days?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          name?: string
          description?: string | null
          type?: Database['public']['Enums']['membership_type']
          duration_days?: number | null
          session_credits?: number | null
          pt_sessions_included?: number
          price?: number
          currency?: string
          is_active?: boolean
          allow_freeze?: boolean
          max_freeze_days?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'membership_packages_brand_id_fkey'
            columns: ['brand_id']
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
        ]
      }
      memberships: {
        Row: {
          id: string
          brand_id: string
          member_id: string
          package_id: string
          status: Database['public']['Enums']['membership_status']
          starts_at: string
          expires_at: string | null
          sessions_remaining: number | null
          pt_sessions_remaining: number | null
          auto_renew: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          member_id: string
          package_id: string
          status?: Database['public']['Enums']['membership_status']
          starts_at: string
          expires_at?: string | null
          sessions_remaining?: number | null
          pt_sessions_remaining?: number | null
          auto_renew?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          member_id?: string
          package_id?: string
          status?: Database['public']['Enums']['membership_status']
          starts_at?: string
          expires_at?: string | null
          sessions_remaining?: number | null
          pt_sessions_remaining?: number | null
          auto_renew?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'memberships_brand_id_fkey'
            columns: ['brand_id']
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'memberships_member_id_fkey'
            columns: ['member_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'memberships_package_id_fkey'
            columns: ['package_id']
            referencedRelation: 'membership_packages'
            referencedColumns: ['id']
          },
        ]
      }
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
        Update: {
          id?: string
          membership_id?: string
          frozen_from?: string
          frozen_until?: string
          reason?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'membership_freezes_membership_id_fkey'
            columns: ['membership_id']
            referencedRelation: 'memberships'
            referencedColumns: ['id']
          },
        ]
      }
      invoices: {
        Row: {
          id: string
          brand_id: string
          member_id: string
          membership_id: string | null
          amount: number
          currency: string
          status: Database['public']['Enums']['invoice_status']
          payment_method: Database['public']['Enums']['payment_method'] | null
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
          status?: Database['public']['Enums']['invoice_status']
          payment_method?: Database['public']['Enums']['payment_method'] | null
          gateway_ref?: string | null
          notes?: string | null
          created_at?: string
          paid_at?: string | null
        }
        Update: {
          id?: string
          brand_id?: string
          member_id?: string
          membership_id?: string | null
          amount?: number
          currency?: string
          status?: Database['public']['Enums']['invoice_status']
          payment_method?: Database['public']['Enums']['payment_method'] | null
          gateway_ref?: string | null
          notes?: string | null
          created_at?: string
          paid_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'invoices_brand_id_fkey'
            columns: ['brand_id']
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_member_id_fkey'
            columns: ['member_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_membership_id_fkey'
            columns: ['membership_id']
            referencedRelation: 'memberships'
            referencedColumns: ['id']
          },
        ]
      }
      promo_codes: {
        Row: {
          id: string
          brand_id: string
          code: string
          discount_type: Database['public']['Enums']['discount_type']
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
          discount_type: Database['public']['Enums']['discount_type']
          discount_value: number
          max_uses?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          code?: string
          discount_type?: Database['public']['Enums']['discount_type']
          discount_value?: number
          max_uses?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'promo_codes_brand_id_fkey'
            columns: ['brand_id']
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
        ]
      }
      trainers: {
        Row: {
          id: string
          brand_id: string
          bio: string | null
          specialties: string[]
          certifications: string[]
          commission_model: Database['public']['Enums']['commission_model']
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
          commission_model?: Database['public']['Enums']['commission_model']
          commission_value?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          bio?: string | null
          specialties?: string[]
          certifications?: string[]
          commission_model?: Database['public']['Enums']['commission_model']
          commission_value?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'trainers_brand_id_fkey'
            columns: ['brand_id']
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trainers_id_fkey'
            columns: ['id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
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
        Update: {
          id?: string
          trainer_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_recurring?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'trainer_availability_trainer_id_fkey'
            columns: ['trainer_id']
            referencedRelation: 'trainers'
            referencedColumns: ['id']
          },
        ]
      }
      trainer_sessions: {
        Row: {
          id: string
          brand_id: string
          trainer_id: string
          member_id: string
          membership_id: string | null
          scheduled_at: string
          duration_minutes: number
          status: Database['public']['Enums']['session_status']
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
          membership_id?: string | null
          scheduled_at: string
          duration_minutes?: number
          status?: Database['public']['Enums']['session_status']
          notes?: string | null
          session_fee?: number | null
          commission_earned?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          trainer_id?: string
          member_id?: string
          membership_id?: string | null
          scheduled_at?: string
          duration_minutes?: number
          status?: Database['public']['Enums']['session_status']
          notes?: string | null
          session_fee?: number | null
          commission_earned?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'trainer_sessions_brand_id_fkey'
            columns: ['brand_id']
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trainer_sessions_trainer_id_fkey'
            columns: ['trainer_id']
            referencedRelation: 'trainers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trainer_sessions_member_id_fkey'
            columns: ['member_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trainer_sessions_membership_id_fkey'
            columns: ['membership_id']
            referencedRelation: 'memberships'
            referencedColumns: ['id']
          },
        ]
      }
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
        Update: {
          id?: string
          brand_id?: string
          name?: string
          description?: string | null
          color?: string
          icon?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'class_types_brand_id_fkey'
            columns: ['brand_id']
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
        ]
      }
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
          status: Database['public']['Enums']['class_status']
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
          status?: Database['public']['Enums']['class_status']
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          class_type_id?: string
          instructor_id?: string | null
          room?: string | null
          capacity?: number
          duration_minutes?: number
          scheduled_at?: string
          status?: Database['public']['Enums']['class_status']
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'classes_brand_id_fkey'
            columns: ['brand_id']
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classes_class_type_id_fkey'
            columns: ['class_type_id']
            referencedRelation: 'class_types'
            referencedColumns: ['id']
          },
        ]
      }
      class_bookings: {
        Row: {
          id: string
          class_id: string
          member_id: string
          status: Database['public']['Enums']['booking_status']
          booked_at: string
          checked_in_at: string | null
        }
        Insert: {
          id?: string
          class_id: string
          member_id: string
          status?: Database['public']['Enums']['booking_status']
          booked_at?: string
          checked_in_at?: string | null
        }
        Update: {
          id?: string
          class_id?: string
          member_id?: string
          status?: Database['public']['Enums']['booking_status']
          booked_at?: string
          checked_in_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'class_bookings_class_id_fkey'
            columns: ['class_id']
            referencedRelation: 'classes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'class_bookings_member_id_fkey'
            columns: ['member_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      checkins: {
        Row: {
          id: string
          brand_id: string
          member_id: string
          membership_id: string | null
          method: Database['public']['Enums']['checkin_method']
          checked_in_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          brand_id: string
          member_id: string
          membership_id?: string | null
          method?: Database['public']['Enums']['checkin_method']
          checked_in_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          brand_id?: string
          member_id?: string
          membership_id?: string | null
          method?: Database['public']['Enums']['checkin_method']
          checked_in_at?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'checkins_brand_id_fkey'
            columns: ['brand_id']
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'checkins_member_id_fkey'
            columns: ['member_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_brand_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: Database['public']['Enums']['user_role']
      }
      is_superadmin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: 'superadmin' | 'admin' | 'staff' | 'trainer' | 'member' | 'support'
      subscription_plan: 'starter' | 'growth' | 'enterprise'
      membership_type: 'monthly' | 'annual' | 'sessions' | 'day_pass'
      membership_status: 'active' | 'frozen' | 'expired' | 'cancelled'
      invoice_status: 'pending' | 'paid' | 'failed' | 'refunded'
      payment_method: 'gateway' | 'cash' | 'transfer'
      discount_type: 'percent' | 'fixed'
      commission_model: 'flat' | 'percent' | 'per_session'
      session_status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
      class_status: 'scheduled' | 'cancelled' | 'completed'
      booking_status: 'booked' | 'waitlisted' | 'attended' | 'cancelled' | 'no_show'
      checkin_method: 'qr' | 'staff' | 'gate'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'] & Database['public']['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database['public']['Tables'] &
        Database['public']['Views'])
    ? (Database['public']['Tables'] &
        Database['public']['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database['public']['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof Database['public']['Enums']
    ? Database['public']['Enums'][PublicEnumNameOrOptions]
    : never
