import * as React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Layers } from "lucide-react"

interface StackedSubjectProps {
  data: {
    subject: string
    attended: number
    missed: number
    remaining: number
  }[]
  className?: string
}

export function StackedSubject({ data, className }: StackedSubjectProps) {
  return (
    <Card className={className}>
      <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm font-semibold">Class Breakdown: Attended / Missed / Remaining</CardTitle>
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
            <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
                fontSize: '12px',
              }}
            />
            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="attended" name="Attended" stackId="a" fill="#10b981" />
            <Bar dataKey="missed" name="Missed" stackId="a" fill="#ef4444" />
            <Bar dataKey="remaining" name="Remaining" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
