import {
  UserDetails,
  DashboardAttendance,
  RegisteredCourse,
  TimetableEvent,
  Lecture,
  ExamSchedule,
  ExamSession,
  HallTicketOption,
  ExamScoreResponse,
} from '@/types/bunkbook'
import { registerUserCourses } from './subjectMappingStore'

const AUTH_TOKEN_KEY = 'authToken'

// Auth Error event emitter
type AuthEventListener = () => void
let authErrorListeners: AuthEventListener[] = []

export const onAuthError = (listener: AuthEventListener) => {
  authErrorListeners.push(listener)
  return () => {
    authErrorListeners = authErrorListeners.filter((l) => l !== listener)
  }
}

export const emitAuthError = () => {
  authErrorListeners.forEach((l) => {
    try {
      l()
    } catch {
      // ignore
    }
  })
}

export const getAuthToken = (): string | null => {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (token === 'DEMO_STUDENT_TOKEN') {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem('bunkbook_is_demo_mode')
      return null
    }
    return token
  } catch {
    return null
  }
}

export const login = async (token: string): Promise<string> => {
  let cleanToken = token
  if (cleanToken.startsWith('"')) {
    try {
      cleanToken = JSON.parse(cleanToken)
    } catch {
      // ignore
    }
  }
  if (!cleanToken.includes('GlobalEducation')) {
    cleanToken = `GlobalEducation ${cleanToken}`
  }
  localStorage.setItem(AUTH_TOKEN_KEY, cleanToken)
  localStorage.removeItem('bunkbook_is_demo_mode')
  return cleanToken
}

export const logout = async () => {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem('bunkbook_is_demo_mode')
    localStorage.removeItem('CACHE_DASHBOARD')
    localStorage.removeItem('CACHE_COURSES')
    localStorage.removeItem('CACHE_PROFILE')
  } catch (e) {
    console.error('Logout error:', e)
  }
}

// Universal proxy call to /api/cybervidya
async function callCyberVidyaProxy(action: string, payload: Record<string, any> = {}): Promise<any> {
  const token = getAuthToken()
  const response = await fetch(`/api/cybervidya?action=${encodeURIComponent(action)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action,
      token,
      ...payload,
    }),
  })

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}))
    throw new Error(errorJson.error || errorJson.message || `Proxy call ${action} failed with HTTP ${response.status}`)
  }

  return response.json()
}

// 1. Login with Username & Password
export const loginApi = async (username: string, password: string): Promise<{ success: boolean; token?: string; requiresOtp?: boolean; transactionId?: string; error?: string }> => {
  try {
    const result = await callCyberVidyaProxy('login', { username, password })
    if (result.success && result.token) {
      await login(result.token)
    }
    return result
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Login failed. Please verify credentials or network.',
    }
  }
}

// 2. Verify OTP
export const verifyOtpApi = async (transactionId: string, otp: string): Promise<{ success: boolean; token?: string; error?: string }> => {
  try {
    const result = await callCyberVidyaProxy('verify-otp', { transactionId, otp })
    if (result.success && result.token) {
      await login(result.token)
    }
    return result
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'OTP verification failed.',
    }
  }
}

// 2b. Verify Admin Security Key
export const verifyAdminPasscode = async (passcode: string): Promise<{ success: boolean; error?: string }> => {
  const clean = passcode.trim()
  if (!clean) {
    return { success: false, error: 'Passcode cannot be empty.' }
  }

  try {
    const result = await callCyberVidyaProxy('verify-admin', { passcode: clean })
    return result
  } catch (err: any) {
    // Client-side fallback if proxy is offline or in mock test environment
    const clientKey = (import.meta.env.VITE_ADMIN_KEY || 'kiet@admin2026').trim()
    if (clean === clientKey) {
      return { success: true }
    }
    return {
      success: false,
      error: err?.message || 'Invalid Admin Passcode.',
    }
  }
}

// 3. User Details & Student Attendance Summary
export const getAttendanceAndDetails = async (): Promise<UserDetails> => {
  try {
    const result = await callCyberVidyaProxy('attendance')
    if (result.success && result.data?.student) {
      const s = result.data.student
      const user: UserDetails = {
        fullName: s.fullName || 'Student',
        registrationNumber: s.rollNumber || '',
        rollNumber: s.rollNumber || '',
        branchShortName: s.branch || '',
        degreeName: s.degree || '',
        semesterName: s.semester || '',
        admissionBatchName: s.admissionBatchName || '',
        profilePhoto: s.profilePhoto,
        attendanceCourseComponentInfoList: result.data.subjects || [],
      }
      localStorage.setItem('CACHE_PROFILE', JSON.stringify(user))
      return user
    }
    throw new Error('Malformed student profile response')
  } catch (err) {
    console.warn('Failed to fetch attendance details from proxy, using cache:', err)
    const cached = localStorage.getItem('CACHE_PROFILE')
    if (cached) return JSON.parse(cached)
    return {
      fullName: 'Student',
      registrationNumber: '',
      rollNumber: '',
      branchShortName: '',
      degreeName: '',
      semesterName: '',
      admissionBatchName: '',
      attendanceCourseComponentInfoList: [],
    }
  }
}

// 4. Dashboard Overall Attendance %
export const getDashboardAttendance = async (): Promise<DashboardAttendance> => {
  try {
    const result = await callCyberVidyaProxy('attendance')
    if (result.success && result.data?.subjects) {
      const subs = result.data.subjects as any[]
      const totalConducted = subs.reduce((acc, curr) => acc + (curr.classesDone || 0), 0)
      const totalAttended = subs.reduce((acc, curr) => acc + (curr.classesAttended || 0), 0)
      const presentPerc = totalConducted > 0 ? Number(((totalAttended / totalConducted) * 100).toFixed(1)) : 0
      const absentPerc = Number((100 - presentPerc).toFixed(1))

      const data: DashboardAttendance = { presentPerc, absentPerc }
      localStorage.setItem('CACHE_DASHBOARD', JSON.stringify(data))
      return data
    }
  } catch (err) {
    console.warn('Dashboard attendance fetch failed, checking cache:', err)
  }

  const cached = localStorage.getItem('CACHE_DASHBOARD')
  if (cached) return JSON.parse(cached)
  return { presentPerc: 0, absentPerc: 0 }
}

// 5. Registered Courses List
export const getRegisteredCourses = async (): Promise<RegisteredCourse[]> => {
  // 1. Try calling the direct registered-courses endpoint
  try {
    const regResult = await callCyberVidyaProxy('registered-courses')
    if (regResult.success && Array.isArray(regResult.data) && regResult.data.length > 0) {
      const courses: RegisteredCourse[] = regResult.data
      localStorage.setItem('CACHE_COURSES', JSON.stringify(courses))
      registerUserCourses(
        courses.map((c) => ({
          courseCode: c.courseCode,
          courseName: c.courseName,
          totalLecture: c.studentCourseCompDetails?.[0]?.totalLecture || 0,
        })),
      )
      return courses
    }
  } catch (err) {
    console.warn('Direct registered-courses fetch failed, checking attendance endpoint:', err)
  }

  // 2. Fallback to attendance endpoint
  try {
    const result = await callCyberVidyaProxy('attendance')
    if (result.success && Array.isArray(result.data?.subjects) && result.data.subjects.length > 0) {
      const courses: RegisteredCourse[] = result.data.subjects.map((s: any, idx: number) => ({
        studentId: s.studentId || 1000,
        courseId: s.courseId || (idx + 1),
        courseCode: s.courseCode || `SUB${idx + 1}`,
        courseName: s.suggestedSubjectName || s.courseName,
        studentCourseCompDetails: [
          {
            courseCompId: s.courseCompId || (idx + 100),
            courseCompFacultyName: 'Department Faculty',
            presentLecture: s.classesAttended,
            totalLecture: s.classesDone,
          },
        ],
      }))
      localStorage.setItem('CACHE_COURSES', JSON.stringify(courses))
      registerUserCourses(
        courses.map((c) => ({
          courseCode: c.courseCode,
          courseName: c.courseName,
          totalLecture: c.studentCourseCompDetails?.[0]?.totalLecture || 0,
        })),
      )
      return courses
    }
  } catch (err) {
    console.warn('Registered courses fetch failed, checking cache:', err)
  }

  const cached = localStorage.getItem('CACHE_COURSES')
  if (cached) {
    const parsed = JSON.parse(cached)
    registerUserCourses(
      parsed.map((c: any) => ({
        courseCode: c.courseCode,
        courseName: c.courseName,
        totalLecture: c.studentCourseCompDetails?.[0]?.totalLecture || 0,
      })),
    )
    return parsed
  }

  return []
}

// 6. Lecture-wise Detailed Attendance History
export const getLectureWiseAttendance = async (params: {
  studentId: number
  courseId: number
  courseCompId: number
  conducted?: number
}): Promise<Lecture[]> => {
  // If no classes have been conducted yet, return an empty array without dummy data
  if (params.conducted === 0) {
    return []
  }

  try {
    const result = await callCyberVidyaProxy('lecture-attendance', params)
    if (result.success && Array.isArray(result.data)) {
      return result.data
    }
  } catch (e) {
    console.log('Lecture detail fetch failed.')
  }

  return []
}

// 7. Weekly Timetable Schedule
export const getWeeklySchedule = async (): Promise<TimetableEvent[]> => {
  try {
    const result = await callCyberVidyaProxy('schedule')
    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
      return result.data
    }
  } catch (err) {
    console.warn('Weekly schedule fetch from proxy failed:', err)
  }

  return []
}

// 8. Student Profile Info
export const getStudentProfileInfo = async (): Promise<UserDetails> => {
  return getAttendanceAndDetails()
}

// 9. Exam Schedule (Datesheet)
export const getExamSchedule = async (): Promise<ExamSchedule[]> => {
  return []
}

// 10. Exam Scores & Results
export const getExamScore = async (): Promise<ExamScoreResponse | null> => {
  return null
}

// 11. Hall Ticket
export const getExamSession = async (_studentId: string | number): Promise<ExamSession[]> => {
  return [
    { sessionId: 20261, sessionName: 'Odd Semester 2026-27 (Regular)' },
    { sessionId: 20252, sessionName: 'Even Semester 2025-26 (Regular)' },
  ]
}

export const getHallTicketOptions = async (_sessionId: number): Promise<HallTicketOption[]> => {
  return [
    { id: 101, title: 'B.Tech V Semester Pre-University Examination Hall Ticket' },
    { id: 102, title: 'End Semester Practical & Viva-Voce Admit Card' },
  ]
}
