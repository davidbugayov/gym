import { describe, it, expect } from 'vitest'
import {
  calcWorkoutIntensity,
  getPreviousSessions,
  compareWorkoutProgression,
  generateProgressionFeedback
} from './workout-progression.js'

describe('calcWorkoutIntensity', () => {
  it('computes volume, average load per rep, max weight, and sets correctly', () => {
    const workout = {
      entries: [
        {
          id: '0025',
          sets: [
            { w: 80, r: 10, done: true }, // 800
            { w: 90, r: 8, done: true },  // 720
            { w: 100, r: 5, done: true }, // 500
            { w: 100, r: 5, done: false } // ignored
          ]
        },
        {
          id: '0047',
          sets: [
            { w: 60, r: 10, done: true }  // 600
          ]
        }
      ]
    }
    // Total weighted vol = 800 + 720 + 500 + 600 = 2620
    // Total weighted reps = 10 + 8 + 5 + 10 = 33
    // avgLoad = 2620 / 33 = 79.39... -> 79.4
    const res = calcWorkoutIntensity(workout)
    expect(res.volume).toBe(2620)
    expect(res.avgLoad).toBe(79.4)
    expect(res.maxWeight).toBe(100)
    expect(res.totalSets).toBe(4)
    expect(res.totalReps).toBe(33)
  })

  it('handles empty workouts or zero weight gracefully', () => {
    expect(calcWorkoutIntensity(null).avgLoad).toBe(0)
    expect(calcWorkoutIntensity({}).avgLoad).toBe(0)

    const bwWorkout = {
      entries: [
        {
          id: '0001',
          sets: [
            { w: 0, r: 15, done: true },
            { w: 0, r: 12, done: true }
          ]
        }
      ]
    }
    const res = calcWorkoutIntensity(bwWorkout)
    expect(res.avgLoad).toBe(0)
    expect(res.totalReps).toBe(27)
    expect(res.totalSets).toBe(2)
  })
})

describe('getPreviousSessions', () => {
  const base = 1700000000000
  const allWorkouts = [
    { id: 'w1', start: base - 40000, vol: 2000, routineId: 'r1', entries: [{ sets: [{ done: true }] }] },
    { id: 'w2', start: base - 30000, vol: 2200, routineId: 'r2', entries: [{ sets: [{ done: true }] }] },
    { id: 'w3', start: base - 20000, vol: 2400, routineId: 'r1', entries: [{ sets: [{ done: true }] }] },
    { id: 'w4', start: base - 10000, vol: 2600, routineId: 'r1', entries: [{ sets: [{ done: true }] }] },
    { id: 'current', start: base, vol: 2800, routineId: 'r1', entries: [{ sets: [{ done: true }] }] }
  ]

  it('picks previous 3 sessions in chronological order', () => {
    const cur = allWorkouts[4]
    const prev = getPreviousSessions(cur, allWorkouts, { limit: 3 })
    expect(prev).toHaveLength(3)
    // Most recent 3 are w4, w3, w2. In chronological order: w2, w3, w4
    expect(prev.map(w => w.id)).toEqual(['w2', 'w3', 'w4'])
  })

  it('filters by routineId when matchRoutine is true', () => {
    const cur = allWorkouts[4]
    const prev = getPreviousSessions(cur, allWorkouts, { limit: 3, matchRoutine: true })
    expect(prev).toHaveLength(3)
    // Routines matching r1: w1, w3, w4
    expect(prev.map(w => w.id)).toEqual(['w1', 'w3', 'w4'])
  })
})

describe('compareWorkoutProgression', () => {
  it('calculates progression and deltas against previous 3 sessions', () => {
    const prevSessions = [
      {
        id: 's1',
        d: '2026-09-20',
        vol: 2000,
        entries: [{ sets: [{ w: 100, r: 20, done: true }] }] // avgLoad: 100
      },
      {
        id: 's2',
        d: '2026-09-22',
        vol: 2200,
        entries: [{ sets: [{ w: 100, r: 22, done: true }] }] // avgLoad: 100
      },
      {
        id: 's3',
        d: '2026-09-24',
        vol: 2400,
        entries: [{ sets: [{ w: 100, r: 24, done: true }] }] // avgLoad: 100
      }
    ]
    // Avg prev vol = (2000 + 2200 + 2400) / 3 = 2200
    // Avg prev intensity = 100

    const current = {
      id: 's4',
      d: '2026-09-26',
      vol: 2530,
      entries: [{ sets: [{ w: 110, r: 23, done: true }] }] // avgLoad: 110
    }

    const comparison = compareWorkoutProgression(current, prevSessions, 'kg')
    expect(comparison.hasBaseline).toBe(true)
    expect(comparison.sessionsCount).toBe(3)
    expect(comparison.volume.current).toBe(2530)
    expect(comparison.volume.avgPrev).toBe(2200)
    expect(comparison.volume.diff).toBe(330)
    expect(comparison.volume.pct).toBe(15) // +15%
    expect(comparison.volume.trend).toBe('up')

    expect(comparison.intensity.current).toBe(110)
    expect(comparison.intensity.avgPrev).toBe(100)
    expect(comparison.intensity.diff).toBe(10)
    expect(comparison.intensity.pct).toBe(10) // +10%
    expect(comparison.intensity.trend).toBe('up')

    expect(comparison.feedback.type).toBe('peak_overload')
    expect(comparison.sessions).toHaveLength(4)
  })

  it('handles first session without crashing', () => {
    const current = {
      id: 's1',
      d: '2026-09-26',
      vol: 1000,
      entries: [{ sets: [{ w: 50, r: 20, done: true }] }]
    }
    const comparison = compareWorkoutProgression(current, [], 'kg')
    expect(comparison.hasBaseline).toBe(false)
    expect(comparison.sessionsCount).toBe(0)
    expect(comparison.feedback.type).toBe('baseline')
  })
})
