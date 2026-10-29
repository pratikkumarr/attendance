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
import { Users, GitCompare } from "lucide-react"
import { useSubjects } from "@/hooks/useSubjects"
import { useAllEntries } from "@/hooks/useEntries"
import { planSubject } from "@/lib/plan"
import { formatPct } from "@/lib/format"

export function Compare() {
  const { data: subjects = [] } = useSubjects()
  const { data: allEntries = [] } = useAllEntries()

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

  // Prepare grouped bar chart data: per-subject live %
  const chartData = React.useMemo(() => {
    return subjects.map((sub) => {
      const row: any = { subject: sub.name }
      selectedUsers.forEach((u) => {
        const entry = allEntries.find((e) => e.user_name === u && e.subject === sub.name)
        const done = entry ? entry.done : 0
        const attended = entry ? entry.attended : 0
        row[u] = done > 0 ? (attended / done) * 100 : 0
      })
      return row
    })
  }, [subjects, selectedUsers, allEntries])

  // Color palette for compared users
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899"]

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

      {/* Grouped Bar Chart: Live % Per Subject */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Subject Live Attendance Comparison</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 15, left: -20, bottom: 45 }}>
              <XAxis
                dataKey="subject"
                angle={-30}
                textAnchor="end"
                interval={0}
                height={55}
                tick={{ fontSize: 11, fill: "currentColor" }}
                className="text-muted-foreground"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "currentColor" }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                  fontSize: "12px",
                }}
                formatter={(val: number) => [`${val.toFixed(1)}%`]}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "12px" }} />
              {selectedUsers.map((u, idx) => (
                <Bar
                  key={u}
                  dataKey={u}
                  name={u}
                  fill={colors[idx % colors.length]}
                  radius={[3, 3, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Who Can Skip The Most Classes: Comparative Table */}
      <div className="w-full overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase border-b select-none">
            <tr>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-3 text-center">Total</th>
              {selectedUsers.map((u) => (
                <th key={u} className="py-3 px-4 text-center">
                  {u} (Skip Budget @ 86%)
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
                const canSkip = plan.at86.canSkip

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
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
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
