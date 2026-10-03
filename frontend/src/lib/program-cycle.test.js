import { describe, it, expect } from 'vitest'
import cycles from '../catalog/athlete-cycles.json'
import { createCycleRoutine, cycleWeight, cycleSchedule, advanceCycle, cycleSessionCompleted } from './program-cycle.js'
import { buildPlanBundle, parsePlan } from './plan-share.js'
import { buildSets } from './history.js'
import { parseProgramUrl, applyImportedProgram } from './import-url.js'

const maximums = { '0043': 165, '0025': 105, '0032': 180 }
const russian = cycles.find(p => p.id === 'russian-cycle')

describe('verified athlete cycles', () => {
  it('preserves the complete Russian source cycle and cached example weights', () => {
    const routine = createCycleRoutine(russian, maximums)
    expect(routine.cycle.sessions).toHaveLength(27)
    expect(routine.ex[0].prescribedSets).toHaveLength(6)
    expect(routine.ex[0].prescribedSets[0]).toMatchObject({ w: 132.5, r: 2 })
    expect(routine.cycle.sessions[1].ex[0].prescribedSets[0]).toMatchObject({ w: 145, r: 2 })
    expect(routine.cycle.sessions[26].ex[0].prescribedSets[0]).toMatchObject({ w: 172.5, r: 1 })
    expect(routine.cycle.sessions[26].ex[1].prescribedSets[0]).toMatchObject({ w: 85, r: 2 })
  })
  it('retains separate bench blocks and source rounding', () => {
    const routine = createCycleRoutine(cycles.find(p => p.id === 'butenko-4'), { '0025': 120 })
    expect(routine.cycle.sessions).toHaveLength(10)
    expect(routine.ex).toHaveLength(2)
    expect(routine.ex[0].prescribedSets.map(s => s.w)).toEqual([60, 70, 82.5, 90, 90, 90, 90, 90])
    expect(cycleWeight(105, 75, 'kg', 'nearest')).toBe(80)
    expect(cycleWeight(120, 60, 'kg', 'down')).toBe(70)
    expect(cycleWeight(200, 80, 'lb', 'nearest')).toBe(160)
  })
  it('seeds prescribed sets without inheriting old PRs or flattening their loads', () => {
    const routine = createCycleRoutine(cycles.find(p => p.id === 'butenko-4'), { '0025': 120 })
    const state = { workouts: [{ entries: [{ id: '0025', sets: [{ w: 200, r: 1, done: true }] }] }], exWeights: { '0025': { w: 200 } } }
    expect(buildSets(state, routine.ex[0]).map(s => s.w)).toEqual([60, 70, 82.5, 90, 90, 90, 90, 90])
  })
  it('advances once only for a complete session and holds partial or missed reps', () => {
    const routine = createCycleRoutine(russian, maximums)
    const state = { routines: [routine] }
    const active = { cycleStep: 0, entries: routine.ex.map(cfg => ({ id: cfg.id, sets: buildSets({}, cfg).map(s => ({ ...s, done: true })) })) }
    expect(cycleSessionCompleted(active, routine)).toBe(true)
    active.entries[0].sets[0].r = 1
    expect(cycleSessionCompleted(active, routine)).toBe(false)
    active.entries[0].sets[0].r = 2
    const workout = { routineId: routine.id, cycleStep: 0, cycleCompleted: false }
    expect(advanceCycle(state, workout)).toBe(false)
    workout.cycleCompleted = true
    expect(advanceCycle(state, workout)).toBe(true)
    expect(routine.ex).toEqual(routine.cycle.sessions[1].ex)
    expect(advanceCycle(state, workout)).toBe(false)
    expect(cycleSessionCompleted({ ...active, entries: active.entries.slice(1) }, routine)).toBe(false)
  })
  it('ends the cycle rather than wrapping silently to its first session', () => {
    const routine = createCycleRoutine(russian, maximums)
    routine.cycle.cursor = 26
    expect(advanceCycle({ routines: [routine] }, { routineId: routine.id, cycleStep: 26, cycleCompleted: true })).toBe(true)
    expect(routine.cycle.complete).toBe(true)
  })
  it('shares the full verified cycle as a fresh plan without losing mixed set loads', () => {
    const routine = createCycleRoutine(russian, maximums)
    routine.cycle.cursor = 2
    const bundle = buildPlanBundle({ routines: [routine], week: {}, customEx: [] })
    const imported = parsePlan(JSON.stringify(bundle)).routines[0]
    expect(imported.cycle.cursor).toBe(0)
    expect(imported.cycle.sessions).toHaveLength(27)
    expect(imported.ex[0].prescribedSets[0].w).toBe(132.5)
  })
  it('uses source weekdays and requires a real Monday', () => {
    const routine = createCycleRoutine(russian, maximums)
    const dates = cycleSchedule(routine, '2026-10-05')
    expect(Object.keys(dates)).toHaveLength(27)
    expect(dates['2026-10-05']).toBe(routine.id)
    expect(dates['2026-12-04']).toBe(routine.id)
    expect(() => cycleSchedule(routine, '2026-10-06')).toThrow('start_on_monday')
    expect(() => cycleSchedule(routine, '2026-02-30')).toThrow('start_on_monday')
  })
  it('rejects unsupported URLs rather than pretending their contents were imported', async () => {
    await expect(parseProgramUrl('https://example.com/program')).rejects.toThrow('unsupported_program_url')
    await expect(parseProgramUrl('https://athlete.ru.evil.example/t7249/')).rejects.toThrow()
    expect((await parseProgramUrl('http://forum.athlete.ru/t7249/')).programs).toHaveLength(4)
  })
  it('validates inline JSON and preserves explicit exercise weights and modes', async () => {
    const data = await parseProgramUrl(JSON.stringify({ routines: [{ name: 'Bench', ex: [{ id: '0025', sets: 3, reps: 8, weight: 45, prog: 'off' }] }] }))
    expect(data.programs[0].spec[0][2][0]).toMatchObject({ weight: 45, prog: 'off', reps: 8 })
    await expect(parseProgramUrl('{"routines":[]}')).rejects.toThrow()
    await expect(parseProgramUrl('{"spec":[["bad","barbell",[["0025",-2,8]]]]}')).rejects.toThrow()
  })
  it('keeps existing schedules unless the user enables cycle scheduling', () => {
    const state = { routines: [], unit: 'kg', workouts: [], week: { 1: 'old' }, dayPlan: { '2026-10-04': 'old' } }
    applyImportedProgram(state, fn => fn(state), russian, { maximums })
    expect(state.week).toEqual({ 1: 'old' })
    applyImportedProgram(state, fn => fn(state), russian, { maximums, applyWeek: true, startDate: '2026-10-05' })
    expect(state.week).toEqual({})
    expect(state.dayPlan['2026-10-04']).toBe('old')
    expect(state.workouts).toEqual([])
  })
})
