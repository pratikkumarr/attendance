import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export function useRealtime() {
  const queryClient = useQueryClient()
  const [isConnected, setIsConnected] = useState(false)
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    const channel = supabase
      .channel('attendance_live_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subjects' },
        (payload) => {
          setLastEventAt(new Date())
          queryClient.invalidateQueries({ queryKey: ['subjects'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entries' },
        (payload) => {
          setLastEventAt(new Date())
          // Invalidate entries queries
          queryClient.invalidateQueries({ queryKey: ['entries'] })
          queryClient.invalidateQueries({ queryKey: ['users'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entry_history' },
        (payload) => {
          setLastEventAt(new Date())
          queryClient.invalidateQueries({ queryKey: ['history'] })
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return { isConnected, lastEventAt }
}
