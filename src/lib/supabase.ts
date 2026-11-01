import { createClient } from '@supabase/supabase-js'

export interface SubjectRow {
  name: string
  total: number
  position: number
  course_code?: string | null
}

export interface EntryRow {
  user_name: string
  subject: string
  done: number
  attended: number
  total_classes?: number | null
}

export interface CyberVidyaSyncRow {
  user_name: string
  roll_number: string
  student_name?: string
  section_name?: string
  branch_name?: string
  last_synced_at: string
  status: 'synced' | 'error' | 'disconnected'
  synced_subjects_count?: number
}

export interface CyberVidyaSubjectMappingRow {
  id?: number
  user_name: string
  external_id: string
  course_code?: string
  course_name: string
  component_name?: string
  subject_name: string
  classes_done: number
  classes_attended: number
  last_synced_at: string
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
