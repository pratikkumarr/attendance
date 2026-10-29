/**
 * format.ts — Formatting utilities for attendance metrics, percentages, dates, and CSV export.
 */

/**
 * Format a percentage to 0 decimals for general display, or 1 decimal if requested.
 */
export function formatPct(val: number, precision: number = 0): string {
  if (isNaN(val) || !isFinite(val)) return '0%'
  return `${val.toFixed(precision)}%`
}

/**
 * Format ratio like "41 / 44"
 */
export function formatRatio(numerator: number, denominator: number): string {
  return `${numerator} / ${denominator}`
}

/**
 * Human readable relative or formatted date for history timestamps.
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const diffInSec = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSec < 10) return 'Just now'
  if (diffInSec < 60) return `${diffInSec}s ago`

  const diffInMin = Math.floor(diffInSec / 60)
  if (diffInMin < 60) return `${diffInMin}m ago`

  const diffInHours = Math.floor(diffInMin / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Clean & validate a person's display name.
 * Rules: trimmed, 1-30 characters, no forward/back slashes.
 */
export function validateUserName(name: string): { valid: boolean; error?: string; cleanName: string } {
  const cleanName = name.trim()
  if (!cleanName) {
    return { valid: false, error: 'Name cannot be empty', cleanName }
  }
  if (cleanName.length > 30) {
    return { valid: false, error: 'Name must be 30 characters or fewer', cleanName }
  }
  if (cleanName.includes('/') || cleanName.includes('\\')) {
    return { valid: false, error: 'Name cannot contain slashes', cleanName }
  }
  return { valid: true, cleanName }
}

/**
 * Generate CSV text and trigger client-side download.
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCell = (cell: string | number) => {
    const str = String(cell ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
