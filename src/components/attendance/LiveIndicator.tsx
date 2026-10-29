import * as React from "react"
import { cn } from "@/lib/utils"

interface LiveIndicatorProps {
  isConnected: boolean
  lastEventAt?: Date | null
  className?: string
}

export function LiveIndicator({
  isConnected,
  lastEventAt,
  className,
}: LiveIndicatorProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium select-none shadow-sm transition-all",
        isConnected
          ? "border-safe/30 bg-safe/10 text-safe"
          : "border-muted bg-muted/50 text-muted-foreground",
        className
      )}
      title={
        isConnected
          ? `Realtime active${lastEventAt ? ` — Last update: ${lastEventAt.toLocaleTimeString()}` : ''}`
          : "Connecting to realtime..."
      }
    >
      <span className="relative flex h-2 w-2">
        {isConnected && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe opacity-75" />
        )}
        <span
          className={cn(
            "relative inline-flex rounded-full h-2 w-2",
            isConnected ? "bg-safe" : "bg-muted-foreground/60"
          )}
        />
      </span>
      <span className="font-semibold">{isConnected ? "Live" : "Offline"}</span>
    </div>
  )
}
