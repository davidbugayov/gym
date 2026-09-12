// Tests for the ready-made programs: structure, exercise validity, and program loading.
import { describe, it, expect } from 'vitest'
import { READY_PROGRAMS, readyProgram, starterRoutines } from './starter.js'
import { EXIDX } from './exercises.js'
import { isCardio } from './exercises.js'
import { modeOf, exLine } from './history.js'

describe('ready-made programs', () => {
  it('has at least 7 programs available', () => {
    expect(READY_PROGRAMS.length).toBeGreaterThanOrEqual(7)
  })

  it('each program has a unique id, name, and detail', () => {
    const ids = READY_PROGRAMS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)  // unique ids
    READY_PROGRAMS.forEach(p => {
      expect(p.name).toBeTruthy()
      expect(p.detail).toBeTruthy()
      expect(p.spec.length).toBeGreaterThan(0)
      expect(p.days.length).toBeGreaterThan(0)
    })
  })

  it('all exercise ids in every program exist in the local database', () => {
    READY_PROGRAMS.forEach(program => {
      program.spec.forEach(([name, emoji, exercises]) => {
        exercises.forEach(raw => {
          const e = Array.isArray(raw) ? { id: raw[0], sets: raw[1], reps: raw[2], weight: 0 } : raw
          expect(EXIDX[e.id], `Exercise ${e.id} in program "${program.name}" / routine "${name}"`).toBeTruthy()
          expect(e.sets).toBeGreaterThan(0)
          const mode = modeOf(e)
          if (mode === 'cardio') expect(e.min).toBeGreaterThan(0)
          else if (mode === 'time') expect(e.sec).toBeGreaterThan(0)
          else expect(e.reps).toBeGreaterThan(0)
        })
      })
    })
  })

  it('each routine has at least 3 exercises', () => {
    READY_PROGRAMS.forEach(program => {
      program.spec.forEach(([name, , exercises]) => {
        expect(exercises.length).toBeGreaterThanOrEqual(3)
      })
    })
  })

  it('days array maps to routines correctly', () => {
    READY_PROGRAMS.forEach(program => {
      if (program.id === 'five-by-five') {
        expect(program.days.length).toBe(5)  // special case: alternating
      } else {
        expect(program.days.length).toBe(program.spec.length)
      }
    })
  })
})

describe('readyProgram', () => {
  it('returns fresh routines with new ids and correct week mapping', () => {
    const result = readyProgram('ppl')
    expect(result.routines).toHaveLength(3)
    expect(result.week[1]).toBe(result.routines[0].id)
    expect(result.week[3]).toBe(result.routines[1].id)
    expect(result.week[5]).toBe(result.routines[2].id)
    // All routine ids are unique
    const ids = result.routines.map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('generates new ids on each call (no shared references)', () => {
    const a = readyProgram('full-body')
    const b = readyProgram('full-body')
    a.routines.forEach((r, i) => {
      expect(r.id).not.toBe(b.routines[i].id)
    })
  })

  it('maps the five-by-five schedule correctly (alternating A/B)', () => {
    const result = readyProgram('five-by-five')
    expect(result.routines).toHaveLength(2)
    expect(result.week[1]).toBe(result.routines[0].id)  // A
    expect(result.week[3]).toBe(result.routines[1].id)  // B
    expect(result.week[5]).toBe(result.routines[0].id)  // A again
  })

  it('handles upper-lower split with 4 routines and 4 days', () => {
    const result = readyProgram('upper-lower')
    expect(result.routines).toHaveLength(4)
    expect(result.week[1]).toBe(result.routines[0].id)
    expect(result.week[2]).toBe(result.routines[1].id)
    expect(result.week[4]).toBe(result.routines[2].id)
    expect(result.week[5]).toBe(result.routines[3].id)
  })

  it('handles bodyweight programs with cardio-style exercises', () => {
    const result = readyProgram('bodyweight-hiit')
    expect(result.routines).toHaveLength(3)
    expect(result.week[1]).toBeTruthy()
    expect(result.week[3]).toBeTruthy()
    expect(result.week[5]).toBeTruthy()
  })

  it('handles athletic program with mixed modalities', () => {
    const result = readyProgram('athletic')
    expect(result.routines).toHaveLength(4)
    expect(result.week[1]).toBeTruthy()
    expect(result.week[2]).toBeTruthy()
    expect(result.week[4]).toBeTruthy()
    expect(result.week[5]).toBeTruthy()
  })

  it('handles core & mobility with 2 routines', () => {
    const result = readyProgram('core-mobility')
    expect(result.routines).toHaveLength(2)
    expect(result.week[2]).toBe(result.routines[0].id)
    expect(result.week[5]).toBe(result.routines[1].id)
  })

  it('falls back to the first program for an unknown id', () => {
    const result = readyProgram('nonexistent-id')
    expect(result.id).toBe(READY_PROGRAMS[0].id)
  })

  it('all loaded routines have exercises with proper sets and reps', () => {
    READY_PROGRAMS.forEach(program => {
      const result = readyProgram(program.id)
      result.routines.forEach(r => {
        r.ex.forEach(e => {
          expect(e.sets).toBeGreaterThan(0)
          expect(e.weight).toBe(0)
          const mode = modeOf(e)
          if (mode === 'cardio') expect(e.min).toBeGreaterThan(0)
          else if (mode === 'time') expect(e.sec).toBeGreaterThan(0)
          else expect(e.reps).toBeGreaterThan(0)
        })
      })
    })
  })
})

describe('starterRoutines', () => {
  it('returns 3 push/pull/legs routines', () => {
    const routines = starterRoutines()
    expect(routines).toHaveLength(3)
    expect(routines[0].name).toBe('Push Day')
    expect(routines[1].name).toBe('Pull Day')
    expect(routines[2].name).toBe('Leg Day')
  })

  it('generates fresh ids on each call', () => {
    const a = starterRoutines()
    const b = starterRoutines()
    expect(a[0].id).not.toBe(b[0].id)
  })
})

describe('program coverage', () => {
  it('covers multiple training frequencies (2, 3, and 4 days)', () => {
    const frequencies = new Set(READY_PROGRAMS.map(p => p.days.length === 5 ? 3 : p.days.length))
    expect(frequencies.has(2)).toBe(true)
    expect(frequencies.has(3)).toBe(true)
    expect(frequencies.has(4)).toBe(true)
  })

  it('includes barbell, dumbbell, bodyweight, and mixed programs', () => {
    const allGlyphs = new Set(READY_PROGRAMS.flatMap(p => p.spec.map(r => r[1])))
    expect(allGlyphs.has('barbell')).toBe(true)
    expect(allGlyphs.has('dumbbell')).toBe(true)
    expect(allGlyphs.has('bodyweight')).toBe(true)
  })
})

describe('readyProgram with an explicit session count', () => {
  it('trims a program to the picked number of sessions per week', () => {
    const two = readyProgram('home-base', 2)
    expect(two.routines).toHaveLength(2)
    expect(Object.keys(two.week)).toHaveLength(2)
    expect(Object.values(two.week)).toEqual(two.routines.map(r => r.id))
  })

  it('trims the 4-day mixed program to 3 days (push/pull/legs first)', () => {
    const three = readyProgram('balance-variety', 3)
    expect(three.routines).toHaveLength(3)
    expect(three.routines.map(r => r.name)).toEqual(['Push', 'Pull', 'Legs'])
    expect(three.week[1]).toBe(three.routines[0].id)
    expect(three.week[3]).toBe(three.routines[1].id)
    expect(three.week[5]).toBe(three.routines[2].id)
  })

  it('keeps all four days when the user picks 4 sessions', () => {
    const four = readyProgram('balance-variety', 4)
    expect(four.routines).toHaveLength(4)
    expect(four.week[2]).toBe(four.routines[1].id)
    expect(four.week[5]).toBe(four.routines[3].id)
  })

  it('alternates A/B programs across the slots (5×5 with 3 sessions)', () => {
    const alt = readyProgram('five-by-five', 3)
    expect(alt.routines).toHaveLength(2)
    expect(alt.week[1]).toBe(alt.routines[0].id)
    expect(alt.week[3]).toBe(alt.routines[1].id)
    expect(alt.week[5]).toBe(alt.routines[0].id)
  })

  it('never schedules more sessions than the program allows', () => {
    const five = readyProgram('core-mobility', 5)
    expect(Object.keys(five.week)).toHaveLength(2)
  })
})

describe('exercise modes in the ready-made programs', () => {
  it('every id exists and reps/cardio/time entries carry the right fields (no fake reps on cardio)', () => {
    READY_PROGRAMS.forEach(p => p.spec.forEach(([, , list]) => list.forEach(raw => {
      const e = Array.isArray(raw) ? { id: raw[0], sets: raw[1], reps: raw[2], weight: 0 } : raw
      expect(EXIDX[e.id], `Exercise ${e.id} in program "${p.name}"`).toBeTruthy()
      const mode = modeOf(e)
      if (isCardio(e.id) && e.mode !== 'time') {
        // Cardio exercises are stored as cardio entries (minutes + speed), never reps.
        expect(mode).toBe('cardio')
        expect(e.min).toBeGreaterThan(0)
        expect(e.reps, `cardio ${e.id} must not carry reps`).toBeUndefined()
      } else if (mode === 'time') {
        expect(e.sec).toBeGreaterThan(0)
      } else {
        expect(e.reps).toBeGreaterThan(0)
      }
    })))
  })

  it('prepares a cardio preview line with minutes and speed, not sets × reps', () => {
    const run = { id: '0685', sets: 4, min: 5, speed: 9 }
    expect(modeOf(run)).toBe('cardio')
    const line = exLine(run, 'kg')
    expect(line).toContain('4 × 5 min')
    expect(line).toContain('@ 9 km/h')
    expect(line).not.toMatch(/[0-9]+ × [0-9]+$/)   // no bare "sets × reps" tail
  })

  it('prepares a time-entry preview line with a duration, not sets × reps', () => {
    const hold = { id: '0630', sets: 3, sec: 30, weight: 0, mode: 'time' }
    expect(modeOf(hold)).toBe('time')
    expect(exLine(hold, 'kg')).toContain('3 × 0:30')
  })

  it('keeps reps entries as reps', () => {
    const squat = { id: '0043', sets: 5, reps: 5, weight: 0 }
    expect(modeOf(squat)).toBe('reps')
    expect(exLine(squat, 'kg')).toContain('5 × 5')
  })
})
