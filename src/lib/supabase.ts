import { createClient } from '@supabase/supabase-js'

export interface SubjectRow {
  name: string
  total: number
  position: number
}

export interface EntryRow {
  user_name: string
  subject: string
  done: number
  attended: number
}

export interface EntryHistoryRow {
  id: number
  user_name: string
  subject: string
  done: number
  attended: number
  changed_at: string
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project-ref.supabase.co' &&
  !supabaseUrl.includes('your-project')
)

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
)
