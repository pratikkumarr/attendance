import { SubjectClassMapping, SkippableCalculation } from '@/types/bunkbook'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const STORAGE_KEY = 'bunkbook_subject_mappings_v2'
const ADMIN_SESSION_KEY = 'bunkbook_admin_authenticated'

export const normalizeSubjectCode = (code: string): string => {
  if (!code) return ''
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

// Initial default KIET subjects with fixed static total classes (for all students)
export const DEFAULT_SUBJECT_MAPPINGS: Record<string, SubjectClassMapping> = {
  // Real Active KIET Curriculum Subjects (matching Supabase Cloud DB)
  CS310L: {
    subjectCode: 'CS310L',
    subjectName: 'Theory of Computation',
    totalClasses: 49,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Admin (System)',
    isNewlyDiscovered: false,
  },
  IT401B: {
    subjectCode: 'IT401B',
    subjectName: 'Advanced Databases',
    totalClasses: 59,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Admin (System)',
    isNewlyDiscovered: false,
  },
  CS305E: {
    subjectCode: 'CS305E',
    subjectName: 'Professional Elective',
    totalClasses: 74,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Admin (System)',
    isNewlyDiscovered: false,
  },
  CS311L: {
    subjectCode: 'CS311L',
    subjectName: 'Software Engineering',
    totalClasses: 35,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Admin (System)',
    isNewlyDiscovered: false,
  },
  CS312B: {
    subjectCode: 'CS312B',
    subjectName: 'Deep Learning',
    totalClasses: 63,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Admin (System)',
    isNewlyDiscovered: false,
  },
  HS203L: {
    subjectCode: 'HS203L',
    subjectName: 'Aptitude - 3',
    totalClasses: 30,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Admin (System)',
    isNewlyDiscovered: false,
  },
  HS204L: {
    subjectCode: 'HS204L',
    subjectName: 'Soft Skills',
    totalClasses: 26,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Admin (System)',
    isNewlyDiscovered: false,
  },
  CS313P: {
    subjectCode: 'CS313P',
    subjectName: 'Problem Solving',
    totalClasses: 61,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Admin (System)',
    isNewlyDiscovered: false,
  },
  CS311P: {
    subjectCode: 'CS311P',
    subjectName: 'Software Engg Lab',
    totalClasses: 24,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Admin (System)',
    isNewlyDiscovered: false,
  },
  IT304P: {
    subjectCode: 'IT304P',
    subjectName: 'Project Internship',
    totalClasses: 0,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Admin (System)',
    isNewlyDiscovered: false,
  },
  CS337E: {
    subjectCode: 'CS337E',
    subjectName: 'AWS Cloud Architecture and Data Engineering (BLENDED)',
    totalClasses: 74,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Admin (System)',
    isNewlyDiscovered: false,
  },

  // Standard & Test Reference KIET Subjects
  KCS501: {
    subjectCode: 'KCS501',
    subjectName: 'Database Management Systems',
    totalClasses: 44, // Fixed total classes for all students
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Admin (System)',
    isNewlyDiscovered: false,
  },
  KCS502: {
    subjectCode: 'KCS502',
    subjectName: 'Compiler Design',
    totalClasses: 42,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Admin (System)',
    isNewlyDiscovered: false,
  },
  KCS503: {
    subjectCode: 'KCS503',
    subjectName: 'Design and Analysis of Algorithms',
    totalClasses: 40,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Admin (System)',
    isNewlyDiscovered: false,
  },
  KIT051: {
    subjectCode: 'KIT051',
    subjectName: 'Web Technology',
    totalClasses: 38,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Admin (System)',
    isNewlyDiscovered: false,
  },
  KNC501: {
    subjectCode: 'KNC501',
    subjectName: 'Constitution of India, Law & Engineering',
    totalClasses: 30,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Admin (System)',
    isNewlyDiscovered: false,
  },
  KCS551: {
    subjectCode: 'KCS551',
    subjectName: 'DBMS Lab',
    totalClasses: 14,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Admin (System)',
    isNewlyDiscovered: false,
  },
  KCS552: {
    subjectCode: 'KCS552',
    subjectName: 'DAA Lab',
    totalClasses: 14,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Admin (System)',
    isNewlyDiscovered: false,
  },
  KCS553: {
    subjectCode: 'KCS553',
    subjectName: 'Mini Project Lab',
    totalClasses: 12,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Admin (System)',
    isNewlyDiscovered: false,
  },
}

// In-memory cache & listeners
type MappingChangeListener = () => void
const listeners: Set<MappingChangeListener> = new Set()

export const subscribeSubjectMappings = (listener: MappingChangeListener): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener()
    } catch (e) {
      console.error('Error in subject mapping listener:', e)
    }
  })
}

// Load mappings from localStorage or fallback
export const getSubjectMappings = (): Record<string, SubjectClassMapping> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (err) {
    console.warn('Could not read subject mappings from localStorage:', err)
  }
  const initial = { ...DEFAULT_SUBJECT_MAPPINGS }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
  } catch {
    // ignore
  }
  return initial
}

// Save mappings to localStorage
export const saveSubjectMappings = (mappings: Record<string, SubjectClassMapping>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings))
  } catch (err) {
    console.error('Failed to save subject mappings to localStorage:', err)
  }
  notifyListeners()
}

/**
 * Fetch static subject totals directly from Supabase Cloud DB (subjects table).
 * This ensures all students and devices always use the Admin's permanent static values.
 */
export const fetchSubjectMappingsFromSupabase = async (): Promise<Record<string, SubjectClassMapping>> => {
  if (!isSupabaseConfigured) {
    return getSubjectMappings()
  }

  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('name, total, position, course_code')
      .order('position', { ascending: true })

    if (error) {
      console.warn('Error fetching subjects from Supabase:', error.message)
      return getSubjectMappings()
    }

    if (data && Array.isArray(data) && data.length > 0) {
      const all = getSubjectMappings()

      data.forEach((row) => {
        const normCode = normalizeSubjectCode(row.course_code || row.name)
        if (!normCode) return

        all[normCode] = {
          subjectCode: normCode,
          subjectName: row.name,
          totalClasses: Number(row.total) || 0,
          lastUpdated: new Date().toISOString(),
          updatedBy: 'Admin (Supabase Cloud)',
          isNewlyDiscovered: false,
        }

        // Also index by normalized subject name for resilient matching
        const normName = normalizeSubjectCode(row.name)
        if (normName && normName !== normCode && !all[normName]) {
          all[normName] = all[normCode]
        }
      })

      saveSubjectMappings(all)
      return all
    }
  } catch (err) {
    console.warn('Failed to connect to Supabase for subject mappings:', err)
  }

  return getSubjectMappings()
}

/**
 * Auto-discovery function:
 * Called whenever a user logs in or courses are loaded.
 * 
 * CRITICAL RULE:
 * Total classes set by Admin are STATIC and PERMANENT!
 * Student login or attendance fetch MUST NEVER overwrite or mutate totalClasses!
 */
export const registerUserCourses = (
  courses: { courseCode: string; courseName: string; totalLecture?: number }[],
) => {
  if (!courses || courses.length === 0) return

  const all = getSubjectMappings()
  let hasChanges = false

  courses.forEach((c) => {
    const norm = normalizeSubjectCode(c.courseCode)
    if (!norm) return

    const conducted = c.totalLecture || 0

    if (!all[norm]) {
      // Brand new subject discovered! Default to 40 and flag for Admin review
      all[norm] = {
        subjectCode: norm,
        subjectName: c.courseName || norm,
        totalClasses: Math.max(40, conducted),
        lastUpdated: new Date().toISOString(),
        updatedBy: 'Discovered from Student Login',
        isNewlyDiscovered: true,
        discoveredAt: new Date().toISOString(),
      }
      hasChanges = true
    } else {
      // Subject already exists: DO NOT OVERWRITE totalClasses!
      // Total classes configured by Admin is static and permanently preserved.
      if (!all[norm].subjectName && c.courseName) {
        all[norm] = {
          ...all[norm],
          subjectName: c.courseName,
        }
        hasChanges = true
      }
    }
  })

  if (hasChanges) {
    saveSubjectMappings(all)
  }
}

// Get or auto-register mapping for a course code with fuzzy name fallback
export const getMappingForCourse = (courseCode: string, courseName?: string): SubjectClassMapping => {
  const norm = normalizeSubjectCode(courseCode)
  const all = getSubjectMappings()

  // 1. Direct match by normalized course code
  if (norm && all[norm]) {
    return all[norm]
  }

  // 2. Resilient match by course name
  if (courseName) {
    const normName = normalizeSubjectCode(courseName)
    const matchedByName = Object.values(all).find(
      (m) =>
        normalizeSubjectCode(m.subjectName) === normName ||
        normalizeSubjectCode(m.subjectCode) === normName ||
        (norm && normalizeSubjectCode(m.subjectName).includes(norm)),
    )

    if (matchedByName) {
      if (norm) {
        all[norm] = { ...matchedByName, subjectCode: norm }
        saveSubjectMappings(all)
      }
      return matchedByName
    }
  }

  // 3. Fallback to default
  const newMapping: SubjectClassMapping = {
    subjectCode: norm || courseCode || 'UNKNOWN',
    subjectName: courseName || courseCode || 'Unknown Subject',
    totalClasses: 40,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'Auto-Discovered',
    isNewlyDiscovered: true,
    discoveredAt: new Date().toISOString(),
  }

  if (norm) {
    all[norm] = newMapping
    saveSubjectMappings(all)
  }

  return newMapping
}

/**
 * Admin API: Edit total number of classes for a subject.
 * This totalClasses is fixed for all students taking this subject.
 */
export const updateSubjectTotalClasses = (
  subjectCode: string,
  totalClasses: number,
  adminName = 'Admin',
) => {
  const norm = normalizeSubjectCode(subjectCode)
  if (!norm) return

  const all = getSubjectMappings()
  const existing = all[norm] || {
    subjectCode: norm,
    subjectName: norm,
    totalClasses: 40,
  }

  all[norm] = {
    ...existing,
    totalClasses: Math.max(1, Math.round(totalClasses)),
    lastUpdated: new Date().toISOString(),
    updatedBy: adminName,
    isNewlyDiscovered: false, // cleared once edited/reviewed by admin
  }

  saveSubjectMappings(all)
}

/**
 * Save all subject mappings permanently to Supabase Cloud DB.
 */
export const saveAllSubjectMappingsToSupabase = async (
  mappings: Record<string, SubjectClassMapping>,
  adminName = 'Admin',
): Promise<{ success: boolean; count: number; error?: string }> => {
  saveSubjectMappings(mappings)

  if (!isSupabaseConfigured) {
    return { success: true, count: Object.keys(mappings).length }
  }

  let successCount = 0

  try {
    const { data: currentDbSubjects } = await supabase.from('subjects').select('*')
    const existingList = currentDbSubjects || []

    for (const m of Object.values(mappings)) {
      const norm = normalizeSubjectCode(m.subjectCode)
      const total = Math.max(0, Math.round(m.totalClasses))

      const match = existingList.find(
        (s) =>
          (s.course_code && normalizeSubjectCode(s.course_code) === norm) ||
          normalizeSubjectCode(s.name) === normalizeSubjectCode(m.subjectName) ||
          s.name.toLowerCase() === m.subjectName.toLowerCase(),
      )

      if (match) {
        const { error } = await supabase
          .from('subjects')
          .update({
            total,
            course_code: norm,
          })
          .eq('name', match.name)

        if (!error) successCount++
      } else {
        const { error } = await supabase
          .from('subjects')
          .upsert(
            {
              name: m.subjectName || norm,
              total,
              course_code: norm,
              position: existingList.length + successCount + 1,
            },
            { onConflict: 'name' },
          )

        if (!error) successCount++
      }
    }

    // Pull refreshed records from Supabase to guarantee complete sync
    await fetchSubjectMappingsFromSupabase()

    return { success: true, count: successCount }
  } catch (err: any) {
    console.error('Error saving subject mappings to Supabase:', err)
    return { success: false, count: successCount, error: err?.message || 'Network error' }
  }
}

/**
 * Save a single subject mapping permanently to Supabase.
 */
export const saveSubjectMappingToSupabase = async (
  mapping: SubjectClassMapping,
  adminName = 'Admin',
): Promise<boolean> => {
  setSubjectMapping(mapping, adminName)

  if (!isSupabaseConfigured) return true

  try {
    const norm = normalizeSubjectCode(mapping.subjectCode)
    const total = Math.max(0, Math.round(mapping.totalClasses))

    const { data: existing } = await supabase
      .from('subjects')
      .select('*')
      .or(`course_code.eq.${norm},name.eq.${mapping.subjectName}`)
      .limit(1)

    if (existing && existing.length > 0) {
      await supabase
        .from('subjects')
        .update({ total, course_code: norm })
        .eq('name', existing[0].name)
    } else {
      await supabase.from('subjects').upsert(
        {
          name: mapping.subjectName || norm,
          total,
          course_code: norm,
          position: 99,
        },
        { onConflict: 'name' },
      )
    }

    return true
  } catch (err) {
    console.warn('Error saving single subject mapping to Supabase:', err)
    return false
  }
}

/**
 * Initialize Realtime listener on Supabase subjects table.
 */
let realtimeChannelInitialized = false
export const initSubjectMappingsRealtime = () => {
  if (realtimeChannelInitialized || !isSupabaseConfigured || typeof window === 'undefined') {
    return
  }

  realtimeChannelInitialized = true

  try {
    supabase
      .channel('realtime:admin_subjects_totals')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subjects' },
        () => {
          fetchSubjectMappingsFromSupabase()
        },
      )
      .subscribe()
  } catch (err) {
    console.warn('Realtime subscription error for subjects:', err)
  }
}

// Admin API: Acknowledge a newly discovered subject
export const acknowledgeSubjectMapping = (subjectCode: string) => {
  const norm = normalizeSubjectCode(subjectCode)
  if (!norm) return

  const all = getSubjectMappings()
  if (all[norm]) {
    all[norm] = {
      ...all[norm],
      isNewlyDiscovered: false,
    }
    saveSubjectMappings(all)
  }
}

// Admin API: Add or upsert complete mapping
export const setSubjectMapping = (mapping: SubjectClassMapping, adminName = 'Admin') => {
  const norm = normalizeSubjectCode(mapping.subjectCode)
  if (!norm) return

  const all = getSubjectMappings()
  all[norm] = {
    ...mapping,
    subjectCode: norm,
    totalClasses: Math.max(1, Math.round(mapping.totalClasses)),
    lastUpdated: new Date().toISOString(),
    updatedBy: adminName,
  }

  saveSubjectMappings(all)
}

// Admin API: Remove a subject from mappings
export const removeSubjectMapping = (subjectCode: string) => {
  const norm = normalizeSubjectCode(subjectCode)
  if (!norm) return

  const all = getSubjectMappings()
  if (all[norm]) {
    delete all[norm]
    saveSubjectMappings(all)
  }
}

// Admin API: Remove a subject from mappings and delete from Supabase
export const removeSubjectMappingFromSupabase = async (subjectCode: string): Promise<boolean> => {
  removeSubjectMapping(subjectCode)

  if (!isSupabaseConfigured) return true

  try {
    const norm = normalizeSubjectCode(subjectCode)
    await supabase.from('subjects').delete().eq('course_code', norm)
    return true
  } catch (err) {
    console.warn('Error removing subject from Supabase:', err)
    return false
  }
}

// Admin API: reset all mappings back to initial defaults
export const resetSubjectMappingsToDefault = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  notifyListeners()
}

// Admin auth check
export const isAdminAuthenticated = (): boolean => {
  try {
    return localStorage.getItem(ADMIN_SESSION_KEY) === 'true'
  } catch {
    return false
  }
}

export const setAdminAuthenticated = (status: boolean) => {
  try {
    if (status) {
      localStorage.setItem(ADMIN_SESSION_KEY, 'true')
    } else {
      localStorage.removeItem(ADMIN_SESSION_KEY)
    }
  } catch {
    // ignore
  }
  notifyListeners()
}

/**
 * Core Dynamic Attendance Calculation:
 *
 * 1. Total Classes (T): Fixed by admin for all students.
 * 2. Classes Done / Conducted so far (H): from the student's attendance portal.
 * 3. Remaining Classes (R): NOT fixed — dynamically adjusts according to number of classes done!
 *    R = max(0, T - H)
 * 4. Total Projected Classes: T (or max(T, H) if conducted exceeded planned).
 *
 * Target 75% Attendance (t = 0.75):
 * Total required attendance in the semester: ceil(0.75 * T)
 * Remaining attendance needed: needed = max(0, ceil(0.75 * T) - P)
 * If needed > R: Impossible to reach 75%, skippable = 0
 * If needed <= R: skippable75 = R - needed
 *
 * Target 86% Attendance (t = 0.86):
 * Total required attendance in the semester: ceil(0.86 * T)
 * Remaining attendance needed: needed = max(0, ceil(0.86 * T) - P)
 * If needed > R: Impossible to reach 86%, skippable = 0
 * If needed <= R: skippable86 = R - needed
 */
export const calculateSkippables = (
  courseCode: string,
  courseName: string,
  present: number,
  conducted: number,
): SkippableCalculation => {
  const mapping = getMappingForCourse(courseCode, courseName)
  const P = Math.max(0, present)
  const H = Math.max(0, conducted)

  // Total classes is fixed for all students (set by admin)
  // If conducted happens to exceed totalClasses, totalClasses adjusts to at least H
  const T = Math.max(H, mapping.totalClasses)

  // Remaining classes adjust dynamically based on classes done so far
  const R = Math.max(0, T - H)

  const currentPercentage = H > 0 ? (P / H) * 100 : 100
  const maxPossiblePercentage = T > 0 ? ((P + R) / T) * 100 : 100

  // --- Target 75% ---
  const requiredAttended75 = Math.ceil(0.75 * T)
  const neededFromRemaining75 = Math.max(0, requiredAttended75 - P)
  const isAchievable75 = neededFromRemaining75 <= R
  const skippable75 = isAchievable75 ? Math.max(0, R - neededFromRemaining75) : 0
  const minAttend75 = isAchievable75 ? neededFromRemaining75 : R
  const projectedPercentage75 = T > 0 ? ((P + (R - skippable75)) / T) * 100 : 100

  // Subject will NEVER fall below 75% even if all remaining classes are skipped:
  // (i.e. already attended >= required 75% of total classes)
  const isGuaranteedSafe75 = T > 0 && P >= requiredAttended75

  // --- Target 86% ---
  const requiredAttended86 = Math.ceil(0.86 * T)
  const neededFromRemaining86 = Math.max(0, requiredAttended86 - P)
  const isAchievable86 = neededFromRemaining86 <= R
  const skippable86 = isAchievable86 ? Math.max(0, R - neededFromRemaining86) : 0
  const minAttend86 = isAchievable86 ? neededFromRemaining86 : R
  const projectedPercentage86 = T > 0 ? ((P + (R - skippable86)) / T) * 100 : 100

  // --- Immediate BunkBook rules (right now without waiting for remaining) ---
  let immediateCanMiss = 0
  let immediateMustAttend = 0
  if (H === 0) {
    immediateCanMiss = 0
    immediateMustAttend = 0
  } else if (currentPercentage >= 75) {
    immediateCanMiss = Math.max(0, Math.floor(P / 0.75 - H))
  } else {
    immediateMustAttend = Math.max(0, Math.ceil(3 * H - 4 * P))
  }

  return {
    subjectCode: mapping.subjectCode,
    subjectName: mapping.subjectName,
    present: P,
    conducted: H,
    currentPercentage,
    totalClasses: T, // Fixed for all students
    remainingClasses: R, // Dynamic: T - H
    totalProjectedClasses: T,
    skippable75,
    minAttend75,
    projectedPercentage75,
    isAchievable75,
    isGuaranteedSafe75,
    maxPossiblePercentage,
    skippable86,
    minAttend86,
    projectedPercentage86,
    isAchievable86,
    immediateCanMiss,
    immediateMustAttend,
  }
}
