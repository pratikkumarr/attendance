import { describe, it, expect, beforeEach } from 'vitest'
import {
  normalizeSubjectCode,
  getMappingForCourse,
  getSubjectMappings,
  updateSubjectTotalClasses,
  registerUserCourses,
  calculateSkippables,
  resetSubjectMappingsToDefault,
  setAdminAuthenticated,
  isAdminAuthenticated,
  removeSubjectMapping,
} from '@/lib/subjectMappingStore'

describe('Subject Code Mapping, Auto-Discovery & Dynamic Remaining Calculations', () => {
  beforeEach(() => {
    localStorage.clear()
    resetSubjectMappingsToDefault()
  })

  it('normalizes subject codes properly by stripping dashes, spaces, and converting to uppercase', () => {
    expect(normalizeSubjectCode('kcs-501')).toBe('KCS501')
    expect(normalizeSubjectCode('KCS 501')).toBe('KCS501')
    expect(normalizeSubjectCode('kcs.501')).toBe('KCS501')
    expect(normalizeSubjectCode('Kit-051')).toBe('KIT051')
  })

  it('retrieves default mapping for known KIET subject code with fixed totalClasses', () => {
    const mapping = getMappingForCourse('KCS501', 'Database Management Systems')
    expect(mapping.subjectCode).toBe('KCS501')
    expect(mapping.totalClasses).toBe(44)
  })

  it('auto-registers any new subject when a user logs in and makes it visible on the admin dashboard', () => {
    // Simulate user login with new subjects that are not in default list
    registerUserCourses([
      {
        courseCode: 'KCS601',
        courseName: 'Software Engineering',
        totalLecture: 12,
      },
      {
        courseCode: 'KOE068',
        courseName: 'Cyber Security',
        totalLecture: 8,
      },
    ])

    const allMappings = getSubjectMappings()

    // Both new subjects should now be in the admin mappings
    expect(allMappings['KCS601']).toBeDefined()
    expect(allMappings['KCS601']?.subjectName).toBe('Software Engineering')
    expect(allMappings['KCS601']?.isNewlyDiscovered).toBe(true)
    expect(allMappings['KCS601']?.totalClasses).toBe(40) // Default 40 fixed classes

    expect(allMappings['KOE068']).toBeDefined()
    expect(allMappings['KOE068']?.subjectName).toBe('Cyber Security')
    expect(allMappings['KOE068']?.isNewlyDiscovered).toBe(true)
  })

  it('allows admin to edit total number of classes for each subject - which is fixed for all students', () => {
    // Admin sets total classes for KCS501 to 48
    updateSubjectTotalClasses('KCS501', 48, 'Admin User')
    const updated = getMappingForCourse('KCS501')
    expect(updated.totalClasses).toBe(48)
    expect(updated.updatedBy).toBe('Admin User')
    expect(updated.isNewlyDiscovered).toBe(false)
  })

  it('dynamically adjusts remaining classes according to the number of classes done (T - H)', () => {
    // Fixed total classes for KCS501 is 40
    updateSubjectTotalClasses('KCS501', 40)

    // Student A has had 20 classes done so far
    const studentA = calculateSkippables('KCS501', 'Database Management Systems', 18, 20)
    expect(studentA.totalClasses).toBe(40)
    expect(studentA.conducted).toBe(20)
    expect(studentA.remainingClasses).toBe(20) // 40 - 20 = 20

    // Later in semester, student has had 26 classes done so far
    const studentLater = calculateSkippables('KCS501', 'Database Management Systems', 24, 26)
    expect(studentLater.totalClasses).toBe(40)
    expect(studentLater.conducted).toBe(26)
    expect(studentLater.remainingClasses).toBe(14) // 40 - 26 = 14
  })

  it('calculates skippable classes for 75% and 86% attendance correctly with dynamic remaining classes', () => {
    // Fixed total classes T = 40.
    // Conducted H = 20, Present P = 18.
    // Remaining classes R = 40 - 20 = 20.
    //
    // For 75%:
    // Total classes needed = ceil(0.75 * 40) = 30.
    // Student already attended 18.
    // Minimum classes to attend from remaining = 30 - 18 = 12.
    // Skippable classes from remaining R = 20 - 12 = 8 classes.
    // If student skips 8, attended = 18 + 12 = 30 / 40 = 75.0%.
    //
    // For 86%:
    // Total classes needed = ceil(0.86 * 40) = ceil(34.4) = 35.
    // Student already attended 18.
    // Minimum classes to attend from remaining = 35 - 18 = 17.
    // Skippable classes from remaining R = 20 - 17 = 3 classes.
    // If student skips 3, attended = 18 + 17 = 35 / 40 = 87.5% >= 86%.

    updateSubjectTotalClasses('KCS501', 40)
    const result = calculateSkippables('KCS501', 'Database Management Systems', 18, 20)

    expect(result.totalClasses).toBe(40)
    expect(result.conducted).toBe(20)
    expect(result.remainingClasses).toBe(20)
    expect(result.present).toBe(18)

    // 75% verification:
    expect(result.skippable75).toBe(8)
    expect(result.minAttend75).toBe(12)
    expect(result.projectedPercentage75).toBe(75.0)
    expect(result.isAchievable75).toBe(true)

    // 86% verification:
    expect(result.skippable86).toBe(3)
    expect(result.minAttend86).toBe(17)
    expect(result.projectedPercentage86).toBe(87.5)
    expect(result.isAchievable86).toBe(true)
  })

  it('handles case where student cannot reach 86% even by attending all remaining classes', () => {
    // Fixed total classes T = 40.
    // Conducted H = 30, Present P = 15.
    // Remaining R = 10.
    // Required for 86%: ceil(0.86 * 40) = 35.
    // Even if attending all 10 remaining: max attended is 15 + 10 = 25 / 40 = 62.5% < 86%.
    updateSubjectTotalClasses('KCS502', 40)
    const result = calculateSkippables('KCS502', 'Compiler Design', 15, 30)

    expect(result.remainingClasses).toBe(10)
    expect(result.skippable86).toBe(0)
    expect(result.isAchievable86).toBe(false)
    expect(result.maxPossiblePercentage).toBe(62.5)
  })

  it('handles case where student can skip ALL remaining classes and still maintain 75%', () => {
    // Fixed total classes T = 35.
    // Conducted H = 30, Present P = 30.
    // Remaining R = 5.
    // Required for 75%: ceil(0.75 * 35) = 27.
    // Student already attended 30 >= 27.
    // Can skip all 5 remaining classes!
    updateSubjectTotalClasses('KCS503', 35)
    const result = calculateSkippables('KCS503', 'Design and Analysis of Algorithms', 30, 30)

    expect(result.remainingClasses).toBe(5)
    expect(result.skippable75).toBe(5)
    expect(result.minAttend75).toBe(0)
    expect(result.isAchievable75).toBe(true)
    expect(result.isGuaranteedSafe75).toBe(true)

    // When present is less than required (e.g. 26 < 27), skipping all remaining classes drops below 75%
    const notGuaranteed = calculateSkippables('KCS503', 'Design and Analysis of Algorithms', 26, 30)
    expect(notGuaranteed.isGuaranteedSafe75).toBe(false)
    expect(notGuaranteed.minAttend75).toBe(1) // Must attend at least 1 more
  })

  it('allows admin to remove a subject from the mappings list', () => {
    expect(getSubjectMappings()['KCS501']).toBeDefined()
    removeSubjectMapping('KCS501')
    expect(getSubjectMappings()['KCS501']).toBeUndefined()
  })

  it('manages admin authentication state', () => {
    expect(isAdminAuthenticated()).toBe(false)
    setAdminAuthenticated(true)
    expect(isAdminAuthenticated()).toBe(true)
    setAdminAuthenticated(false)
    expect(isAdminAuthenticated()).toBe(false)
  })
})
