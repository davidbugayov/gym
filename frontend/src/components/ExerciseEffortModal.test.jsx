import { describe, it, expect } from 'vitest'
import { getExerciseEffortHistory, toScale, effortLevel } from '../lib/effort.js'

describe('ExerciseEffortModal data aggregation', () => {
  const dummyState = {
    effort: 'rpe',
    workouts: [
      {
        id: 'w1',
        d: '2026-03-01',
        entries: [{
          id: '0025',
          sets: [
            { w: 60, r: 8, rpe: 7.5, done: true },
            { w: 60, r: 8, rpe: 8, done: true }
          ]
        }]
      },
      {
        id: 'w2',
        d: '2026-03-08',
        entries: [{
          id: '0025',
          sets: [
            { w: 62.5, r: 8, rpe: 8.5, done: true }
          ]
        }]
      },
      {
        id: 'w3',
        d: '2026-03-15',
        entries: [{
          id: '0025',
          sets: [
            { w: 65, r: 7, rpe: 9, done: true }
          ]
        }]
      }
    ]
  }

  it('gathers all sessions with detailed sets', () => {
    const history = getExerciseEffortHistory(dummyState, '0025', 10)
    expect(history.length).toBe(3)
    expect(history[0].date).toBe('2026-03-01')
    expect(history[0].sets.length).toBe(2)
    expect(history[0].sets[0].w).toBe(60)
    expect(history[0].sets[0].r).toBe(8)
    expect(history[0].sets[0].rpe).toBe(7.5)
    expect(history[0].sets[0].rir).toBe(2.5)

    expect(history[2].date).toBe('2026-03-15')
    expect(history[2].val).toBe(9)
  })

  it('supports on-the-fly scale conversion between RPE and RIR', () => {
    const history = getExerciseEffortHistory(dummyState, '0025', 10)
    // In RPE scale
    const rpeVals = history.map(s => toScale('rpe', s.rir))
    expect(rpeVals).toEqual([7.7, 8.5, 9])

    // In RIR scale
    const rirVals = history.map(s => toScale('rir', s.rir))
    expect(rirVals).toEqual([2.3, 1.5, 1])
  })

  it('classifies effort level with appropriate feel description and color', () => {
    const history = getExerciseEffortHistory(dummyState, '0025', 10)
    const levelLatest = effortLevel(history[2].rir)
    expect(levelLatest.tag).toBe('heavy')
    expect(levelLatest.feel).toContain('1 rep in reserve')
  })

  it('filters sessions correctly by time ranges (3m, 1y, all)', () => {
    // Session 1: 500 days ago (> 1 year)
    // Session 2: 120 days ago (> 3 months, < 1 year)
    // Session 3: 20 days ago (< 3 months)
    const now = Date.now()
    const msDay = 86400000
    const dFar = new Date(now - 500 * msDay).toISOString().slice(0, 10)
    const dMed = new Date(now - 120 * msDay).toISOString().slice(0, 10)
    const dRecent = new Date(now - 20 * msDay).toISOString().slice(0, 10)

    const timedState = {
      effort: 'rpe',
      workouts: [
        { id: 'w1', d: dFar, entries: [{ id: 'bench', sets: [{ done: true, rpe: 8 }] }] },
        { id: 'w2', d: dMed, entries: [{ id: 'bench', sets: [{ done: true, rpe: 8.5 }] }] },
        { id: 'w3', d: dRecent, entries: [{ id: 'bench', sets: [{ done: true, rpe: 9 }] }] }
      ]
    }

    const allSessions = getExerciseEffortHistory(timedState, 'bench', 0)
    expect(allSessions.length).toBe(3)

    const filterByRange = (sessions, range) => {
      if (range === 'all') return sessions
      const days = range === '3m' ? 90 : 365
      const cutoff = now - days * msDay
      return sessions.filter(s => {
        const ms = s.ts || (s.date ? new Date(s.date + 'T12:00:00').getTime() : 0)
        return ms >= cutoff
      })
    }

    const filtered3m = filterByRange(allSessions, '3m')
    expect(filtered3m.length).toBe(1)
    expect(filtered3m[0].workoutId).toBe('w3')

    const filtered1y = filterByRange(allSessions, '1y')
    expect(filtered1y.length).toBe(2)
    expect(filtered1y.map(s => s.workoutId)).toEqual(['w2', 'w3'])

    const filteredAll = filterByRange(allSessions, 'all')
    expect(filteredAll.length).toBe(3)
  })
})
