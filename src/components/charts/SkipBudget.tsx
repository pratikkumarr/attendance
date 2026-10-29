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
import { CalendarOff } from "lucide-react"

interface SkipBudgetProps {
  data: {
    subject: string
    canSkip86: number
    canSkip75: number
  }[]
  className?: string
}

export function SkipBudget({ data, className }: SkipBudgetProps) {
  return (
    <Card className={className}>
      <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
        <CalendarOff className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm font-semibold">Skip Budget: 86% vs 75% Target</CardTitle>
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
            <Bar dataKey="canSkip86" name="Skippable for 86%" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="canSkip75" name="Skippable for 75%" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
