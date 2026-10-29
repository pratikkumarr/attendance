import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type SubjectRow } from '@/lib/supabase'

export const SUBJECTS_QUERY_KEY = ['subjects']

export function useSubjects() {
  return useQuery({
    queryKey: SUBJECTS_QUERY_KEY,
    queryFn: async (): Promise<SubjectRow[]> => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('position', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }
      return (data as SubjectRow[]) || []
    },
    staleTime: 1000 * 60 * 5, // 5 mins; refreshed via realtime
  })
}

export function useUpsertSubject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (subject: { name: string; total: number; position?: number }) => {
      const { data, error } = await supabase
        .from('subjects')
        .upsert(
          {
            name: subject.name,
            total: subject.total,
            position: subject.position ?? 0,
          },
          { onConflict: 'name' }
        )
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY })
    },
  })
}
