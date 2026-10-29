import * as React from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
  Download,
  Share2,
  History,
  LayoutGrid,
  Table as TableIcon,
  ChevronDown,
  User,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { KpiRow } from "@/components/attendance/KpiRow"
import { SubjectCard } from "@/components/attendance/SubjectCard"
import { SubjectTable } from "@/components/attendance/SubjectTable"
import { InsightsPanel } from "@/components/attendance/InsightsPanel"
import { WhatIfSimulator } from "@/components/attendance/WhatIfSimulator"
import { HistoryDrawer } from "@/components/attendance/HistoryDrawer"
import { AttendanceBar } from "@/components/charts/AttendanceBar"
import { StackedSubject } from "@/components/charts/StackedSubject"
import { SkipBudget } from "@/components/charts/SkipBudget"
import { TrendLine } from "@/components/charts/TrendLine"
import { RadialGauge } from "@/components/charts/RadialGauge"
import { useSubjects } from "@/hooks/useSubjects"
import { useEntries, useUpdateEntry } from "@/hooks/useEntries"
import { useHistory } from "@/hooks/useHistory"
import { useUsers } from "@/hooks/useUsers"
import { planSubject, generateInsights } from "@/lib/plan"
import { formatRelativeTime, exportToCsv, formatPct } from "@/lib/format"

export function PersonDashboard() {
  const { name: encodedName } = useParams<{ name: string }>()
  const userName = encodedName ? decodeURIComponent(encodedName) : ""
  const navigate = useNavigate()

  const [viewMode, setViewMode] = React.useState<"cards" | "table">("cards")
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false)
  const [copiedLink, setCopiedLink] = React.useState(false)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  const { data: subjects = [], isLoading: loadingSubs } = useSubjects()
  const { data: entries = [], isLoading: loadingEntries } = useEntries(userName)
  const { data: history = [] } = useHistory(userName)
  const { users } = useUsers()
  const updateMutation = useUpdateEntry()

  // Auto clear toast after 3s
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Combine subjects with person's entries
  const subjectData = React.useMemo(() => {
    return subjects.map((sub) => {
      const entry = entries.find((e) => e.subject === sub.name)
      return {
        name: sub.name,
        total: sub.total,
        position: sub.position,
        done: entry ? entry.done : 0,
        attended: entry ? entry.attended : 0,
      }
    })
  }, [subjects, entries])

  // Aggregate KPIs
  const {
    totalAttended,
    totalDone,
    totalRemaining,
    overallPct,
    safe86Count,
    safe75Count,
    atRiskCount,
  } = React.useMemo(() => {
    let attendedSum = 0
    let doneSum = 0
    let remainingSum = 0
    let safe86 = 0
    let safe75 = 0
    let atRisk = 0

    subjectData.forEach((s) => {
      attendedSum += s.attended
      doneSum += s.done
      const plan = planSubject(s.total, s.done, s.attended)
      remainingSum += plan.remaining
      if (plan.at86.status === "SAFE") safe86++
      if (plan.at75.status === "SAFE") safe75++
      if (plan.at86.status === "IMPOSSIBLE" || plan.at75.status === "IMPOSSIBLE") {
        atRisk++
      }
    })

    const pct = doneSum > 0 ? (attendedSum / doneSum) * 100 : 0
    return {
      totalAttended: attendedSum,
      totalDone: doneSum,
      totalRemaining: remainingSum,
      overallPct: pct,
      safe86Count: safe86,
      safe75Count: safe75,
      atRiskCount: atRisk,
    }
  }, [subjectData])

  // Generate plain language insights sorted by urgency
  const insights = React.useMemo(() => {
    return generateInsights(
      subjectData.map((s) => ({
        subject: s.name,
        total: s.total,
        done: s.done,
        attended: s.attended,
      }))
    )
  }, [subjectData])

  // Handler for updates
  const handleUpdate = async (subject: string, done: number, attended: number) => {
    try {
      await updateMutation.mutateAsync({
        user_name: userName,
        subject,
        done,
        attended,
      })
      showToast(`Updated ${subject}: ${done} done, ${attended} attended`)
    } catch (err: any) {
      showToast(`Failed to update ${subject}: ${err?.message || "Error"}`)
    }
  }

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      "Subject",
      "Total Classes",
      "Done",
      "Attended",
      "Remaining",
      "Live %",
      "Status @ 86%",
      "Must Attend @ 86%",
      "Can Skip @ 86%",
      "Status @ 75%",
      "Must Attend @ 75%",
      "Can Skip @ 75%",
    ]

    const rows = subjectData.map((s) => {
      const plan = planSubject(s.total, s.done, s.attended)
      return [
        s.name,
        s.total,
        s.done,
        s.attended,
        plan.remaining,
        `${plan.livePct.toFixed(1)}%`,
        plan.at86.status,
        plan.at86.mustAttend,
        plan.at86.canSkip,
        plan.at75.status,
        plan.at75.mustAttend,
        plan.at75.canSkip,
      ]
    })

    exportToCsv(`${userName}_attendance_report`, headers, rows)
  }

  // Copy share URL
  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
    showToast("Shareable profile link copied to clipboard!")
  }

  // Chart datasets preparation
  const barChartData = React.useMemo(() => {
    return subjectData.map((s) => {
      const plan = planSubject(s.total, s.done, s.attended)
      return {
        subject: s.name,
        livePct: plan.livePct,
      }
    })
  }, [subjectData])

  const stackedChartData = React.useMemo(() => {
    return subjectData.map((s) => {
      const plan = planSubject(s.total, s.done, s.attended)
      const missed = Math.max(0, s.done - s.attended)
      return {
        subject: s.name,
        attended: s.attended,
        missed,
        remaining: plan.remaining,
      }
    })
  }, [subjectData])

  const skipBudgetData = React.useMemo(() => {
    return subjectData.map((s) => {
      const plan = planSubject(s.total, s.done, s.attended)
      return {
        subject: s.name,
        canSkip86: plan.at86.canSkip,
        canSkip75: plan.at75.canSkip,
      }
    })
  }, [subjectData])

  // Trend data grouped by time
  const trendChartData = React.useMemo(() => {
    if (history.length === 0) return []
    // Group records into points
    const pointsMap = new Map<string, any>()
    history.forEach((h) => {
      const timeLabel = new Date(h.changed_at).toLocaleDateString(undefined, {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      const current = pointsMap.get(timeLabel) || { time: timeLabel }
      if (h.done > 0) {
        current[h.subject] = (h.attended / h.done) * 100
      }
      pointsMap.set(timeLabel, current)
    })
    return Array.from(pointsMap.values())
  }, [history])

  if (loadingSubs || loadingEntries) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="text-sm text-muted-foreground">Loading {userName}'s statistics...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-foreground text-background text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xl animate-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Header & Quick Profile Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary text-xl shadow-inner">
            {userName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {userName}
              </h1>
              {/* Quick switcher dropdown */}
              <div className="relative inline-block">
                <select
                  aria-label="Switch person"
                  value={userName}
                  onChange={(e) => navigate(`/u/${encodeURIComponent(e.target.value)}`)}
                  className="text-xs bg-muted/60 hover:bg-muted border rounded-md px-2 py-1 pr-6 cursor-pointer font-medium appearance-none focus:outline-none"
                >
                  {users.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-3 w-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personal Attendance Dashboard — changes save automatically.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShareLink}
            className="h-8 gap-1.5 text-xs"
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
            {copiedLink ? "Copied" : "Share"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <History className="h-3.5 w-3.5" />
            Audit History
          </Button>

          {/* Table / Card view mode toggle */}
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/30 ml-1">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-md ${
                viewMode === "cards" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
              }`}
              title="Card View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md ${
                viewMode === "table" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
              }`}
              title="Table View"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <KpiRow
        overallPct={overallPct}
        totalAttended={totalAttended}
        totalDone={totalDone}
        totalRemaining={totalRemaining}
        safe86Count={safe86Count}
        safe75Count={safe75Count}
        atRiskCount={atRiskCount}
      />

      {/* Insights Panel */}
      <InsightsPanel insights={insights} />

      {/* Subject Statistics Display: Cards or Table */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Subject Breakdown</h2>
          <span className="text-xs text-muted-foreground">
            {subjectData.length} subjects enrolled
          </span>
        </div>

        {viewMode === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectData.map((s) => (
              <SubjectCard
                key={s.name}
                userName={userName}
                subjectName={s.name}
                total={s.total}
                done={s.done}
                attended={s.attended}
                onUpdate={(newDone, newAttended) =>
                  handleUpdate(s.name, newDone, newAttended)
                }
              />
            ))}
          </div>
        ) : (
          <SubjectTable
            userName={userName}
            subjects={subjectData}
            onUpdate={handleUpdate}
          />
        )}
      </section>

      {/* What-If Semester Simulator */}
      <WhatIfSimulator subjects={subjectData} />

      {/* Recharts Data Visualizations Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AttendanceBar data={barChartData} />
        <RadialGauge pct={overallPct} />
        <StackedSubject data={stackedChartData} />
        <SkipBudget data={skipBudgetData} />
        <div className="lg:col-span-2">
          <TrendLine
            data={trendChartData}
            subjects={subjectData.map((s) => s.name)}
          />
        </div>
      </section>

      {/* Audit History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historyRows={history}
        userName={userName}
      />
    </div>
  )
}
