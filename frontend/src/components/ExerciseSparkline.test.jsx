import { describe, it, expect } from 'vitest'
import { getExerciseSparklineData } from './ExerciseSparkline.jsx'

describe('ExerciseSparkline data helper', () => {
  it('returns empty array if no workouts or invalid exId', () => {
    expect(getExerciseSparklineData([], '0025')).toEqual([])
    expect(getExerciseSparklineData(null, '0025')).toEqual([])
    expect(getExerciseSparklineData([{ entries: [] }], null)).toEqual([])
  })

  it('extracts top weight for completed sets chronologically', () => {
    const workouts = [
      {
        id: 'w1',
        d: '2026-09-01',
        start: 1000,
        entries: [{ id: '0025', sets: [{ w: 50, r: 10, done: true }, { w: 60, r: 8, done: true }] }]
      },
      {
        id: 'w2',
        d: '2026-09-05',
        start: 2000,
        entries: [{ id: '0025', sets: [{ w: 62.5, r: 8, done: true }] }]
      },
      {
        id: 'w3',
        d: '2026-09-10',
        start: 3000,
        entries: [{ id: '0025', sets: [{ w: 65, r: 6, done: true }] }]
      }
    ]

    const data = getExerciseSparklineData(workouts, '0025', 5)
    expect(data.length).toBe(3)
    expect(data[0].val).toBe(60)
    expect(data[1].val).toBe(62.5)
    expect(data[2].val).toBe(65)
    expect(data[0].metricType).toBe('weight')
  })

  it('filters up to target workout if upToWorkout is supplied', () => {
    const workouts = [
      {
        id: 'w1',
        d: '2026-09-01',
        start: 1000,
        entries: [{ id: '0025', sets: [{ w: 50, done: true }] }]
      },
      {
        id: 'w2',
        d: '2026-09-05',
        start: 2000,
        entries: [{ id: '0025', sets: [{ w: 60, done: true }] }]
      },
      {
        id: 'w3',
        d: '2026-09-10',
        start: 3000,
        entries: [{ id: '0025', sets: [{ w: 70, done: true }] }]
      }
    ]

    const data = getExerciseSparklineData(workouts, '0025', 5, workouts[1])
    expect(data.length).toBe(2)
    expect(data[1].val).toBe(60)
  })

  it('falls back to reps for bodyweight exercises with 0 weight', () => {
    const workouts = [
      {
        id: 'w1',
        d: '2026-09-01',
        start: 1000,
        entries: [{ id: 'bw1', sets: [{ w: 0, r: 8, done: true }] }]
      },
      {
        id: 'w2',
        d: '2026-09-05',
        start: 2000,
        entries: [{ id: 'bw1', sets: [{ w: 0, r: 12, done: true }] }]
      }
    ]

    const data = getExerciseSparklineData(workouts, 'bw1', 5)
    expect(data.length).toBe(2)
    expect(data[0].val).toBe(8)
    expect(data[1].val).toBe(12)
    expect(data[0].metricType).toBe('reps')
  })
})
