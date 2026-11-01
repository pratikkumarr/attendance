import * as React from "react"
import { Link } from "react-router-dom"
import { ExternalLink, AlertTriangle, Pencil, Check, X, Lock } from "lucide-react"
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
  courseCode?: string | null
  total: number
  done: number
  attended: number
  onUpdate: (done: number, attended: number) => void
  onUpdateTotal?: (newTotal: number) => void
  className?: string
}

export function SubjectCard({
  userName,
  subjectName,
  courseCode,
  total,
  done,
  attended,
  onUpdate,
  onUpdateTotal,
  className,
}: SubjectCardProps) {
  const [isEditingTotal, setIsEditingTotal] = React.useState(false)
  const [editTotalValue, setEditTotalValue] = React.useState<number>(total)

  React.useEffect(() => {
    setEditTotalValue(total)
  }, [total])

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

  const handleSaveTotal = () => {
    if (onUpdateTotal) {
      onUpdateTotal(Math.max(0, editTotalValue))
    }
    setIsEditingTotal(false)
  }

  const hasWarning = attended > done || (total > 0 && done > total)
  const isTotalUnset = total <= 0

  return (
    <Card className={cn("overflow-hidden border-border/70 hover:border-border transition-all shadow-sm", className)}>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex flex-col">
          <Link
            to={`/u/${encodeURIComponent(userName)}/${encodeURIComponent(subjectName)}`}
            className="group flex items-center gap-1.5 font-semibold text-base hover:text-primary transition-colors flex-wrap"
          >
            <span className="line-clamp-1">{subjectName}</span>
            {courseCode && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                {courseCode}
              </span>
            )}
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>

          {isEditingTotal ? (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-muted-foreground">Total:</span>
              <input
                type="number"
                min="0"
                autoFocus
                value={editTotalValue}
                onChange={(e) => setEditTotalValue(parseInt(e.target.value, 10) || 0)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTotal()
                  if (e.key === "Escape") setIsEditingTotal(false)
                }}
                className="w-16 rounded border bg-background px-1.5 py-0.5 text-xs font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={handleSaveTotal}
                className="p-1 rounded bg-primary text-primary-foreground hover:opacity-90"
                title="Save total"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingTotal(false)}
                className="p-1 rounded hover:bg-muted text-muted-foreground"
                title="Cancel"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <span>Total:</span>
              <strong className="text-foreground tabular-nums">
                {isTotalUnset ? "Unset" : total}
              </strong>
              {onUpdateTotal && (
                <button
                  type="button"
                  onClick={() => setIsEditingTotal(true)}
                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Edit planned semester Total Classes (preserved across CyberVidya sync)"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
              <span className="text-muted-foreground/60 ml-0.5">|</span>
              <span className="ml-0.5">Remaining:</span>
              <strong className="text-foreground tabular-nums">
                {isTotalUnset ? "—" : plan.remaining}
              </strong>
            </span>
          )}
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
          <div className="flex items-center gap-1.5 text-xs text-attend bg-attend/10 p-2 rounded-md border border-attend/30">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>
              {attended > done
                ? `Attended (${attended}) > done (${done})`
                : `Done (${done}) exceeds total (${total})`}
            </span>
          </div>
        )}

        {/* Unset Total Prompt */}
        {isTotalUnset && (
          <div className="flex items-center justify-between text-[11px] bg-attend/10 text-attend p-2 rounded-md border border-attend/30">
            <span>Planned semester Total Classes is unset.</span>
            {onUpdateTotal && (
              <button
                type="button"
                onClick={() => setIsEditingTotal(true)}
                className="underline font-bold hover:text-foreground ml-2"
              >
                Set Total
              </button>
            )}
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
                Attend: <span className="font-bold text-foreground">{isTotalUnset ? "—" : plan.at86.mustAttend}</span>
              </div>
              <div>
                Skip: <span className="font-bold text-foreground">{isTotalUnset ? "—" : plan.at86.canSkip}</span>
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
                Attend: <span className="font-bold text-foreground">{isTotalUnset ? "—" : plan.at75.mustAttend}</span>
              </div>
              <div>
                Skip: <span className="font-bold text-foreground">{isTotalUnset ? "—" : plan.at75.canSkip}</span>
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
