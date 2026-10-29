import { useMemo } from 'react'
import { useAllEntries } from './useEntries'

export function useUsers() {
  const { data: entries, ...rest } = useAllEntries()

  const users = useMemo(() => {
    if (!entries) return []
    const distinct = Array.from(new Set(entries.map((e) => e.user_name)))
    return distinct.sort((a, b) => a.localeCompare(b))
  }, [entries])

  return { users, entries, ...rest }
}
