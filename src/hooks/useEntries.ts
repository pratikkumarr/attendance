import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type EntryRow } from '@/lib/supabase'

export const ENTRIES_QUERY_KEY = (userName?: string) =>
  userName ? ['entries', userName] : ['entries']

export function useEntries(userName?: string) {
  return useQuery({
    queryKey: ENTRIES_QUERY_KEY(userName),
    queryFn: async (): Promise<EntryRow[]> => {
      let query = supabase.from('entries').select('*')
      if (userName) {
        query = query.eq('user_name', userName)
      }
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data as EntryRow[]) || []
    },
    enabled: userName === undefined || Boolean(userName),
    staleTime: 1000 * 60 * 5,
  })
}

export function useAllEntries() {
  return useEntries(undefined)
}

export function useUpdateEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      user_name,
      subject,
      done,
      attended,
    }: {
      user_name: string
      subject: string
      done: number
      attended: number
    }) => {
      const { data, error } = await supabase
        .from('entries')
        .upsert(
          {
            user_name,
            subject,
            done,
            attended,
          },
          { onConflict: 'user_name,subject' }
        )
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    // Optimistic updates for snappy UI
    onMutate: async (newEntry) => {
      await queryClient.cancelQueries({ queryKey: ['entries'] })

      const prevUserEntries = queryClient.getQueryData<EntryRow[]>(
        ENTRIES_QUERY_KEY(newEntry.user_name)
      )
      const prevAllEntries = queryClient.getQueryData<EntryRow[]>(ENTRIES_QUERY_KEY())

      // Optimistically update specific user cache
      if (prevUserEntries) {
        queryClient.setQueryData<EntryRow[]>(
          ENTRIES_QUERY_KEY(newEntry.user_name),
          prevUserEntries.map((e) =>
            e.subject === newEntry.subject ? { ...e, ...newEntry } : e
          )
        )
      }

      // Optimistically update all entries cache
      if (prevAllEntries) {
        queryClient.setQueryData<EntryRow[]>(
          ENTRIES_QUERY_KEY(),
          prevAllEntries.map((e) =>
            e.user_name === newEntry.user_name && e.subject === newEntry.subject
              ? { ...e, ...newEntry }
              : e
          )
        )
      }

      return { prevUserEntries, prevAllEntries }
    },
    onError: (_err, newEntry, context) => {
      if (context?.prevUserEntries) {
        queryClient.setQueryData(
          ENTRIES_QUERY_KEY(newEntry.user_name),
          context.prevUserEntries
        )
      }
      if (context?.prevAllEntries) {
        queryClient.setQueryData(ENTRIES_QUERY_KEY(), context.prevAllEntries)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ENTRIES_QUERY_KEY(variables.user_name) })
      queryClient.invalidateQueries({ queryKey: ENTRIES_QUERY_KEY() })
      queryClient.invalidateQueries({ queryKey: ['history'] })
    },
  })
}

export function useAddPerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userName,
      subjects,
    }: {
      userName: string
      subjects: { name: string }[]
    }) => {
      const rows = subjects.map((s) => ({
        user_name: userName,
        subject: s.name,
        done: 0,
        attended: 0,
      }))

      if (rows.length === 0) return []

      const { data, error } = await supabase.from('entries').insert(rows).select()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['history'] })
    },
  })
}
