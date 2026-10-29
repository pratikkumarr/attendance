import * as React from "react"
import { Plus, User, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { validateUserName } from "@/lib/format"

interface AddPersonDialogProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string) => Promise<void>
  existingUsers: string[]
}

export function AddPersonDialog({
  isOpen,
  onClose,
  onAdd,
  existingUsers,
}: AddPersonDialogProps) {
  const [name, setName] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const valResult = validateUserName(name)
    if (!valResult.valid) {
      setError(valResult.error || "Invalid name")
      return
    }

    const clean = valResult.cleanName
    if (existingUsers.some((u) => u.toLowerCase() === clean.toLowerCase())) {
      setError("A person with this name already exists")
      return
    }

    try {
      setIsSubmitting(true)
      await onAdd(clean)
      setName("")
      onClose()
    } catch (err: any) {
      setError(err?.message || "Failed to add person")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-xl border bg-card p-6 shadow-xl animate-in fade-in-0 zoom-in-95">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Add New Person
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          This will add an attendance profile for this person across all subjects initialized at 0.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Person's Name
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul"
              maxLength={30}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-danger bg-danger/10 p-2 rounded-md border border-danger/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Person"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
