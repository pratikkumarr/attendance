import * as React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

interface AttendanceBarProps {
  data: {
    subject: string
    livePct: number
  }[]
  className?: string
}

export function AttendanceBar({ data, className }: AttendanceBarProps) {
  return (
    <Card className={className}>
      <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm font-semibold">Live Attendance % by Subject</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 40 }}>
            <XAxis
              dataKey="subject"
              angle={-30}
              textAnchor="end"
              interval={0}
              height={50}
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-muted-foreground"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-muted-foreground"
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Live Attendance']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
                fontSize: '12px',
              }}
            />
            {/* Target lines at 75% and 86% */}
            <ReferenceLine
              y={75}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              label={{ value: '75%', fill: '#f59e0b', fontSize: 10, position: 'right' }}
            />
            <ReferenceLine
              y={86}
              stroke="#10b981"
              strokeDasharray="3 3"
              label={{ value: '86%', fill: '#10b981', fontSize: 10, position: 'right' }}
            />
            <Bar dataKey="livePct" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => {
                let fill = '#ef4444' // red
                if (entry.livePct >= 86) fill = '#10b981' // green
                else if (entry.livePct >= 75) fill = '#f59e0b' // yellow
                return <Cell key={`cell-${index}`} fill={fill} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
