import * as React from "react"
import { Sliders, RefreshCw } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { projectFinal } from "@/lib/plan"
import { formatPct } from "@/lib/format"
import { cn } from "@/lib/utils"

interface SimulatorSubject {
  name: string
  total: number
  done: number
  attended: number
}

interface WhatIfSimulatorProps {
  subjects: SimulatorSubject[]
  className?: string
}

export function WhatIfSimulator({ subjects, className }: WhatIfSimulatorProps) {
  // Store per-subject skip values
  const [skips, setSkips] = React.useState<Record<string, number>>({})
  const [globalSkip, setGlobalSkip] = React.useState<number>(0)

  // Reset simulator
  const handleReset = () => {
    setSkips({})
    setGlobalSkip(0)
  }

  const handleSubjectSkipChange = (subjectName: string, val: number) => {
    setSkips((prev) => ({ ...prev, [subjectName]: val }))
  }

  const handleApplyGlobalSkip = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10) || 0
    setGlobalSkip(val)
    const newSkips: Record<string, number> = {}
    for (const s of subjects) {
      const remaining = Math.max(s.total - s.done, 0)
      newSkips[s.name] = Math.min(val, remaining)
    }
    setSkips(newSkips)
  }

  // Calculate projected aggregate attendance across all subjects
  let totalProjectedAttended = 0
  let totalOverallClasses = 0

  subjects.forEach((s) => {
    const remaining = Math.max(s.total - s.done, 0)
    const skipCount = skips[s.name] ?? 0
    const finalAttended = s.attended + (remaining - Math.min(skipCount, remaining))
    totalProjectedAttended += finalAttended
    totalOverallClasses += s.total
  })

  const projectedOverallPct =
    totalOverallClasses > 0 ? (totalProjectedAttended / totalOverallClasses) * 100 : 0

  return (
    <Card className={cn("shadow-sm overflow-hidden", className)}>
      <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">"What-If" Semester Simulator</CardTitle>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-muted-foreground mr-1.5">Projected Overall:</span>
            <strong
              className={cn(
                "text-base tabular-nums font-bold",
                projectedOverallPct >= 86
                  ? "text-emerald-600 dark:text-emerald-400"
                  : projectedOverallPct >= 75
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {formatPct(projectedOverallPct, 1)}
            </strong>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-8 gap-1 text-xs"
          >
            <RefreshCw className="h-3 w-3" />
            Reset
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex flex-col gap-4">
        {/* Global Quick Action */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border bg-muted/30">
          <span className="text-xs font-medium text-foreground">
            Quick Action: Skip <span className="font-bold text-primary">{globalSkip}</span> remaining classes across every subject:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="20"
              value={globalSkip}
              onChange={handleApplyGlobalSkip}
              className="w-36 accent-primary cursor-pointer"
            />
            <span className="w-6 text-xs text-center font-bold tabular-nums">{globalSkip}</span>
          </div>
        </div>

        {/* Per-subject sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {subjects.map((s) => {
            const remaining = Math.max(s.total - s.done, 0)
            const skipVal = skips[s.name] ?? 0
            const projectedPct = projectFinal(s.total, s.done, s.attended, skipVal)

            return (
              <div
                key={s.name}
                className="flex flex-col gap-2 p-3 rounded-lg border bg-card/60 hover:bg-card transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold truncate max-w-[200px]" title={s.name}>
                    {s.name}
                  </span>
                  <div className="flex items-center gap-1.5 tabular-nums">
                    <span className="text-xs text-muted-foreground">Final:</span>
                    <span
                      className={cn(
                        "text-sm font-bold",
                        projectedPct >= 86
                          ? "text-emerald-600 dark:text-emerald-400"
                          : projectedPct >= 75
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {formatPct(projectedPct, 1)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max={remaining}
                    value={skipVal}
                    disabled={remaining === 0}
                    onChange={(e) =>
                      handleSubjectSkipChange(s.name, parseInt(e.target.value, 10) || 0)
                    }
                    className="flex-1 accent-primary cursor-pointer disabled:opacity-40"
                  />
                  <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                    Skip <strong className="text-foreground">{skipVal}</strong> / {remaining} left
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
