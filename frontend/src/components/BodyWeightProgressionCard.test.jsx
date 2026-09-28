import { describe, it, expect } from 'vitest'

describe('Body weight progression data calculation and goal tracking', () => {
  const baseTime = new Date('2026-09-27T12:00:00').getTime()

  const sampleWeights = [
    { d: '2026-06-25', t: baseTime - 94 * 86400000, w: 82.5 },
    { d: '2026-07-15', t: baseTime - 74 * 86400000, w: 81.2 },
    { d: '2026-08-10', t: baseTime - 48 * 86400000, w: 79.8 },
    { d: '2026-09-01', t: baseTime - 26 * 86400000, w: 78.4 },
    { d: '2026-09-20', t: baseTime - 7 * 86400000, w: 77.5 },
    { d: '2026-09-27', t: baseTime, w: 77.0 }
  ]

  it('filters weigh-ins within a 90-day window correctly', () => {
    const cutoff90 = baseTime - 90 * 86400000
    const inWindow = sampleWeights.filter(b => b.t >= cutoff90)
    expect(inWindow).toHaveLength(5)
    expect(inWindow[0].w).toBe(81.2)
    expect(inWindow[inWindow.length - 1].w).toBe(77.0)
  })

  it('calculates net change, percentage, and period range correctly', () => {
    const cutoff90 = baseTime - 90 * 86400000
    const inWindow = sampleWeights.filter(b => b.t >= cutoff90)
    const starting = inWindow[0].w
    const latest = inWindow[inWindow.length - 1].w
    const delta = Math.round((latest - starting) * 10) / 10
    const pct = Math.round(((delta / starting) * 100) * 10) / 10

    expect(delta).toBe(-4.2)
    expect(pct).toBe(-5.2)

    const minW = Math.min(...inWindow.map(b => b.w))
    const maxW = Math.max(...inWindow.map(b => b.w))
    expect(minW).toBe(77.0)
    expect(maxW).toBe(81.2)
  })

  it('computes goal distance and progress percentage for weight loss goal', () => {
    const targetW = 75.0
    const starting = 81.2
    const latest = 77.0

    const totalNeeded = starting - targetW // 6.2 kg
    const achieved = starting - latest // 4.2 kg
    const distance = Math.round(Math.abs(latest - targetW) * 10) / 10 // 2.0 kg
    const progressPct = Math.round((achieved / totalNeeded) * 100)

    expect(distance).toBe(2.0)
    expect(progressPct).toBe(68)
    expect(latest <= targetW).toBe(false)
  })

  it('detects when goal is reached', () => {
    const targetW = 78.0
    const latest = 77.0
    const isLossGoal = true
    const isAchieved = isLossGoal ? latest <= targetW : latest >= targetW
    expect(isAchieved).toBe(true)
  })
})
