import React from 'react'
import { useTheme } from '@/ThemeContext'

interface CircularProgressProps {
  percentage: number
  size?: number
  strokeWidth?: number
  present: number
  total: number
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 130,
  strokeWidth = 10,
  present,
  total,
}) => {
  const { isDark, isBrutalist, colors } = useTheme()

  const safePerc = Math.max(0, Math.min(100, isNaN(percentage) ? 0 : percentage))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (safePerc / 100) * circumference

  // Status color
  let progressColor = colors.success
  if (safePerc < 65) {
    progressColor = colors.danger
  } else if (safePerc < 75) {
    progressColor = colors.warning
  }

  const trackColor = isBrutalist
    ? isDark
      ? '#333333'
      : '#E5E7EB'
    : isDark
    ? '#1E293B'
    : '#F1F5F9'

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Center percentage and stats */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
        <span
          className={`font-black text-2xl tracking-tight ${
            isBrutalist ? 'font-mono uppercase' : ''
          }`}
          style={{ color: isBrutalist ? colors.text : progressColor }}
        >
          {safePerc.toFixed(1)}%
        </span>
        <span className="text-[11px] font-semibold mt-0.5 opacity-70" style={{ color: colors.subText }}>
          {present} / {total}
        </span>
      </div>
    </div>
  )
}
