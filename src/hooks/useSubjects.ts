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
    mutationFn: async (subject: {
      name: string
      total: number
      position?: number
      course_code?: string | null
    }) => {
      const payload: Record<string, any> = {
        name: subject.name,
        total: subject.total,
        position: subject.position ?? 0,
      }
      if (subject.course_code !== undefined) {
        payload.course_code = subject.course_code ? subject.course_code.trim().toUpperCase() : null
      }

      let { data, error } = await supabase
        .from('subjects')
        .upsert(payload, { onConflict: 'name' })
        .select()
        .single()

      // If the remote table does not yet have course_code column (migration pending), retry without it
      if (error && error.message.includes('course_code')) {
        delete payload.course_code
        const retry = await supabase
          .from('subjects')
          .upsert(payload, { onConflict: 'name' })
          .select()
          .single()
        if (retry.error) throw new Error(retry.error.message)
        data = retry.data
      } else if (error) {
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY })
    },
  })
}
