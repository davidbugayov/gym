import { describe, it, expect } from 'vitest'
import { getVolumeProgression30Days } from './volume-30d.js'

describe('getVolumeProgression30Days', () => {
  const baseTime = new Date('2026-09-30T12:00:00Z').getTime()

  it('generates 30 days of data ending today', () => {
    const res = getVolumeProgression30Days([], { now: baseTime, days: 30 })
    expect(res.days).toHaveLength(30)
    expect(res.days[29].date).toBe('2026-09-30')
    expect(res.days[0].date).toBe('2026-09-01')
    expect(res.totalVolume).toBe(0)
    expect(res.hasData).toBe(false)
  })

  it('aggregates workout volume by day correctly across the 30-day window', () => {
    const workouts = [
      {
        id: 'w1',
        d: '2026-09-15',
        vol: 5000,
        entries: [{ sets: [{ w: 100, r: 10, done: true }, { w: 100, r: 10, done: true }] }]
      },
      {
        id: 'w2',
        d: '2026-09-15', // Same day second workout
        vol: 3000,
        entries: [{ sets: [{ w: 50, r: 10, done: true }] }]
      },
      {
        id: 'w3',
        d: '2026-09-25',
        vol: 10000,
        entries: [{ sets: [{ w: 100, r: 10, done: true }] }]
      },
      {
        id: 'w_old', // Outside 30 days
        d: '2026-08-10',
        vol: 8000,
        entries: [{ sets: [{ w: 100, r: 10, done: true }] }]
      }
    ]

    const res = getVolumeProgression30Days(workouts, { now: baseTime, days: 30 })
    expect(res.hasData).toBe(true)
    expect(res.totalVolume).toBe(18000) // 5000 + 3000 + 10000 (w_old excluded)
    expect(res.workoutsCount).toBe(3)
    expect(res.activeDaysCount).toBe(2)

    // Day 2026-09-15 should have 8000 volume and 2 workouts
    const sep15 = res.days.find(d => d.date === '2026-09-15')
    expect(sep15).toBeDefined()
    expect(sep15.volume).toBe(8000)
    expect(sep15.workouts).toHaveLength(2)

    // Peak day should be 2026-09-25 with 10000 volume
    expect(res.peakDay.date).toBe('2026-09-25')
    expect(res.peakDay.volume).toBe(10000)
  })

  it('calculates 15-day progression trend percentage', () => {
    // 1st half: 2026-09-01 to 2026-09-15
    // 2nd half: 2026-09-16 to 2026-09-30
    const workouts = [
      { id: 'w1', d: '2026-09-05', vol: 4000, entries: [] },
      { id: 'w2', d: '2026-09-20', vol: 6000, entries: [] }
    ]

    const res = getVolumeProgression30Days(workouts, { now: baseTime, days: 30 })
    expect(res.firstHalfVol).toBe(4000)
    expect(res.secondHalfVol).toBe(6000)
    expect(res.trendPct).toBe(50) // +50% increase in volume
  })
})
