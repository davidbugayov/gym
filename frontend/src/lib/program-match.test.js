// Tests for the Program Wizard's matching logic: hard filters, scoring order, fallbacks,
// the equipment model and the way a program is applied to the plan.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { READY_PROGRAMS } from './starter.js'
import {
  scoreProgram, matchPrograms, durOf, durBucket, GOALS, EQUIP, LEVELS,
  fitsEquipment, equipCovered, defaultUseSchedule, hasWeekAssignments, applyProgramToState
} from './program-match.js'

const byId = id => READY_PROGRAMS.find(p => p.id === id)

describe('taxonomy', () => {
  it('covers the wizard questions', () => {
    expect(GOALS).toEqual(['muscle', 'fatloss', 'fitness', 'endurance', 'stress'])
    expect(EQUIP).toEqual(['bodyweight', 'dumbbell', 'barbell', 'kettlebell', 'run', 'gym'])
    expect(LEVELS).toEqual(['beginner', 'returning', 'regular', 'advanced'])
  })

  it('every program carries wizard metadata and only known ids', () => {
    READY_PROGRAMS.forEach(p => {
      expect(p.goals.length).toBeGreaterThan(0)
      expect(p.goals.every(g => GOALS.includes(g))).toBe(true)
      expect(p.equip.length).toBeGreaterThan(0)
      expect(p.equip.every(e => EQUIP.includes(e))).toBe(true)
      expect((p.requiredEquip || []).every(e => EQUIP.includes(e))).toBe(true)
      ;(p.altEquipGroups || []).forEach(g => expect(g.every(e => EQUIP.includes(e))).toBe(true))
      expect(p.levels.length).toBeGreaterThan(0)
      expect(p.levels.every(l => LEVELS.includes(l))).toBe(true)
      expect(p.freq[0]).toBeLessThanOrEqual(p.freq[1])
      expect(p.minutes).toBeGreaterThan(10)
    })
  })
})

describe('equipment model (requiredEquip + alternativeEquipGroups)', () => {
  it('covers the exact pick always', () => {
    expect(equipCovered('barbell', ['barbell'])).toBe(true)
    expect(equipCovered('bodyweight', ['bodyweight'])).toBe(true)
  })

  it('a gym pick covers the kit a gym has — but never a barbell or outdoor running', () => {
    expect(equipCovered('dumbbell', ['gym'])).toBe(true)
    expect(equipCovered('kettlebell', ['gym'])).toBe(true)
    expect(equipCovered('bodyweight', ['gym'])).toBe(true)
    expect(equipCovered('gym', ['gym'])).toBe(true)
    expect(equipCovered('barbell', ['gym'])).toBe(false)
    expect(equipCovered('run', ['gym'])).toBe(false)
  })

  it('required equipment must all be available', () => {
    expect(fitsEquipment(byId('five-by-five'), ['barbell'])).toBe(true)
    expect(fitsEquipment(byId('five-by-five'), ['gym'])).toBe(false)     // gym ≠ barbell
    expect(fitsEquipment(byId('upper-lower'), ['barbell'])).toBe(false)  // also needs a gym
    expect(fitsEquipment(byId('upper-lower'), ['barbell', 'gym'])).toBe(true)
  })

  it('ppl needs a gym AND a barbell — a gym alone is not enough', () => {
    expect(fitsEquipment(byId('ppl'), ['gym'])).toBe(false)
    expect(fitsEquipment(byId('ppl'), ['gym', 'barbell'])).toBe(true)
    expect(fitsEquipment(byId('ppl'), ['barbell'])).toBe(false)
  })

  it('full-body accurately requires a gym (it uses cable and a sled machine)', () => {
    expect(fitsEquipment(byId('full-body'), ['gym'])).toBe(true)
    expect(fitsEquipment(byId('full-body'), ['barbell', 'dumbbell', 'kettlebell'])).toBe(false)
    expect(fitsEquipment(byId('full-body'), ['barbell', 'gym'])).toBe(true)
  })

  it('alternative groups need at least one fully available group', () => {
    expect(fitsEquipment(byId('strong-start'), ['dumbbell', 'bodyweight'])).toBe(true)
    expect(fitsEquipment(byId('strong-start'), ['dumbbell'])).toBe(false)
    expect(fitsEquipment(byId('strong-start'), ['gym'])).toBe(true)      // gym covers both
    expect(fitsEquipment(byId('burn-run'), ['run'])).toBe(false)
    expect(fitsEquipment(byId('burn-run'), ['gym', 'bodyweight'])).toBe(false)
    expect(fitsEquipment(byId('burn-run'), ['run', 'bodyweight'])).toBe(true)
  })

  it('the wizard never shows a program whose equipment is missing', () => {
    const out = matchPrograms(READY_PROGRAMS, { goals: ['muscle'], equip: ['gym'], level: 'beginner', sessions: 3 })
    out.forEach(p => expect(fitsEquipment(p, ['gym'])).toBe(true))
    expect(out.some(p => p.requiredEquip.includes('barbell'))).toBe(false)
  })
})

describe('applying a program to the plan', () => {
  const weekOf = routineIds => Object.fromEntries([1, 3, 5].map((d, i) => [d, routineIds[i % routineIds.length]]))
  const loaded = {
    name: 'Test Program',
    routines: [{ id: 'r1', name: 'A', ex: [] }, { id: 'r2', name: 'B', ex: [] }],
    week: weekOf(['r1', 'r2'])
  }
  const baseState = () => ({
    routines: [{ id: 'old' }],
    week: { 1: 'old', 2: 'other', 4: 'old' },
    workouts: [{ d: '2026-01-05' }],
    dayPlan: { '2026-01-06': 'rest' },
    bodyweight: [{ d: '2026-01-01', w: 80 }]
  })

  it('with the schedule on, every old day assignment is replaced', () => {
    const st = baseState()
    applyProgramToState(st, loaded, { schedule: true })
    expect(st.routines.map(r => r.id)).toEqual(['old', 'r1', 'r2'])   // nothing removed
    expect(st.week).toEqual({ 1: 'r1', 3: 'r2', 5: 'r1' })            // only the program's days
    expect(st.week[2]).toBeUndefined()                                // old days are gone
    expect(st.week[4]).toBeUndefined()                                // …and cannot linger
  })

  it('with the schedule on, workouts/routines before it/dayPlan/bodyweight are untouched', () => {
    const st = baseState()
    applyProgramToState(st, loaded, { schedule: true })
    expect(st.routines[0]).toEqual({ id: 'old' })                     // pre-existing routine intact
    expect(st.workouts).toEqual([{ d: '2026-01-05' }])                // history preserved
    expect(st.dayPlan).toEqual({ '2026-01-06': 'rest' })              // overrides preserved
    expect(st.bodyweight).toEqual([{ d: '2026-01-01', w: 80 }])
  })

  it('with the schedule off (or unset), the week is left completely identical', () => {
    const apply = opt => {
      const st = baseState()
      applyProgramToState(st, loaded, opt)
      return st.week
    }
    expect(apply({ schedule: false })).toEqual({ 1: 'old', 2: 'other', 4: 'old' })
    expect(apply(undefined)).toEqual({ 1: 'old', 2: 'other', 4: 'old' })   // default = no schedule change
    // routines are still added either way
    const st = baseState()
    applyProgramToState(st, loaded)
    expect(st.routines.map(r => r.id)).toEqual(['old', 'r1', 'r2'])
  })

  it('defaults the schedule switch off when the week already has assignments', () => {
    expect(defaultUseSchedule({})).toBe(true)
    expect(defaultUseSchedule({ 3: undefined, 5: null })).toBe(true)          // falsy = empty
    expect(defaultUseSchedule({ 1: 'routine-id' })).toBe(false)
    expect(hasWeekAssignments({ 2: 'r' })).toBe(true)
    expect(hasWeekAssignments(null)).toBe(false)
  })

  it('the schedule is off by default for any non-empty plan, on for an empty one', () => {
    const st = { routines: [], week: {} }
    expect(defaultUseSchedule(st.week)).toBe(true)
    const st2 = { routines: [{ id: 'x' }], week: { 5: 'x' } }
    expect(defaultUseSchedule(st2.week)).toBe(false)
  })
})

describe('scoreProgram', () => {
  it('returns null when the equipment does not overlap', () => {
    expect(scoreProgram(byId('strength-growth'), { equip: ['bodyweight'], sessions: 3 })).toBeNull()
    expect(scoreProgram(byId('home-base'), { equip: ['barbell'], sessions: 3 })).toBeNull()
  })

  it('returns null when the session count is outside the program range', () => {
    expect(scoreProgram(byId('upper-lower'), { equip: ['barbell'], sessions: 3 })).toBeNull()
    expect(scoreProgram(byId('core-mobility'), { equip: ['bodyweight'], sessions: 4 })).toBeNull()
  })

  it('scores goal overlap higher than anything else', () => {
    const fatloss = scoreProgram(byId('burn-run'), { goals: ['fatloss'], equip: ['run', 'bodyweight'], level: 'beginner', sessions: 3 })
    const muscle = scoreProgram(byId('burn-run'), { goals: ['muscle'], equip: ['run', 'bodyweight'], level: 'beginner', sessions: 3 })
    expect(fatloss).toBeGreaterThan(muscle)
  })

  it('prefers programs matching the first (priority) equipment pick', () => {
    const prefs = { goals: ['muscle'], equip: ['bodyweight', 'dumbbell', 'barbell'], sessions: 3 }
    const out = matchPrograms(READY_PROGRAMS, prefs)
    expect(out.some(p => p.id === 'strong-start')).toBe(true)
    expect(out.some(p => p.id === 'five-by-five')).toBe(true)
    expect(out.indexOf(out.find(p => p.id === 'strong-start'))).toBeLessThan(out.indexOf(out.find(p => p.id === 'five-by-five')))
    // Scoring directly: with home kit first the home program outranks the barbell one,
    // and with the barbell (plus a gym) first it is the other way around.
    expect(scoreProgram(byId('strong-start'), prefs)).toBeGreaterThan(scoreProgram(byId('five-by-five'), prefs))
    const gymPrefs = { ...prefs, equip: ['barbell', 'dumbbell', 'gym'] }
    expect(scoreProgram(byId('ppl'), gymPrefs)).toBeGreaterThan(scoreProgram(byId('strong-start'), gymPrefs))
  })

  it('rewards an exact level match and penalises a far one', () => {
    const exact = scoreProgram(byId('strong-start'), { equip: ['dumbbell', 'bodyweight'], level: 'beginner', sessions: 3 })
    const far = scoreProgram(byId('strong-start'), { equip: ['dumbbell', 'bodyweight'], level: 'advanced', sessions: 3 })
    expect(exact).toBeGreaterThan(far)
  })

  it('rewards the picked session-length bucket', () => {
    const mid = scoreProgram(byId('burn-run'), { equip: ['run', 'bodyweight'], duration: 'mid', sessions: 3 })
    const long = scoreProgram(byId('burn-run'), { equip: ['run', 'bodyweight'], duration: 'long', sessions: 3 })
    expect(mid).toBeGreaterThan(long)
  })
})

describe('matchPrograms', () => {
  it('returns 2–4 results for a typical profile', () => {
    const out = matchPrograms(READY_PROGRAMS, { goals: ['muscle'], equip: ['dumbbell', 'bodyweight'], level: 'beginner', sessions: 3, duration: 'mid' })
    expect(out.length).toBeGreaterThanOrEqual(2)
    expect(out.length).toBeLessThanOrEqual(4)
  })

  it('puts the closest match first for a fat-loss + running profile', () => {
    const out = matchPrograms(READY_PROGRAMS, { goals: ['fatloss', 'endurance'], equip: ['run', 'bodyweight'], level: 'beginner', sessions: 3, duration: 'mid' })
    expect(out[0].id).toBe('burn-run')
  })

  it('puts a barbell strength program first for advanced + barbell', () => {
    const out = matchPrograms(READY_PROGRAMS, { goals: ['muscle'], equip: ['barbell'], level: 'advanced', sessions: 3, duration: 'long' })
    expect(['strength-growth', 'five-by-five', 'ppl']).toContain(out[0].id)
  })

  it('respects the equipment hard filter — every result fits one picked type', () => {
    const out = matchPrograms(READY_PROGRAMS, { goals: ['stress'], equip: ['bodyweight'], level: 'returning', sessions: 2, duration: 'short' })
    expect(out.length).toBeGreaterThanOrEqual(2)
    out.forEach(p => expect(p.equip).toContain('bodyweight'))
  })

  it('never leaves the user with zero results, even for 5 sessions', () => {
    const out = matchPrograms(READY_PROGRAMS, { goals: ['muscle'], equip: ['barbell'], level: 'beginner', sessions: 5, duration: 'short' })
    expect(out.length).toBeGreaterThanOrEqual(2)
  })

  it('returns at most 4 cards', () => {
    const out = matchPrograms(READY_PROGRAMS, { equip: ['bodyweight', 'dumbbell', 'barbell', 'kettlebell', 'run', 'gym'], goals: GOALS, sessions: 3 })
    expect(out.length).toBeLessThanOrEqual(4)
  })
})

describe('duration buckets', () => {
  it('maps program minutes to the wizard buckets', () => {
    expect(durBucket(25)).toBe('short')
    expect(durBucket(40)).toBe('mid')
    expect(durBucket(60)).toBe('long')
    expect(durOf(30)).toBe('short')
    expect(durOf(35)).toBe('mid')
    expect(durOf(50)).toBe('long')
  })
})

describe('preview sheet guard (regression: helpers must be imported)', () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../sheets.jsx'), 'utf8')

  it('every helper ProgramPreview uses is imported into sheets.jsx', () => {
    // The exOr crash came from using a helper without importing it — bundlers don't catch
    // that, so pin the imports themselves.
    for (const helper of ['exOr', 'exLine', 'modeOf', 'defaultUseSchedule', 'applyProgramToState', 'readyProgram']) {
      expect(src, helper).toMatch(new RegExp('import\\s+\\{[^}]*\\b' + helper + '\\b[^}]*\\}\\s+from'))
    }
  })

  it('the browse-all sheet never writes the week directly — it routes through ProgramPreview', () => {
    // "Show all programs" must open the same preview (with the schedule switch) instead of
    // writing st.week on its own, so a user can never change the schedule by accident.
    expect(src).not.toMatch(/st\.week\[day\] = routineId/)     // the old direct write is gone
    expect(src).toMatch(/function ReadyProgramsSheet[\s\S]*ProgramPreview/)
    expect(src).toMatch(/function ReadyProgramsSheet[\s\S]*applyProgramToState/)
  })
})
