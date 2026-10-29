import * as React from "react"
import { LineChart, Line, ResponsiveContainer } from "recharts"

interface SparklineProps {
  data: number[] // array of percentage numbers e.g. [80, 82, 85]
  width?: number | string
  height?: number
  className?: string
}

export function Sparkline({ data, width = "100%", height = 28, className }: SparklineProps) {
  if (!data || data.length < 2) {
    return <div className="h-7 w-16 bg-muted/30 rounded flex items-center justify-center text-[10px] text-muted-foreground">--</div>
  }

  const chartData = data.map((val, idx) => ({ idx, val }))
  const first = data[0] ?? 0
  const last = data[data.length - 1] ?? 0
  const isUp = last >= first

  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="val"
            stroke={isUp ? "#10b981" : "#ef4444"}
            strokeWidth={1.8}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
