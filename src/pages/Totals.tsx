import * as React from "react"
import { Layers, Plus, Save, AlertTriangle, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useSubjects, useUpsertSubject } from "@/hooks/useSubjects"
import { useAllEntries } from "@/hooks/useEntries"
import { Stepper } from "@/components/attendance/Stepper"

export function Totals() {
  const { data: subjects = [], isLoading } = useSubjects()
  const { data: allEntries = [] } = useAllEntries()
  const upsertMutation = useUpsertSubject()

  // Local state for editing totals
  const [totalsMap, setTotalsMap] = React.useState<Record<string, number>>({})
  const [hasChanges, setHasChanges] = React.useState(false)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  // Add new subject state
  const [newSubjectName, setNewSubjectName] = React.useState("")
  const [newSubjectTotal, setNewSubjectTotal] = React.useState(40)
  const [addError, setAddError] = React.useState<string | null>(null)

  // Sync initial totals
  React.useEffect(() => {
    const initial: Record<string, number> = {}
    subjects.forEach((s) => {
      initial[s.name] = s.total
    })
    setTotalsMap(initial)
  }, [subjects])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Count how many people each subject affects and max done
  const subjectMetadata = React.useMemo(() => {
    const meta: Record<string, { peopleCount: number; maxDone: number }> = {}
    subjects.forEach((s) => {
      const related = allEntries.filter((e) => e.subject === s.name)
      const people = new Set(related.map((e) => e.user_name)).size
      const maxDone = related.reduce((max, e) => Math.max(max, e.done), 0)
      meta[s.name] = { peopleCount: people, maxDone }
    })
    return meta
  }, [subjects, allEntries])

  const handleTotalChange = (name: string, val: number) => {
    setTotalsMap((prev) => ({ ...prev, [name]: val }))
    setHasChanges(true)
  }

  const handleSaveAll = async () => {
    try {
      for (const s of subjects) {
        const newTotal = totalsMap[s.name] ?? s.total
        if (newTotal !== s.total) {
          await upsertMutation.mutateAsync({
            name: s.name,
            total: newTotal,
            position: s.position,
          })
        }
      }
      setHasChanges(false)
      showToast("Subject totals saved successfully!")
    } catch (err: any) {
      showToast(`Failed to save: ${err?.message || "Error"}`)
    }
  }

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)

    const clean = newSubjectName.trim()
    if (!clean) {
      setAddError("Subject name cannot be empty")
      return
    }
    if (subjects.some((s) => s.name.toLowerCase() === clean.toLowerCase())) {
      setAddError("A subject with this name already exists")
      return
    }

    try {
      const nextPos =
        subjects.length > 0 ? Math.max(...subjects.map((s) => s.position)) + 1 : 0
      await upsertMutation.mutateAsync({
        name: clean,
        total: Math.max(0, newSubjectTotal),
        position: nextPos,
      })
      setNewSubjectName("")
      setNewSubjectTotal(40)
      showToast(`Subject "${clean}" added successfully!`)
    } catch (err: any) {
      setAddError(err?.message || "Failed to create subject")
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-foreground text-background text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xl animate-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Manage Subject Totals
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure the expected semester class counts. Updates apply to everyone immediately.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          disabled={!hasChanges || upsertMutation.isPending}
          onClick={handleSaveAll}
          className="h-9 gap-1.5 text-xs font-semibold"
        >
          <Save className="h-4 w-4" />
          {upsertMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Subjects Edit List */}
      <div className="w-full overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase border-b select-none">
            <tr>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">Affects</th>
              <th className="py-3 px-4 text-center">Semester Total Classes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {subjects.map((s) => {
              const currentTotal = totalsMap[s.name] ?? s.total
              const meta = subjectMetadata[s.name] || { peopleCount: 0, maxDone: 0 }
              const isLowerThanDone = meta.maxDone > 0 && currentTotal < meta.maxDone

              return (
                <tr key={s.name} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-foreground">
                    {s.name}
                    {isLowerThanDone && (
                      <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-normal mt-0.5">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        Warning: Lower than highest recorded classes done ({meta.maxDone})
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {meta.peopleCount} people
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex justify-center">
                      <Stepper
                        value={currentTotal}
                        onChange={(val) => handleTotalChange(s.name, val)}
                        warning={isLowerThanDone}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add New Subject Card */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Add New Subject
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <form onSubmit={handleAddSubject} className="flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <label className="text-xs font-medium text-muted-foreground">
                Subject Name
              </label>
              <input
                type="text"
                placeholder="e.g. Computer Networks"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                maxLength={40}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="w-full sm:w-32">
              <label className="text-xs font-medium text-muted-foreground">
                Total Classes
              </label>
              <input
                type="number"
                min="0"
                value={newSubjectTotal}
                onChange={(e) => setNewSubjectTotal(parseInt(e.target.value, 10) || 0)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
              />
            </div>

            <Button type="submit" size="sm" className="h-9 gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Add Subject
            </Button>
          </form>

          {addError && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">
              {addError}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
