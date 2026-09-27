import { describe, it, expect } from 'vitest'
import { EXIDX } from '../lib/exercises.js'

describe('Exercise weight progression 6-month data calculation', () => {
  const baseTime = new Date('2026-09-26T12:00:00').getTime()
  const LIFT_ID = '0025' // Bench press (barbell)

  it('correctly filters sessions within the last 6 months and tracks progression', () => {
    const workouts = [
      // 8 months ago (outside 180-day window)
      {
        id: 'w0',
        d: '2026-01-20',
        start: baseTime - 240 * 86400000,
        entries: [{ id: LIFT_ID, sets: [{ w: 60, r: 10, done: true }] }]
      },
      // 5 months ago (inside 180-day window)
      {
        id: 'w1',
        d: '2026-04-26',
        start: baseTime - 150 * 86400000,
        entries: [{ id: LIFT_ID, sets: [{ w: 70, r: 8, done: true }] }]
      },
      // 3 months ago (inside 180-day window)
      {
        id: 'w2',
        d: '2026-06-26',
        start: baseTime - 90 * 86400000,
        entries: [{ id: LIFT_ID, sets: [{ w: 80, r: 6, done: true }] }]
      },
      // 2 weeks ago (inside 180-day window)
      {
        id: 'w3',
        d: '2026-09-12',
        start: baseTime - 14 * 86400000,
        entries: [{ id: LIFT_ID, sets: [{ w: 85, r: 5, done: true }] }]
      }
    ]

    const cutoff6M = baseTime - 180 * 86400000
    const inWindow = workouts.filter(w => (w.start || new Date(w.d).getTime()) >= cutoff6M)

    expect(inWindow).toHaveLength(3)

    const pts = inWindow.map(w => {
      const en = w.entries.find(e => e.id === LIFT_ID)
      const topSet = en.sets.filter(s => s.done).sort((a, b) => b.w - a.w)[0]
      return {
        t: w.start,
        d: w.d,
        y: topSet.w,
        r: topSet.r
      }
    })

    expect(pts[0].y).toBe(70) // Starting in 6M window
    expect(pts[pts.length - 1].y).toBe(85) // Latest in 6M window
    expect(Math.max(...pts.map(p => p.y))).toBe(85) // Peak in 6M window

    const delta = pts[pts.length - 1].y - pts[0].y
    expect(delta).toBe(15) // +15 kg in 6 months
    const pct = (delta / pts[0].y) * 100
    expect(pct).toBeCloseTo(21.43, 1)
  })

  it('verifies exercise exists in catalog', () => {
    expect(EXIDX[LIFT_ID]).toBeDefined()
    expect(EXIDX[LIFT_ID].n).toContain('bench press')
  })
})
