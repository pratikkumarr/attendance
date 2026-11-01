import React from 'react'
import { RegisteredCourse } from '@/types/bunkbook'
import { useTheme } from '@/ThemeContext'
import { calculateSkippables } from '@/lib/subjectMappingStore'
import {
  CheckCircle2,
  XCircle,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'

interface CourseCardProps {
  course: RegisteredCourse
  index: number
  todayStatus?: 'PRESENT' | 'ABSENT' | 'PENDING' | 'SCHEDULED' | string
  onSelect: (course: RegisteredCourse) => void
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  index,
  todayStatus,
  onSelect,
}) => {
  const { colors, isDark, isBrutalist } = useTheme()
  const { courseName, courseCode, studentCourseCompDetails } = course
  const details = studentCourseCompDetails?.[0]

  const present = details?.presentLecture || 0
  const conducted = details?.totalLecture || 0
  const percentage = conducted > 0 ? (present / conducted) * 100 : 100

  // Calculate new skippables for 75% and 86% mapped by subject code
  const calc = calculateSkippables(courseCode, courseName, present, conducted)

  // Color logic
  let statusColor = colors.success
  let statusBg = isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)'
  let statusBorder = isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)'

  if (percentage < 65) {
    statusColor = colors.danger
    statusBg = isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)'
    statusBorder = isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'
  } else if (percentage < 75) {
    statusColor = colors.warning
    statusBg = isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)'
    statusBorder = isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)'
  }

  // Render Today's status badge
  const renderTodayBadge = () => {
    if (!todayStatus || todayStatus === 'SCHEDULED' || todayStatus === 'Upcoming' || todayStatus === 'upcoming') {
      return null
    }

    if (todayStatus === 'PRESENT') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" /> Present Today
        </span>
      )
    }
    if (todayStatus === 'ABSENT') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
          <XCircle className="w-3.5 h-3.5" /> Absent Today
        </span>
      )
    }
    return null
  }

  return (
    <div
      onClick={() => onSelect(course)}
      className={`group cursor-pointer rounded-2xl p-4 sm:p-5 transition-all duration-200 border ${
        isBrutalist
          ? 'bg-white dark:bg-zinc-950 border-2 border-black dark:border-white shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#fff] hover:translate-x-[-2px] hover:translate-y-[-2px]'
          : isDark
          ? 'bg-slate-800/90 hover:bg-slate-800 border-slate-700/60 shadow-lg shadow-black/20'
          : 'bg-white hover:bg-slate-50/80 border-slate-200/80 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Header Row: Subject Code Badge + Course Name + Overall % Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider ${
                isBrutalist
                  ? 'bg-[#FFD166] text-black border border-black font-mono'
                  : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono'
              }`}
            >
              {courseCode || 'KIET'}
            </span>
            {calc.isGuaranteedSafe75 && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                  isBrutalist
                    ? 'bg-[#06D6A0] text-black border border-black font-mono shadow-[2px_2px_0px_#000]'
                    : 'bg-emerald-500 text-white dark:bg-emerald-600'
                }`}
                title="Guaranteed: Even if all remaining classes are skipped, attendance will not fall below 75%"
              >
                <ShieldCheck className="w-3 h-3" /> Safe 75%
              </span>
            )}
            {renderTodayBadge()}
          </div>
          <h3
            className={`font-bold text-base sm:text-lg leading-snug line-clamp-2 ${
              isBrutalist ? 'font-black tracking-tight text-black dark:text-white' : ''
            }`}
            style={{ color: isBrutalist ? undefined : colors.text }}
          >
            {courseName}
          </h3>
        </div>

        {/* Percentage badge */}
        <div
          className={`px-3 py-1.5 rounded-xl flex items-center justify-center flex-shrink-0 border transition-transform group-hover:scale-105 ${
            isBrutalist ? 'border-2 border-black dark:border-white' : ''
          }`}
          style={{
            backgroundColor: isBrutalist ? (isDark ? '#000' : '#FFF') : statusBg,
            borderColor: isBrutalist ? undefined : statusBorder,
          }}
        >
          <span
            className="font-black text-base sm:text-lg tracking-tight"
            style={{ color: isBrutalist ? (isDark ? '#FFF' : '#000') : statusColor }}
          >
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Meta Attended Row */}
      <div className="mt-3 flex items-center justify-between text-xs font-semibold" style={{ color: colors.subText }}>
        <span>
          <strong className="text-sm font-bold" style={{ color: colors.text }}>
            {present}
          </strong>{' '}
          of {conducted} Attended
        </span>
        <span className="text-right opacity-80">
          Faculty: {details?.courseCompFacultyName || 'Dept Faculty'}
        </span>
      </div>

      {/* Progress Bar */}
      <div
        className={`w-full h-2.5 rounded-full overflow-hidden mt-2 ${
          isBrutalist
            ? 'border border-black dark:border-white bg-zinc-200 dark:bg-zinc-800'
            : isDark
            ? 'bg-slate-700/60'
            : 'bg-slate-100'
        }`}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${Math.min(100, Math.max(0, percentage))}%`,
            backgroundColor: isBrutalist ? (percentage >= 75 ? '#06D6A0' : percentage >= 65 ? '#FFD166' : '#EF476F') : statusColor,
          }}
        />
      </div>

      {/* Subject Code Mapping & Remaining / Skippable Classes */}
      <div
        className={`mt-3 p-3 rounded-xl border flex flex-col gap-2 ${
          isBrutalist
            ? 'bg-zinc-100 dark:bg-zinc-900 border-2 border-black dark:border-white font-mono'
            : isDark
            ? 'bg-slate-900/60 border-slate-700/50'
            : 'bg-slate-50 border-slate-200/70'
        }`}
      >
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold flex items-center gap-1.5 opacity-80" style={{ color: colors.subText }}>
            <Layers className="w-3.5 h-3.5 text-indigo-500" /> Total Classes: <strong className="text-slate-800 dark:text-slate-200">{calc.totalClasses}</strong> (Fixed)
          </span>
          <span className="font-black text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20" title="Adjusts dynamically as classes are conducted">
            {calc.remainingClasses} remaining
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-dashed border-slate-300 dark:border-slate-700">
          {/* 75% Target Pill */}
          <div
            className={`flex flex-col p-2 rounded-lg border transition-all ${
              calc.isGuaranteedSafe75
                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                : 'bg-white/70 dark:bg-slate-800/70 border-slate-200/60 dark:border-slate-700/60'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                For 75% Attendance
              </span>
              {calc.isGuaranteedSafe75 && (
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-500 text-white uppercase tracking-wider">
                  Safe 75%
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-baseline gap-1">
              {calc.isAchievable75 ? (
                <>
                  <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                    {calc.minAttend75}
                  </span>
                  <span className="text-[11px] font-medium opacity-80" style={{ color: colors.subText }}>
                    to attend
                  </span>
                </>
              ) : (
                <span className="font-bold text-xs text-rose-600 dark:text-rose-400">
                  Cannot reach
                </span>
              )}
            </div>
          </div>

          {/* 86% Target Pill */}
          <div className="flex flex-col bg-white/70 dark:bg-slate-800/70 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
              For 86% Attendance
            </span>
            <div className="mt-0.5 flex items-baseline gap-1">
              {calc.isAchievable86 ? (
                <>
                  <span className="font-black text-sm text-indigo-600 dark:text-indigo-400">
                    {calc.minAttend86}
                  </span>
                  <span className="text-[11px] font-medium opacity-80" style={{ color: colors.subText }}>
                    to attend
                  </span>
                </>
              ) : (
                <span className="font-bold text-xs text-amber-600 dark:text-amber-400">
                  Cannot reach
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-xs font-semibold">
        <span
          className={`flex items-center gap-1.5 transition-colors group-hover:underline ${
            isBrutalist ? 'font-black uppercase' : ''
          }`}
          style={{ color: colors.primary }}
        >
          View Details & Lecture Log
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </span>
      </div>
    </div>
  )
}
