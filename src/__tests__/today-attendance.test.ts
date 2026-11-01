import { describe, it, expect } from 'vitest'
import {
  getTodayAttendanceData,
  parseTimeToMinutes,
  formatDisplayTime,
  normalizeToDateKey,
  normalizeAttendance,
  extractTimeRange,
} from '@/lib/todayAttendance'
import { getLectureWiseAttendance } from '@/lib/api'

describe('Today Attendance Service', () => {
  it('parses time strings to minutes from midnight for accurate ascending sorting', () => {
    expect(parseTimeToMinutes('09:10 AM')).toBe(9 * 60 + 10) // 550
    expect(parseTimeToMinutes('10:05 AM')).toBe(10 * 60 + 5) // 605
    expect(parseTimeToMinutes('11:00 AM')).toBe(11 * 60) // 660
    expect(parseTimeToMinutes('01:05 PM')).toBe(13 * 60 + 5) // 785
    expect(parseTimeToMinutes('02:00 PM')).toBe(14 * 60) // 840
    expect(parseTimeToMinutes('09:10')).toBe(9 * 60 + 10)
    expect(parseTimeToMinutes('14:30')).toBe(14 * 60 + 30)
    expect(parseTimeToMinutes('01:05 - 01:55 PM')).toBe(13 * 60 + 5)
  })

  it('formats display time properly across all formats', () => {
    expect(formatDisplayTime('09:10:00')).toBe('09:10 AM')
    expect(formatDisplayTime('13:05:00')).toBe('01:05 PM')
    expect(formatDisplayTime('01:05:00')).toBe('01:05 PM') // 1:05 college afternoon disambiguation
    expect(formatDisplayTime('02:00:00')).toBe('02:00 PM')
    expect(formatDisplayTime('09:10 AM')).toBe('09:10 AM')
    expect(formatDisplayTime('01:05 PM')).toBe('01:05 PM')
    expect(formatDisplayTime('2026-11-02 10:05:00')).toBe('10:05 AM')
    expect(formatDisplayTime('02/11/2026 09:10:00')).toBe('09:10 AM')
    expect(formatDisplayTime('02/11/2026 13:05:00')).toBe('01:05 PM')
  })

  it('normalizes various date formats to YYYY-MM-DD', () => {
    expect(normalizeToDateKey('2026-11-02')).toBe('2026-11-02')
    expect(normalizeToDateKey('2026-11-02 00:00:00')).toBe('2026-11-02')
    expect(normalizeToDateKey('02/11/2026')).toBe('2026-11-02')
    expect(normalizeToDateKey('02-11-2026')).toBe('2026-11-02')
    expect(normalizeToDateKey('2026/11/02')).toBe('2026-11-02')
  })

  it('normalizes attendance to three states: PRESENT, ABSENT, or NOT MARKED', () => {
    expect(normalizeAttendance('PRESENT')).toBe('PRESENT')
    expect(normalizeAttendance('Present')).toBe('PRESENT')
    expect(normalizeAttendance('P')).toBe('PRESENT')
    expect(normalizeAttendance('ABSENT')).toBe('ABSENT')
    expect(normalizeAttendance('Absent')).toBe('ABSENT')
    expect(normalizeAttendance('A')).toBe('ABSENT')
    expect(normalizeAttendance(null)).toBe('NOT MARKED')
    expect(normalizeAttendance('NOT MARKED')).toBe('NOT MARKED')
    expect(normalizeAttendance('PENDING')).toBe('NOT MARKED')
    expect(normalizeAttendance('')).toBe('NOT MARKED')
  })

  it('extracts start, end, and timeSlot accurately from ranges', () => {
    const range1 = extractTimeRange('09:10 - 10:00 AM')
    expect(range1.startTime).toBe('09:10 AM')
    expect(range1.endTime).toBe('10:00 AM')

    const range2 = extractTimeRange('01:05 - 01:55 PM')
    expect(range2.startTime).toBe('01:05 PM')
    expect(range2.endTime).toBe('01:55 PM')
  })

  it('retrieves today attendance with all scheduled classes and valid three status', async () => {
    const result = await getTodayAttendanceData(false)

    expect(result).toBeDefined()
    expect(result.classes.length).toBeGreaterThan(0)

    // Verify ascending order
    for (let i = 0; i < result.classes.length - 1; i++) {
      const current = result.classes[i]
      const next = result.classes[i + 1]
      expect(current!.rawMinutes).toBeLessThanOrEqual(next!.rawMinutes)
    }

    // Verify every class has one of the three statuses: PRESENT, ABSENT, NOT MARKED
    result.classes.forEach((cls) => {
      expect(['PRESENT', 'ABSENT', 'NOT MARKED']).toContain(cls.attendance)
      expect(cls.timeSlot).toBeDefined()
      expect(cls.courseCode).toBeDefined()
      // Room number should be removed
      expect((cls as any).classRoom).toBeUndefined()
    })

    // Verify counts match total classes
    expect(result.presentCount + result.absentCount + result.notMarkedCount).toBe(result.classes.length)
  })

  it('detects holiday and automatically retrieves last working day attendance', async () => {
    // Force holiday mode
    const result = await getTodayAttendanceData(true)

    expect(result.isHolidayToday).toBe(true)
    expect(result.isShowingLastWorkingDay).toBe(true)
    expect(result.lastWorkingDayFormatted).toBeDefined()
    expect(result.classes.length).toBeGreaterThan(0)

    // Verify last working day classes are also sorted ascending timewise
    for (let i = 0; i < result.classes.length - 1; i++) {
      expect(result.classes[i]!.rawMinutes).toBeLessThanOrEqual(result.classes[i + 1]!.rawMinutes)
    }

    result.classes.forEach((cls) => {
      expect(['PRESENT', 'ABSENT', 'NOT MARKED']).toContain(cls.attendance)
    })
  })

  it('sorts lecture history in descending order with latest class on top', () => {
    const rawLectures = [
      { planLecDate: '2026-10-18', timeSlot: '09:10 - 10:00 AM', topicCovered: 'Lecture 1', attendance: 'PRESENT' },
      { planLecDate: '2026-11-02', timeSlot: '09:10 - 10:00 AM', topicCovered: 'Lecture 4', attendance: 'PRESENT' },
      { planLecDate: '2026-10-25', timeSlot: '02:00 - 02:50 PM', topicCovered: 'Lecture 2', attendance: 'ABSENT' },
      { planLecDate: '2026-11-02', timeSlot: '01:05 - 01:55 PM', topicCovered: 'Lecture 5 (Afternoon)', attendance: 'PRESENT' },
      { planLecDate: '2026-10-31', timeSlot: '11:00 - 11:50 AM', topicCovered: 'Lecture 3', attendance: 'PRESENT' },
      { planLecDate: '01/11/2026', timeSlot: '10:05 - 10:55 AM', topicCovered: 'Lecture 3.5 (DD/MM/YYYY)', attendance: 'PRESENT' },
    ]

    const sorted = [...rawLectures].sort((a, b) => {
      const dateA = normalizeToDateKey(a.planLecDate)
      const dateB = normalizeToDateKey(b.planLecDate)
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA) // Descending: latest date first
      }
      const timeA = parseTimeToMinutes(a.timeSlot)
      const timeB = parseTimeToMinutes(b.timeSlot)
      return timeB - timeA // Descending: later time slot first on the same day
    })

    // Expect latest date and time on top (2026-11-02 01:05 PM)
    expect(sorted[0]!.topicCovered).toBe('Lecture 5 (Afternoon)')
    expect(sorted[1]!.topicCovered).toBe('Lecture 4') // 2026-11-02 09:10 AM
    expect(sorted[2]!.topicCovered).toBe('Lecture 3.5 (DD/MM/YYYY)') // 2026-11-01
    expect(sorted[3]!.topicCovered).toBe('Lecture 3') // 2026-10-31
    expect(sorted[4]!.topicCovered).toBe('Lecture 2') // 2026-10-25
    expect(sorted[5]!.topicCovered).toBe('Lecture 1') // 2026-10-18 (Oldest at bottom)
  })

  it('returns empty lecture array when conducted === 0', async () => {
    const lectures = await getLectureWiseAttendance({
      studentId: 10482,
      courseId: 501,
      courseCompId: 1001,
      conducted: 0,
    })
    expect(lectures).toEqual([])
  })
})
