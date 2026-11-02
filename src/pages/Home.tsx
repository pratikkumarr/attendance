import React, { useState, useEffect } from 'react'
import {
  UserDetails,
  DashboardAttendance,
  RegisteredCourse,
  TimetableEvent,
} from '@/types/bunkbook'
import { useTheme } from '@/ThemeContext'
import { CircularProgress } from '@/components/home/CircularProgress'
import { CourseCard } from '@/components/home/CourseCard'
import {
  getAttendanceAndDetails,
  getDashboardAttendance,
  getRegisteredCourses,
  getWeeklySchedule,
} from '@/lib/api'
import {
  subscribeSubjectMappings,
  registerUserCourses,
  calculateSkippables,
  fetchSubjectMappingsFromSupabase,
  initSubjectMappingsRealtime,
} from '@/lib/subjectMappingStore'
import {
  ShieldCheck,
  AlertTriangle,
  BookOpen,
  Calendar,
  Sparkles,
  TrendingUp,
  Layers,
  ArrowRight,
} from 'lucide-react'

interface HomeProps {
  onSelectCourse: (course: RegisteredCourse) => void
  onOpenAdmin: (targetCourseCode?: string) => void
  onNavigateToTab: (tab: any) => void
}

export const Home: React.FC<HomeProps> = ({
  onSelectCourse,
  onOpenAdmin,
  onNavigateToTab,
}) => {
  const { colors, isDark, isBrutalist } = useTheme()

  const [userData, setUserData] = useState<UserDetails | null>(null)
  const [dashboard, setDashboard] = useState<DashboardAttendance | null>(null)
  const [courses, setCourses] = useState<RegisteredCourse[]>([])
  const [timetable, setTimetable] = useState<TimetableEvent[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshKey, setRefreshKey] = useState<number>(0)

  // Listen to admin mappings changes, Realtime Supabase updates, and re-render
  useEffect(() => {
    initSubjectMappingsRealtime()
    fetchSubjectMappingsFromSupabase()

    const unsubscribe = subscribeSubjectMappings(() => {
      setRefreshKey((k) => k + 1)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      setLoading(true)
      try {
        const [u, d, c, t] = await Promise.all([
          getAttendanceAndDetails(),
          getDashboardAttendance(),
          getRegisteredCourses(),
          getWeeklySchedule(),
        ])
        if (mounted) {
          setUserData(u)
          setDashboard(d)
          setCourses(c)
          setTimetable(t)

          // Auto-discover and register user's subjects by subject code so any new subjects
          // immediately appear in the global subject mappings and the Admin Dashboard!
          registerUserCourses(
            c.map((crs) => ({
              courseCode: crs.courseCode,
              courseName: crs.courseName,
              totalLecture: crs.studentCourseCompDetails?.[0]?.totalLecture || 0,
            })),
          )
        }
      } catch (err) {
        console.error('Error fetching Home data:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchData()
    return () => {
      mounted = false
    }
  }, [refreshKey])

  // Aggregate totals
  const totalConducted = courses.reduce(
    (acc, c) => acc + (c.studentCourseCompDetails?.[0]?.totalLecture || 0),
    0,
  )
  const totalAttended = courses.reduce(
    (acc, c) => acc + (c.studentCourseCompDetails?.[0]?.presentLecture || 0),
    0,
  )
  const overallPercentage =
    totalConducted > 0
      ? (totalAttended / totalConducted) * 100
      : dashboard?.presentPerc || 80.0

  // "Safe Subjects" shows how many subjects will NEVER have less than 75% attendance —
  // even if the user skips all the remaining classes in the semester!
  const safeSubjectsCount = courses.filter((c) => {
    const d = c.studentCourseCompDetails?.[0]
    const p = d?.presentLecture || 0
    const t = d?.totalLecture || 0
    const calc = calculateSkippables(c.courseCode, c.courseName, p, t)
    return calc.isGuaranteedSafe75
  }).length

  const warningSubjectsCount = courses.length - safeSubjectsCount

  // Map today's timetable status to courseCode
  const getTodayStatusForCourse = (courseCode?: string) => {
    if (!courseCode) return undefined
    const today = new Date().toISOString().split('T')[0] || ''
    const matching = timetable.find(
      (ev) =>
        ev.courseCode === courseCode &&
        Boolean(ev.start && (ev.start.includes(today) || ev.start.includes('2026'))),
    )
    if (!matching) return undefined
    return 'SCHEDULED'
  }

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Student Welcome & Quick Info Card */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border transition-all ${
          isBrutalist
            ? 'bg-white dark:bg-zinc-950 border-4 border-black dark:border-white shadow-[6px_6px_0px_#000] dark:shadow-[6px_6px_0px_#fff]'
            : isDark
            ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/80 shadow-xl'
            : 'bg-gradient-to-br from-white to-indigo-50/40 border-slate-200/90 shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="min-w-0 flex-1">
            <span
              className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                isBrutalist
                  ? 'bg-[#FFD166] text-black border border-black font-mono'
                  : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              {userData?.branchShortName || 'CSE'} • {userData?.semesterName || '5th Sem'}
            </span>
            <h1 className="text-xl sm:text-2xl font-black mt-1 leading-tight tracking-tight">
              {userData?.fullName || 'KIET Student'}
            </h1>
            <p className="text-xs font-semibold opacity-75 mt-0.5" style={{ color: colors.subText }}>
              Roll No: <span className="font-mono">{userData?.rollNumber || '2100290120145'}</span> • KIET Group of Institutions
            </p>
          </div>

          {/* Quick Admin Shortcut Pill */}
          <button
            onClick={() => onOpenAdmin()}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95 ${
              isBrutalist
                ? 'bg-[#06D6A0] text-black border-2 border-black font-mono uppercase'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Map Subject Classes</span>
          </button>
        </div>
      </div>

      {/* Overall Attendance Progress Card */}
      <div
        className={`p-5 sm:p-6 rounded-3xl border transition-all ${
          isBrutalist
            ? 'bg-white dark:bg-zinc-950 border-4 border-black dark:border-white shadow-[6px_6px_0px_#000] dark:shadow-[6px_6px_0px_#fff]'
            : isDark
            ? 'bg-slate-800/90 border-slate-700/80 shadow-xl'
            : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base sm:text-lg font-black tracking-tight">
              Overall Attendance Status
            </h2>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              overallPercentage >= 75
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
            }`}
          >
            {overallPercentage >= 75 ? 'Safe Standing' : 'Critical Action'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Circular Progress Gauge */}
          <div className="flex-shrink-0">
            <CircularProgress
              percentage={overallPercentage}
              present={totalAttended}
              total={totalConducted}
              size={135}
              strokeWidth={11}
            />
          </div>

          {/* Quick Metrics & Smart Summary */}
          <div className="flex-1 w-full space-y-3">
            <div className="grid grid-cols-2 gap-2 text-center sm:text-left">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Total Attended
                </span>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {totalAttended} / {totalConducted}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                <span
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block"
                  title="Subjects that will stay at or above 75% even if you skip all remaining classes"
                >
                  Safe Subjects
                </span>
                <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {safeSubjectsCount} of {courses.length}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                  Never &lt; 75% if all skipped
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Attendance Shortcut Banner */}
      <div
        onClick={() => onNavigateToTab('today')}
        className={`cursor-pointer p-4 rounded-2xl border flex items-center justify-between gap-3 transition-transform active:scale-[0.99] ${
          isBrutalist
            ? 'bg-[#118AB2] text-white border-2 border-black dark:border-white shadow-[4px_4px_0px_#000]'
            : isDark
            ? 'bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border-indigo-800/40 hover:border-indigo-700'
            : 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200/80 hover:border-indigo-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/20 dark:bg-white/10 flex-shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-sm sm:text-base leading-tight">
              View Today's Attendance Log
            </div>
            <div className="text-xs opacity-80 mt-0.5">
              Check Present / Absent status sorted ascending timewise
            </div>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 flex-shrink-0" />
      </div>

      {/* Subject Wise Attendance Cards List */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" /> Registered Courses & Attendance
            </h2>
            <p className="text-xs opacity-75 mt-0.5" style={{ color: colors.subText }}>
              Tap any subject card to view remaining classes and 75% / 86% skippable calculator
            </p>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {courses.length} Subjects
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-semibold text-slate-500 animate-pulse">
            Loading attendance records from CyberVidya...
          </div>
        ) : courses.length === 0 ? (
          <div className="py-10 text-center text-xs font-medium text-slate-500">
            No registered courses found for current semester.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course, idx) => (
              <CourseCard
                key={course.courseId || idx}
                course={course}
                index={idx}
                todayStatus={getTodayStatusForCourse(course.courseCode)}
                onSelect={onSelectCourse}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
