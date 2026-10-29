import * as React from "react"
import { Sparkles, AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { type Insight, type InsightSeverity } from "@/lib/plan"
import { cn } from "@/lib/utils"

interface InsightsPanelProps {
  insights: Insight[]
  className?: string
}

export function InsightsPanel({ insights, className }: InsightsPanelProps) {
  const [collapsed, setCollapsed] = React.useState(false)

  if (insights.length === 0) {
    return (
      <Card className={cn("border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10", className)}>
        <CardContent className="flex items-center gap-3 p-4 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>All subjects look great! You are comfortably safe across all targets.</span>
        </CardContent>
      </Card>
    )
  }

  const dangerCount = insights.filter((i) => i.severity === 'danger').length
  const warningCount = insights.filter((i) => i.severity === 'warning').length

  const getSeverityIcon = (sev: InsightSeverity) => {
    switch (sev) {
      case 'danger':
        return <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      case 'safe':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
      default:
        return <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
    }
  }

  const getSeverityStyle = (sev: InsightSeverity) => {
    switch (sev) {
      case 'danger':
        return "border-rose-500/20 bg-rose-50/50 text-rose-900 dark:bg-rose-950/20 dark:text-rose-200"
      case 'warning':
        return "border-amber-500/20 bg-amber-50/50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200"
      case 'safe':
        return "border-emerald-500/20 bg-emerald-50/50 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200"
      default:
        return "border-blue-500/20 bg-blue-50/50 text-blue-900 dark:bg-blue-950/20 dark:text-blue-200"
    }
  }

  return (
    <Card className={cn("overflow-hidden shadow-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between p-4 cursor-pointer select-none bg-muted/30" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold">Actionable Insights</CardTitle>
          <div className="flex items-center gap-1.5 ml-2">
            {dangerCount > 0 && (
              <Badge variant="impossible" className="text-[11px] px-2 py-0">
                {dangerCount} critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="attend" className="text-[11px] px-2 py-0">
                {warningCount} attention
              </Badge>
            )}
          </div>
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground p-1 rounded-md"
          aria-label={collapsed ? "Expand insights" : "Collapse insights"}
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </CardHeader>

      {!collapsed && (
        <CardContent className="p-4 pt-3 flex flex-col gap-2">
          {insights.map((insight, idx) => (
            <div
              key={`${insight.subject}-${idx}`}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border p-3 text-sm transition-all",
                getSeverityStyle(insight.severity)
              )}
            >
              {getSeverityIcon(insight.severity)}
              <div className="flex-1 font-medium leading-relaxed">
                {insight.message}
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  )
}
