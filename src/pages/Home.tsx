import * as React from "react"
import { Link } from "react-router-dom"
import { UserPlus, Trophy, Award, GitCompare, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PersonCard } from "@/components/attendance/PersonCard"
import { AddPersonDialog } from "@/components/attendance/AddPersonDialog"
import { useSubjects } from "@/hooks/useSubjects"
import { useAllEntries, useAddPerson } from "@/hooks/useEntries"
import { useHistory } from "@/hooks/useHistory"
import { planSubject } from "@/lib/plan"
import { formatPct } from "@/lib/format"

export function Home() {
  const [isAddOpen, setIsAddOpen] = React.useState(false)

  const { data: subjects = [], isLoading: loadingSubs, refetch: refetchSubs } = useSubjects()
  const { data: allEntries = [], isLoading: loadingEntries, refetch: refetchEntries } = useAllEntries()
  const { data: allHistory = [] } = useHistory()
  const addPersonMutation = useAddPerson()

  // Distinct users
  const userNames = React.useMemo(() => {
    return Array.from(new Set(allEntries.map((e) => e.user_name))).sort()
  }, [allEntries])

  // Build subject lookup
  const subjectMap = React.useMemo(() => {
    const map = new Map<string, number>()
    subjects.forEach((s) => map.set(s.name, s.total))
    return map
  }, [subjects])

  // Compute stats per person
  const personStats = React.useMemo(() => {
    return userNames.map((name) => {
      const userEntries = allEntries.filter((e) => e.user_name === name)

      let totalAttended = 0
      let totalDone = 0
      let safe86Count = 0
      let safe75Count = 0
      let atRiskCount = 0
      let totalSkippable86 = 0

      userEntries.forEach((entry) => {
        const total = subjectMap.get(entry.subject) ?? 0
        totalAttended += entry.attended
        totalDone += entry.done

        const plan = planSubject(total, entry.done, entry.attended)
        if (plan.at86.status === "SAFE") safe86Count++
        if (plan.at75.status === "SAFE") safe75Count++
        if (plan.at86.status === "IMPOSSIBLE" || plan.at75.status === "IMPOSSIBLE") {
          atRiskCount++
        }
        totalSkippable86 += plan.at86.canSkip
      })

      const overallPct = totalDone > 0 ? (totalAttended / totalDone) * 100 : 0

      // Compute sparkline trend data from history
      const userHist = allHistory.filter((h) => h.user_name === name)
      // Group history into sequential snapshots
      const trendPoints: number[] = []
      if (userHist.length > 0) {
        // Sample recent history entries
        userHist.slice(-8).forEach((h) => {
          if (h.done > 0) {
            trendPoints.push((h.attended / h.done) * 100)
          }
        })
      }
      if (trendPoints.length === 0) {
        trendPoints.push(overallPct)
      }

      return {
        name,
        overallPct,
        totalAttended,
        totalDone,
        safe86Count,
        safe75Count,
        atRiskCount,
        totalSkippable86,
        trendPoints,
      }
    })
  }, [userNames, allEntries, subjectMap, allHistory])

  // Leaderboard logic:
  // Best overall %
  const bestPerson = React.useMemo(() => {
    if (personStats.length === 0) return null
    return [...personStats].sort((a, b) => b.overallPct - a.overallPct)[0]
  }, [personStats])

  // Most skippable classes
  const mostRelaxedPerson = React.useMemo(() => {
    if (personStats.length === 0) return null
    return [...personStats].sort((a, b) => b.totalSkippable86 - a.totalSkippable86)[0]
  }, [personStats])

  const handleAddPerson = async (name: string) => {
    await addPersonMutation.mutateAsync({
      userName: name,
      subjects: subjects.map((s) => ({ name: s.name })),
    })
  }

  if (loadingSubs || loadingEntries) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="text-sm text-muted-foreground">Loading attendance data...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Leaderboard strip */}
      {personStats.length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 rounded-xl border bg-gradient-to-r from-primary/5 via-accent/10 to-transparent">
          {bestPerson && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-card/60 border border-border/50">
              <div className="h-9 w-9 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  Highest Attendance
                </span>
                <p className="text-sm font-bold flex items-center gap-1.5">
                  <span>{bestPerson.name}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold tabular-nums">
                    ({formatPct(bestPerson.overallPct, 1)})
                  </span>
                </p>
              </div>
            </div>
          )}

          {mostRelaxedPerson && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-card/60 border border-border/50">
              <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  Most Skippable Classes
                </span>
                <p className="text-sm font-bold flex items-center gap-1.5">
                  <span>{mostRelaxedPerson.name}</span>
                  <span className="text-primary font-extrabold tabular-nums">
                    ({mostRelaxedPerson.totalSkippable86} skippable @ 86%)
                  </span>
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between sm:col-span-2 lg:col-span-1 p-2.5 rounded-lg bg-card/60 border border-border/50">
            <div>
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                Compare Friends
              </span>
              <p className="text-xs text-muted-foreground">
                Direct side-by-side analysis
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <Link to="/compare">
                <GitCompare className="h-3.5 w-3.5" />
                Compare People
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Main Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            People Dashboards
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click any profile to review detailed stats, adjust attendance, or run what-if simulations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              refetchSubs()
              refetchEntries()
            }}
            className="h-9 gap-1 text-xs"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Sync
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Person
          </Button>
        </div>
      </div>

      {/* People Grid */}
      {personStats.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl bg-card p-8">
          <p className="text-muted-foreground text-sm">
            No people registered yet. Click "Add Person" above to create the first record!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {personStats.map((p) => (
            <PersonCard
              key={p.name}
              name={p.name}
              overallPct={p.overallPct}
              totalAttended={p.totalAttended}
              totalDone={p.totalDone}
              safe86Count={p.safe86Count}
              safe75Count={p.safe75Count}
              atRiskCount={p.atRiskCount}
              trendData={p.trendPoints}
            />
          ))}
        </div>
      )}

      {/* Add Person Modal */}
      <AddPersonDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={handleAddPerson}
        existingUsers={userNames}
      />
    </div>
  )
}
