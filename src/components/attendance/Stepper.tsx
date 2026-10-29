import * as React from "react"
import { Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface StepperProps {
  value: number
  onChange: (val: number) => void
  min?: number
  max?: number
  label?: string
  disabled?: boolean
  className?: string
  warning?: boolean
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max,
  label,
  disabled = false,
  className,
  warning = false,
}: StepperProps) {
  const [internalStr, setInternalStr] = React.useState(String(value))

  // Sync internal string when external value updates
  React.useEffect(() => {
    setInternalStr(String(value))
  }, [value])

  const handleDecrement = () => {
    if (disabled) return
    const next = Math.max(min, value - 1)
    onChange(next)
  }

  const handleIncrement = () => {
    if (disabled) return
    const next = max !== undefined ? Math.min(max, value + 1) : value + 1
    onChange(next)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalStr(e.target.value)
  }

  const handleBlur = () => {
    const parsed = parseInt(internalStr, 10)
    if (isNaN(parsed)) {
      setInternalStr(String(value))
      return
    }
    let clamped = Math.max(min, parsed)
    if (max !== undefined) clamped = Math.min(max, clamped)
    onChange(clamped)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur()
    }
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <label className="text-xs font-medium text-muted-foreground select-none">
          {label}
        </label>
      )}
      <div
        className={cn(
          "flex items-center rounded-lg border bg-background/50 shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring",
          warning && "border-attend/50 bg-attend/5"
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="h-8 w-8 rounded-r-none text-muted-foreground hover:text-foreground"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          aria-label={`Decrease ${label || 'value'}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={internalStr}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="w-12 text-center text-sm font-semibold tabular-nums bg-transparent focus:outline-none"
          aria-label={label || 'Numeric input'}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="h-8 w-8 rounded-l-none text-muted-foreground hover:text-foreground"
          onClick={handleIncrement}
          disabled={disabled || (max !== undefined && value >= max)}
          aria-label={`Increase ${label || 'value'}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
