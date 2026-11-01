import React, { useState, useEffect } from 'react'
import { RegisteredCourse, Lecture } from '@/types/bunkbook'
import { useTheme } from '@/ThemeContext'
import { calculateSkippables } from '@/lib/subjectMappingStore'
import { getLectureWiseAttendance } from '@/lib/api'
import { normalizeToDateKey, parseTimeToMinutes } from '@/lib/todayAttendance'
import {
  X,
  Calendar,
  CheckCircle2,
  XCircle,
  Layers,
  BookOpen,
  ShieldCheck,
} from 'lucide-react'

interface CourseDetailsModalProps {
  course: RegisteredCourse | null
  onClose: () => void
  onOpenAdmin: (targetCourseCode?: string) => void
}

export const CourseDetailsModal: React.FC<CourseDetailsModalProps> = ({
  course,
  onClose,
}) => {
  const { colors, isDark, isBrutalist } = useTheme()

  if (!course) return null

  const { courseName, courseCode, courseId, studentId, studentCourseCompDetails } = course
  const details = studentCourseCompDetails?.[0]
  const present = details?.presentLecture || 0
  const conducted = details?.totalLecture || 0
  const courseCompId = details?.courseCompId || 101

  // Lecture history
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [loadingLectures, setLoadingLectures] = useState<boolean>(true)

  // Skippable calculation based on subject code mapping
  const calc = calculateSkippables(courseCode, courseName, present, conducted)

  useEffect(() => {
    if (conducted === 0) {
      setLectures([])
      setLoadingLectures(false)
      return
    }

    // Fetch lectures and sort in descending order (latest class on top, oldest on bottom)
    const fetchLectures = async () => {
      setLoadingLectures(true)
      try {
        const data = await getLectureWiseAttendance({
          studentId: studentId || 1000,
          courseId,
          courseCompId,
          conducted,
        })
        const sorted = (Array.isArray(data) ? [...data] : []).sort((a, b) => {
          const dateA = normalizeToDateKey(a.planLecDate)
          const dateB = normalizeToDateKey(b.planLecDate)
          if (dateA !== dateB) {
            // Descending order: latest date first
            return dateB.localeCompare(dateA)
          }
          const timeA = parseTimeToMinutes(a.timeSlot)
          const timeB = parseTimeToMinutes(b.timeSlot)
          // Descending order: later time slot first on the same day
          return timeB - timeA
        })
        setLectures(sorted)
      } catch (e) {
        console.error('Failed to load lectures:', e)
      } finally {
        setLoadingLectures(false)
      }
    }

    fetchLectures()
  }, [courseId, courseCode, conducted, courseCompId, studentId, calc.totalClasses])

  // Format date helper (handles DD/MM/YYYY, YYYY-MM-DD, and ISO)
  const formatDate = (dateStr: string) => {
    try {
      const dateKey = normalizeToDateKey(dateStr)
      if (dateKey) {
        const [y, m, d] = dateKey.split('-').map(Number)
        if (y && m && d) {
          const dt = new Date(y, m - 1, d)
          return dt.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        }
      }
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div
        className={`w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden border shadow-2xl transition-all ${
          isBrutalist
            ? 'bg-white dark:bg-zinc-950 border-4 border-black dark:border-white shadow-[8px_8px_0px_#000] dark:shadow-[8px_8px_0px_#fff]'
            : isDark
            ? 'bg-slate-900 border-slate-700/80 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`p-4 sm:p-5 flex items-start justify-between border-b ${
            isBrutalist
              ? 'bg-[#118AB2] text-white border-b-4 border-black dark:border-white'
              : isDark
              ? 'bg-slate-800/80 border-slate-700'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-black uppercase font-mono tracking-wider ${
                  isBrutalist
                    ? 'bg-[#FFD166] text-black border border-black'
                    : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                }`}
              >
                {courseCode}
              </span>
              {calc.isGuaranteedSafe75 && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${
                    isBrutalist
                      ? 'bg-[#06D6A0] text-black border border-black font-mono shadow-[2px_2px_0px_#000]'
                      : 'bg-emerald-500 text-white dark:bg-emerald-600'
                  }`}
                  title="Guaranteed: Even if all remaining classes are skipped, attendance will not fall below 75%"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Safe 75%
                </span>
              )}
              <span className="text-xs font-semibold opacity-75">
                {details?.courseCompFacultyName || 'Dept Faculty'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black leading-tight line-clamp-2">
              {courseName}
            </h2>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-transform hover:scale-105 active:scale-95 ${
              isBrutalist
                ? 'bg-black text-white dark:bg-white dark:text-black border-2 border-black'
                : 'bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
            }`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Top Info Grid: Attended vs Conducted (Target % Removed) */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center sm:text-left">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Current Conducted</div>
              <div className="text-lg font-black mt-0.5">{conducted} classes</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center sm:text-left">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Attended</div>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{present} classes</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center sm:text-left">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Current %</div>
              <div
                className={`text-lg font-black mt-0.5 ${
                  calc.currentPercentage >= 75
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : calc.currentPercentage >= 65
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {calc.currentPercentage.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Total Classes Scheduled Banner */}
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-2 ${
              isBrutalist
                ? 'bg-[#FFD166] text-black border-2 border-black font-mono shadow-[3px_3px_0px_#000]'
                : isDark
                ? 'bg-slate-800/80 border-slate-700 text-slate-100'
                : 'bg-indigo-50/70 border-indigo-200/80 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600 text-white flex-shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="font-extrabold text-sm sm:text-base">
                Total classes scheduled = <span className="font-black text-indigo-600 dark:text-indigo-400">{calc.totalClasses}</span> classes
              </div>
            </div>

            <div className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono">
              {calc.remainingClasses} remaining
            </div>
          </div>

          {/* Skippable Classes for 75% and 86% Attendance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 75% Skippable Card */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                isBrutalist
                  ? 'bg-white dark:bg-zinc-900 border-2 border-black dark:border-white shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#fff]'
                  : isDark
                  ? 'bg-slate-800/80 border-slate-700'
                  : 'bg-emerald-50/60 border-emerald-200/90'
              }`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Target 75% Attendance
                </span>
                <div className="flex items-center gap-1.5">
                  {calc.isGuaranteedSafe75 && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm ${
                        isBrutalist
                          ? 'bg-[#06D6A0] text-black border border-black font-mono shadow-[2px_2px_0px_#000]'
                          : 'bg-emerald-500 text-white dark:bg-emerald-600'
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3" /> Safe 75%
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    University Min: 75%
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
                  {calc.skippable75}
                </span>
                <span className="text-sm font-bold opacity-80" style={{ color: colors.subText }}>
                  classes skippable
                </span>
              </div>

              <div className="mt-2.5 text-xs space-y-1 font-medium" style={{ color: colors.subText }}>
                {calc.skippable75 >= calc.remainingClasses ? (
                  <p className="text-emerald-700 dark:text-emerald-300 font-semibold">
                    🎉 Outstanding! You can safely skip <strong>ALL {calc.remainingClasses}</strong> remaining classes and still maintain at least 75.0% attendance.
                  </p>
                ) : calc.isAchievable75 ? (
                  <>
                    <p>
                      You can skip up to <strong>{calc.skippable75}</strong> of the {calc.remainingClasses} remaining classes.
                    </p>
                    <p>
                      Minimum classes to attend: <strong>{calc.minAttend75}</strong> classes.
                    </p>
                    <p className="text-[11px] opacity-75">
                      Projected attendance if {calc.skippable75} skipped:{' '}
                      <strong className="text-emerald-600">{calc.projectedPercentage75.toFixed(1)}%</strong>
                    </p>
                  </>
                ) : (
                  <p className="text-rose-600 dark:text-rose-400 font-bold">
                    ⚠️ Cannot reach 75%. Even attending all {calc.remainingClasses} remaining classes yields a maximum of {calc.maxPossiblePercentage.toFixed(1)}%.
                  </p>
                )}
              </div>
            </div>

            {/* 86% Skippable Card */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                isBrutalist
                  ? 'bg-white dark:bg-zinc-900 border-2 border-black dark:border-white shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#fff]'
                  : isDark
                  ? 'bg-slate-800/80 border-slate-700'
                  : 'bg-indigo-50/60 border-indigo-200/90'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Target 86% Attendance
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  Scholar/Elite Req: 86%
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400">
                  {calc.skippable86}
                </span>
                <span className="text-sm font-bold opacity-80" style={{ color: colors.subText }}>
                  classes skippable
                </span>
              </div>

              <div className="mt-2.5 text-xs space-y-1 font-medium" style={{ color: colors.subText }}>
                {calc.skippable86 >= calc.remainingClasses ? (
                  <p className="text-indigo-700 dark:text-indigo-300 font-semibold">
                    ⭐ Excellent! You can skip <strong>all {calc.remainingClasses}</strong> remaining classes and still stay above 86.0%.
                  </p>
                ) : calc.isAchievable86 ? (
                  <>
                    <p>
                      You can skip up to <strong>{calc.skippable86}</strong> of the {calc.remainingClasses} remaining classes.
                    </p>
                    <p>
                      Minimum classes to attend: <strong>{calc.minAttend86}</strong> classes.
                    </p>
                    <p className="text-[11px] opacity-75">
                      Projected attendance if {calc.skippable86} skipped:{' '}
                      <strong className="text-indigo-600">{calc.projectedPercentage86.toFixed(1)}%</strong>
                    </p>
                  </>
                ) : (
                  <p className="text-amber-600 dark:text-amber-400 font-bold">
                    ⚠️ Cannot reach 86%. Maximum possible is {calc.maxPossiblePercentage.toFixed(1)}% even if attending all {calc.remainingClasses} remaining classes.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Lecture-wise Attendance Log */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" /> Lecture-Wise History & Attendance
              </h3>
              {conducted > 0 && (
                <span className="text-xs font-semibold opacity-60">
                  {lectures.length} records logged
                </span>
              )}
            </div>

            {conducted === 0 ? (
              <div
                className={`py-8 px-4 text-center rounded-2xl border ${
                  isBrutalist
                    ? 'border-2 border-black dark:border-white bg-[#FFD166]/20'
                    : isDark
                    ? 'bg-slate-800/40 border-slate-700/60'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="font-black text-sm sm:text-base text-slate-700 dark:text-slate-300">
                  No classes done
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  No lectures have been conducted for this subject yet.
                </div>
              </div>
            ) : loadingLectures ? (
              <div className="py-8 text-center text-xs font-semibold text-slate-500 animate-pulse">
                Loading detailed lecture history from CyberVidya...
              </div>
            ) : lectures.length === 0 ? (
              <div className="py-6 text-center text-xs font-medium text-slate-500">
                No individual lecture logs recorded yet for this subject.
              </div>
            ) : (
              <div className="space-y-2">
                {lectures.map((lec, idx) => {
                  const isPresent = lec.attendance === 'PRESENT'
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                        isBrutalist
                          ? 'border border-black dark:border-white bg-white dark:bg-zinc-900'
                          : isDark
                          ? 'bg-slate-800/60 border-slate-700/60'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs font-semibold opacity-70">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(lec.planLecDate)}</span>
                          {lec.timeSlot && <span className="opacity-60">• {lec.timeSlot}</span>}
                        </div>
                        {lec.topicCovered && (
                          <div className="text-xs font-medium mt-1 text-slate-800 dark:text-slate-200 line-clamp-1">
                            {lec.topicCovered}
                          </div>
                        )}
                      </div>

                      <div
                        className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 flex-shrink-0 ${
                          isPresent
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                        }`}
                      >
                        {isPresent ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> PRESENT
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" /> ABSENT
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`p-3 sm:p-4 border-t flex items-center justify-between ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <span className="text-xs font-medium opacity-70">
            Subject Code: <strong className="font-mono">{courseCode}</strong>
          </span>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-transform active:scale-95 ${
              isBrutalist
                ? 'bg-black text-white dark:bg-white dark:text-black border-2 border-black'
                : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
