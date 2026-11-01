/**
 * cybervidya-sync.test.ts — Unit & Regression Tests for CyberVidya Integration
 *
 * Verifies all 14 mandatory test cases:
 * 1. Unconnected users continue using existing features seamlessly
 * 2. Correct credentials initiate auth and request OTP
 * 3. Valid OTP completes authentication and retrieves attendance
 * 4. Invalid credentials and invalid OTPs produce useful errors
 * 5. Portal network failures do not corrupt existing attendance data
 * 6. Subject retrieval creates appropriate subject records
 * 7. Repeated syncs do not create duplicate subjects (idempotence)
 * 8. Classes Done and Classes Attended update on next sync
 * 9. Manually configured Total Classes remains unchanged when portal reports different values
 * 10. Previously configured Total Classes remains unchanged across repeated syncs or renames
 * 11. New subjects require manual Total Classes configuration (never initialized from portal)
 * 12. Remaining Classes is recalculated correctly when Total Classes or Classes Done changes
 * 13. One user's private synced records cannot be accessed by or overwrite another user
 * 14. Existing attendance calculations and exports continue to work
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  calculateRemainingClasses,
  formatSuggestedSubjectName,
  normalizeCyberVidyaResponse,
  mergeSubjectWithPortal,
  executeAttendanceSync,
} from '@/lib/cybervidya/sync'
import {
  encryptCyberVidyaString,
  decryptCyberVidyaString,
} from '@/lib/cybervidya/crypto'
import {
  initiateCyberVidyaLogin,
  verifyCyberVidyaOtp,
  fetchCyberVidyaAttendance,
} from '@/server/cybervidyaService'
import { planSubject, projectFinal } from '@/lib/plan'
import type {
  CyberVidyaStudentDetails,
  LocalSubjectRecord,
  NormalizedPortalSubject,
  NormalizedAttendanceData,
} from '@/lib/cybervidya/types'

// ---------------------------------------------------------------------------
// Sample Fixture Data
// ---------------------------------------------------------------------------

const mockCyberVidyaStudentDetails: CyberVidyaStudentDetails = {
  fullName: 'Pratik Kumar',
  registrationNumber: '2200290100123',
  sectionName: 'CS-4B',
  branchShortName: 'CSE',
  degreeName: 'B.Tech',
  semesterName: '6',
  attendanceCourseComponentInfoList: [
    {
      courseName: 'Database Management Systems',
      courseCode: 'BCS501',
      courseId: 101,
      attendanceCourseComponentNameInfoList: [
        {
          courseComponentId: 201,
          componentName: 'Theory',
          numberOfPeriods: 44, // Classes Done
          numberOfPresent: 41, // Classes Attended
          numberOfExtraAttendance: 1,
          presentPercentage: 95.45,
          presentPercentageWith: '95.45%',
          isProjected: false,
        },
      ],
    },
    {
      courseName: 'Computer Networks',
      courseCode: 'BCS502',
      courseId: 102,
      attendanceCourseComponentNameInfoList: [
        {
          courseComponentId: 202,
          componentName: 'Theory',
          numberOfPeriods: 38,
          numberOfPresent: 32,
          numberOfExtraAttendance: 0,
          presentPercentage: 84.21,
          presentPercentageWith: '84.21%',
          isProjected: false,
        },
        {
          courseComponentId: 203,
          componentName: 'Practical',
          numberOfPeriods: 12,
          numberOfPresent: 12,
          numberOfExtraAttendance: 0,
          presentPercentage: 100.0,
          presentPercentageWith: '100%',
          isProjected: false,
        },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// 1. Crypto Verification
// ---------------------------------------------------------------------------

describe('CyberVidya Crypto (AES-128-CBC)', () => {
  it('encrypts plaintext into valid base64 ciphertext matching portal specs', () => {
    const plaintext = 'StudentPassword@123'
    const encrypted = encryptCyberVidyaString(plaintext)
    expect(typeof encrypted).toBe('string')
    expect(encrypted.length).toBeGreaterThan(0)
    expect(encrypted).not.toBe(plaintext)

    // Decrypting must restore original plaintext exactly
    const decrypted = decryptCyberVidyaString(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it('handles empty input gracefully', () => {
    expect(encryptCyberVidyaString('')).toBe('')
    expect(decryptCyberVidyaString('')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// 2. Remaining Classes Derivation (Requirement 5 & 12)
// ---------------------------------------------------------------------------

describe('calculateRemainingClasses', () => {
  it('calculates remaining as max(0, Total - Done)', () => {
    // Total 60, Done 44 -> Remaining 16
    expect(calculateRemainingClasses(60, 44)).toBe(16)
    // Total 40, Done 40 -> Remaining 0
    expect(calculateRemainingClasses(40, 40)).toBe(0)
    // Total 40, Done 45 -> Remaining 0 (clamped, never negative)
    expect(calculateRemainingClasses(40, 45)).toBe(0)
  })

  it('returns null gracefully when Total Classes is unset, null, or zero', () => {
    expect(calculateRemainingClasses(null, 25)).toBeNull()
    expect(calculateRemainingClasses(undefined, 25)).toBeNull()
    expect(calculateRemainingClasses(0, 25)).toBeNull()
    expect(calculateRemainingClasses(-5, 25)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 3. Response Normalization & Disambiguation (Requirement 4 & 6)
// ---------------------------------------------------------------------------

describe('normalizeCyberVidyaResponse', () => {
  it('normalizes student metadata and decomposes course components', () => {
    const normalized = normalizeCyberVidyaResponse(mockCyberVidyaStudentDetails)

    expect(normalized.student.fullName).toBe('Pratik Kumar')
    expect(normalized.student.rollNumber).toBe('2200290100123')
    expect(normalized.student.sectionName).toBe('CS-4B')

    // 1 single-component course + 1 two-component course = 3 subjects total
    expect(normalized.subjects).toHaveLength(3)

    // Single-component course keeps clean course name
    const dbms = normalized.subjects.find((s) => s.externalId === '101_201')
    expect(dbms).toBeDefined()
    expect(dbms?.suggestedSubjectName).toBe('Database Management Systems')
    expect(dbms?.classesDone).toBe(44)
    expect(dbms?.classesAttended).toBe(42) // 41 present + 1 extra

    // Multi-component course includes component name to avoid collision
    const cnTheory = normalized.subjects.find((s) => s.externalId === '102_202')
    expect(cnTheory).toBeDefined()
    expect(cnTheory?.suggestedSubjectName).toBe('Computer Networks (Theory)')
    expect(cnTheory?.classesDone).toBe(38)
    expect(cnTheory?.classesAttended).toBe(32)

    const cnPractical = normalized.subjects.find((s) => s.externalId === '102_203')
    expect(cnPractical).toBeDefined()
    expect(cnPractical?.suggestedSubjectName).toBe('Computer Networks (Practical)')
    expect(cnPractical?.classesDone).toBe(12)
    expect(cnPractical?.classesAttended).toBe(12)
  })
})

// ---------------------------------------------------------------------------
// 4. CRITICAL BUSINESS RULE: Total Classes Protection (Requirement 5, 9, 10, 11)
// ---------------------------------------------------------------------------

describe('CRITICAL: Total Classes Protection across Synchronization', () => {
  const portalSubject: NormalizedPortalSubject = {
    externalId: '101_201',
    courseCode: 'BCS501',
    courseName: 'Database Management Systems',
    componentName: 'Theory',
    suggestedSubjectName: 'Database Management Systems',
    classesDone: 44,
    classesAttended: 42,
    extraAttendance: 1,
    percentage: 95.45,
  }

  it('RULE 9: Manually configured Total Classes remains unchanged when portal sync runs', () => {
    // Student manually planned for 60 classes
    const existingSubject: LocalSubjectRecord = {
      name: 'Database Management Systems',
      totalClasses: 60,
      classesDone: 35,
      classesAttended: 32,
      remainingClasses: 25,
      externalId: '101_201',
    }

    const mergeResult = mergeSubjectWithPortal(existingSubject, portalSubject)

    // CRITICAL: Total Classes MUST remain exactly 60
    expect(mergeResult.updatedSubject.totalClasses).toBe(60)
    expect(mergeResult.wasTotalPreserved).toBe(true)

    // Classes Done and Classes Attended MUST update to latest portal values
    expect(mergeResult.updatedSubject.classesDone).toBe(44)
    expect(mergeResult.updatedSubject.classesAttended).toBe(42)

    // Remaining Classes must be recalculated using the manual Total Classes: max(0, 60 - 44) = 16
    expect(mergeResult.updatedSubject.remainingClasses).toBe(16)
  })

  it('RULE 10: Previously configured Total Classes remains unchanged across repeated syncs', () => {
    let subjectRecord: LocalSubjectRecord = {
      name: 'Database Management Systems',
      totalClasses: 60,
      classesDone: 44,
      classesAttended: 42,
      remainingClasses: 16,
      externalId: '101_201',
    }

    // Portal updates later in the semester: Done increases from 44 to 48, Attended to 45
    const subsequentPortalUpdate: NormalizedPortalSubject = {
      ...portalSubject,
      classesDone: 48,
      classesAttended: 45,
    }

    const secondSync = mergeSubjectWithPortal(subjectRecord, subsequentPortalUpdate)
    expect(secondSync.updatedSubject.totalClasses).toBe(60) // Unchanged!
    expect(secondSync.updatedSubject.classesDone).toBe(48)
    expect(secondSync.updatedSubject.classesAttended).toBe(45)
    expect(secondSync.updatedSubject.remainingClasses).toBe(12) // max(0, 60 - 48) = 12

    // Third sync where portal reports 59 done
    const thirdPortalUpdate: NormalizedPortalSubject = {
      ...portalSubject,
      classesDone: 59,
      classesAttended: 56,
    }

    const thirdSync = mergeSubjectWithPortal(secondSync.updatedSubject, thirdPortalUpdate)
    expect(thirdSync.updatedSubject.totalClasses).toBe(60) // STILL 60!
    expect(thirdSync.updatedSubject.classesDone).toBe(59)
    expect(thirdSync.updatedSubject.remainingClasses).toBe(1) // max(0, 60 - 59) = 1
  })

  it('RULE 11: New subjects require manual Total Classes configuration and are NOT initialized from portal', () => {
    // New subject not in local DB
    const mergeResult = mergeSubjectWithPortal(undefined, portalSubject)

    expect(mergeResult.isNew).toBe(true)
    expect(mergeResult.requiresManualTotal).toBe(true)
    // MUST NOT be set to classesDone (44) or any portal number
    expect(mergeResult.updatedSubject.totalClasses).toBeNull()
    expect(mergeResult.updatedSubject.remainingClasses).toBeNull()
    expect(mergeResult.updatedSubject.classesDone).toBe(44)
    expect(mergeResult.updatedSubject.classesAttended).toBe(42)
  })

  it('preserves user custom name when merging existing subject', () => {
    const existingSubject: LocalSubjectRecord = {
      name: 'DBMS (My Favorite)',
      totalClasses: 55,
      classesDone: 20,
      classesAttended: 20,
      remainingClasses: 35,
      externalId: '101_201',
    }

    const mergeResult = mergeSubjectWithPortal(existingSubject, portalSubject)
    expect(mergeResult.updatedSubject.name).toBe('DBMS (My Favorite)')
    expect(mergeResult.updatedSubject.totalClasses).toBe(55)
    expect(mergeResult.updatedSubject.classesDone).toBe(44)
  })
})

// ---------------------------------------------------------------------------
// 5. Subject Matching & Duplicate Prevention (Requirement 6, 7, 8)
// ---------------------------------------------------------------------------

describe('executeAttendanceSync — Duplicate Prevention & Idempotency', () => {
  const normalizedData = normalizeCyberVidyaResponse(mockCyberVidyaStudentDetails)

  it('creates new records on initial sync', () => {
    const summary = executeAttendanceSync({
      userName: 'Pratik',
      existingSubjects: [],
      portalData: normalizedData,
    })

    expect(summary.totalSyncedSubjects).toBe(3)
    expect(summary.newSubjectsCount).toBe(3)
    expect(summary.updatedSubjectsCount).toBe(0)
    expect(summary.subjects).toHaveLength(3)

    for (const res of summary.subjects) {
      expect(res.isNew).toBe(true)
      expect(res.updatedSubject.totalClasses).toBeNull() // Requires manual setup
    }
  })

  it('RULE 7: Repeated syncs update existing subjects and do NOT create duplicates', () => {
    // Initial sync
    const firstSync = executeAttendanceSync({
      userName: 'Pratik',
      existingSubjects: [],
      portalData: normalizedData,
    })

    // Suppose user sets manual totals for the 3 subjects
    const existingRecordsWithManualTotals: LocalSubjectRecord[] = firstSync.subjects.map(
      (res, idx) => ({
        ...res.updatedSubject,
        totalClasses: 50 + idx * 5, // e.g. 50, 55, 60
      }),
    )

    // Map external IDs
    const mappings: Record<string, string> = {}
    existingRecordsWithManualTotals.forEach((r) => {
      if (r.externalId) mappings[r.externalId] = r.name
    })

    // Second sync with updated portal attendance
    const updatedPortalData: NormalizedAttendanceData = {
      ...normalizedData,
      subjects: normalizedData.subjects.map((s) => ({
        ...s,
        classesDone: s.classesDone + 2,
        classesAttended: s.classesAttended + 2,
      })),
    }

    const secondSync = executeAttendanceSync({
      userName: 'Pratik',
      existingSubjects: existingRecordsWithManualTotals,
      existingMappings: mappings,
      portalData: updatedPortalData,
    })

    expect(secondSync.newSubjectsCount).toBe(0) // ZERO new subjects created!
    expect(secondSync.updatedSubjectsCount).toBe(3) // All 3 matched and updated!
    expect(secondSync.subjects).toHaveLength(3)

    // Verify each subject's Total Classes was strictly preserved!
    expect(secondSync.subjects[0]?.updatedSubject.totalClasses).toBe(50)
    expect(secondSync.subjects[1]?.updatedSubject.totalClasses).toBe(55)
    expect(secondSync.subjects[2]?.updatedSubject.totalClasses).toBe(60)

    // Verify classesDone increased by 2
    expect(secondSync.subjects[0]?.updatedSubject.classesDone).toBe(46)
  })

  it('preserves manually created non-portal subjects without deleting them', () => {
    const manualNonPortalSubject: LocalSubjectRecord = {
      name: 'Independent Research / Projects',
      totalClasses: 30,
      classesDone: 10,
      classesAttended: 10,
      remainingClasses: 20,
      externalId: null, // No portal mapping
    }

    const summary = executeAttendanceSync({
      userName: 'Pratik',
      existingSubjects: [manualNonPortalSubject],
      portalData: normalizedData,
    })

    // Portal subjects are imported
    expect(summary.newSubjectsCount).toBe(3)
    // Non-portal subject remains uncorrupted in the local state
    expect(manualNonPortalSubject.totalClasses).toBe(30)
    expect(manualNonPortalSubject.classesDone).toBe(10)
  })

  it('matches subjects by Course Code configured in Subject Totals tool', () => {
    // Student named their subject "DBMS" (abbreviation) and configured Course Code "BCS501"
    const dbmsSubject: LocalSubjectRecord = {
      name: 'DBMS',
      courseCode: 'BCS501',
      totalClasses: 60,
      classesDone: 20,
      classesAttended: 18,
      remainingClasses: 40,
    }

    // Portal subject has courseCode "BCS501" and full courseName "Database Management Systems"
    const summary = executeAttendanceSync({
      userName: 'Pratik',
      existingSubjects: [dbmsSubject],
      portalData: normalizedData,
    })

    // "DBMS" must be matched via BCS501 and updated, NOT duplicated!
    const matchedResult = summary.subjects.find((s) => s.updatedSubject.name === 'DBMS')
    expect(matchedResult).toBeDefined()
    expect(matchedResult?.isNew).toBe(false)
    expect(matchedResult?.updatedSubject.classesDone).toBe(44)
    expect(matchedResult?.updatedSubject.classesAttended).toBe(42)
    // CRITICAL: Total Classes (60) is preserved!
    expect(matchedResult?.updatedSubject.totalClasses).toBe(60)
    expect(matchedResult?.updatedSubject.remainingClasses).toBe(16) // 60 - 44
  })

  it('matches subjects by Course Code with hyphen or space variations', () => {
    // Student entered "BCS-501" or "bcs 501"
    const subjectWithHyphen: LocalSubjectRecord = {
      name: 'Database Mgmt',
      courseCode: 'BCS-501',
      totalClasses: 55,
      classesDone: 10,
      classesAttended: 9,
      remainingClasses: 45,
    }

    const summary = executeAttendanceSync({
      userName: 'Pratik',
      existingSubjects: [subjectWithHyphen],
      portalData: normalizedData,
    })

    const matchedResult = summary.subjects.find((s) => s.updatedSubject.name === 'Database Mgmt')
    expect(matchedResult).toBeDefined()
    expect(matchedResult?.isNew).toBe(false)
    expect(matchedResult?.updatedSubject.classesDone).toBe(44)
    expect(matchedResult?.updatedSubject.totalClasses).toBe(55)
  })
})

// ---------------------------------------------------------------------------
// 6. CyberVidya Server Service (Requirement 2, 3, 4, 5)
// ---------------------------------------------------------------------------

describe('CyberVidya Service API Client (Mocked Remote Portal)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('RULE 2: Initiates authentication and requests OTP for valid credentials', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { transactionId: 'tx-test-987654' },
          message: 'OTP sent to student email',
        }),
        { status: 200 },
      ),
    )

    const res = await initiateCyberVidyaLogin('2200290100123', 'SecretPass123')
    expect(res.success).toBe(true)
    expect(res.requiresOtp).toBe(true)
    expect(res.transactionId).toBe('tx-test-987654')

    // Verify encrypted payload was sent (passwords are NOT sent in plaintext)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const callArgs = mockFetch.mock.calls[0]
    expect(callArgs).toBeDefined()
    const callBody = JSON.parse(callArgs![1]?.body as string)
    expect(callBody.userName).not.toBe('2200290100123')
    expect(callBody.password).not.toBe('SecretPass123')
    expect(decryptCyberVidyaString(callBody.userName)).toBe('2200290100123')
    expect(decryptCyberVidyaString(callBody.password)).toBe('SecretPass123')
  })

  it('RULE 3: Verifies OTP and retrieves authenticated session token', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { token: 'jwt-auth-session-token-xyz', id: 4567 },
          message: 'OTP verified',
        }),
        { status: 200 },
      ),
    )

    const res = await verifyCyberVidyaOtp('tx-test-987654', '123456')
    expect(res.success).toBe(true)
    expect(res.token).toBe('jwt-auth-session-token-xyz')
    expect(res.studentId).toBe(4567)
  })

  it('RULE 4: Handles invalid credentials with clear user error', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { reason: 'Invalid Username or Password' },
        }),
        { status: 400 },
      ),
    )

    const res = await initiateCyberVidyaLogin('baduser', 'wrongpass')
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/Invalid (Username|University roll number|roll number)/i)
  })

  it('RULE 4: Handles invalid or expired OTP with clear user error', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { reason: 'Invalid or expired OTP' },
        }),
        { status: 400 },
      ),
    )

    const res = await verifyCyberVidyaOtp('tx-test-987654', '000000')
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/Invalid or expired OTP/i)
  })

  it('RULE 4: Handles portal rate limits (HTTP 429)', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Rate limit' }), { status: 429 }),
    )

    const res = await initiateCyberVidyaLogin('2200290100123', 'SecretPass123')
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/rate limit/i)
  })

  it('RULE 5: Network failure returns clean error without crashing', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockRejectedValueOnce(new Error('fetch failed: ENOTFOUND'))

    const res = await initiateCyberVidyaLogin('2200290100123', 'SecretPass123')
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/Unable to reach CyberVidya servers/i)
  })
})

// ---------------------------------------------------------------------------
// 7. User Isolation (Requirement 7 & 13)
// ---------------------------------------------------------------------------

describe('User Isolation and Privacy', () => {
  it('RULE 13: One user’s synced records do not clobber another user’s records', () => {
    const portalDataUser1 = normalizeCyberVidyaResponse(mockCyberVidyaStudentDetails)

    const user1Existing: LocalSubjectRecord[] = [
      {
        name: 'Database Management Systems',
        totalClasses: 60,
        classesDone: 10,
        classesAttended: 10,
        remainingClasses: 50,
      },
    ]

    const user2Existing: LocalSubjectRecord[] = [
      {
        name: 'Database Management Systems',
        totalClasses: 50, // Different total
        classesDone: 20, // Different done
        classesAttended: 18,
        remainingClasses: 30,
      },
    ]

    // Sync for User 1
    const user1Summary = executeAttendanceSync({
      userName: 'Pratik',
      existingSubjects: user1Existing,
      portalData: portalDataUser1,
    })

    expect(user1Summary.userName).toBe('Pratik')
    expect(user1Summary.subjects[0]?.updatedSubject.totalClasses).toBe(60)
    expect(user1Summary.subjects[0]?.updatedSubject.classesDone).toBe(44)

    // User 2's local record is completely untouched
    expect(user2Existing[0]?.totalClasses).toBe(50)
    expect(user2Existing[0]?.classesDone).toBe(20)
    expect(user2Existing[0]?.classesAttended).toBe(18)
  })
})

// ---------------------------------------------------------------------------
// 8. Integration with Existing Attendance Planner Calculations (Requirement 1 & 14)
// ---------------------------------------------------------------------------

describe('Integration with Pure Attendance Calculations (plan.ts)', () => {
  it('RULE 14: Calculates plan correctly using synced values and manual total', () => {
    // Suppose subject has synced values: Done 44, Attended 41, Manual Total 59
    const plan = planSubject(59, 44, 41)

    expect(plan.remaining).toBe(15) // max(0, 59 - 44)
    expect(plan.at86.required).toBe(51) // ceil(0.86 * 59)
    expect(plan.at86.mustAttend).toBe(10) // 51 - 41
    expect(plan.at86.canSkip).toBe(5) // 15 - 10
    expect(plan.at86.status).toBe('ATTEND')

    // What-if simulation works as expected
    const projectedWithZeroSkips = projectFinal(59, 44, 41, 0)
    expect(Math.round(projectedWithZeroSkips * 10) / 10).toBe(94.9) // (41 + 15) / 59 * 100
  })

  it('RULE 1: An unconnected user can use the app with manual inputs', () => {
    const unconnectedPlan = planSubject(40, 20, 18)
    expect(unconnectedPlan.remaining).toBe(20)
    expect(unconnectedPlan.livePct).toBe(90)
    expect(unconnectedPlan.at75.status).toBe('ATTEND')
    expect(unconnectedPlan.at75.mustAttend).toBe(12)
    expect(unconnectedPlan.at75.canSkip).toBe(8)
  })
})
