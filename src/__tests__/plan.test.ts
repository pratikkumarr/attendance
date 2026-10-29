/**
 * plan.test.ts — Vitest tests for src/lib/plan.ts
 *
 * Covers every required test case from the spec plus edge cases,
 * projectFinal, and insight generation.
 */

import { describe, it, expect } from 'vitest'
import {
  planSubject,
  projectFinal,
  generateInsights,
  type SubjectPlan,
  type ThresholdResult,
} from '@/lib/plan'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round to 1 decimal place (matches the "show 1 decimal in tooltips" spec). */
const r1 = (n: number) => Math.round(n * 10) / 10

// ---------------------------------------------------------------------------
// 1. Spec test cases
// ---------------------------------------------------------------------------

describe('planSubject — spec test cases', () => {
  /**
   * Case 1: T=59, D=44, A=41
   * Expected:
   *   R=15; live ≈ 93%
   *   86%: required=51, mustAttend=10, canSkip=5, status=ATTEND
   *   75%: required=45, mustAttend=4,  canSkip=11, status=ATTEND
   */
  describe('T=59 D=44 A=41', () => {
    const plan = planSubject(59, 44, 41)

    it('remaining = 15', () => expect(plan.remaining).toBe(15))
    it('livePct ≈ 93.2 (1dp)', () => expect(r1(plan.livePct)).toBe(93.2))

    it('86%: required = 51', () => expect(plan.at86.required).toBe(51))
    it('86%: mustAttend = 10', () => expect(plan.at86.mustAttend).toBe(10))
    it('86%: canSkip = 5', () => expect(plan.at86.canSkip).toBe(5))
    it('86%: status = ATTEND', () => expect(plan.at86.status).toBe('ATTEND'))

    it('75%: required = 45', () => expect(plan.at75.required).toBe(45))
    it('75%: mustAttend = 4', () => expect(plan.at75.mustAttend).toBe(4))
    it('75%: canSkip = 11', () => expect(plan.at75.canSkip).toBe(11))
    it('75%: status = ATTEND', () => expect(plan.at75.status).toBe('ATTEND'))
  })

  /**
   * Case 2: T=61, D=49, A=49
   * Expected:
   *   R=12
   *   75%: required=46, mustAttend=0, canSkip=12 (NOT 15 — capped at R), status=SAFE
   *   86%: required=53, mustAttend=4,  canSkip=8, status=ATTEND
   */
  describe('T=61 D=49 A=49', () => {
    const plan = planSubject(61, 49, 49)

    it('remaining = 12', () => expect(plan.remaining).toBe(12))

    it('75%: required = 46', () => expect(plan.at75.required).toBe(46))
    it('75%: mustAttend = 0', () => expect(plan.at75.mustAttend).toBe(0))
    it('75%: canSkip = 12 (capped at R, not 15)', () => expect(plan.at75.canSkip).toBe(12))
    it('75%: status = SAFE', () => expect(plan.at75.status).toBe('SAFE'))

    it('86%: required = 53', () => expect(plan.at86.required).toBe(53))
    it('86%: mustAttend = 4', () => expect(plan.at86.mustAttend).toBe(4))
    it('86%: canSkip = 8', () => expect(plan.at86.canSkip).toBe(8))
    it('86%: status = ATTEND', () => expect(plan.at86.status).toBe('ATTEND'))
  })

  /**
   * Case 3: T=74, D=60, A=50
   * Expected:
   *   R=14
   *   86%: required=64, mustAttend=14, canSkip=0, status=ATTEND
   */
  describe('T=74 D=60 A=50', () => {
    const plan = planSubject(74, 60, 50)

    it('remaining = 14', () => expect(plan.remaining).toBe(14))

    it('86%: required = 64', () => expect(plan.at86.required).toBe(64))
    it('86%: mustAttend = 14', () => expect(plan.at86.mustAttend).toBe(14))
    it('86%: canSkip = 0', () => expect(plan.at86.canSkip).toBe(0))
    it('86%: status = ATTEND (must attend every remaining class)', () =>
      expect(plan.at86.status).toBe('ATTEND'))
  })

  /**
   * Case 4: T=26, D=20, A=17
   * Expected:
   *   R=6
   *   86%: required=23, mustAttend=6, canSkip=0, status=ATTEND
   */
  describe('T=26 D=20 A=17', () => {
    const plan = planSubject(26, 20, 17)

    it('remaining = 6', () => expect(plan.remaining).toBe(6))

    it('86%: required = 23', () => expect(plan.at86.required).toBe(23))
    it('86%: mustAttend = 6', () => expect(plan.at86.mustAttend).toBe(6))
    it('86%: canSkip = 0', () => expect(plan.at86.canSkip).toBe(0))
    it('86%: status = ATTEND', () => expect(plan.at86.status).toBe('ATTEND'))
  })
})

// ---------------------------------------------------------------------------
// 2. Edge cases
// ---------------------------------------------------------------------------

describe('planSubject — edge cases', () => {
  describe('D = 0 (no classes held yet)', () => {
    const plan = planSubject(60, 0, 0)

    it('remaining equals total', () => expect(plan.remaining).toBe(60))
    it('livePct = 0', () => expect(plan.livePct).toBe(0))
    it('no ATTENDED_EXCEEDS_DONE warning', () =>
      expect(plan.warnings.some((w) => w.code === 'ATTENDED_EXCEEDS_DONE')).toBe(false))
    it('has ALL_ZERO warning when T also 0', () => {
      const p2 = planSubject(0, 0, 0)
      expect(p2.warnings.some((w) => w.code === 'ALL_ZERO')).toBe(true)
    })
  })

  describe('T = 0 (total not set)', () => {
    const plan = planSubject(0, 0, 0)

    it('remaining = 0', () => expect(plan.remaining).toBe(0))
    it('livePct = 0', () => expect(plan.livePct).toBe(0))
    it('maxReachablePct = 0 (not NaN)', () => {
      expect(plan.at86.maxReachablePct).toBe(0)
      expect(plan.at75.maxReachablePct).toBe(0)
    })
    it('warns ALL_ZERO', () =>
      expect(plan.warnings.some((w) => w.code === 'ALL_ZERO')).toBe(true))
  })

  describe('D > T (done exceeds total — total too low)', () => {
    const plan = planSubject(30, 35, 30)

    it('remaining = 0 (clamped)', () => expect(plan.remaining).toBe(0))
    it('warns DONE_EXCEEDS_TOTAL', () =>
      expect(plan.warnings.some((w) => w.code === 'DONE_EXCEEDS_TOTAL')).toBe(true))
    it('status for both thresholds degrades gracefully (no crash)', () => {
      expect(['SAFE', 'ATTEND', 'IMPOSSIBLE']).toContain(plan.at86.status)
      expect(['SAFE', 'ATTEND', 'IMPOSSIBLE']).toContain(plan.at75.status)
    })
  })

  describe('A > D (attended more than done — data entry error)', () => {
    const plan = planSubject(60, 40, 45)

    it('warns ATTENDED_EXCEEDS_DONE', () =>
      expect(plan.warnings.some((w) => w.code === 'ATTENDED_EXCEEDS_DONE')).toBe(true))
  })

  describe('IMPOSSIBLE target', () => {
    // T=50, D=48, A=30 → R=2, required@86%=ceil(43-ε)=43, stillNeeded=13 > R=2
    const plan = planSubject(50, 48, 30)

    it('remaining = 2', () => expect(plan.remaining).toBe(2))
    it('86% is IMPOSSIBLE', () => expect(plan.at86.status).toBe('IMPOSSIBLE'))
  })

  describe('Perfect attendance (A = D = T)', () => {
    const plan = planSubject(60, 60, 60)

    it('remaining = 0', () => expect(plan.remaining).toBe(0))
    it('livePct = 100', () => expect(plan.livePct).toBe(100))
    it('86%: SAFE', () => expect(plan.at86.status).toBe('SAFE'))
    it('75%: SAFE', () => expect(plan.at75.status).toBe('SAFE'))
    it('canSkip = 0 when R = 0', () => {
      expect(plan.at86.canSkip).toBe(0)
      expect(plan.at75.canSkip).toBe(0)
    })
  })

  describe('canSkip is never negative', () => {
    // Force a scenario where stillNeeded > R so canSkip would naively go negative
    const plan = planSubject(100, 90, 50) // R=10, required@86%=86, stillNeeded=36 > R
    it('at86 canSkip >= 0', () => expect(plan.at86.canSkip).toBeGreaterThanOrEqual(0))
    it('at75 canSkip >= 0', () => expect(plan.at75.canSkip).toBeGreaterThanOrEqual(0))
  })

  describe('canSkip is never greater than R', () => {
    // Safe scenario where surplus is larger than R
    const plan = planSubject(61, 49, 49) // case 2 from spec
    it('at75 canSkip <= remaining', () =>
      expect(plan.at75.canSkip).toBeLessThanOrEqual(plan.remaining))
    it('at86 canSkip <= remaining', () =>
      expect(plan.at86.canSkip).toBeLessThanOrEqual(plan.remaining))
  })

  describe('maxLeavesTotal', () => {
    // T=60, 86% required = ceil(0.86*60 - ε) = ceil(51.6-ε) = 52 → maxLeaves = 8
    const plan = planSubject(60, 30, 25)
    it('at86 maxLeavesTotal = T - required', () => {
      expect(plan.at86.maxLeavesTotal).toBe(60 - plan.at86.required)
    })
    it('at75 maxLeavesTotal = T - required', () => {
      expect(plan.at75.maxLeavesTotal).toBe(60 - plan.at75.required)
    })
  })

  describe('required ceiling avoids floating-point bumps', () => {
    // 0.75 * 60 = 45.0 exactly; ceil should give 45, not 46
    const plan = planSubject(60, 0, 0)
    it('at75 required for T=60 is 45', () => expect(plan.at75.required).toBe(45))

    // 0.86 * 50 = 43.0 exactly; ceil should give 43
    const plan2 = planSubject(50, 0, 0)
    it('at86 required for T=50 is 43', () => expect(plan2.at86.required).toBe(43))
  })
})

// ---------------------------------------------------------------------------
// 3. projectFinal
// ---------------------------------------------------------------------------

describe('projectFinal', () => {
  it('skip 0 → attends all remaining, same as maxReachable', () => {
    // T=59, D=44, A=41, R=15; skip 0 → final = (41+15)/59 * 100
    expect(projectFinal(59, 44, 41, 0)).toBeCloseTo((56 / 59) * 100, 5)
  })

  it('skip all remaining', () => {
    // T=59, D=44, A=41, R=15; skip 15 → final = 41/59 * 100
    expect(projectFinal(59, 44, 41, 15)).toBeCloseTo((41 / 59) * 100, 5)
  })

  it('skip 5 out of 15', () => {
    // final attended = 41 + (15-5) = 51; final % = 51/59 * 100
    expect(projectFinal(59, 44, 41, 5)).toBeCloseTo((51 / 59) * 100, 5)
  })

  it('clamps skipN below 0 → treats as 0', () => {
    expect(projectFinal(59, 44, 41, -3)).toBeCloseTo(projectFinal(59, 44, 41, 0), 5)
  })

  it('clamps skipN above R → treats as R (skip all)', () => {
    expect(projectFinal(59, 44, 41, 999)).toBeCloseTo(projectFinal(59, 44, 41, 15), 5)
  })

  it('T = 0 → returns 0, not NaN', () => {
    expect(projectFinal(0, 0, 0, 0)).toBe(0)
  })

  it('no remaining classes (D = T) → result = livePct', () => {
    // T=60, D=60, A=50 → R=0, projectFinal(any skip) = 50/60*100
    expect(projectFinal(60, 60, 50, 0)).toBeCloseTo((50 / 60) * 100, 5)
    expect(projectFinal(60, 60, 50, 5)).toBeCloseTo((50 / 60) * 100, 5)
  })

  it('attending all remaining from case 2 clears 86%', () => {
    // T=61, D=49, A=49, R=12; skip 0 → (49+12)/61 = 100%
    expect(projectFinal(61, 49, 49, 0)).toBeCloseTo(100, 5)
  })
})

// ---------------------------------------------------------------------------
// 4. Insight generation
// ---------------------------------------------------------------------------

describe('generateInsights', () => {
  it('returns empty array when no subjects', () => {
    expect(generateInsights([])).toEqual([])
  })

  it('generates an IMPOSSIBLE insight when 86% is unreachable', () => {
    // T=50, D=48, A=30, R=2 → 86% needs 43, stillNeeded=13 > 2
    const insights = generateInsights([{ subject: 'Math', total: 50, done: 48, attended: 30 }])
    const imp = insights.find((i) => i.subject === 'Math' && i.severity === 'danger')
    expect(imp).toBeDefined()
    expect(imp?.message).toMatch(/86%/)
  })

  it('generates a SAFE insight when safe at 86%', () => {
    // T=60, D=60, A=60 → 100% attendance, safe at both
    const insights = generateInsights([{ subject: 'CS', total: 60, done: 60, attended: 60 }])
    const safe = insights.find((i) => i.subject === 'CS' && i.severity === 'safe')
    expect(safe).toBeDefined()
  })

  it('sorts most urgent (IMPOSSIBLE) first', () => {
    const subjects = [
      { subject: 'Easy', total: 60, done: 60, attended: 60 }, // safe
      { subject: 'Hard', total: 50, done: 48, attended: 30 }, // impossible
    ]
    const insights = generateInsights(subjects)
    const firstDanger = insights.findIndex((i) => i.severity === 'danger')
    const firstSafe = insights.findIndex((i) => i.severity === 'safe')
    expect(firstDanger).not.toBe(-1)
    expect(firstSafe).not.toBe(-1)
    // danger must appear before safe
    expect(firstDanger).toBeLessThan(firstSafe)
  })

  it('generates "must attend all remaining" insight when mustAttend equals remaining', () => {
    // T=74, D=60, A=50, R=14, 86% mustAttend=14 === R
    const insights = generateInsights([
      { subject: 'DB', total: 74, done: 60, attended: 50 },
    ])
    const critical = insights.find(
      (i) => i.subject === 'DB' && i.message.includes('all 14 remaining'),
    )
    expect(critical).toBeDefined()
  })

  it('does not produce NaN or undefined in messages', () => {
    const subjects = [
      { subject: 'Empty', total: 0, done: 0, attended: 0 },
      { subject: 'Normal', total: 59, done: 44, attended: 41 },
    ]
    const insights = generateInsights(subjects)
    for (const insight of insights) {
      expect(insight.message).not.toMatch(/NaN/)
      expect(insight.message).not.toMatch(/undefined/)
      expect(insight.urgency).not.toBeNaN()
    }
  })

  it('includes subject name in every insight message', () => {
    const subjects = [{ subject: 'Physics', total: 60, done: 30, attended: 20 }]
    const insights = generateInsights(subjects)
    for (const i of insights) {
      expect(i.message).toContain('Physics')
    }
  })
})

// ---------------------------------------------------------------------------
// 5. livePct precision
// ---------------------------------------------------------------------------

describe('livePct precision', () => {
  it('is 0 when D = 0 (no division by zero)', () => {
    expect(planSubject(60, 0, 0).livePct).toBe(0)
  })

  it('rounds correctly at 1dp for spec case 1', () => {
    const { livePct } = planSubject(59, 44, 41)
    // 41/44*100 = 93.181818…  → 1dp = 93.2
    expect(r1(livePct)).toBe(93.2)
  })

  it('is exactly 100 when A = D', () => {
    expect(planSubject(60, 40, 40).livePct).toBe(100)
  })
})
