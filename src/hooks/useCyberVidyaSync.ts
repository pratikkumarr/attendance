/**
 * useCyberVidyaSync.ts — React Query Hooks for CyberVidya Attendance Synchronization
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  supabase,
  type SubjectRow,
  type EntryRow,
  type CyberVidyaSyncRow,
  type CyberVidyaSubjectMappingRow,
} from '@/lib/supabase'
import {
  executeAttendanceSync,
  calculateRemainingClasses,
} from '@/lib/cybervidya/sync'
import type {
  NormalizedAttendanceData,
  LocalSubjectRecord,
  SyncSummary,
} from '@/lib/cybervidya/types'

export const CYBERVIDYA_SYNC_QUERY_KEY = (userName: string) => ['cybervidya_sync', userName]

/**
 * Hook to retrieve persistent sync status and mappings for a specific student.
 */
export function useCyberVidyaStatus(userName?: string) {
  return useQuery({
    queryKey: userName ? CYBERVIDYA_SYNC_QUERY_KEY(userName) : ['cybervidya_sync'],
    queryFn: async (): Promise<{
      syncRecord: CyberVidyaSyncRow | null
      mappings: Record<string, string> // externalId -> subject_name
    }> => {
      if (!userName) {
        return { syncRecord: null, mappings: {} }
      }

      try {
        const { data: syncData, error: syncError } = await supabase
          .from('cybervidya_sync')
          .select('*')
          .eq('user_name', userName)
          .maybeSingle()

        if (syncError && syncError.code !== 'PGRST116') {
          // Table may not exist yet if migration hasn't been run
          console.warn('Could not read cybervidya_sync:', syncError.message)
        }

        const { data: mappingData, error: mappingError } = await supabase
          .from('cybervidya_subject_mappings')
          .select('*')
          .eq('user_name', userName)

        if (mappingError) {
          console.warn('Could not read cybervidya_subject_mappings:', mappingError.message)
        }

        const mappings: Record<string, string> = {}
        if (mappingData) {
          for (const m of mappingData as CyberVidyaSubjectMappingRow[]) {
            mappings[m.external_id] = m.subject_name
          }
        }

        return {
          syncRecord: (syncData as CyberVidyaSyncRow) || null,
          mappings,
        }
      } catch (err) {
        console.warn('Failed to query CyberVidya metadata from Supabase:', err)
        return { syncRecord: null, mappings: {} }
      }
    },
    enabled: Boolean(userName),
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Mutation that executes the sync logic and writes allowlisted attendance updates to Supabase.
 *
 * CRITICAL BUSINESS RULE:
 * Preserves user-configured Total Classes and never overwrites them.
 */
export function useApplyCyberVidyaSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userName,
      portalData,
      existingSubjects,
      existingEntries,
      existingMappings = {},
    }: {
      userName: string
      portalData: NormalizedAttendanceData
      existingSubjects: SubjectRow[]
      existingEntries: EntryRow[]
      existingMappings?: Record<string, string>
    }): Promise<SyncSummary> => {
      // 1. Build local subject records from existing database state
      const localRecords: LocalSubjectRecord[] = existingSubjects.map((s) => {
        const entry = existingEntries.find((e) => e.subject === s.name)
        const done = entry ? entry.done : 0
        const attended = entry ? entry.attended : 0
        // If entry has a personal total_classes, use that; otherwise use subjects.total
        const total = entry?.total_classes != null ? entry.total_classes : s.total > 0 ? s.total : null

        return {
          name: s.name,
          courseCode: s.course_code ?? null,
          totalClasses: total,
          classesDone: done,
          classesAttended: attended,
          remainingClasses: calculateRemainingClasses(total, done),
        }
      })

      // 2. Execute sync algorithm (merging with strict allowlist)
      const summary = executeAttendanceSync({
        userName,
        existingSubjects: localRecords,
        existingMappings,
        portalData,
      })

      // 3. Persist brand-new subjects into `subjects` table
      // CRITICAL RULE: total is set to 0 (requiring manual config), never initialized from CyberVidya!
      const newSubjectResults = summary.subjects.filter((s) => s.isNew)
      if (newSubjectResults.length > 0) {
        const maxPos =
          existingSubjects.length > 0
            ? Math.max(...existingSubjects.map((s) => s.position))
            : 0

        for (let i = 0; i < newSubjectResults.length; i++) {
          const res = newSubjectResults[i]
          if (!res) continue
          const newName = res.updatedSubject.name

          // Insert into subjects table if not already present
          const alreadyExists = existingSubjects.some(
            (s) => s.name.toLowerCase() === newName.toLowerCase(),
          )
          if (!alreadyExists) {
            const newPayload: Record<string, any> = {
              name: newName,
              total: 0, // Unset — student will configure manually
              position: maxPos + i + 1,
            }
            if (res.updatedSubject.courseCode) {
              newPayload.course_code = res.updatedSubject.courseCode
            }
            const { error: insErr } = await supabase
              .from('subjects')
              .upsert(newPayload, { onConflict: 'name' })

            if (insErr && insErr.message.includes('course_code')) {
              delete newPayload.course_code
              await supabase.from('subjects').upsert(newPayload, { onConflict: 'name' })
            }
          }
        }
      }

      // 4. Update entries with allowlisted portal values (done and attended only)
      for (const res of summary.subjects) {
        const subjectName = res.updatedSubject.name
        const done = res.updatedSubject.classesDone
        const attended = res.updatedSubject.classesAttended

        // Explicit allowlist update: ONLY done and attended are updated.
        // total_classes or total is NEVER overwritten by CyberVidya sync!
        const existingEntry = existingEntries.find((e) => e.subject === subjectName)
        const updatePayload: Record<string, any> = {
          user_name: userName,
          subject: subjectName,
          done,
          attended,
        }

        // If existingEntry has a total_classes value, explicitly preserve it
        if (existingEntry && existingEntry.total_classes != null) {
          updatePayload.total_classes = existingEntry.total_classes
        }

        const { error: entryErr } = await supabase
          .from('entries')
          .upsert(updatePayload, { onConflict: 'user_name,subject' })

        if (entryErr) {
          console.warn(`Failed to update entry for ${subjectName}:`, entryErr.message)
        }
      }

      // 5. Persist sync metadata into `cybervidya_sync` table (if table exists)
      try {
        await supabase.from('cybervidya_sync').upsert(
          {
            user_name: userName,
            roll_number: portalData.student.rollNumber,
            student_name: portalData.student.fullName,
            section_name: portalData.student.sectionName || null,
            branch_name: portalData.student.branch || null,
            last_synced_at: summary.syncedAt,
            status: 'synced',
            synced_subjects_count: summary.totalSyncedSubjects,
          },
          { onConflict: 'user_name' },
        )
      } catch (err) {
        console.warn('Could not save to cybervidya_sync table:', err)
      }

      // 6. Persist stable external ID mappings into `cybervidya_subject_mappings` table
      try {
        const mappingRows = summary.subjects
          .filter((res) => res.updatedSubject.externalId)
          .map((res) => {
            const portalSub = portalData.subjects.find(
              (p) => p.externalId === res.updatedSubject.externalId,
            )
            return {
              user_name: userName,
              external_id: res.updatedSubject.externalId!,
              course_code: portalSub?.courseCode || null,
              course_name: portalSub?.courseName || res.updatedSubject.name,
              component_name: portalSub?.componentName || null,
              subject_name: res.updatedSubject.name,
              classes_done: res.updatedSubject.classesDone,
              classes_attended: res.updatedSubject.classesAttended,
              last_synced_at: summary.syncedAt,
            }
          })

        if (mappingRows.length > 0) {
          await supabase
            .from('cybervidya_subject_mappings')
            .upsert(mappingRows, { onConflict: 'user_name,external_id' })
        }
      } catch (err) {
        console.warn('Could not save to cybervidya_subject_mappings table:', err)
      }

      return summary
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries to trigger immediate live UI refresh
      queryClient.invalidateQueries({ queryKey: ['entries', variables.userName] })
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      queryClient.invalidateQueries({ queryKey: ['history'] })
      queryClient.invalidateQueries({ queryKey: CYBERVIDYA_SYNC_QUERY_KEY(variables.userName) })
    },
  })
}

/**
 * Mutation to disconnect CyberVidya synchronization.
 * Requirement 9: Disconnecting CyberVidya must NOT delete existing attendance records,
 * reset manually configured totals, or log the user out of the existing website.
 */
export function useDisconnectCyberVidya() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userName: string) => {
      try {
        // Mark status as disconnected
        await supabase
          .from('cybervidya_sync')
          .update({ status: 'disconnected' })
          .eq('user_name', userName)

        // Clear mappings
        await supabase
          .from('cybervidya_subject_mappings')
          .delete()
          .eq('user_name', userName)
      } catch (err) {
        console.warn('Error during disconnect:', err)
      }
    },
    onSuccess: (_, userName) => {
      queryClient.invalidateQueries({ queryKey: CYBERVIDYA_SYNC_QUERY_KEY(userName) })
    },
  })
}
