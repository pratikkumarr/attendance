/**
 * plan.ts — Pure attendance calculation functions.
 *
 * No side-effects, no imports. All logic is expressed as mathematical
 * transformations on plain numbers so it is trivially unit-testable.
 *
 * Key formula:
 *   required  = ⌈p × T  − ε⌉          (ε = 1e-9 avoids floating-point ceiling bumps)
 *   mustAttend = max(required − A, 0)
 *   canSkip    = max(R − mustAttend, 0)  capped at R — never negative
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Attendance threshold levels supported by the planner. */
export type Threshold = 0.86 | 0.75

/** Status of a subject relative to a given threshold. */
export type AttendanceStatus = 'SAFE' | 'ATTEND' | 'IMPOSSIBLE'

/**
 * All computed values for one subject at one threshold level.
 */
export interface ThresholdResult {
  /** Threshold fraction (e.g. 0.86). */
  threshold: Threshold
  /** Minimum total classes that must be attended by semester end. */
  required: number
  /** How many more the person still needs to attend (may be negative — means surplus). */
  stillNeeded: number
  /** Classes the person *must* attend out of the remaining ones (clamped ≥ 0). */
  mustAttend: number
  /** Remaining classes the person *can* skip (clamped to [0, R]). */
  canSkip: number
  /** Traffic-light status. */
  status: AttendanceStatus
  /** Best possible attendance % if all remaining classes are attended. */
  maxReachablePct: number
  /** Total allowed absences over the entire semester for this threshold. */
  maxLeavesTotal: number
}

/**
 * Warnings raised when input data looks inconsistent.
 */
export interface DataWarning {
  /** Machine-readable code. */
  code:
    | 'ATTENDED_EXCEEDS_DONE'
    | 'DONE_EXCEEDS_TOTAL'
    | 'TOTAL_IS_ZERO'
    | 'ALL_ZERO'
  /** Human-readable description. */
  message: string
}

/**
 * Full computed result for one (subject, person) pair.
 */
export interface SubjectPlan {
  /** Remaining classes = max(T − D, 0). */
  remaining: number
  /** Live attendance percentage (A / D × 100), or 0 when D = 0. */
  livePct: number
  /** Results for both thresholds. */
  at86: ThresholdResult
  at75: ThresholdResult
  /** Non-fatal data warnings (shown as UI hints). */
  warnings: DataWarning[]
}

/**
 * Insight severity used for sorting and coloring.
 */
export type InsightSeverity = 'danger' | 'warning' | 'safe' | 'info'

/**
 * A single auto-generated plain-language insight sentence.
 */
export interface Insight {
  subject: string
  severity: InsightSeverity
  /** Urgency rank (lower = more urgent, shown first). */
  urgency: number
  /** Human-readable sentence. */
  message: string
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Ceiling that avoids floating-point artifacts.
 * e.g. ceil(0.86 × 59) should be 51, not 51 when 0.86×59 = 50.74.
 * The tiny ε nudges exact-integer products (like 0.75 × 60 = 45.000…) away
 * from the integer so ceil produces the correct value.
 */
function requiredAttended(threshold: Threshold, total: number): number {
  return Math.ceil(threshold * total - 1e-9)
}

/**
 * Compute a single ThresholdResult.
 */
function computeThreshold(
  threshold: Threshold,
  total: number,
  done: number,
  attended: number,
  remaining: number,
): ThresholdResult {
  const required = requiredAttended(threshold, total)
  const stillNeeded = required - attended
  const mustAttend = Math.max(stillNeeded, 0)
  const canSkip = Math.max(remaining - mustAttend, 0)

  let status: AttendanceStatus
  if (stillNeeded > remaining) {
    status = 'IMPOSSIBLE'
  } else if (mustAttend === 0) {
    status = 'SAFE'
  } else {
    status = 'ATTEND'
  }

  // Best-case % if you attend all remaining classes
  const maxReachablePct = total > 0 ? ((attended + remaining) / total) * 100 : 0

  // Total absences the threshold allows over the entire semester
  const maxLeavesTotal = total - required

  return {
    threshold,
    required,
    stillNeeded,
    mustAttend,
    canSkip,
    status,
    maxReachablePct,
    maxLeavesTotal,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute attendance plan for one subject.
 *
 * @param total    - Total scheduled classes for the semester (from subjects.total)
 * @param done     - Classes held so far (entries.done)
 * @param attended - Classes this person attended (entries.attended)
 */
export function planSubject(total: number, done: number, attended: number): SubjectPlan {
  const warnings: DataWarning[] = []

  // Guard: clamp negative inputs to 0 (defensive, UI should prevent this)
  const T = Math.max(0, Math.round(total))
  const D = Math.max(0, Math.round(done))
  const A = Math.max(0, Math.round(attended))

  if (T === 0 && D === 0 && A === 0) {
    warnings.push({ code: 'ALL_ZERO', message: 'No data entered yet for this subject.' })
  } else if (T === 0) {
    warnings.push({
      code: 'TOTAL_IS_ZERO',
      message: 'Total classes is 0 — please update the subject total.',
    })
  }

  if (A > D) {
    warnings.push({
      code: 'ATTENDED_EXCEEDS_DONE',
      message: `Attended (${A}) is greater than done (${D}). Please check the numbers.`,
    })
  }

  if (D > T && T > 0) {
    warnings.push({
      code: 'DONE_EXCEEDS_TOTAL',
      message: `Done (${D}) exceeds total (${T}). The subject total may be set too low.`,
    })
  }

  const remaining = Math.max(T - D, 0)
  const livePct = D > 0 ? (A / D) * 100 : 0

  const at86 = computeThreshold(0.86, T, D, A, remaining)
  const at75 = computeThreshold(0.75, T, D, A, remaining)

  return { remaining, livePct, at86, at75, warnings }
}

/**
 * Project the final semester attendance percentage if the person skips
 * `skipN` of the remaining classes (attending the rest).
 *
 * @param total    - Total scheduled classes
 * @param done     - Classes held so far
 * @param attended - Classes attended so far
 * @param skipN    - How many of the remaining classes to skip (clamped to [0, R])
 * @returns        Projected final % (0–100), or 0 when total is 0
 */
export function projectFinal(
  total: number,
  done: number,
  attended: number,
  skipN: number,
): number {
  const T = Math.max(0, Math.round(total))
  const D = Math.max(0, Math.round(done))
  const A = Math.max(0, Math.round(attended))
  const remaining = Math.max(T - D, 0)
  const skipped = Math.max(0, Math.min(skipN, remaining))
  const finalAttended = A + (remaining - skipped)
  return T > 0 ? (finalAttended / T) * 100 : 0
}

// ---------------------------------------------------------------------------
// Insight generation
// ---------------------------------------------------------------------------

export interface SubjectInput {
  subject: string
  total: number
  done: number
  attended: number
}

/**
 * Generate sorted plain-language insights for a person's full subject list.
 * Insights are sorted by urgency (most critical first).
 */
export function generateInsights(subjects: SubjectInput[]): Insight[] {
  const insights: Insight[] = []

  for (const { subject, total, done, attended } of subjects) {
    const plan = planSubject(total, done, attended)
    const { at86, at75, remaining, warnings } = plan

    // Data warnings become info insights
    for (const w of warnings) {
      if (w.code !== 'ALL_ZERO') {
        insights.push({
          subject,
          severity: 'info',
          urgency: 50,
          message: `${subject}: ${w.message}`,
        })
      }
    }

    if (total === 0) continue

    // IMPOSSIBLE at 86%
    if (at86.status === 'IMPOSSIBLE') {
      insights.push({
        subject,
        severity: 'danger',
        urgency: 0,
        message: `${subject}: 86% is no longer reachable — you'd need to attend ${at86.stillNeeded} more classes but only ${remaining} remain.`,
      })
    }

    // IMPOSSIBLE at 75% (but not at 86% — that's already covered above)
    if (at75.status === 'IMPOSSIBLE' && at86.status !== 'IMPOSSIBLE') {
      insights.push({
        subject,
        severity: 'danger',
        urgency: 1,
        message: `${subject}: 75% is no longer reachable — you'd need ${at75.stillNeeded} more classes but only ${remaining} remain.`,
      })
    }

    // Must attend ALL remaining for 86%
    if (at86.status === 'ATTEND' && at86.mustAttend === remaining && remaining > 0) {
      insights.push({
        subject,
        severity: 'danger',
        urgency: 2,
        message: `${subject}: You must attend all ${remaining} remaining classes to reach 86%.`,
      })
    }

    // Needs to attend some for 86% (not all)
    if (at86.status === 'ATTEND' && at86.mustAttend < remaining) {
      insights.push({
        subject,
        severity: 'warning',
        urgency: 10,
        message: `${subject}: Attend at least ${at86.mustAttend} more class${at86.mustAttend !== 1 ? 'es' : ''} to reach 86% — you can skip ${at86.canSkip}.`,
      })
    }

    // Safe at 86% — report skip budget
    if (at86.status === 'SAFE') {
      if (at86.canSkip === remaining && remaining > 0) {
        insights.push({
          subject,
          severity: 'safe',
          urgency: 40,
          message: `${subject}: Safe at 86% — you can skip all ${remaining} remaining classes.`,
        })
      } else if (at86.canSkip > 0) {
        insights.push({
          subject,
          severity: 'safe',
          urgency: 41,
          message: `${subject}: Safe at 86% — you can skip up to ${at86.canSkip} more class${at86.canSkip !== 1 ? 'es' : ''}.`,
        })
      } else {
        insights.push({
          subject,
          severity: 'safe',
          urgency: 42,
          message: `${subject}: Safe at 86% — attend all remaining classes to stay safe.`,
        })
      }
    }

    // Safe at 75% but needs work for 86%
    if (at75.status === 'SAFE' && at86.status !== 'SAFE') {
      insights.push({
        subject,
        severity: 'warning',
        urgency: 20,
        message: `${subject}: Safe at 75% (can skip ${at75.canSkip}), but still needs ${at86.mustAttend} more class${at86.mustAttend !== 1 ? 'es' : ''} for 86%.`,
      })
    }
  }

  // Sort: lower urgency number = more urgent = shown first
  insights.sort((a, b) => a.urgency - b.urgency || a.subject.localeCompare(b.subject))

  return insights
}
