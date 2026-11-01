import React, { useState, useEffect } from 'react'
import { useTheme } from '@/ThemeContext'
import {
  getTodayAttendanceData,
  TodayAttendanceResult,
  TodayClassAttendance,
} from '@/lib/todayAttendance'
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Coffee,
  Sparkles,
  Info,
  RefreshCw,
} from 'lucide-react'

export const TodayAttendance: React.FC = () => {
  const { colors, isDark, isBrutalist } = useTheme()

  const [data, setData] = useState<TodayAttendanceResult | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const fetchAttendance = async () => {
    setLoading(true)
    try {
      const res = await getTodayAttendanceData(false)
      setData(res)
    } catch (err) {
      console.error('Failed to load today attendance:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttendance()
  }, [])

  return (
    <div className="space-y-6 pb-24 animate-fade-in max-w-2xl mx-auto">
      {/* Page Header */}
      <div
        className={`p-5 sm:p-6 rounded-3xl border transition-all ${
          isBrutalist
            ? 'bg-white dark:bg-zinc-950 border-4 border-black dark:border-white shadow-[6px_6px_0px_#000] dark:shadow-[6px_6px_0px_#fff]'
            : isDark
            ? 'bg-slate-800/90 border-slate-700/80 shadow-xl'
            : 'bg-white border-slate-200/90 shadow-sm'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full font-mono ${
                  isBrutalist
                    ? 'bg-[#FFD166] text-black border border-black'
                    : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                }`}
              >
                Daily Lecture Log
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight">Today's Attendance</h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              {data?.formattedDate || 'Loading date...'}
            </p>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={() => fetchAttendance()}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh Today's Attendance"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Holiday / Last Working Day Notification Banner */}
        {data?.isShowingLastWorkingDay && (
          <div
            className={`mt-4 p-4 rounded-2xl border flex items-start gap-3 ${
              isBrutalist
                ? 'bg-[#FFD166] text-black border-2 border-black font-mono shadow-[3px_3px_0px_#000]'
                : isDark
                ? 'bg-amber-950/50 border-amber-800/60 text-amber-200'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <Coffee className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="text-xs">
              <div className="font-black text-sm">
                Today is a Holiday ({data.holidayReason || 'Weekend'})
              </div>
              <div className="mt-0.5 opacity-90">
                Showing attendance for the last working day:{' '}
                <strong className="underline">{data.lastWorkingDayFormatted}</strong>.
              </div>
            </div>
          </div>
        )}

        {/* Summary Chips */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs font-semibold">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> {data?.presentCount || 0} Present
            </span>
            <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1 font-bold">
              <XCircle className="w-3.5 h-3.5" /> {data?.absentCount || 0} Absent
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1 font-bold">
              <Clock className="w-3.5 h-3.5" /> {data?.notMarkedCount || 0} Not Marked
            </span>
          </div>
        </div>
      </div>

      {/* Class List (Ascending Timewise) */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-xs font-semibold text-slate-500 animate-pulse">
            Loading today's attendance status...
          </div>
        ) : !data || data.classes.length === 0 ? (
          <div
            className={`p-8 text-center rounded-3xl border flex flex-col items-center justify-center space-y-2 ${
              isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <Coffee className="w-10 h-10 text-slate-400" />
            <h3 className="font-bold text-base">No Classes Recorded</h3>
            <p className="text-xs text-slate-500">
              No class attendance was recorded for this day.
            </p>
          </div>
        ) : (
          data.classes.map((item: TodayClassAttendance) => {
            const isPresent = item.attendance === 'PRESENT'
            const isAbsent = item.attendance === 'ABSENT'
            const isNotMarked = item.attendance === 'NOT MARKED'

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between gap-4 transition-all duration-200 ${
                  isBrutalist
                    ? 'bg-white dark:bg-zinc-950 border-2 border-black dark:border-white shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#fff]'
                    : isDark
                    ? 'bg-slate-800/80 border-slate-700/80 hover:border-slate-600'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                {/* Time + Course Details */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Time Badge */}
                  <div
                    className={`flex-shrink-0 w-24 sm:w-28 py-2 px-2.5 rounded-xl border text-center font-mono ${
                      isBrutalist
                        ? 'border border-black dark:border-white bg-slate-100 dark:bg-zinc-900'
                        : isDark
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                      {item.startTime}
                    </div>
                    <div className="text-[10px] opacity-60 font-semibold mt-0.5">
                      to {item.endTime}
                    </div>
                  </div>

                  {/* Course Name and Subject Code */}
                  <div className="min-w-0 flex-1">
                    <span
                      className={`font-mono text-[10px] font-black px-2 py-0.5 rounded ${
                        isBrutalist
                          ? 'bg-[#FFD166] text-black border border-black font-mono'
                          : 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
                      }`}
                    >
                      {item.courseCode}
                    </span>

                    <h3 className="font-extrabold text-sm sm:text-base leading-snug mt-1 truncate">
                      {item.courseName}
                    </h3>

                    {item.facultyName && (
                      <div className="text-xs opacity-60 mt-0.5 truncate">
                        {item.facultyName}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Badge: PRESENT, ABSENT, or NOT MARKED */}
                <div className="flex-shrink-0">
                  <div
                    className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl flex items-center gap-2 font-black text-xs sm:text-sm tracking-wide uppercase transition-transform active:scale-95 ${
                      isBrutalist
                        ? isPresent
                          ? 'bg-[#06D6A0] text-black border-2 border-black shadow-[3px_3px_0px_#000] font-mono'
                          : isAbsent
                          ? 'bg-[#EF476F] text-white border-2 border-black shadow-[3px_3px_0px_#000] font-mono'
                          : 'bg-[#FFD166] text-black border-2 border-black shadow-[3px_3px_0px_#000] font-mono'
                        : isPresent
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-2 border-emerald-400/80 dark:border-emerald-700 shadow-sm'
                        : isAbsent
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-2 border-rose-400/80 dark:border-rose-700 shadow-sm'
                        : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-2 border-amber-400/80 dark:border-amber-700 shadow-sm'
                    }`}
                  >
                    {isPresent ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                        <span>PRESENT</span>
                      </>
                    ) : isAbsent ? (
                      <>
                        <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 dark:text-rose-400" />
                        <span>ABSENT</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
                        <span>NOT MARKED</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
