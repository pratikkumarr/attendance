import * as React from "react"
import { cn } from "@/lib/utils"

interface AttendanceProgressBarProps {
  value: number // live percentage (0-100+)
  className?: string
  showMarkers?: boolean
}

export function AttendanceProgressBar({
  value,
  className,
  showMarkers = true,
}: AttendanceProgressBarProps) {
  const clampedValue = Math.min(Math.max(value, 0), 100)

  // Color code dynamically using custom semantic status colors:
  // >= 86% -> Safe green (#4C8C4A)
  // >= 75% -> Mustard yellow (#D9A441)
  // < 75% -> Error red (#B3402F)
  let barColor = "bg-danger"
  if (value >= 86) {
    barColor = "bg-safe"
  } else if (value >= 75) {
    barColor = "bg-attend"
  }

  return (
    <div className={cn("relative w-full pt-1 pb-1", className)}>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted border border-border/50">
        <div
          className={cn("h-full transition-all duration-300", barColor)}
          style={{ width: `${clampedValue}%` }}
        />

        {showMarkers && (
          <>
            {/* 75% Target Marker */}
            <div
              className="absolute top-0 bottom-0 w-[1.5px] bg-slate-400/80 dark:bg-slate-500 z-10 pointer-events-none"
              style={{ left: "75%" }}
              title="75% Attendance Threshold"
            />
            {/* 86% Safe Target Marker */}
            <div
              className="absolute top-0 bottom-0 w-[1.5px] bg-slate-700/80 dark:bg-slate-300 z-10 pointer-events-none"
              style={{ left: "86%" }}
              title="86% Recommended Safe Threshold"
            />
          </>
        )}
      </div>

      {showMarkers && (
        <div className="relative flex justify-between text-[10px] text-muted-foreground mt-0.5 tabular-nums">
          <span>0%</span>
          <span className="absolute -translate-x-1/2 left-[75%] font-medium text-slate-500 dark:text-slate-400">
            75%
          </span>
          <span className="absolute -translate-x-1/2 left-[86%] font-semibold text-slate-700 dark:text-slate-300">
            86%
          </span>
          <span>100%</span>
        </div>
      )}
    </div>
  )
}
