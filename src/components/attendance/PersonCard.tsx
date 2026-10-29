import * as React from "react"
import { Link } from "react-router-dom"
import { ArrowRight, CheckCircle2, Clock, XCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkline } from "@/components/attendance/Sparkline"
import { formatPct } from "@/lib/format"
import { cn } from "@/lib/utils"

interface PersonCardProps {
  name: string
  overallPct: number
  totalAttended: number
  totalDone: number
  safe86Count: number
  safe75Count: number
  atRiskCount: number
  trendData: number[]
}

export function PersonCard({
  name,
  overallPct,
  totalAttended,
  totalDone,
  safe86Count,
  safe75Count,
  atRiskCount,
  trendData,
}: PersonCardProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  let statusColor = "text-danger"
  if (overallPct >= 86) statusColor = "text-safe"
  else if (overallPct >= 75) statusColor = "text-attend"

  return (
    <Link to={`/u/${encodeURIComponent(name)}`} className="block group">
      <Card className="h-full border-border/70 hover:border-primary/50 hover:shadow-md transition-all">
        <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
          {/* Header & Avatar */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-base shadow-inner">
                {initials}
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                  <span>{name}</span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
                </h3>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {totalAttended} / {totalDone} classes attended
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className={cn("text-2xl font-black tabular-nums tracking-tight", statusColor)}>
                {formatPct(overallPct, 1)}
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Overall %
              </span>
            </div>
          </div>

          {/* Sparkline & Mini Status Breakdown */}
          <div className="flex items-end justify-between border-t pt-3 mt-1">
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1 text-safe font-medium" title="Safe for 86%">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="tabular-nums font-bold">{safe86Count}</span>
              </div>
              <div className="flex items-center gap-1 text-attend font-medium" title="Safe for 75%">
                <Clock className="h-3.5 w-3.5" />
                <span className="tabular-nums font-bold">{safe75Count}</span>
              </div>
              <div className="flex items-center gap-1 text-danger font-medium" title="At risk">
                <XCircle className="h-3.5 w-3.5" />
                <span className="tabular-nums font-bold">{atRiskCount}</span>
              </div>
            </div>

            <div className="w-24">
              <Sparkline data={trendData} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
