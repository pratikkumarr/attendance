export interface UserDetails {
  fullName: string
  registrationNumber: string
  rollNumber: string
  branchShortName: string
  degreeName: string
  semesterName: string
  admissionBatchName: string
  studentId?: number
  profilePhoto?: string
  attendanceCourseComponentInfoList?: any[]
}

export interface DashboardAttendance {
  presentPerc: number
  absentPerc: number
}

export interface CourseComponentDetail {
  courseCompId: number
  courseCompFacultyName: string
  presentLecture: number
  totalLecture: number
}

export interface RegisteredCourse {
  studentId: number
  courseId: number
  courseCode: string
  courseName: string
  studentCourseCompDetails: CourseComponentDetail[]
}

export interface Lecture {
  planLecDate: string
  topicCovered: string | null
  attendance: 'PRESENT' | 'ABSENT' | string
  timeSlot?: string
}

export interface LectureWiseAttendance {
  presentCount: number
  lectureCount: number
  percent: number
  lectureList: Lecture[]
}

export interface TimetableEvent {
  type: 'CLASS' | 'HOLIDAY' | string
  start: string
  end: string
  courseName: string | null
  facultyName: string | null
  classRoom: string | null
  courseCode: string | null
  title: string
  content: string
}

export interface ExamSchedule {
  strExamDate: string
  courseName: string
  evalLevelComponentName: string
  courseCode: string
  strExamTime: string | null
  examMode: string
  examVenueName: string
  courseComponentName: string
  courseDetails?: string
}

export interface ExamSession {
  sessionId: number
  sessionName: string
}

export interface HallTicketOption {
  id: number
  title: string
}

export interface ExamScoreComponent {
  courseCompName: string
  compSessionLevelMarks: {
    grade: string
    result: string
    compEgp: number
    compCredits: number
  }[]
}

export interface ExamScoreSubject {
  courseCode: string
  courseName: string
  courseCompDTOList: ExamScoreComponent[]
  resultSort: string
}

export interface ExamScoreSemester {
  semesterName: string
  sgpa: number
  studentMarksDetailsDTO: ExamScoreSubject[]
}

export interface ExamScoreResponse {
  studentSemesterWiseMarksDetailsList: ExamScoreSemester[]
  cgpa: number
  fullName: string
  enrollmentNo?: string
}

/**
 * Subject Class Mapping Model:
 * Maps subject codes (e.g. KCS501) to:
 * - totalClasses (fixed total classes for the subject, set by admin for all students)
 * - remainingClasses dynamically adjusts: Math.max(0, totalClasses - conducted)
 */
export interface SubjectClassMapping {
  subjectCode: string // e.g. "KCS501"
  subjectName: string
  totalClasses: number // Fixed total classes for all students
  lastUpdated?: string
  updatedBy?: string
  isNewlyDiscovered?: boolean // Auto-added from student login
  discoveredAt?: string
}

/**
 * Calculation results for skippable classes
 */
export interface SkippableCalculation {
  subjectCode: string
  subjectName: string
  present: number
  conducted: number
  currentPercentage: number
  totalClasses: number // Fixed by admin for all students
  remainingClasses: number // Dynamic: adjusts as classes are done (totalClasses - conducted)
  totalProjectedClasses: number // Same as totalClasses (or max(totalClasses, conducted))

  // For 75% target:
  skippable75: number // how many of the remaining can be missed
  minAttend75: number // how many of remaining must be attended
  projectedPercentage75: number // % if you skip skippable75
  isAchievable75: boolean
  isGuaranteedSafe75: boolean // True if attendance will never drop below 75% even if all remaining classes are skipped
  maxPossiblePercentage: number

  // For 86% target:
  skippable86: number
  minAttend86: number
  projectedPercentage86: number
  isAchievable86: boolean

  // Immediate bunkable right now (standard BunkBook rule):
  immediateCanMiss: number
  immediateMustAttend: number
}
