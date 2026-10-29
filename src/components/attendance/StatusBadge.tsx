import * as React from "react"
import { CheckCircle2, Clock, XCircle, AlertTriangle, HelpCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { type AttendanceStatus } from "@/lib/plan"

interface StatusBadgeProps {
  status: AttendanceStatus
  label?: string
  showIcon?: boolean
  className?: string
}

export function StatusBadge({
  status,
  label,
  showIcon = true,
  className,
}: StatusBadgeProps) {
  if (status === 'SAFE') {
    return (
      <Badge variant="safe" className={className}>
        {showIcon && <CheckCircle2 className="h-3.5 w-3.5 text-safe" />}
        <span>{label || 'Safe'}</span>
      </Badge>
    )
  }

  if (status === 'ATTEND') {
    return (
      <Badge variant="attend" className={className}>
        {showIcon && <Clock className="h-3.5 w-3.5 text-attend" />}
        <span>{label || 'Attend'}</span>
      </Badge>
    )
  }

  return (
    <Badge variant="impossible" className={className}>
      {showIcon && <XCircle className="h-3.5 w-3.5 text-destructive" />}
      <span>{label || 'Impossible'}</span>
    </Badge>
  )
}
