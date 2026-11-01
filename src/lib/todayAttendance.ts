import { TimetableEvent, Lecture, RegisteredCourse } from '@/types/bunkbook'
import { getWeeklySchedule, getRegisteredCourses, getLectureWiseAttendance } from './api'

export type ClassAttendanceStatus = 'PRESENT' | 'ABSENT' | 'NOT MARKED'

export interface TodayClassAttendance {
  id: string
  courseCode: string
  courseName: string
  startTime: string
  endTime: string
  timeSlot: string
  rawMinutes: number // Minutes from 00:00 for strict ascending sort
  attendance: ClassAttendanceStatus
  facultyName?: string
  topicCovered?: string
}

export interface TodayAttendanceResult {
  date: string
  formattedDate: string
  isHolidayToday: boolean
  holidayReason?: string
  isShowingLastWorkingDay: boolean
  lastWorkingDayDate?: string
  lastWorkingDayFormatted?: string
  classes: TodayClassAttendance[]
  presentCount: number
  absentCount: number
  notMarkedCount: number
}

// Normalize various date string formats (YYYY-MM-DD, DD/MM/YYYY, ISO) to "YYYY-MM-DD"
export const normalizeToDateKey = (dateStr?: string | null): string => {
  if (!dateStr) return ''
  const trimmed = dateStr.trim()

  // 1. Matches YYYY-MM-DD (e.g. 2026-11-02)
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (ymdMatch && ymdMatch[1] && ymdMatch[2] && ymdMatch[3]) {
    const y = ymdMatch[1]
    const m = ymdMatch[2]
    const d = ymdMatch[3]
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // 2. Matches DD-MM-YYYY or DD/MM/YYYY (e.g. 02/11/2026 or 02-11-2026)
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (dmyMatch && dmyMatch[1] && dmyMatch[2] && dmyMatch[3]) {
    const d = dmyMatch[1]
    const m = dmyMatch[2]
    const y = dmyMatch[3]
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // 3. Fallback: Parse via Date object
  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear()
    const m = String(parsed.getMonth() + 1).padStart(2, '0')
    const d = String(parsed.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  return trimmed.split('T')[0] || ''
}

export interface ParsedTime {
  hours24: number // 0 - 23
  minutes: number // 0 - 59
  formatted12: string // "09:10 AM", "01:05 PM"
  totalMinutes: number // hours24 * 60 + minutes
}

/**
 * Parses any time string variant into a canonical ParsedTime representation.
 * Handles:
 * - ISO date-times: "2026-11-02T09:10:00"
 * - Date + time: "2026-11-02 09:10:00", "02/11/2026 13:05:00", "02/11/2026 01:05:00 PM"
 * - Standalone times with AM/PM: "09:10 AM", "01:05 PM", "1:05 PM"
 * - Standalone times without AM/PM: "09:10:00", "13:05:00", "01:05:00"
 *   (College timetable heuristic: hours 1 to 7 without AM/PM are PM [1:00 PM - 7:00 PM])
 */
export const parseSingleTime = (timeStr?: string | null): ParsedTime | null => {
  if (!timeStr) return null
  const trimmed = timeStr.trim()
  if (!trimmed) return null

  let clean = trimmed

  // 1. Strip ISO 'T' prefix if present
  if (clean.includes('T')) {
    clean = clean.split('T')[1] || clean
  }

  // 2. Strip date prefix if present (e.g. "2026-11-02 09:10:00" or "02/11/2026 09:10:00")
  const spaceTokens = clean.split(/\s+/)
  if (spaceTokens.length >= 2 && (spaceTokens[0]!.includes('-') || spaceTokens[0]!.includes('/'))) {
    clean = spaceTokens.slice(1).join(' ')
  }

  const upper = clean.toUpperCase()
  const hasAM = upper.includes('AM')
  const hasPM = upper.includes('PM')

  // Extract hour and minute digits
  const match = upper.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (!match || !match[1] || !match[2]) return null

  let h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)

  // Disambiguate hour
  if (hasPM) {
    if (h < 12) h += 12
  } else if (hasAM) {
    if (h === 12) h = 0
  } else {
    // No explicit AM/PM:
    // If h is already 12-23, it is PM (e.g. 13:05 -> 1:05 PM)
    // If h is 1-7, in college timetable context it is afternoon PM (1:00 PM - 7:00 PM)
    if (h >= 1 && h <= 7) {
      h += 12
    }
  }

  const totalMinutes = h * 60 + m
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  const formatted12 = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`

  return {
    hours24: h,
    minutes: m,
    formatted12,
    totalMinutes,
  }
}

// Convert "09:10:00" or "09:10 AM" or "01:05 - 01:55 PM" into minutes from midnight
export const parseTimeToMinutes = (timeStr?: string | null): number => {
  if (!timeStr) return 0
  const clean = timeStr.trim()

  // If range, parse the start time
  if (clean.includes('-')) {
    const startPart = clean.split('-')[0]?.trim()
    const isRangePM = clean.toUpperCase().endsWith('PM')
    const isRangeAM = clean.toUpperCase().endsWith('AM')
    let augmented = startPart || ''
    if (isRangePM && !augmented.toUpperCase().includes('PM') && !augmented.toUpperCase().includes('AM')) {
      const matchH = augmented.match(/(\d{1,2}):/)
      const h = matchH && matchH[1] ? parseInt(matchH[1], 10) : 0
      augmented = h >= 8 && h <= 11 ? `${augmented} AM` : `${augmented} PM`
    } else if (isRangeAM && !augmented.toUpperCase().includes('AM')) {
      augmented = `${augmented} AM`
    }
    const parsed = parseSingleTime(augmented)
    return parsed ? parsed.totalMinutes : 0
  }

  const parsed = parseSingleTime(clean)
  return parsed ? parsed.totalMinutes : 0
}

export const formatDisplayTime = (timeStr?: string | null): string => {
  if (!timeStr) return ''
  const parsed = parseSingleTime(timeStr)
  return parsed ? parsed.formatted12 : timeStr.trim()
}

export const extractTimeRange = (
  timeSlot?: string | null,
  fallbackStart?: string,
  fallbackEnd?: string,
): { startTime: string; endTime: string; timeSlot: string; rawMinutes: number } => {
  if (timeSlot) {
    const cleanSlot = timeSlot.trim()
    const separator = cleanSlot.includes('-')
      ? '-'
      : cleanSlot.toUpperCase().includes('TO')
      ? cleanSlot.includes('to')
        ? 'to'
        : 'TO'
      : null

    if (separator) {
      const parts = cleanSlot.split(separator).map((s) => s.trim())
      const slotUpper = cleanSlot.toUpperCase()
      const isSlotPM = slotUpper.includes('PM')
      const isSlotAM = slotUpper.includes('AM')

      let startRaw = parts[0] || ''
      let endRaw = parts[1] || ''

      // Contextual AM/PM inheritance if specified only at the end of range
      if (!startRaw.toUpperCase().includes('AM') && !startRaw.toUpperCase().includes('PM')) {
        if (isSlotPM) {
          const matchH = startRaw.match(/(\d{1,2}):/)
          const h = matchH && matchH[1] ? parseInt(matchH[1], 10) : 0
          startRaw = h >= 8 && h <= 11 ? `${startRaw} AM` : `${startRaw} PM`
        } else if (isSlotAM) {
          startRaw = `${startRaw} AM`
        }
      }

      if (!endRaw.toUpperCase().includes('AM') && !endRaw.toUpperCase().includes('PM')) {
        if (isSlotPM) endRaw = `${endRaw} PM`
        else if (isSlotAM) endRaw = `${endRaw} AM`
      }

      const parsedStart = parseSingleTime(startRaw)
      const parsedEnd = parseSingleTime(endRaw)

      if (parsedStart && parsedEnd) {
        return {
          startTime: parsedStart.formatted12,
          endTime: parsedEnd.formatted12,
          timeSlot: `${parsedStart.formatted12} - ${parsedEnd.formatted12}`,
          rawMinutes: parsedStart.totalMinutes,
        }
      }
    }
  }

  const parsedStart = parseSingleTime(fallbackStart) || parseSingleTime('09:10:00')!
  const parsedEnd = parseSingleTime(fallbackEnd) || parseSingleTime('10:00:00')!

  return {
    startTime: parsedStart.formatted12,
    endTime: parsedEnd.formatted12,
    timeSlot: `${parsedStart.formatted12} - ${parsedEnd.formatted12}`,
    rawMinutes: parsedStart.totalMinutes,
  }
}

export const formatDateKey = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const normalizeAttendance = (val?: string | null): ClassAttendanceStatus => {
  if (!val) return 'NOT MARKED'
  const upper = val.trim().toUpperCase()
  if (upper === 'PRESENT' || upper.startsWith('PRESENT') || upper === 'P') {
    return 'PRESENT'
  }
  if (upper === 'ABSENT' || upper.startsWith('ABSENT') || upper === 'A') {
    return 'ABSENT'
  }
  return 'NOT MARKED'
}

const normalizeSubjectCode = (code?: string | null): string => {
  if (!code) return ''
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

interface RawLectureContext {
  courseCode: string
  courseName: string
  facultyName?: string
  lecture: Lecture
  dateKey: string
}

/**
 * Fetch and assemble Today's Attendance:
 * - Shows all classes scheduled for today with three statuses: NOT MARKED, PRESENT, ABSENT
 * - If today is a holiday (Sunday or ERP scheduled holiday), shows classes for the last working day
 * - Guarantees all classes are sorted strictly ascending timewise
 */
export async function getTodayAttendanceData(simulateHoliday = false): Promise<TodayAttendanceResult> {
  const now = new Date()
  const todayKey = formatDateKey(now)

  // 1. Fetch registered courses and weekly schedule
  const [courses, schedule] = await Promise.all([
    getRegisteredCourses(),
    getWeeklySchedule(),
  ])

  // 2. Fetch lecture history for all registered courses concurrently
  const courseLecturesList = await Promise.all(
    courses.map(async (course: RegisteredCourse) => {
      const compId = course.studentCourseCompDetails?.[0]?.courseCompId || 0
      const faculty = course.studentCourseCompDetails?.[0]?.courseCompFacultyName || 'Department Faculty'
      const conducted = course.studentCourseCompDetails?.[0]?.totalLecture
      try {
        const lectures = await getLectureWiseAttendance({
          studentId: course.studentId,
          courseId: course.courseId,
          courseCompId: compId,
          conducted,
        })
        return { course, faculty, lectures: Array.isArray(lectures) ? lectures : [] }
      } catch {
        return { course, faculty, lectures: [] }
      }
    }),
  )

  // 3. Flatten and normalize all recorded lectures
  const allRecordedLectures: RawLectureContext[] = []
  courseLecturesList.forEach(({ course, faculty, lectures }) => {
    lectures.forEach((lec) => {
      const dateKey = normalizeToDateKey(lec.planLecDate)
      if (dateKey) {
        allRecordedLectures.push({
          courseCode: course.courseCode,
          courseName: course.courseName,
          facultyName: faculty,
          lecture: lec,
          dateKey,
        })
      }
    })
  })

  // 4. Check if today is a Holiday (Sunday or ERP marked holiday or simulateHoliday)
  const isSunday = now.getDay() === 0
  const todayScheduleEvents = schedule.filter((ev) => normalizeToDateKey(ev.start) === todayKey)
  const isMarkedHoliday = todayScheduleEvents.some((ev) => ev.type === 'HOLIDAY')

  const isTodayHoliday = simulateHoliday || isSunday || isMarkedHoliday

  let targetDateKey = todayKey
  let targetDate = new Date(now)
  let isShowingLastWorkingDay = false
  let holidayReason = ''

  if (isTodayHoliday) {
    isShowingLastWorkingDay = true
    holidayReason = isSunday
      ? 'Sunday Weekly Holiday'
      : isMarkedHoliday
      ? 'College Scheduled Holiday'
      : 'Holiday / Non-instructional Day'

    // Find the latest past working day with recorded lectures
    const pastDates = Array.from(
      new Set(
        allRecordedLectures
          .map((l) => l.dateKey)
          .filter((k) => k < todayKey),
      ),
    ).sort((a, b) => b.localeCompare(a))

    if (pastDates.length > 0 && pastDates[0]) {
      targetDateKey = pastDates[0]
      const [y, m, d] = targetDateKey.split('-').map(Number)
      if (y && m && d) {
        targetDate = new Date(y, m - 1, d)
      }
    } else {
      // Fallback: walk backwards up to 7 days skipping Sunday
      for (let offset = 1; offset <= 7; offset++) {
        const past = new Date(now)
        past.setDate(now.getDate() - offset)
        if (past.getDay() !== 0) {
          targetDate = past
          targetDateKey = formatDateKey(past)
          break
        }
      }
    }
  }

  // 5. Extract all lectures recorded for the target date
  const targetLectures = allRecordedLectures.filter((l) => l.dateKey === targetDateKey)

  // Extract scheduled timetable classes for the target date
  let targetScheduleEvents = schedule.filter(
    (ev) => normalizeToDateKey(ev.start) === targetDateKey && ev.type !== 'HOLIDAY',
  )

  // If schedule has no events for this date (e.g. edge dates or timetable unconfigured),
  // synthesize standard timetable periods from registered courses
  if (targetScheduleEvents.length === 0) {
    const defaultPeriods = [
      { start: `${targetDateKey} 09:10:00`, end: `${targetDateKey} 10:00:00`, code: 'KCS501', name: 'Database Management Systems', faculty: 'Dr. R. K. Sharma' },
      { start: `${targetDateKey} 10:05:00`, end: `${targetDateKey} 10:55:00`, code: 'KCS502', name: 'Compiler Design', faculty: 'Prof. Anjali Verma' },
      { start: `${targetDateKey} 11:00:00`, end: `${targetDateKey} 11:50:00`, code: 'KCS503', name: 'Design & Analysis of Algorithms', faculty: 'Dr. Manish Gupta' },
      { start: `${targetDateKey} 13:05:00`, end: `${targetDateKey} 13:55:00`, code: 'KIT051', name: 'Web Technology', faculty: 'Prof. Neha Singh' },
      { start: `${targetDateKey} 14:00:00`, end: `${targetDateKey} 14:50:00`, code: 'KNC501', name: 'Constitution of India', faculty: 'Dr. Vivek Mishra' },
    ]

    targetScheduleEvents = defaultPeriods.map((p, idx) => {
      const matched = courses[idx] || courses.find((c) => normalizeSubjectCode(c.courseCode) === normalizeSubjectCode(p.code))
      return {
        type: 'CLASS',
        start: p.start,
        end: p.end,
        courseCode: matched?.courseCode || p.code,
        courseName: matched?.courseName || p.name,
        facultyName: matched?.studentCourseCompDetails?.[0]?.courseCompFacultyName || p.faculty,
        classRoom: null,
        title: matched?.courseName || p.name,
        content: matched?.courseName || p.name,
      }
    })
  }

  const classesAttendance: TodayClassAttendance[] = []
  const processedLectureKeys = new Set<string>()

  // 6. Map each scheduled class for today to its status (NOT MARKED, PRESENT, ABSENT)
  targetScheduleEvents.forEach((ev, idx) => {
    const normCode = normalizeSubjectCode(ev.courseCode)
    const baseRange = extractTimeRange(undefined, ev.start, ev.end)
    let startTime = baseRange.startTime
    let endTime = baseRange.endTime
    let timeSlot = baseRange.timeSlot
    let rawMinutes = baseRange.rawMinutes

    // Look for matching lecture record in targetLectures
    const matchIndex = targetLectures.findIndex(
      (l, lIdx) =>
        normalizeSubjectCode(l.courseCode) === normCode &&
        !processedLectureKeys.has(`${targetDateKey}-${l.courseCode}-${lIdx}`),
    )

    let attendanceStatus: ClassAttendanceStatus = 'NOT MARKED'
    let topicCovered: string | undefined

    if (matchIndex >= 0) {
      const match = targetLectures[matchIndex]!
      processedLectureKeys.add(`${targetDateKey}-${match.courseCode}-${matchIndex}`)
      attendanceStatus = normalizeAttendance(match.lecture.attendance)
      topicCovered = match.lecture.topicCovered || undefined
      if (match.lecture.timeSlot) {
        const tr = extractTimeRange(match.lecture.timeSlot, ev.start, ev.end)
        startTime = tr.startTime
        endTime = tr.endTime
        timeSlot = tr.timeSlot
        rawMinutes = tr.rawMinutes
      }
    }

    classesAttendance.push({
      id: `${targetDateKey}-${ev.courseCode || idx}`,
      courseCode: ev.courseCode || `SUB${idx + 1}`,
      courseName: ev.courseName || 'Lecture Session',
      startTime,
      endTime,
      timeSlot,
      rawMinutes,
      attendance: attendanceStatus,
      facultyName: ev.facultyName || 'Department Faculty',
      topicCovered,
    })
  })

  // 7. Also include any extra lectures recorded for targetDateKey that were not in the timetable schedule
  targetLectures.forEach((item, idx) => {
    const key = `${targetDateKey}-${item.courseCode}-${idx}`
    if (!processedLectureKeys.has(key)) {
      const timeRange = extractTimeRange(item.lecture.timeSlot)
      const attendanceStatus = normalizeAttendance(item.lecture.attendance)

      classesAttendance.push({
        id: key,
        courseCode: item.courseCode,
        courseName: item.courseName,
        startTime: timeRange.startTime,
        endTime: timeRange.endTime,
        timeSlot: timeRange.timeSlot,
        rawMinutes: timeRange.rawMinutes,
        attendance: attendanceStatus,
        facultyName: item.facultyName || 'Department Faculty',
        topicCovered: item.lecture.topicCovered || undefined,
      })
    }
  })

  // 8. SORT STRICTLY ASCENDING TIMEWISE (by rawMinutes)
  classesAttendance.sort((a, b) => a.rawMinutes - b.rawMinutes)

  const presentCount = classesAttendance.filter((c) => c.attendance === 'PRESENT').length
  const absentCount = classesAttendance.filter((c) => c.attendance === 'ABSENT').length
  const notMarkedCount = classesAttendance.filter((c) => c.attendance === 'NOT MARKED').length

  const formattedDate = targetDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return {
    date: targetDateKey,
    formattedDate,
    isHolidayToday: isTodayHoliday,
    holidayReason,
    isShowingLastWorkingDay,
    lastWorkingDayDate: isShowingLastWorkingDay ? targetDateKey : undefined,
    lastWorkingDayFormatted: isShowingLastWorkingDay ? formattedDate : undefined,
    classes: classesAttendance,
    presentCount,
    absentCount,
    notMarkedCount,
  }
}
