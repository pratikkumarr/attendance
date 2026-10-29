import * as React from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

interface TrendDataPoint {
  time: string
  overall?: number
  [subject: string]: number | string | undefined
}

interface TrendLineProps {
  data: TrendDataPoint[]
  subjects: string[]
  className?: string
}

export function TrendLine({ data, subjects, className }: TrendLineProps) {
  const [selectedSubjects, setSelectedSubjects] = React.useState<string[]>(['overall'])

  const toggleSubject = (s: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
    )
  }

  // Pre-defined palette for multiple subject lines harmonized with warm earthy theme
  const colors = [
    '#C2602F', // terracotta (overall / accent)
    '#4C8C4A', // success green
    '#D9A441', // mustard
    '#9DAD57', // olive-400
    '#6B705A', // muted olive
    '#B3402F', // error / rust
    '#8b5cf6', // purple
    '#06b6d4', // cyan
  ]

  return (
    <Card className={className}>
      <CardHeader className="p-4 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Attendance Trend Over Time</CardTitle>
        </div>

        {/* Multi-select filter pills */}
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => toggleSubject('overall')}
            className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
              selectedSubjects.includes('overall')
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            Overall
          </button>
          {subjects.map((s, idx) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSubject(s)}
              className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors truncate max-w-[120px] ${
                selectedSubjects.includes(s)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 h-[260px] w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            No history trend points available yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 15, left: -20, bottom: 20 }}>
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "currentColor" }}
                className="text-muted-foreground"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "currentColor" }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                  fontSize: '12px',
                }}
                formatter={(val: number) => [`${val.toFixed(1)}%`]}
              />
              <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '11px' }} />

              {selectedSubjects.includes('overall') && (
                <Line
                  type="monotone"
                  dataKey="overall"
                  name="Overall"
                  stroke="#C2602F"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}

              {subjects.map((sub, idx) => {
                if (!selectedSubjects.includes(sub)) return null
                return (
                  <Line
                    key={sub}
                    type="monotone"
                    dataKey={sub}
                    name={sub}
                    stroke={colors[(idx + 1) % colors.length]}
                    strokeWidth={1.5}
                    dot={{ r: 2 }}
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
