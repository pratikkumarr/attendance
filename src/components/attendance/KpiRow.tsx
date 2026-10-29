import * as React from "react"
import { ShieldCheck, Target, AlertTriangle, BookOpen, Clock, Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { formatPct } from "@/lib/format"
import { cn } from "@/lib/utils"

interface KpiRowProps {
  overallPct: number
  totalAttended: number
  totalDone: number
  totalRemaining: number
  safe86Count: number
  safe75Count: number
  atRiskCount: number
  className?: string
}

export function KpiRow({
  overallPct,
  totalAttended,
  totalDone,
  totalRemaining,
  safe86Count,
  safe75Count,
  atRiskCount,
  className,
}: KpiRowProps) {
  let overallColor = "text-rose-600 dark:text-rose-400"
  if (overallPct >= 86) overallColor = "text-emerald-600 dark:text-emerald-400"
  else if (overallPct >= 75) overallColor = "text-amber-600 dark:text-amber-400"

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3", className)}>
      {/* 1. Overall Attendance */}
      <Card className="border-border/60 shadow-sm hover:border-border transition-all">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Overall Attendance</span>
            <Target className="h-4 w-4" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={cn("text-2xl font-bold tracking-tight tabular-nums", overallColor)}>
              {formatPct(overallPct, 1)}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 tabular-nums">
            {totalAttended} / {totalDone} attended
          </span>
        </CardContent>
      </Card>

      {/* 2. Classes Remaining */}
      <Card className="border-border/60 shadow-sm hover:border-border transition-all">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Remaining Classes</span>
            <Calendar className="h-4 w-4" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {totalRemaining}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground mt-1">
            Across all subjects
          </span>
        </CardContent>
      </Card>

      {/* 3. Safe at 86% */}
      <Card className="border-border/60 shadow-sm hover:border-border transition-all">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Safe @ 86% Target</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
              {safe86Count}
            </span>
            <span className="text-xs text-muted-foreground font-normal">subjects</span>
          </div>
          <span className="text-[11px] text-muted-foreground mt-1">
            Top safe tier
          </span>
        </CardContent>
      </Card>

      {/* 4. Safe at 75% */}
      <Card className="border-border/60 shadow-sm hover:border-border transition-all">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Safe @ 75% Target</span>
            <ShieldCheck className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold tracking-tight tabular-nums text-amber-600 dark:text-amber-400">
              {safe75Count}
            </span>
            <span className="text-xs text-muted-foreground font-normal">subjects</span>
          </div>
          <span className="text-[11px] text-muted-foreground mt-1">
            Minimum threshold
          </span>
        </CardContent>
      </Card>

      {/* 5. At Risk / Impossible */}
      <Card className="border-border/60 shadow-sm hover:border-border transition-all">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">At Risk / Action</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={cn(
              "text-2xl font-bold tracking-tight tabular-nums",
              atRiskCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
            )}>
              {atRiskCount}
            </span>
            <span className="text-xs text-muted-foreground font-normal">subjects</span>
          </div>
          <span className="text-[11px] text-muted-foreground mt-1">
            Need urgent classes
          </span>
        </CardContent>
      </Card>

      {/* 6. Total Classes Conducted */}
      <Card className="border-border/60 shadow-sm hover:border-border transition-all">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Classes Conducted</span>
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {totalDone}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground mt-1">
            Out of scheduled total
          </span>
        </CardContent>
      </Card>
    </div>
  )
}
