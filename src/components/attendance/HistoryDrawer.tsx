import * as React from "react"
import { History, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatRelativeTime } from "@/lib/format"
import { type EntryHistoryRow } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface HistoryDrawerProps {
  isOpen: boolean
  onClose: () => void
  historyRows: EntryHistoryRow[]
  userName: string
  subjectName?: string
}

export function HistoryDrawer({
  isOpen,
  onClose,
  historyRows,
  userName,
  subjectName,
}: HistoryDrawerProps) {
  if (!isOpen) return null

  // Filter history for target user & optional subject
  const filtered = historyRows
    .filter((h) => h.user_name === userName && (!subjectName || h.subject === subjectName))
    .slice()
    .reverse() // Most recent first

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-md h-full bg-background border-l shadow-2xl flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold">Audit History</h2>
              <p className="text-xs text-muted-foreground">
                {subjectName ? `${subjectName} (${userName})` : `All subjects for ${userName}`}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close drawer">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No recorded history changes yet.
            </div>
          ) : (
            filtered.map((item, index) => (
              <div
                key={item.id}
                className="relative pl-6 pb-4 border-l-2 border-border/60 last:border-l-0"
              >
                {/* Timeline node */}
                <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary" />

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground truncate max-w-[180px]">
                      {item.subject}
                    </span>
                    <span className="text-muted-foreground">
                      {formatRelativeTime(item.changed_at)}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground tabular-nums bg-muted/40 p-2 rounded-md">
                    Done: <strong className="text-foreground">{item.done}</strong> | Attended:{" "}
                    <strong className="text-foreground">{item.attended}</strong> (
                    {item.done > 0 ? `${((item.attended / item.done) * 100).toFixed(1)}%` : "0%"})
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
