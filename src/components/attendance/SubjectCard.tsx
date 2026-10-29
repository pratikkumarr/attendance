import * as React from "react"
import { Link } from "react-router-dom"
import { ExternalLink, AlertTriangle } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/attendance/StatusBadge"
import { AttendanceProgressBar } from "@/components/attendance/AttendanceProgressBar"
import { Stepper } from "@/components/attendance/Stepper"
import { formatPct } from "@/lib/format"
import { planSubject, type SubjectPlan } from "@/lib/plan"
import { cn } from "@/lib/utils"

interface SubjectCardProps {
  userName: string
  subjectName: string
  total: number
  done: number
  attended: number
  onUpdate: (done: number, attended: number) => void
  className?: string
}

export function SubjectCard({
  userName,
  subjectName,
  total,
  done,
  attended,
  onUpdate,
  className,
}: SubjectCardProps) {
  const plan = React.useMemo(
    () => planSubject(total, done, attended),
    [total, done, attended]
  )

  const handleDoneChange = (newDone: number) => {
    onUpdate(newDone, attended)
  }

  const handleAttendedChange = (newAttended: number) => {
    onUpdate(done, newAttended)
  }

  const hasWarning = attended > done || (total > 0 && done > total)

  return (
    <Card className={cn("overflow-hidden border-border/70 hover:border-border transition-all shadow-sm", className)}>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex flex-col">
          <Link
            to={`/u/${encodeURIComponent(userName)}/${encodeURIComponent(subjectName)}`}
            className="group flex items-center gap-1.5 font-semibold text-base hover:text-primary transition-colors"
          >
            <span className="line-clamp-1">{subjectName}</span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>
          <span className="text-xs text-muted-foreground">
            Total: <strong className="text-foreground tabular-nums">{total}</strong> | Remaining: <strong className="text-foreground tabular-nums">{plan.remaining}</strong>
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-xl font-bold tabular-nums">
            {formatPct(plan.livePct, 1)}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            Live %
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 flex flex-col gap-3">
        {/* Progress bar with 75% and 86% target lines */}
        <AttendanceProgressBar value={plan.livePct} />

        {/* Warning pill if attended > done or done > total */}
        {hasWarning && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 p-2 rounded-md border border-amber-500/20">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>
              {attended > done
                ? `Attended (${attended}) > done (${done})`
                : `Done (${done}) exceeds total (${total})`}
            </span>
          </div>
        )}

        {/* Side-by-side Threshold Decision Blocks: For 86% vs For 75% */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* For 86% */}
          <div className="flex flex-col gap-1 rounded-lg border p-2.5 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">For 86%</span>
              <StatusBadge status={plan.at86.status} />
            </div>
            <div className="grid grid-cols-2 gap-1 mt-1 text-muted-foreground tabular-nums">
              <div>
                Attend: <span className="font-bold text-foreground">{plan.at86.mustAttend}</span>
              </div>
              <div>
                Skip: <span className="font-bold text-foreground">{plan.at86.canSkip}</span>
              </div>
            </div>
          </div>

          {/* For 75% */}
          <div className="flex flex-col gap-1 rounded-lg border p-2.5 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">For 75%</span>
              <StatusBadge status={plan.at75.status} />
            </div>
            <div className="grid grid-cols-2 gap-1 mt-1 text-muted-foreground tabular-nums">
              <div>
                Attend: <span className="font-bold text-foreground">{plan.at75.mustAttend}</span>
              </div>
              <div>
                Skip: <span className="font-bold text-foreground">{plan.at75.canSkip}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Inline Steppers */}
        <div className="flex items-center justify-between border-t pt-3 mt-1">
          <Stepper
            label="Done"
            value={done}
            onChange={handleDoneChange}
            warning={done > total && total > 0}
          />
          <Stepper
            label="Attended"
            value={attended}
            onChange={handleAttendedChange}
            warning={attended > done}
          />
        </div>
      </CardContent>
    </Card>
  )
}
