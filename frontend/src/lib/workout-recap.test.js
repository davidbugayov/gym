import { describe, it, expect } from 'vitest'
import { recapMetrics, previousComparableWorkout, nextScheduledWorkout } from './workout-recap.js'

const workout = (id, start, entries, routineId = 'r1') => ({ id, start, entries, routineId })
const entry = (id, mode, sets) => ({ id, target: { mode }, sets })

describe('workout recap', () => {
  it('counts only logged work and keeps time, cardio and repetitions separate', () => {
    const session = workout('a', 10, [
      entry('a', 'reps', [{ done: true, w: 20, r: 8 }, { done: false, w: 50, r: 10 }]),
      entry('b', 'time', [{ done: true, sec: 45 }]),
      entry('c', 'cardio', [{ done: true, min: 12, speed: 8 }]),
      entry('d', 'reps', [{ done: false, r: 10 }])
    ])
    expect(recapMetrics(session)).toEqual({ sets: 3, exercises: 3, reps: 8, seconds: 45, cardioMinutes: 12, volume: 160 })
  })

  it('chooses the latest earlier session with the same routine, exercises and modes', () => {
    const entries = [entry('a', 'reps', [{ done: true, w: 20, r: 8 }])]
    const current = workout('current', 30, entries)
    const previous = workout('previous', 20, entries)
    expect(previousComparableWorkout(current, [
      workout('older', 10, entries), previous, current,
      workout('future', 40, entries), workout('other-routine', 25, entries, 'r2'),
      workout('other-mode', 26, [entry('a', 'time', [{ done: true, sec: 45 }])]),
      workout('other-exercise', 27, [entry('b', 'reps', [{ done: true, r: 8 }])])
    ])).toBe(previous)
    expect(previousComparableWorkout(current, [])).toBeNull()
  })

  it('does not treat an empty workout as comparable', () => {
    expect(previousComparableWorkout(workout('empty', 30, []), [workout('old', 20, [])])).toBeNull()
  })

  it('honours a rest override and a rescheduled routine across a month boundary', () => {
    const state = { routines: [{ id: 'r1', name: 'A' }], week: { 6: 'r1' }, dayPlan: { '2026-10-31': 'rest', '2026-11-01': 'r1' } }
    expect(nextScheduledWorkout(state, '2026-10-30')).toEqual({ date: '2026-11-01', routine: state.routines[0] })
    expect(nextScheduledWorkout({ routines: [], week: {}, dayPlan: {} }, '2026-10-30')).toBeNull()
  })
})
