import { SubjectClassMapping, SkippableCalculation } from '@/types/bunkbook'

const STORAGE_KEY = 'bunkbook_subject_mappings_v2'
const ADMIN_SESSION_KEY = 'bunkbook_admin_authenticated'

export const normalizeSubjectCode = (code: string): string => {
  if (!code) return ''
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

// Initial default KIET subjects with fixed total classes (for all students)
export const DEFAULT_SUBJECT_MAPPINGS: Record<string, SubjectClassMapping> = {
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
 * Auto-discovery function:
 * Called whenever a user logs in or courses are loaded.
 * If the user has any new subject, it gets auto-added to the subjects list
 * and will immediately be visible on the Admin Dashboard!
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
      // New subject discovered! Add it so admin can see and configure it
      all[norm] = {
        subjectCode: norm,
        subjectName: c.courseName || norm,
        totalClasses: Math.max(40, conducted), // Default 40 or higher if already conducted
        lastUpdated: new Date().toISOString(),
        updatedBy: 'Discovered from Student Login',
        isNewlyDiscovered: true,
        discoveredAt: new Date().toISOString(),
      }
      hasChanges = true
    } else {
      // If conducted has exceeded fixed totalClasses, adjust totalClasses upward
      if (conducted > all[norm].totalClasses) {
        all[norm] = {
          ...all[norm],
          totalClasses: conducted,
          lastUpdated: new Date().toISOString(),
          updatedBy: 'Adjusted to Conducted Count',
        }
        hasChanges = true
      }
    }
  })

  if (hasChanges) {
    saveSubjectMappings(all)
  }
}

// Get or auto-register mapping for a course code
export const getMappingForCourse = (courseCode: string, courseName?: string): SubjectClassMapping => {
  const norm = normalizeSubjectCode(courseCode)
  const all = getSubjectMappings()

  if (norm && all[norm]) {
    return all[norm]
  }

  // If not found, create a default mapping and flag as newly discovered
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
