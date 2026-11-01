/**
 * sync.ts — Pure Synchronization and Merge Functions for CyberVidya Attendance
 *
 * Implements strict allowlist updates to protect user-configured Total Classes
 * and prevents duplicate subject generation.
 */

import type {
  CyberVidyaStudentDetails,
  CyberVidyaCourseAttendanceInfo,
  CyberVidyaAttendanceComponentInfo,
  NormalizedPortalSubject,
  NormalizedStudentInfo,
  NormalizedAttendanceData,
  LocalSubjectRecord,
  SyncMergeResult,
  SyncSummary,
} from './types'

// ---------------------------------------------------------------------------
// Remaining Classes Derivation (Requirement 5)
// ---------------------------------------------------------------------------

/**
 * Derive remaining classes from manually configured semester Total Classes
 * and the latest Classes Done from the portal:
 *   Remaining Classes = max(0, Total Classes - Classes Done)
 *
 * Rule: Returns null if Total Classes is unset/null/<=0 rather than fabricating
 * a misleading remaining count.
 */
export function calculateRemainingClasses(
  totalClasses: number | null | undefined,
  classesDone: number,
): number | null {
  if (totalClasses == null || totalClasses <= 0) {
    return null
  }
  const cleanTotal = Math.max(0, Math.round(totalClasses))
  const cleanDone = Math.max(0, Math.round(classesDone))
  return Math.max(0, cleanTotal - cleanDone)
}

// ---------------------------------------------------------------------------
// Normalization of Raw Portal Responses
// ---------------------------------------------------------------------------

/**
 * Build a clean, readable local subject name.
 * Disambiguates courses with multiple components (e.g. Theory vs Practical).
 */
export function formatSuggestedSubjectName(
  courseName: string,
  componentName: string,
  totalComponentsForCourse: number,
): string {
  const cleanCourse = courseName.trim()
  const cleanComp = componentName.trim()

  if (totalComponentsForCourse > 1) {
    return `${cleanCourse} (${cleanComp})`
  }

  // If there's only 1 component, use the course name unless the component is distinctive
  if (
    cleanComp &&
    cleanComp.toLowerCase() !== 'theory' &&
    cleanComp.toLowerCase() !== 'default' &&
    !cleanCourse.toLowerCase().includes(cleanComp.toLowerCase())
  ) {
    return `${cleanCourse} (${cleanComp})`
  }

  return cleanCourse
}

/**
 * Normalizes raw student details and course components from CyberVidya.
 * Extracts stable external IDs: `${courseId}_${courseComponentId}`.
 */
export function normalizeCyberVidyaResponse(
  raw: CyberVidyaStudentDetails,
): NormalizedAttendanceData {
  const student: NormalizedStudentInfo = {
    fullName: raw.fullName || 'Student',
    rollNumber: raw.registrationNumber || '',
    sectionName: raw.sectionName,
    branch: raw.branchShortName,
    degree: raw.degreeName,
    semester: raw.semesterName,
  }

  const subjects: NormalizedPortalSubject[] = []

  const courseList = raw.attendanceCourseComponentInfoList || []
  for (const course of courseList) {
    const components = course.attendanceCourseComponentNameInfoList || []
    const totalComps = components.length

    for (const comp of components) {
      // Stable external identifier composed of courseId and courseComponentId
      const externalId = `${course.courseId}_${comp.courseComponentId}`
      const suggestedSubjectName = formatSuggestedSubjectName(
        course.courseName,
        comp.componentName,
        totalComps,
      )

      subjects.push({
        externalId,
        studentId: (course as any).studentId || (raw as any).id || (raw as any).studentId || 1000,
        courseId: course.courseId || 0,
        courseCompId: comp.courseComponentId || 0,
        courseCode: course.courseCode || '',
        courseName: course.courseName || '',
        componentName: comp.componentName || '',
        suggestedSubjectName,
        classesDone: Math.max(0, comp.numberOfPeriods || 0),
        classesAttended: Math.max(0, (comp.numberOfPresent || 0) + (comp.numberOfExtraAttendance || 0)),
        extraAttendance: comp.numberOfExtraAttendance || 0,
        percentage: comp.presentPercentage ?? null,
      })
    }
  }

  return { student, subjects }
}

// ---------------------------------------------------------------------------
// Strict Allowlist Merging (Requirement 5 & 6)
// ---------------------------------------------------------------------------

/**
 * Helper to normalize course codes for comparison (e.g. "BCS-501" -> "BCS501").
 */
export function normalizeCourseCode(code?: string | null): string {
  if (!code) return ''
  return code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

/**
 * Merges a single CyberVidya portal subject into a local subject record.
 *
 * CRITICAL RULE:
 * Total Classes is user-owned and MUST NEVER be overwritten or replaced by
 * a CyberVidya response. Only portal-owned fields (done, attended, externalId)
 * are updated. If the subject is new, totalClasses is initialized to null
 * (requiring manual configuration).
 */
export function mergeSubjectWithPortal(
  existingSubject: LocalSubjectRecord | undefined,
  portalSubject: NormalizedPortalSubject,
): SyncMergeResult {
  if (existingSubject) {
    // Subject already exists — preserve user's manual totalClasses
    const totalClasses = existingSubject.totalClasses
    const remainingClasses = calculateRemainingClasses(totalClasses, portalSubject.classesDone)

    const updatedSubject: LocalSubjectRecord = {
      // Retain existing local name so user custom names aren't clobbered
      name: existingSubject.name,

      // Allowlist of portal-owned fields:
      classesDone: portalSubject.classesDone,
      classesAttended: portalSubject.classesAttended,
      externalId: portalSubject.externalId,

      // Course code (preserve existing or assign portal's)
      courseCode: existingSubject.courseCode || portalSubject.courseCode || null,

      // MANDATORY: Intentionally preserve the user's manual value
      totalClasses: totalClasses,

      remainingClasses,
    }

    return {
      updatedSubject,
      isNew: false,
      wasTotalPreserved: totalClasses != null,
      requiresManualTotal: totalClasses == null || totalClasses <= 0,
    }
  }

  // Brand-new subject from CyberVidya
  // Rule: Do NOT initialize totalClasses from CyberVidya. Leave unset (null).
  const updatedSubject: LocalSubjectRecord = {
    name: portalSubject.suggestedSubjectName,
    courseCode: portalSubject.courseCode || null,
    totalClasses: null, // Requires manual configuration
    classesDone: portalSubject.classesDone,
    classesAttended: portalSubject.classesAttended,
    remainingClasses: null,
    externalId: portalSubject.externalId,
  }

  return {
    updatedSubject,
    isNew: true,
    wasTotalPreserved: false,
    requiresManualTotal: true,
  }
}

// ---------------------------------------------------------------------------
// Full Attendance Sync Engine
// ---------------------------------------------------------------------------

export interface SyncOptions {
  userName: string
  existingSubjects: LocalSubjectRecord[]
  existingMappings?: Record<string, string> // externalId -> localSubjectName
  portalData: NormalizedAttendanceData
}

/**
 * Synchronizes a student's full CyberVidya subject list against their local records.
 *
 * Guarantees:
 * 1. Matches existing subjects by stable external ID first, then by Course Code, then by name.
 * 2. Idempotent: repeated syncs do not create duplicate subjects.
 * 3. Never overwrites manual Total Classes.
 * 4. Preserves un-synced subjects (e.g. manually created non-portal subjects).
 * 5. Returns detailed summary of updated and new subjects.
 */
export function executeAttendanceSync({
  userName,
  existingSubjects,
  existingMappings = {},
  portalData,
}: SyncOptions): SyncSummary {
  const mergedResults: SyncMergeResult[] = []

  // Create fast lookup maps for existing subjects
  const subjectsByName = new Map<string, LocalSubjectRecord>()
  const subjectsByExternalId = new Map<string, LocalSubjectRecord>()
  const subjectsByCourseCode = new Map<string, LocalSubjectRecord[]>()

  for (const s of existingSubjects) {
    subjectsByName.set(s.name.toLowerCase().trim(), s)
    if (s.externalId) {
      subjectsByExternalId.set(s.externalId, s)
    }
    if (s.courseCode) {
      const normCode = normalizeCourseCode(s.courseCode)
      if (normCode) {
        const list = subjectsByCourseCode.get(normCode) || []
        list.push(s)
        subjectsByCourseCode.set(normCode, list)
      }
    }
  }

  let updatedCount = 0
  let newCount = 0
  const matchedSubjectNames = new Set<string>()

  for (const portalSub of portalData.subjects) {
    // 1. Try matching by stable external ID
    let matched: LocalSubjectRecord | undefined = subjectsByExternalId.get(portalSub.externalId)
    if (matched && matchedSubjectNames.has(matched.name.toLowerCase())) {
      matched = undefined
    }

    // 2. Try matching by mapped name from existingMappings
    const mappedTarget = existingMappings[portalSub.externalId]
    if (!matched && mappedTarget) {
      const mappedName = mappedTarget.toLowerCase().trim()
      if (!matchedSubjectNames.has(mappedName)) {
        matched = subjectsByName.get(mappedName)
      }
    }

    // 3. Try matching by Course Code (User configured in Subject Totals tool)
    const portalNormCode = normalizeCourseCode(portalSub.courseCode)
    if (!matched && portalNormCode) {
      const allCandidates = subjectsByCourseCode.get(portalNormCode) || []
      const candidates = allCandidates.filter((c) => !matchedSubjectNames.has(c.name.toLowerCase()))

      if (candidates.length > 0) {
        if (candidates.length === 1) {
          matched = candidates[0]
        } else {
          // Disambiguate multi-component courses with same code (Theory vs Practical / Lab)
          const compMatch = candidates.find((c) => {
            const cName = c.name.toLowerCase()
            const pComp = (portalSub.componentName || '').toLowerCase()
            if (pComp && cName.includes(pComp)) return true
            if (pComp.includes('pract') && cName.includes('lab')) return true
            if (pComp.includes('theor') && !cName.includes('lab') && !cName.includes('pract')) return true
            return false
          })
          matched = compMatch || candidates[0]
        }
      }

      // Check if existing subject name contains the course code (e.g. "BCS501" or "DBMS BCS501")
      if (!matched) {
        matched = existingSubjects.find((s) => {
          if (matchedSubjectNames.has(s.name.toLowerCase())) return false
          const normSubjName = normalizeCourseCode(s.name)
          return normSubjName.includes(portalNormCode)
        })
      }
    }

    // 4. Fallback: match by normalized suggested subject name
    if (!matched) {
      const normName = portalSub.suggestedSubjectName.toLowerCase().trim()
      if (!matchedSubjectNames.has(normName)) {
        matched = subjectsByName.get(normName)
      }
    }

    // 5. Fallback: match by course name directly
    if (!matched) {
      const cleanCourseName = portalSub.courseName.toLowerCase().trim()
      if (!matchedSubjectNames.has(cleanCourseName)) {
        matched = subjectsByName.get(cleanCourseName)
      }
    }

    // Mark matched subject as taken so subsequent portal courses don't collide
    if (matched) {
      matchedSubjectNames.add(matched.name.toLowerCase())
    }

    // 6. Merge portal data with existing or new record
    const result = mergeSubjectWithPortal(matched, portalSub)

    if (result.isNew) {
      newCount++
      // Register in lookup so subsequent identical components don't conflict
      subjectsByName.set(result.updatedSubject.name.toLowerCase().trim(), result.updatedSubject)
      if (result.updatedSubject.externalId) {
        subjectsByExternalId.set(result.updatedSubject.externalId, result.updatedSubject)
      }
    } else {
      updatedCount++
    }

    mergedResults.push(result)
  }

  return {
    userName,
    student: portalData.student,
    totalSyncedSubjects: portalData.subjects.length,
    updatedSubjectsCount: updatedCount,
    newSubjectsCount: newCount,
    syncedAt: new Date().toISOString(),
    subjects: mergedResults,
  }
}
