import { useQuery } from '@tanstack/react-query'
import { supabase, type EntryHistoryRow } from '@/lib/supabase'

export const HISTORY_QUERY_KEY = (userName?: string, subject?: string) => [
  'history',
  userName || 'all',
  subject || 'all',
]

export function useHistory(userName?: string, subject?: string) {
  return useQuery({
    queryKey: HISTORY_QUERY_KEY(userName, subject),
    queryFn: async (): Promise<EntryHistoryRow[]> => {
      let query = supabase
        .from('entry_history')
        .select('*')
        .order('changed_at', { ascending: true })

      if (userName) {
        query = query.eq('user_name', userName)
      }
      if (subject) {
        query = query.eq('subject', subject)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data || []
    },
    staleTime: 1000 * 60 * 5,
  })
}
