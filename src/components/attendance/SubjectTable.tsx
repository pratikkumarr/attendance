import * as React from "react"
import { Link } from "react-router-dom"
import { ExternalLink, AlertTriangle } from "lucide-react"
import { StatusBadge } from "@/components/attendance/StatusBadge"
import { Stepper } from "@/components/attendance/Stepper"
import { formatPct } from "@/lib/format"
import { planSubject } from "@/lib/plan"

interface SubjectTableItem {
  name: string
  total: number
  done: number
  attended: number
}

interface SubjectTableProps {
  userName: string
  subjects: SubjectTableItem[]
  onUpdate: (subject: string, done: number, attended: number) => void
}

export function SubjectTable({ userName, subjects, onUpdate }: SubjectTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border bg-card shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase border-b select-none">
          <tr>
            <th className="py-3 px-4">Subject</th>
            <th className="py-3 px-3 text-center">Total</th>
            <th className="py-3 px-3 text-center">Remaining</th>
            <th className="py-3 px-3 text-center">Live %</th>
            <th className="py-3 px-4">For 86% Target</th>
            <th className="py-3 px-4">For 75% Target</th>
            <th className="py-3 px-4 text-center">Edit Classes (Done / Attended)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {subjects.map((s) => {
            const plan = planSubject(s.total, s.done, s.attended)
            const hasWarning = s.attended > s.done || (s.total > 0 && s.done > s.total)

            return (
              <tr key={s.name} className="hover:bg-muted/20 transition-colors">
                <td className="py-3.5 px-4 font-medium">
                  <Link
                    to={`/u/${encodeURIComponent(userName)}/${encodeURIComponent(s.name)}`}
                    className="flex items-center gap-1.5 hover:text-primary transition-colors group"
                  >
                    <span>{s.name}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                  {hasWarning && (
                    <span className="flex items-center gap-1 text-[11px] text-attend mt-0.5">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      {s.attended > s.done ? 'Attended > done' : 'Done > total'}
                    </span>
                  )}
                </td>

                <td className="py-3.5 px-3 text-center tabular-nums font-semibold text-muted-foreground">
                  {s.total}
                </td>

                <td className="py-3.5 px-3 text-center tabular-nums font-semibold text-foreground">
                  {plan.remaining}
                </td>

                <td className="py-3.5 px-3 text-center tabular-nums">
                  <span
                    className={
                      plan.livePct >= 86
                        ? 'font-bold text-safe'
                        : plan.livePct >= 75
                        ? 'font-bold text-attend'
                        : 'font-bold text-danger'
                    }
                  >
                    {formatPct(plan.livePct, 1)}
                  </span>
                </td>

                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={plan.at86.status} />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      Need: <strong>{plan.at86.mustAttend}</strong> | Can skip: <strong>{plan.at86.canSkip}</strong>
                    </span>
                  </div>
                </td>

                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={plan.at75.status} />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      Need: <strong>{plan.at75.mustAttend}</strong> | Can skip: <strong>{plan.at75.canSkip}</strong>
                    </span>
                  </div>
                </td>

                <td className="py-3.5 px-4">
                  <div className="flex items-center justify-center gap-3">
                    <Stepper
                      value={s.done}
                      onChange={(newDone) => onUpdate(s.name, newDone, s.attended)}
                      warning={s.done > s.total && s.total > 0}
                    />
                    <Stepper
                      value={s.attended}
                      onChange={(newAttended) => onUpdate(s.name, s.done, newAttended)}
                      warning={s.attended > s.done}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
