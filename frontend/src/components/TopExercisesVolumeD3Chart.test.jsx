import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import TopExercisesVolumeD3Chart, { SERIES_COLORS } from './TopExercisesVolumeD3Chart.jsx'
import { getTopExercisesVolumeProgress } from '../lib/volume-progress.js'

describe('TopExercisesVolumeD3Chart series configuration', () => {
  it('provides 3 distinct vibrant series colors', () => {
    expect(SERIES_COLORS).toHaveLength(3)
    expect(SERIES_COLORS[0]).toBe('#30d158')
    expect(SERIES_COLORS[1]).toBe('#0a84ff')
    expect(SERIES_COLORS[2]).toBe('#ff9f0a')
  })

  it('correctly prepares multi-series data for the 3 top exercises', () => {
    const baseTime = new Date('2026-09-26T12:00:00').getTime()
    const workouts = [
      {
        id: 'w1',
        d: '2026-07-15',
        start: baseTime - 70 * 86400000,
        entries: [
          { id: '0025', sets: [{ w: 60, r: 10, done: true }] },
          { id: '0043', sets: [{ w: 100, r: 5, done: true }] },
          { id: '0047', sets: [{ w: 50, r: 10, done: true }] }
        ]
      },
      {
        id: 'w2',
        d: '2026-08-15',
        start: baseTime - 40 * 86400000,
        entries: [
          { id: '0025', sets: [{ w: 65, r: 10, done: true }] },
          { id: '0043', sets: [{ w: 105, r: 5, done: true }] },
          { id: '0047', sets: [{ w: 55, r: 10, done: true }] }
        ]
      },
      {
        id: 'w3',
        d: '2026-09-15',
        start: baseTime - 10 * 86400000,
        entries: [
          { id: '0025', sets: [{ w: 70, r: 10, done: true }] },
          { id: '0043', sets: [{ w: 110, r: 5, done: true }] },
          { id: '0047', sets: [{ w: 60, r: 10, done: true }] }
        ]
      }
    ]

    const data = getTopExercisesVolumeProgress(workouts, {
      now: baseTime,
      days: 90,
      limit: 3
    })

    expect(data.exercises).toHaveLength(3)
    data.exercises.forEach(ex => {
      expect(ex.points).toHaveLength(3)
      // Volume progression is positive
      expect(ex.growth).toBeGreaterThan(0)
      expect(ex.points[0].volume).toBeLessThan(ex.points[2].volume)
    })
  })

  it('renders TopExercisesVolumeD3Chart without throwing when exercises exist', () => {
    const baseTime = new Date('2026-09-26T12:00:00').getTime()
    const workouts = [
      {
        id: 'w1',
        d: '2026-08-10',
        start: baseTime - 30 * 86400000,
        entries: [
          { id: '0025', sets: [{ w: 60, r: 10, done: true }] },
          { id: '0043', sets: [{ w: 100, r: 5, done: true }] }
        ]
      },
      {
        id: 'w2',
        d: '2026-09-10',
        start: baseTime - 10 * 86400000,
        entries: [
          { id: '0025', sets: [{ w: 65, r: 10, done: true }] },
          { id: '0043', sets: [{ w: 105, r: 5, done: true }] }
        ]
      }
    ]
    const data = getTopExercisesVolumeProgress(workouts, {
      now: baseTime,
      days: 90,
      limit: 3
    })

    // This must NOT throw "SERIES_COLORS[...] is not a function"
    const html = renderToString(
      <TopExercisesVolumeD3Chart exercises={data.exercises} timeRange={data.timeRange} />
    )
    expect(html).toContain('svg')
  })

  it('handles empty or incomplete workouts gracefully without error', () => {
    const incompleteWorkouts = [
      null,
      {},
      { id: 'w_inc1', entries: [] },
      { id: 'w_inc2', entries: [{ id: '0025', sets: [{ w: 0, r: 0, done: false }] }] },
      { id: 'w_inc3', d: 'invalid-date', start: null, entries: null }
    ]
    const data = getTopExercisesVolumeProgress(incompleteWorkouts, {
      now: Date.now(),
      days: 90,
      limit: 3
    })

    expect(data.exercises).toEqual([])
    const html = renderToString(<TopExercisesVolumeD3Chart exercises={data.exercises} />)
    expect(html).toBeTruthy()
  })
})
