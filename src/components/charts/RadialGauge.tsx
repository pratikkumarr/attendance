import * as React from "react"
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Compass } from "lucide-react"

interface RadialGaugeProps {
  pct: number
  className?: string
}

export function RadialGauge({ pct, className }: RadialGaugeProps) {
  const clamped = Math.min(Math.max(pct, 0), 100)

  let fillColor = "#ef4444" // red
  if (clamped >= 86) fillColor = "#10b981" // emerald
  else if (clamped >= 75) fillColor = "#f59e0b" // amber

  const chartData = [{ value: clamped, fill: fillColor }]

  return (
    <Card className={className}>
      <CardHeader className="p-4 pb-0 flex flex-row items-center gap-2">
        <Compass className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm font-semibold">Gauge Meter</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 h-[220px] relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            barSize={18}
            data={chartData}
            startAngle={180}
            endAngle={0}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background dataKey="value" cornerRadius={10} />
          </RadialBarChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <span className="text-3xl font-extrabold tabular-nums tracking-tight" style={{ color: fillColor }}>
            {clamped.toFixed(1)}%
          </span>
          <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">
            {clamped >= 86 ? "Excellent" : clamped >= 75 ? "Adequate" : "Low"}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
