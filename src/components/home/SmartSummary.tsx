import React from 'react'
import { ShieldCheck, AlertTriangle, Clock } from 'lucide-react'
import { useTheme } from '@/ThemeContext'

interface SmartSummaryProps {
  present: number
  total: number
}

export const SmartSummary: React.FC<SmartSummaryProps> = ({ present, total }) => {
  const { isDark, isBrutalist, colors } = useTheme()

  if (total === 0) {
    return (
      <div
        className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-all ${
          isBrutalist
            ? 'border-2 border-black dark:border-white shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#fff] bg-[#118AB2] text-white'
            : isDark
            ? 'bg-blue-950/30 border-blue-800/40 text-blue-200'
            : 'bg-blue-50/80 border-blue-200 text-blue-900'
        }`}
      >
        <Clock className="w-6 h-6 flex-shrink-0" />
        <div>
          <div className="font-bold text-sm">Classes Haven't Started</div>
          <div className="text-xs opacity-80 mt-0.5">No lectures conducted for this course yet.</div>
        </div>
      </div>
    )
  }

  const currentPercentage = (present / total) * 100
  const isSafe = currentPercentage >= 75

  if (isSafe) {
    const canMiss = Math.floor(present / 0.75 - total)
    return (
      <div
        className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-all ${
          isBrutalist
            ? 'border-2 border-black dark:border-white shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#fff] bg-[#06D6A0] text-black'
            : isDark
            ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-200'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}
      >
        <ShieldCheck className="w-7 h-7 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm">Attendance is Safe</div>
          {canMiss > 0 ? (
            <div className="text-xs font-medium mt-0.5 opacity-90">
              You can safely bunk <span className="font-bold underline">{canMiss} more classes</span> right now without falling below 75%.
            </div>
          ) : (
            <div className="text-xs opacity-90 mt-0.5">
              Do not miss any more classes to maintain 75% attendance.
            </div>
          )}
        </div>
      </div>
    )
  } else {
    const mustAttend = Math.ceil(3 * total - 4 * present)
    return (
      <div
        className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-all ${
          isBrutalist
            ? 'border-2 border-black dark:border-white shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#fff] bg-[#FFD166] text-black'
            : isDark
            ? 'bg-amber-950/40 border-amber-800/40 text-amber-200'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}
      >
        <AlertTriangle className="w-7 h-7 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm">Action Required!</div>
          <div className="text-xs font-medium mt-0.5 opacity-90">
            You must attend the next <span className="font-bold underline">{mustAttend} consecutive classes</span> to recover 75%.
          </div>
        </div>
      </div>
    )
  }
}
