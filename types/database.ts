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
          created_at: string
          currency: string
          expiry_reminder_days: number[]
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          owner_user_id: string | null
          primary_color: string
          pt_assignment_grace_days: number
          pt_sales_commission_enabled: boolean
          pt_sales_commission_percent: number
          secondary_color: string | null
          slug: string
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          expiry_reminder_days?: number[]
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          primary_color?: string
          pt_assignment_grace_days?: number
          pt_sales_commission_enabled?: boolean
          pt_sales_commission_percent?: number
          secondary_color?: string | null
          slug: string
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          expiry_reminder_days?: number[]
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          primary_color?: string
          pt_assignment_grace_days?: number
          pt_sales_commission_enabled?: boolean
          pt_sales_commission_percent?: number
          secondary_color?: string | null
          slug?: string
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      checkins: {
        Row: {
          brand_id: string
          checked_in_at: string
          id: string
          member_id: string
          membership_id: string | null
          method: Database["public"]["Enums"]["checkin_method"]
          notes: string | null
          staff_override: boolean | null
          warning_message: string | null
        }
        Insert: {
          brand_id: string
          checked_in_at?: string
          id?: string
          member_id: string
          membership_id?: string | null
          method?: Database["public"]["Enums"]["checkin_method"]
          notes?: string | null
          staff_override?: boolean | null
          warning_message?: string | null
        }
        Update: {
          brand_id?: string
          checked_in_at?: string
          id?: string
          member_id?: string
          membership_id?: string | null
          method?: Database["public"]["Enums"]["checkin_method"]
          notes?: string | null
          staff_override?: boolean | null
          warning_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_member_brand_fkey"
            columns: ["member_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "checkins_member_brand_fkey"
            columns: ["member_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "v_active_members"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "checkins_member_brand_fkey"
            columns: ["member_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "v_active_memberships"
            referencedColumns: ["member_id", "brand_id"]
          },
          {
            foreignKeyName: "checkins_member_brand_fkey"
            columns: ["member_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "v_expiry_report"
            referencedColumns: ["member_id", "brand_id"]
          },
          {
            foreignKeyName: "checkins_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_active_members"
            referencedColumns: ["membership_id"]
          },
          {
            foreignKeyName: "checkins_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_active_memberships"
            referencedColumns: ["membership_id"]
          },
          {
            foreignKeyName: "checkins_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_expiry_report"
            referencedColumns: ["membership_id"]
          },
        ]
      }
      class_bookings: {
        Row: {
          booked_at: string
          checked_in_at: string | null
          class_id: string
          id: string
          member_id: string
          status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          booked_at?: string
          checked_in_at?: string | null
          class_id: string
          id?: string
          member_id: string
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          booked_at?: string
          checked_in_at?: string | null
          class_id?: string
          id?: string
          member_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "class_bookings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_bookings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_attendance_summary"
            referencedColumns: ["class_id"]
          },
        ]
      }
      class_types: {
        Row: {
          brand_id: string
          color: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          brand_id: string
          color?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          brand_id?: string
          color?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_types_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          brand_id: string
          capacity: number
          class_type_id: string
          created_at: string
          duration_minutes: number
          id: string
          instructor_id: string | null
          room: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["class_status"]
          updated_at: string
        }
        Insert: {
          brand_id: string
          capacity?: number
          class_type_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          instructor_id?: string | null
          room?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["class_status"]
          updated_at?: string
        }
        Update: {
          brand_id?: string
          capacity?: number
          class_type_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          instructor_id?: string | null
          room?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["class_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_class_type_id_fkey"
            columns: ["class_type_id"]
            isOneToOne: false
            referencedRelation: "class_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_instructor_brand_fkey"
            columns: ["instructor_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "classes_instructor_brand_fkey"
            columns: ["instructor_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "v_active_members"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "classes_instructor_brand_fkey"
            columns: ["instructor_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "v_active_memberships"
            referencedColumns: ["member_id", "brand_id"]
          },
          {
            foreignKeyName: "classes_instructor_brand_fkey"
            columns: ["instructor_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "v_expiry_report"
            referencedColumns: ["member_id", "brand_id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          brand_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          permissions: Json
        }
        Insert: {
          brand_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          permissions?: Json
        }
        Update: {
          brand_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          permissions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          brand_id: string
          created_at: string
          currency: string
          gateway_ref: string | null
          id: string
          member_id: string
          membership_id: string | null
          notes: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          pt_credits_applied: number | null
          reference_number: string | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          brand_id: string
          created_at?: string
          currency?: string
          gateway_ref?: string | null
          id?: string
          member_id: string
          membership_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          pt_credits_applied?: number | null
          reference_number?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          brand_id?: string
          created_at?: string
          currency?: string
          gateway_ref?: string | null
          id?: string
          member_id?: string
          membership_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          pt_credits_applied?: number | null
          reference_number?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_member_brand_fkey"
            columns: ["member_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "invoices_member_brand_fkey"
            columns: ["member_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "v_active_members"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "invoices_member_brand_fkey"
            columns: ["member_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "v_active_memberships"
            referencedColumns: ["member_id", "brand_id"]
          },
          {
            foreignKeyName: "invoices_member_brand_fkey"
            columns: ["member_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "v_expiry_report"
            referencedColumns: ["member_id", "brand_id"]
          },
          {
            foreignKeyName: "invoices_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_active_members"
            referencedColumns: ["membership_id"]
          },
          {
            foreignKeyName: "invoices_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_active_memberships"
            referencedColumns: ["membership_id"]
          },
          {
            foreignKeyName: "invoices_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_expiry_report"
            referencedColumns: ["membership_id"]
          },
        ]
      }
      membership_freezes: {
        Row: {
          created_at: string
          created_by: string | null
          frozen_from: string
          frozen_until: string
          id: string
          membership_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          frozen_from: string
          frozen_until: string
          id?: string
          membership_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          frozen_from?: string
          frozen_until?: string
          id?: string
          membership_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_freezes_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_freezes_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_active_members"
            referencedColumns: ["membership_id"]
          },
          {
            foreignKeyName: "membership_freezes_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_active_memberships"
            referencedColumns: ["membership_id"]
          },
          {
            foreignKeyName: "membership_freezes_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_expiry_report"
            referencedColumns: ["membership_id"]
          },
        ]
      }
      membership_notifications: {
        Row: {
          days_before: number
          id: string
          membership_id: string
          sent_at: string
        }
        Insert: {
          days_before: number
          id?: string
          membership_id: string
          sent_at?: string
        }
        Update: {
          days_before?: number
          id?: string
          membership_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_notifications_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_notifications_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_active_members"
            referencedColumns: ["membership_id"]
          },
          {
            foreignKeyName: "membership_notifications_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_active_memberships"
            referencedColumns: ["membership_id"]
          },
          {
            foreignKeyName: "membership_notifications_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_expiry_report"
            referencedColumns: ["membership_id"]
          },
        ]
      }
      membership_packages: {
        Row: {
          allow_freeze: boolean
          brand_id: string
          created_at: string
          currency: string
          description: string | null
          duration_days: number | null
          gym_access_days: number | null
          id: string
          is_active: boolean
          max_freeze_days: number | null
          name: string
          package_category: string
          price: number
          pt_session_credits: number | null
          pt_session_expiry_days: number | null
          pt_sessions_included: number
          sales_commission_override_percent: number | null
          session_commission_amount: number | null
          session_credits: number | null
          type: Database["public"]["Enums"]["membership_type"]
          updated_at: string
        }
        Insert: {
          allow_freeze?: boolean
          brand_id: string
          created_at?: string
          currency?: string
          description?: string | null
          duration_days?: number | null
          gym_access_days?: number | null
          id?: string
          is_active?: boolean
          max_freeze_days?: number | null
          name: string
          package_category?: string
          price: number
          pt_session_credits?: number | null
          pt_session_expiry_days?: number | null
          pt_sessions_included?: number
          sales_commission_override_percent?: number | null
          session_commission_amount?: number | null
          session_credits?: number | null
          type: Database["public"]["Enums"]["membership_type"]
          updated_at?: string
        }
        Update: {
          allow_freeze?: boolean
          brand_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          duration_days?: number | null
          gym_access_days?: number | null
          id?: string
          is_active?: boolean
          max_freeze_days?: number | null
          name?: string
          package_category?: string
          price?: number
          pt_session_credits?: number | null
          pt_session_expiry_days?: number | null
          pt_sessions_included?: number
          sales_commission_override_percent?: number | null
          session_commission_amount?: number | null
          session_credits?: number | null
          type?: Database["public"]["Enums"]["membership_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_packages_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_reminders_sent: {
        Row: {
          id: string
          membership_id: string
          reminder_day: number | null
          reminder_type: string
          sent_at: string
        }
        Insert: {
          id?: string
          membership_id: string
          reminder_day?: number | null
          reminder_type: string
          sent_at?: string
        }
        Update: {
          id?: string
          membership_id?: string
          reminder_day?: number | null
          reminder_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_reminders_sent_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_reminders_sent_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_active_members"
            referencedColumns: ["membership_id"]
          },
          {
            foreignKeyName: "membership_reminders_sent_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_active_memberships"
            referencedColumns: ["membership_id"]
          },
          {
            foreignKeyName: "membership_reminders_sent_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_expiry_report"
            referencedColumns: ["membership_id"]
          },
        ]
      }
      memberships: {
        Row: {
          auto_renew: boolean
          brand_id: string
          created_at: string
          expires_at: string | null
          gym_access_expires_at: string | null
          gym_access_status: string
          id: string
          member_id: string
          package_category: string | null
          package_id: string
          pt_sessions_expires_at: string | null
          pt_sessions_remaining: number | null
          pt_sessions_status: string
          sessions_remaining: number | null
          starts_at: string
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          brand_id: string
          created_at?: string
          expires_at?: string | null
          gym_access_expires_at?: string | null
          gym_access_status?: string
          id?: string
          member_id: string
          package_category?: string | null
          package_id: string
          pt_sessions_expires_at?: string | null
          pt_sessions_remaining?: number | null
          pt_sessions_status?: string
          sessions_remaining?: number | null
          starts_at: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          brand_id?: string
          created_at?: string
          expires_at?: string | null
          gym_access_expires_at?: string | null
          gym_access_status?: string
          id?: string
          member_id?: string
          package_category?: string | null
          package_id?: string
          pt_sessions_expires_at?: string | null
          pt_sessions_remaining?: number | null
          pt_sessions_status?: string
          sessions_remaining?: number | null
          starts_at?: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_member_brand_fkey"
            columns: ["member_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "memberships_member_brand_fkey"
            columns: ["member_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "v_active_members"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "memberships_member_brand_fkey"
            columns: ["member_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "v_active_memberships"
            referencedColumns: ["member_id", "brand_id"]
          },
          {
            foreignKeyName: "memberships_member_brand_fkey"
            columns: ["member_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "v_expiry_report"
            referencedColumns: ["member_id", "brand_id"]
          },
          {
            foreignKeyName: "memberships_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "membership_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          brand_id: string | null
          created_at: string
          custom_role_id: string | null
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gender: string | null
          id: string
          is_active: boolean
          must_change_password: boolean
          phone: string | null
          profile_id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          brand_id?: string | null
          created_at?: string
          custom_role_id?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          gender?: string | null
          id: string
          is_active?: boolean
          must_change_password?: boolean
          phone?: string | null
          profile_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          brand_id?: string | null
          created_at?: string
          custom_role_id?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          phone?: string | null
          profile_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          brand_id: string
          code: string
          created_at: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          used_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          brand_id: string
          code: string
          created_at?: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          brand_id?: string
          code?: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          brand_id: string
          created_at: string
          grace_started_at: string | null
          id: string
          member_id: string
          membership_id: string
          notes: string | null
          released_at: string | null
          sales_commission_amount: number | null
          sales_commission_claimed: boolean
          sales_commission_percent: number | null
          status: string
          trainer_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          brand_id: string
          created_at?: string
          grace_started_at?: string | null
          id?: string
          member_id: string
          membership_id: string
          notes?: string | null
          released_at?: string | null
          sales_commission_amount?: number | null
          sales_commission_claimed?: boolean
          sales_commission_percent?: number | null
          status?: string
          trainer_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          brand_id?: string
          created_at?: string
          grace_started_at?: string | null
          id?: string
          member_id?: string
          membership_id?: string
          notes?: string | null
          released_at?: string | null
          sales_commission_amount?: number | null
          sales_commission_claimed?: boolean
          sales_commission_percent?: number | null
          status?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pt_assignments_assigned_by_brand_fkey"
            columns: ["assigned_by", "brand_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "pt_assignments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_assignments_member_brand_fkey"
            columns: ["member_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "pt_assignments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_assignments_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_commission_payouts: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          brand_id: string
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          payout_type: string
          period_end: string | null
          period_start: string | null
          pt_assignment_id: string | null
          status: string
          trainer_id: string
          trainer_session_id: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          brand_id: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payout_type: string
          period_end?: string | null
          period_start?: string | null
          pt_assignment_id?: string | null
          status?: string
          trainer_id: string
          trainer_session_id?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          brand_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payout_type?: string
          period_end?: string | null
          period_start?: string | null
          pt_assignment_id?: string | null
          status?: string
          trainer_id?: string
          trainer_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pt_commission_payouts_approved_by_brand_fkey"
            columns: ["approved_by", "brand_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "pt_commission_payouts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_commission_payouts_pt_assignment_id_fkey"
            columns: ["pt_assignment_id"]
            isOneToOne: false
            referencedRelation: "pt_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_commission_payouts_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_commission_payouts_trainer_session_id_fkey"
            columns: ["trainer_session_id"]
            isOneToOne: false
            referencedRelation: "trainer_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_log: {
        Row: {
          id: string
          invoice_id: string | null
          membership_id: string
          new_expiry_date: string
          previous_expiry: string
          renewed_at: string
        }
        Insert: {
          id?: string
          invoice_id?: string | null
          membership_id: string
          new_expiry_date: string
          previous_expiry: string
          renewed_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string | null
          membership_id?: string
          new_expiry_date?: string
          previous_expiry?: string
          renewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_log_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_log_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_active_members"
            referencedColumns: ["membership_id"]
          },
          {
            foreignKeyName: "renewal_log_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_active_memberships"
            referencedColumns: ["membership_id"]
          },
          {
            foreignKeyName: "renewal_log_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_expiry_report"
            referencedColumns: ["membership_id"]
          },
        ]
      }
      trainer_availability: {
        Row: {
          day_of_week: number
          end_time: string
          id: string
          is_recurring: boolean
          start_time: string
          trainer_id: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          id?: string
          is_recurring?: boolean
          start_time: string
          trainer_id: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: string
          is_recurring?: boolean
          start_time?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_availability_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_sessions: {
        Row: {
          brand_id: string
          commission_approved_at: string | null
          commission_approved_by: string | null
          commission_earned: number | null
          commission_status: string | null
          created_at: string
          duration_minutes: number
          id: string
          member_id: string
          membership_id: string | null
          notes: string | null
          pt_assignment_id: string | null
          scheduled_at: string
          session_commission_amount: number | null
          session_fee: number | null
          status: Database["public"]["Enums"]["session_status"]
          trainer_id: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          commission_approved_at?: string | null
          commission_approved_by?: string | null
          commission_earned?: number | null
          commission_status?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          member_id: string
          membership_id?: string | null
          notes?: string | null
          pt_assignment_id?: string | null
          scheduled_at: string
          session_commission_amount?: number | null
          session_fee?: number | null
          status?: Database["public"]["Enums"]["session_status"]
          trainer_id: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          commission_approved_at?: string | null
          commission_approved_by?: string | null
          commission_earned?: number | null
          commission_status?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          member_id?: string
          membership_id?: string | null
          notes?: string | null
          pt_assignment_id?: string | null
          scheduled_at?: string
          session_commission_amount?: number | null
          session_fee?: number | null
          status?: Database["public"]["Enums"]["session_status"]
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_sessions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_sessions_commission_approved_by_brand_fkey"
            columns: ["commission_approved_by", "brand_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "trainer_sessions_member_brand_fkey"
            columns: ["member_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "trainer_sessions_member_brand_fkey"
            columns: ["member_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "v_active_members"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "trainer_sessions_member_brand_fkey"
            columns: ["member_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "v_active_memberships"
            referencedColumns: ["member_id", "brand_id"]
          },
          {
            foreignKeyName: "trainer_sessions_member_brand_fkey"
            columns: ["member_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "v_expiry_report"
            referencedColumns: ["member_id", "brand_id"]
          },
          {
            foreignKeyName: "trainer_sessions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_sessions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_active_members"
            referencedColumns: ["membership_id"]
          },
          {
            foreignKeyName: "trainer_sessions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_active_memberships"
            referencedColumns: ["membership_id"]
          },
          {
            foreignKeyName: "trainer_sessions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "v_expiry_report"
            referencedColumns: ["membership_id"]
          },
          {
            foreignKeyName: "trainer_sessions_pt_assignment_id_fkey"
            columns: ["pt_assignment_id"]
            isOneToOne: false
            referencedRelation: "pt_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_sessions_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      trainers: {
        Row: {
          bio: string | null
          brand_id: string
          certifications: string[]
          commission_model: Database["public"]["Enums"]["commission_model"]
          commission_value: number
          created_at: string
          id: string
          is_active: boolean
          specialties: string[]
          updated_at: string
        }
        Insert: {
          bio?: string | null
          brand_id: string
          certifications?: string[]
          commission_model?: Database["public"]["Enums"]["commission_model"]
          commission_value?: number
          created_at?: string
          id: string
          is_active?: boolean
          specialties?: string[]
          updated_at?: string
        }
        Update: {
          bio?: string | null
          brand_id?: string
          certifications?: string[]
          commission_model?: Database["public"]["Enums"]["commission_model"]
          commission_value?: number
          created_at?: string
          id?: string
          is_active?: boolean
          specialties?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainers_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainers_id_brand_fkey"
            columns: ["id", "brand_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "trainers_id_brand_fkey"
            columns: ["id", "brand_id"]
            isOneToOne: false
            referencedRelation: "v_active_members"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "trainers_id_brand_fkey"
            columns: ["id", "brand_id"]
            isOneToOne: false
            referencedRelation: "v_active_memberships"
            referencedColumns: ["member_id", "brand_id"]
          },
          {
            foreignKeyName: "trainers_id_brand_fkey"
            columns: ["id", "brand_id"]
            isOneToOne: false
            referencedRelation: "v_expiry_report"
            referencedColumns: ["member_id", "brand_id"]
          },
        ]
      }
    }
    Views: {
      v_active_members: {
        Row: {
          auto_renew: boolean | null
          brand_id: string | null
          brand_name: string | null
          brand_slug: string | null
          currency: string | null
          days_until_expiry: number | null
          expires_at: string | null
          full_name: string | null
          gender: string | null
          id: string | null
          membership_id: string | null
          membership_status:
            | Database["public"]["Enums"]["membership_status"]
            | null
          package_name: string | null
          package_price: number | null
          package_type: Database["public"]["Enums"]["membership_type"] | null
          phone: string | null
          sessions_remaining: number | null
          starts_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      v_active_memberships: {
        Row: {
          auto_renew: boolean | null
          brand_id: string | null
          brand_name: string | null
          days_until_gym_expiry: number | null
          days_until_pt_expiry: number | null
          expires_at: string | null
          gym_access_expires_at: string | null
          gym_access_status: string | null
          member_id: string | null
          member_name: string | null
          member_phone: string | null
          membership_id: string | null
          membership_status:
            | Database["public"]["Enums"]["membership_status"]
            | null
          package_category: string | null
          package_name: string | null
          pt_sessions_expires_at: string | null
          pt_sessions_remaining: number | null
          pt_sessions_status: string | null
          starts_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      v_class_attendance_summary: {
        Row: {
          attended_count: number | null
          booked_count: number | null
          brand_id: string | null
          cancelled_count: number | null
          capacity: number | null
          class_id: string | null
          class_status: Database["public"]["Enums"]["class_status"] | null
          class_type_color: string | null
          class_type_name: string | null
          duration_minutes: number | null
          fill_rate_pct: number | null
          instructor_name: string | null
          no_show_count: number | null
          room: string | null
          scheduled_at: string | null
          total_bookings: number | null
          waitlist_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      v_daily_revenue: {
        Row: {
          avg_transaction: number | null
          brand_id: string | null
          currency: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          revenue_date: string | null
          total_amount: number | null
          transaction_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      v_expiry_report: {
        Row: {
          brand_id: string | null
          days_until_gym_expiry: number | null
          days_until_pt_expiry: number | null
          gym_access_expires_at: string | null
          gym_access_status: string | null
          is_gym_expiring_soon: boolean | null
          is_pt_expiring_before_gym: boolean | null
          is_pt_expiring_soon: boolean | null
          is_pt_sessions_low: boolean | null
          member_id: string | null
          member_name: string | null
          member_phone: string | null
          membership_id: string | null
          package_category: string | null
          package_name: string | null
          pt_sessions_expires_at: string | null
          pt_sessions_remaining: number | null
          pt_sessions_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pt_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          brand_id: string | null
          grace_started_at: string | null
          id: string | null
          member_avatar_url: string | null
          member_id: string | null
          member_name: string | null
          member_phone: string | null
          membership_id: string | null
          notes: string | null
          package_category: string | null
          package_name: string | null
          pt_sessions_expires_at: string | null
          pt_sessions_remaining: number | null
          released_at: string | null
          sales_commission_amount: number | null
          sales_commission_claimed: boolean | null
          status: string | null
          trainer_avatar_url: string | null
          trainer_id: string | null
          trainer_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pt_assignments_assigned_by_brand_fkey"
            columns: ["assigned_by", "brand_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "pt_assignments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_assignments_member_brand_fkey"
            columns: ["member_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "pt_assignments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_assignments_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      v_trainer_commission_summary: {
        Row: {
          brand_id: string | null
          period: string | null
          total_commission_all: number | null
          total_sales_commission_approved: number | null
          total_sales_commission_paid: number | null
          total_sales_commission_pending: number | null
          total_session_commission_approved: number | null
          total_session_commission_paid: number | null
          total_session_commission_pending: number | null
          total_sessions_completed: number | null
          trainer_id: string | null
          trainer_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pt_commission_payouts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_commission_payouts_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_auth_user_id_by_email: { Args: { p_email: string }; Returns: string }
      get_my_brand_id: { Args: never; Returns: string }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_brand_admin: { Args: never; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
    }
    Enums: {
      booking_status:
        | "booked"
        | "waitlisted"
        | "attended"
        | "cancelled"
        | "no_show"
      checkin_method: "qr" | "staff" | "gate"
      class_status: "scheduled" | "cancelled" | "completed"
      commission_model: "flat" | "percent" | "per_session"
      discount_type: "percent" | "fixed"
      invoice_status: "pending" | "paid" | "failed" | "refunded" | "cancelled"
      membership_status: "active" | "frozen" | "expired" | "cancelled"
      membership_type: "monthly" | "annual" | "sessions" | "day_pass"
      payment_method: "gateway" | "cash" | "transfer"
      session_status: "scheduled" | "completed" | "cancelled" | "no_show"
      subscription_plan: "starter" | "growth" | "enterprise"
      user_role:
        | "superadmin"
        | "admin"
        | "staff"
        | "trainer"
        | "member"
        | "support"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status: [
        "booked",
        "waitlisted",
        "attended",
        "cancelled",
        "no_show",
      ],
      checkin_method: ["qr", "staff", "gate"],
      class_status: ["scheduled", "cancelled", "completed"],
      commission_model: ["flat", "percent", "per_session"],
      discount_type: ["percent", "fixed"],
      invoice_status: ["pending", "paid", "failed", "refunded", "cancelled"],
      membership_status: ["active", "frozen", "expired", "cancelled"],
      membership_type: ["monthly", "annual", "sessions", "day_pass"],
      payment_method: ["gateway", "cash", "transfer"],
      session_status: ["scheduled", "completed", "cancelled", "no_show"],
      subscription_plan: ["starter", "growth", "enterprise"],
      user_role: [
        "superadmin",
        "admin",
        "staff",
        "trainer",
        "member",
        "support",
      ],
    },
  },
} as const
