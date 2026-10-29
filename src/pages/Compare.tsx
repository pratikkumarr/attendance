import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { GitCompare } from "lucide-react"
import { useSubjects } from "@/hooks/useSubjects"
import { useAllEntries } from "@/hooks/useEntries"
import { planSubject } from "@/lib/plan"
import { formatPct } from "@/lib/format"

export function Compare() {
  const { data: subjects = [] } = useSubjects()
  const { data: allEntries = [] } = useAllEntries()

  const [threshold, setThreshold] = React.useState<75 | 86>(86)

  const allUsers = React.useMemo(() => {
    return Array.from(new Set(allEntries.map((e) => e.user_name))).sort()
  }, [allEntries])

  // Select 2 to 4 people to compare
  const [selectedUsers, setSelectedUsers] = React.useState<string[]>([])

  // Default initial selection to first 2-4 users
  React.useEffect(() => {
    if (selectedUsers.length === 0 && allUsers.length > 0) {
      setSelectedUsers(allUsers.slice(0, Math.min(4, Math.max(2, allUsers.length))))
    }
  }, [allUsers])

  const toggleUser = (u: string) => {
    if (selectedUsers.includes(u)) {
      if (selectedUsers.length > 2) {
        setSelectedUsers(selectedUsers.filter((item) => item !== u))
      }
    } else {
      if (selectedUsers.length < 4) {
        setSelectedUsers([...selectedUsers, u])
      }
    }
  }

  // Pre-calculate per-user summary
  const userSummaries = React.useMemo(() => {
    return selectedUsers.map((u) => {
      const uEntries = allEntries.filter((e) => e.user_name === u)
      let attended = 0
      let done = 0
      uEntries.forEach((e) => {
        attended += e.attended
        done += e.done
      })
      const overall = done > 0 ? (attended / done) * 100 : 0
      return {
        user: u,
        attended,
        done,
        overall,
      }
    })
  }, [selectedUsers, allEntries])

  // Color palette for compared users harmonized with warm earthy theme
  const colors = ["#C2602F", "#4C8C4A", "#D9A441", "#9DAD57"]

  return (
    <div className="flex flex-col gap-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <GitCompare className="h-6 w-6 text-primary" />
            Compare Attendance
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select 2 to 4 people to benchmark attendance and skip allowances side by side.
          </p>
        </div>

        {/* User Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border">
            <span className="text-xs font-semibold px-1.5 text-muted-foreground">Target:</span>
            <button
              type="button"
              onClick={() => setThreshold(75)}
              className={`text-xs px-2.5 py-0.5 rounded-md font-semibold transition-all ${
                threshold === 75
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => setThreshold(86)}
              className={`text-xs px-2.5 py-0.5 rounded-md font-semibold transition-all ${
                threshold === 86
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              86%
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground mr-1">Comparing:</span>
            {allUsers.map((u) => {
              const isSelected = selectedUsers.includes(u)
              return (
                <button
                  key={u}
                  type="button"
                  onClick={() => toggleUser(u)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all font-medium ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {u}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Overall Scorecards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {userSummaries.map((summary, idx) => (
          <Card key={summary.user} className="border-border/80">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: colors[idx % colors.length] }}
                />
                {summary.user}
              </span>
              <span className="text-2xl font-black tabular-nums tracking-tight mt-1 text-foreground">
                {formatPct(summary.overall, 1)}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {summary.attended} / {summary.done} attended
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Who Can Skip The Most Classes: Comparative Table */}
      <div className="w-full overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase border-b select-none">
            <tr>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-3 text-center">Total</th>
              {selectedUsers.map((u) => (
                <th key={u} className="py-3 px-4 text-center">
                  {u} (Skip Budget @ {threshold}%)
                </th>
              ))}
              <th className="py-3 px-4 text-right">Most Skippable Leader</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {subjects.map((sub) => {
              let maxSkippable = -1
              let leaderName = "Tie / None"

              const userSkips = selectedUsers.map((u) => {
                const entry = allEntries.find((e) => e.user_name === u && e.subject === sub.name)
                const done = entry ? entry.done : 0
                const attended = entry ? entry.attended : 0
                const plan = planSubject(sub.total, done, attended)
                const targetPlan = threshold === 86 ? plan.at86 : plan.at75
                const canSkip = targetPlan.canSkip

                if (canSkip > maxSkippable) {
                  maxSkippable = canSkip
                  leaderName = u
                } else if (canSkip === maxSkippable && canSkip > 0) {
                  leaderName = "Tie"
                }

                return {
                  user: u,
                  canSkip,
                  livePct: plan.livePct,
                }
              })

              return (
                <tr key={sub.name} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-foreground">
                    {sub.name}
                  </td>
                  <td className="py-3.5 px-3 text-center tabular-nums text-muted-foreground">
                    {sub.total}
                  </td>
                  {userSkips.map((item) => (
                    <td key={item.user} className="py-3.5 px-4 text-center tabular-nums">
                      <span className="font-bold text-foreground">{item.canSkip} classes</span>
                      <span className="text-[11px] text-muted-foreground block">
                        ({formatPct(item.livePct, 0)} live)
                      </span>
                    </td>
                  ))}
                  <td className="py-3.5 px-4 text-right font-bold text-safe">
                    {leaderName} {maxSkippable > 0 && `(${maxSkippable})`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
