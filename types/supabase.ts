export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      brands: {
        Row: {
          id: string
          name: string
          subdomain: string
          logo_url: string | null
          primary_color: string | null
          owner_id: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          subdomain: string
          logo_url?: string | null
          primary_color?: string | null
          owner_id: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['brands']['Insert']>
      }
      members: {
        Row: {
          id: string
          brand_id: string
          user_id: string | null
          full_name: string
          email: string | null
          phone: string
          gender: 'male' | 'female' | 'other'
          date_of_birth: string | null
          address: string | null
          emergency_contact: string | null
          qr_code: string
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['members']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['members']['Insert']>
      }
      packages: {
        Row: {
          id: string
          brand_id: string
          name: string
          description: string | null
          price: number
          duration_days: number
          visit_limit: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['packages']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['packages']['Insert']>
      }
      trainers: {
        Row: {
          id: string
          brand_id: string
          user_id: string | null
          full_name: string
          email: string | null
          phone: string
          specialization: string | null
          bio: string | null
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['trainers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['trainers']['Insert']>
      }
      checkins: {
        Row: {
          id: string
          brand_id: string
          member_id: string
          checked_in_at: string
          checked_out_at: string | null
          notes: string | null
          staff_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['checkins']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['checkins']['Insert']>
      }
      classes: {
        Row: {
          id: string
          brand_id: string
          name: string
          description: string | null
          trainer_id: string | null
          capacity: number
          duration_minutes: number
          scheduled_at: string
          is_cancelled: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['classes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['classes']['Insert']>
      }
      class_bookings: {
        Row: {
          id: string
          class_id: string
          member_id: string
          brand_id: string
          status: 'confirmed' | 'cancelled' | 'attended'
          booked_at: string
        }
        Insert: Omit<Database['public']['Tables']['class_bookings']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['class_bookings']['Insert']>
      }
      pt_sessions: {
        Row: {
          id: string
          brand_id: string
          trainer_id: string
          member_id: string
          scheduled_at: string
          duration_minutes: number
          status: 'scheduled' | 'completed' | 'cancelled'
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['pt_sessions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['pt_sessions']['Insert']>
      }
      member_packages: {
        Row: {
          id: string
          brand_id: string
          member_id: string
          package_id: string
          start_date: string
          end_date: string
          visits_used: number
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['member_packages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['member_packages']['Insert']>
      }
      payments: {
        Row: {
          id: string
          brand_id: string
          member_id: string
          amount: number
          payment_method: 'cash' | 'transfer' | 'card' | 'ewallet'
          reference: string | null
          notes: string | null
          paid_at: string
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
  }
}
