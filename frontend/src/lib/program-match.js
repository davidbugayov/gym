// Pure matching logic for the local Program Wizard: given the answers from the wizard
// (goals, available equipment in priority order, level, sessions per week, session
// duration), score the ready-made programs from starter.js. No network, no AI — the
// whole thing is a filter plus a small score that the unit tests pin down.
import { READY_PROGRAMS } from './starter.js'

// The wizard's taxonomies. The user-facing labels live in the sheets (t() keys);
// these ids are what programs and preferences are matched on.
export const GOALS = ['muscle', 'fatloss', 'fitness', 'endurance', 'stress']
export const EQUIP = ['bodyweight', 'dumbbell', 'barbell', 'kettlebell', 'run', 'gym']
export const LEVELS = ['beginner', 'returning', 'regular', 'advanced']
export const DURATIONS = ['short', 'mid', 'long']

// The wizard's three time buckets and the program minutes they accept.
export const DUR_BUCKETS = { short: [20, 30], mid: [35, 45], long: [50, 70] }

/* ---- equipment model ----
   A program declares:
     requiredEquip    — every one of these must be available, or the program cannot run
     altEquipGroups   — arrays of alternatives; if present, at least ONE group must be
                        fully available (e.g. bodyweight ИЛИ dumbbells for home strength)
   How a pick satisfies a requirement: an exact match always works. Picking "gym / mixed
   equipment" covers the kit a gym certainly has (bodyweight, dumbbells, kettlebells, the
   gym itself) — but it must NOT silently imply owning a barbell or outdoor running. */
export const GYM_COVERED = ['bodyweight', 'dumbbell', 'kettlebell']

export const equipCovered = (need, picks) => {
  if (picks.includes(need)) return true
  if (need === 'gym') return picks.includes('gym')
  return picks.includes('gym') && GYM_COVERED.includes(need)
}

export function fitsEquipment(program, picks) {
  const required = program.requiredEquip || []
  if (!required.every(n => equipCovered(n, picks))) return false
  const groups = program.altEquipGroups || []
  if (!groups.length) return true
  return groups.some(g => g.every(n => equipCovered(n, picks)))
}

/* ---- applying a program to the plan ----
   The wizard never rewrites the plan silently: routines are always ADDED, and the weekly
   schedule is only touched when the user explicitly opts in. */
export const hasWeekAssignments = week => !!week && Object.values(week).some(Boolean)

// Build a week mapping from an ordered list of weekdays (1=Mon … 5=Fri, 6=Sat, 0=Sun) onto
// the program's routines, cycling when the program has fewer routines than sessions (an A/B
// program alternates across the chosen days). Lets the user pick their own training days.
export function buildCustomWeek(days, routines) {
  const week = {}
  days.forEach((day, i) => { week[day] = routines[i % routines.length].id })
  return week
}

// Default for the preview's "Use this weekly schedule" switch: on for an empty plan,
// off as soon as anything is already assigned — an existing schedule is never replaced
// behind the user's back.
export const defaultUseSchedule = week => !hasWeekAssignments(week)

// Push the program's routines into the state. Existing routines, workouts, day overrides
// and body weight are never touched. The weekly schedule is only ever changed when
// `schedule` is true, and then it is replaced entirely: every old day assignment is
// cleared before the new program's days are written.
export function applyProgramToState(st, loaded, { schedule = false } = {}) {
  st.routines.push(...loaded.routines)
  if (schedule) {
    Object.keys(st.week).forEach(day => delete st.week[day])
    Object.entries(loaded.week).forEach(([day, routineId]) => { st.week[day] = routineId })
  }
  return st
}

// Duration bucket a program's per-session estimate falls into (with a little tolerance
// at the edges so a 32-minute program still reads as "short"). 35 minutes counts as mid.
export const durOf = minutes => (minutes <= 32 ? 'short' : minutes >= 48 ? 'long' : 'mid')

export const durBucket = minutes => (minutes <= 30 ? 'short' : minutes <= 45 ? 'mid' : 'long')

// Score one program against the wizard answers, or null when it is incompatible.
// Hard rules: the program must fit at least one picked equipment type, and the picked
// number of weekly sessions must be inside the program's freq range.
export function scoreProgram(program, prefs) {
  const goals = prefs.goals || []
  const equip = prefs.equip || []
  const level = prefs.level
  const sessions = prefs.sessions || 3
  const duration = prefs.duration

  if (equip.length && !fitsEquipment(program, equip)) return null
  if (sessions < program.freq[0] || sessions > program.freq[1]) return null

  let score = 0
  // Goals weigh most — they are why someone is here.
  score += 3 * goals.filter(g => program.goals.includes(g)).length
  // Equipment overlap, plus a bonus when the program fits the first (priority) pick.
  const nOverlap = program.equip.filter(e => equip.includes(e)).length
  score += 2 * nOverlap
  if (equip.length && program.equip.includes(equip[0])) score += 2
  // Level fit: exact match is best, one step off is tolerable, far off is a penalty.
  if (level && program.levels.includes(level)) score += 2
  else if (level && LEVELS.indexOf(level) !== -1 && program.levels.some(l => Math.abs(LEVELS.indexOf(l) - LEVELS.indexOf(level)) === 1)) score += 1
  else if (level) score -= 2
  // Session length.
  if (duration && durBucket(program.minutes) === duration) score += 2
  else if (duration && durOf(program.minutes) === duration) score += 1
  return score
}

// Programs to show on the wizard's result step: best matches first, at most `limit`.
// If the strict pass leaves fewer than two results, retry ignoring level and duration
// (equipment and frequency stay hard) — a beginner picking 5 barbell days a week should
// still see something rather than a dead end.
export function matchPrograms(programs = READY_PROGRAMS, prefs = {}, { limit = 4 } = {}) {
  const scored = programs
    .map(p => [scoreProgram(p, prefs), p])
    .filter(([s]) => s !== null)
    .sort((a, b) => b[0] - a[0] || (a[1].id < b[1].id ? -1 : 1))
  let out = scored.slice(0, limit).map(([, p]) => p)
  if (out.length < 2) {
    const eq = prefs.equip || []
    const sessions = prefs.sessions || 3
    for (const p of programs) {
      if (out.length >= 2) break
      if (out.includes(p)) continue
      if (eq.length && !fitsEquipment(p, eq)) continue
      if (sessions < p.freq[0] || sessions > p.freq[1]) continue
      out.push(p)
    }
    // Last resort: drop the frequency filter too so the user always sees 2 options.
    for (const p of programs) {
      if (out.length >= 2) break
      if (out.includes(p)) continue
      if (eq.length && !fitsEquipment(p, eq)) continue
      out.push(p)
    }
  }
  return out
}
