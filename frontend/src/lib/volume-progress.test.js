import { describe, it, expect } from 'vitest'
import { entryVolume, workoutTimestamp, getTopExercisesVolumeProgress } from './volume-progress.js'

describe('entryVolume', () => {
  it('calculates total volume (weight * reps) for done sets', () => {
    const entry = {
      id: '0025',
      sets: [
        { w: 60, r: 10, done: true },
        { w: 65, r: 8, done: true },
        { w: 70, r: 6, done: true },
        { w: 70, r: 6, done: false } // not done, excluded
      ]
    }
    // (60*10) + (65*8) + (70*6) = 600 + 520 + 420 = 1540
    expect(entryVolume(entry)).toBe(1540)
  })

  it('handles empty or missing sets cleanly', () => {
    expect(entryVolume(null)).toBe(0)
    expect(entryVolume({})).toBe(0)
    expect(entryVolume({ sets: [] })).toBe(0)
  })

  it('ignores negative or invalid numbers', () => {
    const entry = {
      sets: [
        { w: 'abc', r: 10, done: true },
        { w: -10, r: 5, done: true },
        { w: 50, r: null, done: true }
      ]
    }
    expect(entryVolume(entry)).toBe(0)
  })
})

describe('workoutTimestamp', () => {
  it('extracts start timestamp or date string timestamp', () => {
    expect(workoutTimestamp({ start: 1700000000000 })).toBe(1700000000000)
    expect(workoutTimestamp({ d: '2026-09-20' })).toBe(new Date('2026-09-20T12:00:00').getTime())
    expect(workoutTimestamp({})).toBe(0)
  })
})

describe('getTopExercisesVolumeProgress', () => {
  const baseTime = new Date('2026-09-26T12:00:00').getTime()

  const mockWorkouts = [
    // Workout 1: 80 days ago (Bench, Squat, Row)
    {
      id: 'w1',
      d: '2026-07-08',
      start: baseTime - 80 * 86400000,
      entries: [
        { id: '0025', sets: [{ w: 60, r: 10, done: true }, { w: 60, r: 10, done: true }] }, // Bench: 1200
        { id: '0043', sets: [{ w: 80, r: 8, done: true }, { w: 80, r: 8, done: true }] },   // Squat: 1280
        { id: '0047', sets: [{ w: 50, r: 10, done: true }] }                                 // Row: 500
      ]
    },
    // Workout 2: 50 days ago (Bench, Squat, OHP)
    {
      id: 'w2',
      d: '2026-08-07',
      start: baseTime - 50 * 86400000,
      entries: [
        { id: '0025', sets: [{ w: 65, r: 10, done: true }, { w: 65, r: 10, done: true }] }, // Bench: 1300
        { id: '0043', sets: [{ w: 85, r: 8, done: true }, { w: 85, r: 8, done: true }] },   // Squat: 1360
        { id: '0426', sets: [{ w: 40, r: 8, done: true }] }                                  // OHP: 320
      ]
    },
    // Workout 3: 20 days ago (Bench, Row, Squat)
    {
      id: 'w3',
      d: '2026-09-06',
      start: baseTime - 20 * 86400000,
      entries: [
        { id: '0025', sets: [{ w: 70, r: 10, done: true }, { w: 70, r: 10, done: true }] }, // Bench: 1400
        { id: '0047', sets: [{ w: 55, r: 10, done: true }] },                                // Row: 550
        { id: '0043', sets: [{ w: 90, r: 8, done: true }, { w: 90, r: 8, done: true }] }    // Squat: 1440
      ]
    },
    // Workout 4: 120 days ago (outside 90-day window)
    {
      id: 'w4',
      d: '2026-05-29',
      start: baseTime - 120 * 86400000,
      entries: [
        { id: '0025', sets: [{ w: 50, r: 10, done: true }] }
      ]
    }
  ]

  it('selects the top 3 most used exercises within the 3-month window', () => {
    const result = getTopExercisesVolumeProgress(mockWorkouts, {
      now: baseTime,
      days: 90,
      limit: 3
    })

    // Both Bench ('0025') and Squat ('0043') have 3 sessions in window.
    // Row ('0047') has 2 sessions in window.
    // OHP ('0426') has 1 session in window.
    expect(result.exercises).toHaveLength(3)
    const topIds = result.exercises.map(e => e.id)
    expect(topIds).toContain('0025')
    expect(topIds).toContain('0043')
    expect(topIds).toContain('0047')

    const bench = result.exercises.find(e => e.id === '0025')
    expect(bench.sessions).toBe(3)
    expect(bench.totalVolume).toBe(1200 + 1300 + 1400) // 3900
    expect(bench.points).toHaveLength(3)
    expect(bench.points[0].volume).toBe(1200)
    expect(bench.points[2].volume).toBe(1400)
    expect(bench.growth).toBe(200)
  })

  it('computes maxVolume across all top exercises points', () => {
    const result = getTopExercisesVolumeProgress(mockWorkouts, {
      now: baseTime,
      days: 90
    })
    // Squat workout 3 volume was 1440
    expect(result.maxVolume).toBe(1440)
  })

  it('handles empty workouts gracefully', () => {
    const result = getTopExercisesVolumeProgress([], { now: baseTime })
    expect(result.exercises).toEqual([])
    expect(result.maxVolume).toBe(0)
  })
})
