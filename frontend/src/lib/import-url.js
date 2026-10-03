import { READY_PROGRAMS, makeRoutines } from './starter.js'
import { uid } from './format.js'
import { EXIDX } from './exercises.js'
import cycles from '../catalog/athlete-cycles.json'
import { createCycleRoutine, cycleSchedule } from './program-cycle.js'

export const ATHLETE_RU_URL = 'http://forum.athlete.ru/t7249/'
export const ATHLETE_PROGRAMS = cycles

/**
 * Check if the given URL is pointing to the athlete.ru t7249 forum thread or athlete.ru cycles.
 */
export function isAthleteRuUrl(url) {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return ['athlete.ru', 'www.athlete.ru', 'forum.athlete.ru'].includes(parsed.hostname) && /^\/t7249(?:\/|$)/.test(parsed.pathname)
  } catch { return false }
}

function validateSpec(spec) {
  if (!Array.isArray(spec) || !spec.length || spec.length > 50) throw new Error('invalid_program')
  for (const row of spec) {
    if (!Array.isArray(row) || typeof row[0] !== 'string' || !Array.isArray(row[2]) || !row[2].length || row[2].length > 100) throw new Error('invalid_program')
    for (const raw of row[2]) {
      const cfg = Array.isArray(raw) ? { id: raw[0], sets: raw[1], reps: raw[2] } : raw
      if (!cfg || !EXIDX[cfg.id] || !Number.isInteger(cfg.sets) || cfg.sets < 1 || cfg.sets > 100) throw new Error('invalid_program')
      for (const key of ['reps', 'sec', 'min']) if (cfg[key] != null && (!Number.isFinite(cfg[key]) || cfg[key] <= 0)) throw new Error('invalid_program')
      if (cfg.weight != null && (!Number.isFinite(cfg.weight) || cfg.weight < 0)) throw new Error('invalid_program')
    }
  }
  return spec
}

/**
 * Parse an input URL or text string and return matched training programs.
 */
export async function parseProgramUrl(inputUrl) {
  const url = (inputUrl || '').trim()
  if (!url) throw new Error('empty_url')
  if (url.length > 1000000) throw new Error('program_too_large')

  // If it's the athlete.ru link or references athlete.ru/t7249
  if (isAthleteRuUrl(url)) {
    return {
      source: url,
      sourceName: 'athlete.ru (Тема t7249: Циклы Excel)',
      programs: ATHLETE_PROGRAMS
    }
  }

  const attached = ATHLETE_PROGRAMS.filter(program => program.download === url)
  if (attached.length) return { source: url, sourceName: 'athlete.ru', programs: attached }

  // Inline JSON only; unsupported links are never presented as fetched programs.
  if (url.startsWith('{') && url.endsWith('}')) {
    try {
      const parsed = JSON.parse(url)
      if (parsed.routines || parsed.spec) {
        return {
          source: 'custom-json',
          sourceName: parsed.name || 'Custom JSON Program',
          programs: [{
            id: 'custom-' + uid(),
            title: parsed.name || 'Custom Program',
            titleEn: parsed.name || 'Custom Program',
            spec: validateSpec(parsed.spec || (parsed.routines || []).map(r => [r.name, r.emoji || 'barbell', (r.ex || []).map(e => ({ ...e, sets: e.sets ?? 3, ...(e.reps == null && e.sec == null && e.min == null ? { reps: 10 } : {}) }))])),
            days: Array.isArray(parsed.days) && parsed.days.length && parsed.days.every(day => Number.isInteger(day) && day >= 0 && day <= 6) ? parsed.days : [1, 3, 5],
            description: parsed.description || 'Imported from custom format',
            descriptionEn: parsed.description || 'Imported from custom format',
            notes: parsed.notes || []
          }]
        }
      }
    } catch (e) {
      // not inline json
    }
  }

  // Fallback: check if URL matches any ready program
  const match = READY_PROGRAMS.find(p => p.id === url.toLowerCase())
  if (match) {
    return {
      source: 'preset',
      sourceName: match.name,
      programs: [{
        id: match.id,
        title: match.name,
        titleEn: match.name,
        spec: match.spec,
        days: match.days || [1, 3, 5],
        description: match.detail,
        descriptionEn: match.detail,
        notes: []
      }]
    }
  }

  throw new Error('unsupported_program_url')
}

/**
 * Apply a selected program into the user plan.
 */
export function applyImportedProgram(st, update, program, { applyWeek = false, maximums = {}, startDate } = {}) {
  if (program.sessions) {
    const routine = createCycleRoutine(program, maximums, st.unit)
    const dates = applyWeek ? cycleSchedule(routine, startDate) : null
    update(s => {
      s.routines.push(routine)
      if (dates) { s.week = {}; s.dayPlan = { ...(s.dayPlan || {}), ...dates } }
    })
    return { routines: [routine], week: {}, dates }
  }
  const routines = makeRoutines(program.spec)
  const newWeek = { ...(st.week || {}) }

  if (applyWeek && program.days) {
    program.days.forEach((day, idx) => {
      newWeek[day] = routines[idx % routines.length].id
    })
  }

  update(s => {
    s.routines = [...(s.routines || []), ...routines]
    if (applyWeek) {
      s.week = newWeek
    }
  })

  return { routines, week: newWeek }
}
