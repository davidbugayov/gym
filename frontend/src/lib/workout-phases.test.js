import { describe, expect, it } from 'vitest'
import { skipWorkoutPhase } from './workout-phases.js'
import { setsDoneActive, workoutVolume } from './history.js'
describe('phase skipping', () => {
  it('preserves performed sets without crediting skipped sets', () => {
    const active = { cur: 0, entries: [
      { phase: 'warmup', sets: [{ done: true, w: 10, r: 5 }, { done: false, w: 10, r: 5 }] },
      { phase: 'workout', sets: [{ done: false, w: 40, r: 8 }] }
    ] }
    expect(skipWorkoutPhase(active, 'warmup')).toBe(1)
    expect(active.cur).toBe(1)
    expect(setsDoneActive(active)).toBe(1)
    expect(workoutVolume(active)).toBe(50)
    expect(active.entries[0].sets[1]).toMatchObject({ done: false, skipped: true })
  })
})
