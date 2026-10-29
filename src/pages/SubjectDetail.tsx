import * as React from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft, BookOpen, Clock, Calendar, CheckCircle2, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Stepper } from "@/components/attendance/Stepper"
import { StatusBadge } from "@/components/attendance/StatusBadge"
import { AttendanceProgressBar } from "@/components/attendance/AttendanceProgressBar"
import { TrendLine } from "@/components/charts/TrendLine"
import { useSubjects } from "@/hooks/useSubjects"
import { useEntries, useUpdateEntry } from "@/hooks/useEntries"
import { useHistory } from "@/hooks/useHistory"
import { planSubject, projectFinal } from "@/lib/plan"
import { formatPct, formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export function SubjectDetail() {
  const { name: encodedName, subject: encodedSubject } = useParams<{
    name: string
    subject: string
  }>()
  const userName = encodedName ? decodeURIComponent(encodedName) : ""
  const subjectName = encodedSubject ? decodeURIComponent(encodedSubject) : ""

  const [simulatedSkip, setSimulatedSkip] = React.useState<number>(0)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  const { data: subjects = [] } = useSubjects()
  const { data: entries = [] } = useEntries(userName)
  const { data: history = [] } = useHistory(userName, subjectName)
  const updateMutation = useUpdateEntry()

  const subject = subjects.find((s) => s.name === subjectName)
  const entry = entries.find((e) => e.subject === subjectName)

  const total = subject ? subject.total : 0
  const done = entry ? entry.done : 0
  const attended = entry ? entry.attended : 0

  const plan = React.useMemo(() => planSubject(total, done, attended), [total, done, attended])
  const projectedPct = React.useMemo(
    () => projectFinal(total, done, attended, simulatedSkip),
    [total, done, attended, simulatedSkip]
  )

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleUpdate = async (newDone: number, newAttended: number) => {
    try {
      await updateMutation.mutateAsync({
        user_name: userName,
        subject: subjectName,
        done: newDone,
        attended: newAttended,
      })
      showToast(`Saved changes for ${subjectName}`)
    } catch (err: any) {
      showToast(`Error: ${err?.message || "Failed to update"}`)
    }
  }

  // Trend points
  const trendData = React.useMemo(() => {
    return history.map((h) => ({
      time: new Date(h.changed_at).toLocaleDateString(undefined, {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      [subjectName]: h.done > 0 ? (h.attended / h.done) * 100 : 0,
    }))
  }, [history, subjectName])

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-foreground text-background text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xl animate-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Top Breadcrumb & Nav */}
      <div className="flex items-center justify-between border-b pb-4">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs">
          <Link to={`/u/${encodeURIComponent(userName)}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to {userName}'s Dashboard
          </Link>
        </Button>
      </div>

      {/* Subject Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            Subject Analytics
          </span>
          <h1 className="text-2xl font-black tracking-tight text-foreground mt-0.5">
            {subjectName}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Tracking attendance metrics for <strong className="text-foreground">{userName}</strong>
          </p>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-3xl font-black tabular-nums tracking-tight">
            {formatPct(plan.livePct, 1)}
          </span>
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            Current Live Attendance
          </span>
        </div>
      </div>

      {/* Live Progress Bar */}
      <AttendanceProgressBar value={plan.livePct} />

      {/* Key Numbers Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium">Total Classes</span>
            <p className="text-2xl font-bold tabular-nums mt-1">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium">Classes Done</span>
            <p className="text-2xl font-bold tabular-nums mt-1">{done}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium">Classes Attended</span>
            <p className="text-2xl font-bold tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">
              {attended}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium">Remaining Classes</span>
            <p className="text-2xl font-bold tabular-nums mt-1 text-primary">
              {plan.remaining}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stepper Edits */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Update Classes</CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex items-center gap-6">
          <Stepper
            label="Classes Done"
            value={done}
            onChange={(newDone) => handleUpdate(newDone, attended)}
          />
          <Stepper
            label="Classes Attended"
            value={attended}
            onChange={(newAttended) => handleUpdate(done, newAttended)}
          />
        </CardContent>
      </Card>

      {/* Threshold Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* For 86% Target */}
        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">86% Target Level</CardTitle>
            <StatusBadge status={plan.at86.status} />
          </CardHeader>
          <CardContent className="p-4 pt-1 flex flex-col gap-2 text-xs">
            <div className="flex justify-between border-b py-1.5">
              <span className="text-muted-foreground">Required by semester end:</span>
              <strong className="tabular-nums">{plan.at86.required} classes</strong>
            </div>
            <div className="flex justify-between border-b py-1.5">
              <span className="text-muted-foreground">Must attend from remaining:</span>
              <strong className="tabular-nums text-foreground">{plan.at86.mustAttend} classes</strong>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Maximum skippable classes:</span>
              <strong className="tabular-nums text-emerald-600 dark:text-emerald-400">
                {plan.at86.canSkip} classes
              </strong>
            </div>
          </CardContent>
        </Card>

        {/* For 75% Target */}
        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">75% Target Level</CardTitle>
            <StatusBadge status={plan.at75.status} />
          </CardHeader>
          <CardContent className="p-4 pt-1 flex flex-col gap-2 text-xs">
            <div className="flex justify-between border-b py-1.5">
              <span className="text-muted-foreground">Required by semester end:</span>
              <strong className="tabular-nums">{plan.at75.required} classes</strong>
            </div>
            <div className="flex justify-between border-b py-1.5">
              <span className="text-muted-foreground">Must attend from remaining:</span>
              <strong className="tabular-nums text-foreground">{plan.at75.mustAttend} classes</strong>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Maximum skippable classes:</span>
              <strong className="tabular-nums text-amber-600 dark:text-amber-400">
                {plan.at75.canSkip} classes
              </strong>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* What-If Simulator for This Subject */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Single-Subject What-If Simulator</CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Simulate skipping <strong className="text-foreground">{simulatedSkip}</strong> of {plan.remaining} remaining classes:
            </span>
            <span
              className={cn(
                "text-base font-bold tabular-nums",
                projectedPct >= 86
                  ? "text-emerald-600 dark:text-emerald-400"
                  : projectedPct >= 75
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              Final: {formatPct(projectedPct, 1)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max={plan.remaining}
            value={simulatedSkip}
            onChange={(e) => setSimulatedSkip(parseInt(e.target.value, 10) || 0)}
            className="w-full accent-primary cursor-pointer"
          />
        </CardContent>
      </Card>

      {/* Trend Graph */}
      <TrendLine
        data={trendData}
        subjects={[subjectName]}
        className="w-full"
      />

      {/* Audit History Timeline */}
      <Card>
        <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Change Log</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1 divide-y text-xs">
          {history.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">No recorded history entries yet.</p>
          ) : (
            history.slice().reverse().map((h) => (
              <div key={h.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-foreground">
                    Done: {h.done} | Attended: {h.attended}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    ({h.done > 0 ? `${((h.attended / h.done) * 100).toFixed(1)}%` : "0%"})
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {formatRelativeTime(h.changed_at)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
