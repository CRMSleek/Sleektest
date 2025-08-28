import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password: string
          name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password: string
          name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password?: string
          name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      businesses: {
        Row: {
          id: string
          name: string | null
          description: string | null
          created_at: string
          updated_at: string
          email: string | null
          website: string | null
          phone: string | null
          address: string | null
          user_id: string
        }
        Insert: {
          id?: string
          name?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
          email?: string | null
          website?: string | null
          phone?: string | null
          address?: string | null
          user_id: string
        }
        Update: {
          id?: string
          name?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
          email?: string | null
          website?: string | null
          phone?: string | null
          address?: string | null
          user_id?: string
        }
      }
      customers: {
        Row: {
          id: string
          age: number | null
          email: string | null
          name: string | null
          phone: string | null
          data: any | null
          location: string | null
          notes: string | null
          created_at: string
          updated_at: string
          business_id: string
        }
        Insert: {
          id?: string
          age?: number | null
          email?: string | null
          name?: string | null
          phone?: string | null
          data?: any | null
          location?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          business_id: string
        }
        Update: {
          id?: string
          age?: number | null
          email?: string | null
          name?: string | null
          phone?: string | null
          data?: any | null
          location?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          business_id?: string
        }
      }
      surveys: {
        Row: {
          id: string
          title: string
          description: string | null
          questions: any
          is_active: boolean
          times_opened: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          questions: any
          is_active?: boolean
          times_opened?: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          questions?: any
          is_active?: boolean
          times_opened?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
      }
      survey_responses: {
        Row: {
          id: string
          answers: any
          created_at: string
          submitted_at: string
          survey_id: string
          business_id: string
          customer_id: string | null
          customer_email: string | null
          customer_name: string | null
        }
        Insert: {
          id?: string
          answers: any
          created_at?: string
          submitted_at?: string
          survey_id: string
          business_id: string
          customer_id?: string | null
          customer_email?: string | null
          customer_name?: string | null
        }
        Update: {
          id?: string
          answers?: any
          created_at?: string
          submitted_at?: string
          survey_id?: string
          business_id?: string
          customer_id?: string | null
          customer_email?: string | null
          customer_name?: string | null
        }
      }
    }
  }
}
