import { describe, it, expect } from 'vitest'
import { getExerciseEffortHistory } from '../lib/effort.js'

describe('ExerciseEffortSparkline data helper', () => {
  it('returns empty array when workouts are empty or exercise is not found', () => {
    expect(getExerciseEffortHistory({ workouts: [] }, '0025')).toEqual([])
    expect(getExerciseEffortHistory(null, '0025')).toEqual([])
  })

  it('aggregates RPE/RIR values chronologically', () => {
    const S = {
      effort: 'rpe',
      workouts: [
        {
          id: 'w1',
          d: '2026-09-01',
          start: 1000,
          entries: [{ id: '0025', sets: [{ w: 60, r: 8, rpe: 7.5, done: true }] }]
        },
        {
          id: 'w2',
          d: '2026-09-08',
          start: 2000,
          entries: [{ id: '0025', sets: [{ w: 62.5, r: 8, rpe: 8, done: true }] }]
        },
        {
          id: 'w3',
          d: '2026-09-15',
          start: 3000,
          entries: [{ id: '0025', sets: [{ w: 65, r: 6, rpe: 8.5, done: true }] }]
        }
      ]
    }

    const points = getExerciseEffortHistory(S, '0025', 5)
    expect(points.length).toBe(3)
    expect(points[0].val).toBe(7.5)
    expect(points[1].val).toBe(8)
    expect(points[2].val).toBe(8.5)
    expect(points[0].scale).toBe('rpe')
  })

  it('properly converts RIR when profile displays RIR', () => {
    const S = {
      effort: 'rir',
      workouts: [
        {
          id: 'w1',
          d: '2026-09-01',
          start: 1000,
          entries: [{ id: '0025', sets: [{ w: 60, r: 8, rir: 2, done: true }] }]
        },
        {
          id: 'w2',
          d: '2026-09-08',
          start: 2000,
          entries: [{ id: '0025', sets: [{ w: 62.5, r: 8, rir: 1, done: true }] }]
        }
      ]
    }

    const points = getExerciseEffortHistory(S, '0025', 5)
    expect(points.length).toBe(2)
    expect(points[0].val).toBe(2)
    expect(points[1].val).toBe(1)
    expect(points[0].scale).toBe('rir')
  })
})
