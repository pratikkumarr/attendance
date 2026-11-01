/**
 * types.ts — CyberVidya Integration Type Definitions
 */

// ---------------------------------------------------------------------------
// CyberVidya Remote Portal API Responses (Reverse-Engineered)
// ---------------------------------------------------------------------------

/** Raw response from POST /api/auth/encrypt/login */
export interface CyberVidyaEncryptLoginResponse {
  data?: {
    transactionId?: string
    token?: string
    id?: number | string
  }
  token?: string
  message?: string
  error?: {
    reason?: string
    message?: string
  }
}

/** Raw response from POST /api/auth/verify/otp */
export interface CyberVidyaOtpResponse {
  data?: {
    token?: string
    id?: number | string
  }
  token?: string
  message?: string
  error?: {
    reason?: string
    message?: string
  }
}

/** Component of a course (e.g. Theory, Practical, Tutorial) */
export interface CyberVidyaAttendanceComponentInfo {
  courseComponentId: number
  componentName: string
  numberOfPeriods: number // Classes Done
  numberOfPresent: number // Classes Attended
  numberOfExtraAttendance?: number
  presentPercentage?: number | null
  presentPercentageWith?: string
  isProjected?: boolean
}

/** Course returned by GET /api/attendance/course/component/student */
export interface CyberVidyaCourseAttendanceInfo {
  courseName: string
  courseCode: string
  courseId: number
  attendanceCourseComponentNameInfoList: CyberVidyaAttendanceComponentInfo[]
}

/** Root student details returned by GET /api/attendance/course/component/student */
export interface CyberVidyaStudentDetails {
  fullName: string
  registrationNumber: string
  sectionName?: string
  branchShortName?: string
  degreeName?: string
  semesterName?: string
  attendanceCourseComponentInfoList: CyberVidyaCourseAttendanceInfo[]
}

export interface CyberVidyaAttendanceApiResponse {
  data: CyberVidyaStudentDetails
  message?: string
}

// ---------------------------------------------------------------------------
// Normalized Internal Models
// ---------------------------------------------------------------------------

/** Normalized representation of an individual course component from CyberVidya */
export interface NormalizedPortalSubject {
  /** Stable unique external identifier, e.g. "102_202" (courseId_componentId) */
  externalId: string
  studentId?: number
  courseId?: number
  courseCompId?: number
  courseCode: string
  courseName: string
  componentName: string
  /** Human-readable subject name suitable for the local attendance dashboard */
  suggestedSubjectName: string
  /** Number of classes conducted so far */
  classesDone: number
  /** Number of classes attended so far */
  classesAttended: number
  /** Any extra attendance granted */
  extraAttendance: number
  /** Portal attendance percentage if available */
  percentage: number | null
}

export interface NormalizedStudentInfo {
  fullName: string
  rollNumber: string
  sectionName?: string
  branch?: string
  degree?: string
  semester?: string
}

export interface NormalizedAttendanceData {
  student: NormalizedStudentInfo
  subjects: NormalizedPortalSubject[]
}

// ---------------------------------------------------------------------------
// Local Subject & Sync Models
// ---------------------------------------------------------------------------

/** Existing local subject record before or during sync */
export interface LocalSubjectRecord {
  name: string
  /**
   * Planned total classes for the semester.
   * Manually maintained by the student.
   * Null or 0 if not yet configured.
   */
  totalClasses: number | null
  classesDone: number
  classesAttended: number
  /** Derived remaining classes = max(0, totalClasses - classesDone) */
  remainingClasses: number | null
  /** Optional external ID if mapped from CyberVidya */
  externalId?: string | null
  /** Optional course code (e.g. BCS501, KCS051) configured by user or mapped */
  courseCode?: string | null
}

/** Result of merging a CyberVidya subject into a local record */
export interface SyncMergeResult {
  updatedSubject: LocalSubjectRecord
  isNew: boolean
  wasTotalPreserved: boolean
  requiresManualTotal: boolean
}

/** Overall synchronization outcome */
export interface SyncSummary {
  userName: string
  student: NormalizedStudentInfo
  totalSyncedSubjects: number
  updatedSubjectsCount: number
  newSubjectsCount: number
  syncedAt: string
  subjects: SyncMergeResult[]
}

// ---------------------------------------------------------------------------
// Client Request & Response Types for Serverless API
// ---------------------------------------------------------------------------

export type PortalMode = 'live' | 'proxy'

export interface LoginRequestBody {
  username: string
  password: string
  portalUrl?: string
  mode?: PortalMode
}

export interface LoginResponseBody {
  success: boolean
  requiresOtp: boolean
  transactionId?: string
  token?: string
  studentId?: number | string
  message?: string
  error?: string
}

export interface VerifyOtpRequestBody {
  transactionId: string
  otp: string
  portalUrl?: string
  mode?: PortalMode
}

export interface VerifyOtpResponseBody {
  success: boolean
  token?: string
  studentId?: number | string
  message?: string
  error?: string
}

export interface FetchAttendanceRequestBody {
  token: string
  portalUrl?: string
  mode?: PortalMode
}

export interface FetchAttendanceResponseBody {
  success: boolean
  data?: NormalizedAttendanceData
  message?: string
  error?: string
}

/** Record stored in Supabase for user sync state */
export interface CyberVidyaSyncRecord {
  user_name: string
  roll_number: string
  student_name?: string
  section_name?: string
  branch_name?: string
  last_synced_at: string
  status: 'synced' | 'error' | 'disconnected'
  synced_subjects_count?: number
}

/** Record stored in Supabase for stable subject mapping */
export interface CyberVidyaSubjectMapping {
  id?: number
  user_name: string
  external_id: string
  course_code?: string
  course_name: string
  component_name?: string
  subject_name: string
  classes_done: number
  classes_attended: number
  last_synced_at: string
}
