import { describe, expect, it } from 'vitest'
import { EXDB } from './exercises.js'
import { weightGuideFor } from './weightGuide.js'

const ex = name => EXDB.find(item => item.n === name)
const state = () => ({ unit: 'kg', workouts: [], exWeights: {}, routines: [], dayPlan: {}, week: Array(7).fill(null) })

describe('weightGuideFor', () => {
  it('gives conservative equipment guidance when no personal data exists', () => {
    expect(weightGuideFor(state(), ex('dumbbell bulgarian split squat'))).toEqual({
      weight: 5, unit: 'kg', source: 'starter', scope: 'each'
    })
    expect(weightGuideFor(state(), ex('barbell hip thrust'))).toEqual({
      weight: 10, unit: 'kg', source: 'starter', scope: 'total'
    })
    expect(weightGuideFor({ ...state(), unit: 'lb' }, ex('dumbbell bulgarian split squat')).weight).toBe(10)
  })

  it('does not invent a load for bodyweight, cardio or machine exercises', () => {
    expect(weightGuideFor(state(), ex('push-up'))).toBeNull()
    expect(weightGuideFor(state(), ex('indoor rowing machine'))).toBeNull()
    expect(weightGuideFor(state(), ex('cable face pull'))).toBeNull()
    const S = state()
    S.exWeights[ex('push-up').id] = { w: 10 }
    expect(weightGuideFor(S, ex('push-up')).weight).toBe(10)
  })

  it('prefers the current session, then the plan progression, then saved and logged weights', () => {
    const lift = ex('dumbbell bulgarian split squat')
    const S = state()
    S.workouts = [{ d: '2026-09-25', entries: [{ id: lift.id, target: { id: lift.id, sets: 1, reps: 5 }, sets: [{ w: 20, r: 5, done: true }] }] }]
    expect(weightGuideFor(S, lift).weight).toBe(20)
    expect(weightGuideFor(S, lift).source).toBe('history')
    S.exWeights[lift.id] = { w: 22.5 }
    expect(weightGuideFor(S, lift).weight).toBe(22.5)
    S.routines = [{ id: 'r1', ex: [{ id: lift.id, sets: 1, reps: 5, weight: 20 }] }]
    S.week = Array(7).fill('r1')
    expect(weightGuideFor(S, lift).weight).toBe(25)
    expect(weightGuideFor(S, lift).source).toBe('plan')
    S.active = { entries: [{ id: lift.id, sets: [{ w: 17.5, r: 5, done: false }] }] }
    expect(weightGuideFor(S, lift).weight).toBe(17.5)
    expect(weightGuideFor(S, lift).source).toBe('session')
  })
})
