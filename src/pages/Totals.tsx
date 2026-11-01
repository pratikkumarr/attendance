import * as React from "react"
import { Layers, Plus, Save, AlertTriangle, Users, GraduationCap, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useSubjects, useUpsertSubject } from "@/hooks/useSubjects"
import { useAllEntries } from "@/hooks/useEntries"
import { Stepper } from "@/components/attendance/Stepper"

export function Totals() {
  const { data: subjects = [], isLoading } = useSubjects()
  const { data: allEntries = [] } = useAllEntries()
  const upsertMutation = useUpsertSubject()

  // Local state for editing totals and course codes
  const [totalsMap, setTotalsMap] = React.useState<Record<string, number>>({})
  const [courseCodesMap, setCourseCodesMap] = React.useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = React.useState(false)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  // Add new subject state
  const [newSubjectName, setNewSubjectName] = React.useState("")
  const [newSubjectCourseCode, setNewSubjectCourseCode] = React.useState("")
  const [newSubjectTotal, setNewSubjectTotal] = React.useState(40)
  const [addError, setAddError] = React.useState<string | null>(null)

  // Sync initial totals and course codes
  React.useEffect(() => {
    const initialTotals: Record<string, number> = {}
    const initialCodes: Record<string, string> = {}
    subjects.forEach((s) => {
      initialTotals[s.name] = s.total
      initialCodes[s.name] = s.course_code || ""
    })
    setTotalsMap(initialTotals)
    setCourseCodesMap(initialCodes)
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

  const handleCourseCodeChange = (name: string, code: string) => {
    setCourseCodesMap((prev) => ({ ...prev, [name]: code.toUpperCase() }))
    setHasChanges(true)
  }

  const handleSaveAll = async () => {
    try {
      for (const s of subjects) {
        const newTotal = totalsMap[s.name] ?? s.total
        const newCode = (courseCodesMap[s.name] ?? (s.course_code || "")).trim().toUpperCase()
        const oldCode = (s.course_code || "").trim().toUpperCase()

        if (newTotal !== s.total || newCode !== oldCode) {
          await upsertMutation.mutateAsync({
            name: s.name,
            total: newTotal,
            position: s.position,
            course_code: newCode || null,
          })
        }
      }
      setHasChanges(false)
      showToast("Subject totals & course codes saved successfully!")
    } catch (err: any) {
      if (err?.message?.includes("row-level security") || err?.message?.includes("violates")) {
        showToast("RLS policy error: Please run the SQL migration in Supabase SQL Editor!")
      } else {
        showToast(`Failed to save: ${err?.message || "Error"}`)
      }
    }
  }

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)

    const cleanName = newSubjectName.trim()
    const cleanCode = newSubjectCourseCode.trim().toUpperCase()

    if (!cleanName) {
      setAddError("Subject name cannot be empty")
      return
    }
    if (subjects.some((s) => s.name.toLowerCase() === cleanName.toLowerCase())) {
      setAddError("A subject with this name already exists")
      return
    }

    try {
      const nextPos =
        subjects.length > 0 ? Math.max(...subjects.map((s) => s.position)) + 1 : 0
      await upsertMutation.mutateAsync({
        name: cleanName,
        total: Math.max(0, newSubjectTotal),
        position: nextPos,
        course_code: cleanCode || null,
      })
      setNewSubjectName("")
      setNewSubjectCourseCode("")
      setNewSubjectTotal(40)
      showToast(`Subject "${cleanName}" added successfully!`)
    } catch (err: any) {
      if (err?.message?.includes("row-level security") || err?.message?.includes("violates")) {
        setAddError("RLS policy error: Please run the SQL migration in Supabase SQL Editor.")
      } else {
        setAddError(err?.message || "Failed to create subject")
      }
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
            Manage Subject Totals & Course Codes
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure planned semester class counts and map CyberVidya course codes (e.g. BCS501, KCS501) for attendance sync.
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
              <th className="py-3 px-4">
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  <span>Course Code (CyberVidya)</span>
                </div>
              </th>
              <th className="py-3 px-4">Affects</th>
              <th className="py-3 px-4 text-center">Semester Total Classes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {subjects.map((s) => {
              const currentTotal = totalsMap[s.name] ?? s.total
              const currentCode = courseCodesMap[s.name] ?? (s.course_code || "")
              const meta = subjectMetadata[s.name] || { peopleCount: 0, maxDone: 0 }
              const isLowerThanDone = meta.maxDone > 0 && currentTotal < meta.maxDone

              return (
                <tr key={s.name} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-foreground">
                    {s.name}
                    {isLowerThanDone && (
                      <span className="flex items-center gap-1 text-[11px] text-attend font-normal mt-0.5">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        Warning: Lower than highest recorded classes done ({meta.maxDone})
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <input
                      type="text"
                      placeholder="e.g. BCS501"
                      value={currentCode}
                      onChange={(e) => handleCourseCodeChange(s.name, e.target.value)}
                      maxLength={15}
                      className="w-32 rounded-lg border bg-background px-2.5 py-1 text-xs font-mono font-bold tracking-wider uppercase text-primary placeholder:text-muted-foreground/50 placeholder:normal-case placeholder:font-normal focus:outline-none focus:ring-1 focus:ring-ring"
                    />
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

            <div className="w-full sm:w-36">
              <label className="text-xs font-medium text-muted-foreground">
                Course Code (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. BCS502"
                value={newSubjectCourseCode}
                onChange={(e) => setNewSubjectCourseCode(e.target.value)}
                maxLength={15}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="w-full sm:w-28">
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

            <Button type="submit" size="sm" className="h-9 gap-1 text-xs font-semibold">
              <Plus className="h-3.5 w-3.5" />
              Add Subject
            </Button>
          </form>

          {addError && (
            <p className="text-xs text-danger mt-2">
              {addError}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
