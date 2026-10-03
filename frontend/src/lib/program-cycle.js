import { uid, isoOf } from './format.js'

export function cycleWeight(maximum, percent, unit, rounding) {
  const step = unit === 'lb' ? 5 : 2.5
  const value = maximum * percent / 100 / step
  return Math.round((rounding === 'down' ? Math.floor(value + 1e-9) : Math.round(value)) * step * 10) / 10
}

export function createCycleRoutine(program, maximums, unit = 'kg') {
  if (!['kg', 'lb'].includes(unit)) throw new Error('invalid_unit')
  if (!program.sessions?.length || !program.lifts?.every(id => Number.isFinite(maximums[id]) && maximums[id] > 0)) throw new Error('invalid_maximums')
  const sessions = program.sessions.map(session => ({ ...session, ex: session.ex.map(entry => {
    const prescribedSets = entry.sets.map(set => ({ w: cycleWeight(maximums[entry.id], set.pct, unit, program.rounding), r: set.reps, pct: set.pct }))
    return { id: entry.id, sets: prescribedSets.length, reps: prescribedSets[0].r, weight: prescribedSets[0].w, prog: 'off', prescribedSets }
  }) }))
  return { id: uid(), name: program.title, emoji: 'barbell', prog: 'off', ex: sessions[0].ex,
    cycle: { programId: program.id, source: program.source, file: program.file, sheet: program.sheet, unit, maximums: { ...maximums }, cursor: 0, sessions } }
}

export function cycleSchedule(routine, startDate) {
  const start = new Date(startDate + 'T12:00:00')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isFinite(start.getTime()) || isoOf(start) !== startDate || start.getDay() !== 1) throw new Error('start_on_monday')
  return Object.fromEntries(routine.cycle.sessions.map(session => {
    const date = new Date(start)
    date.setDate(start.getDate() + (session.week - 1) * 7 + (session.weekday + 6) % 7)
    return [isoOf(date), routine.id]
  }))
}

export function cycleSessionCompleted(active, routine) {
  const expected = routine?.cycle?.sessions[active.cycleStep]?.ex
  const main = active.entries.filter(entry => !entry.phase)
  return !!expected?.length && main.length === expected.length && expected.every((cfg, index) => {
    const entry = main[index]
    return entry.id === cfg.id && entry.sets.length >= cfg.prescribedSets.length && cfg.prescribedSets.every((target, i) => {
      const actual = entry.sets[i]
      return actual?.done && !actual.skipped && Number(actual.r) >= target.r
    })
  })
}

export function advanceCycle(state, workout) {
  const routine = state.routines.find(r => r.id === workout.routineId)
  if (!routine?.cycle || workout.cycleStep !== routine.cycle.cursor || !workout.cycleCompleted) return false
  routine.cycle.cursor++
  const next = routine.cycle.sessions[routine.cycle.cursor]
  if (next) routine.ex = JSON.parse(JSON.stringify(next.ex))
  else routine.cycle.complete = true
  return true
}
