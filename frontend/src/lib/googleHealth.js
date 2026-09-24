// Google Health data helpers for openGym.
// Provides legacy-compatible exports/imports and MET-based calorie calculations.

import { EXIDX } from './exercises.js'
import { fmtVol, todayISO } from './format.js'

// Legacy Google Fit activity codes used only by the Takeout-compatible export format:
// 97: Weightlifting / Strength Training
// 8: Calisthenics / Bodyweight
// 58: Circuit Training / HIIT
// 88: Rowing machine
// 55: Stationary biking
// 29: Elliptical
// 7: Bodybuilding
export function resolveActivityType(workout) {
  const name = (workout.name || '').toLowerCase()
  if (name.includes('hiit') || name.includes('circuit')) return { id: 58, name: 'Circuit Training' }
  if (name.includes('calisthenic') || name.includes('bodyweight')) return { id: 8, name: 'Calisthenics' }
  if (name.includes('row')) return { id: 88, name: 'Rowing' }
  if (name.includes('bike') || name.includes('cycle')) return { id: 55, name: 'Stationary Biking' }
  return { id: 97, name: 'Weightlifting' }
}

// Estimate calorie burn using standard Metabolic Equivalent of Task (MET)
// Formula: Calories = MET * Weight(kg) * Duration(hours)
// Average strength training MET is 5.0 - 6.0; HIIT/circuit is 8.0
export function estimateCalories(workout, userWeightKg = 75) {
  const durMs = Math.max(60000, (workout.end || Date.now()) - (workout.start || (Date.now() - 3600000)))
  const durHours = durMs / 3600000
  const act = resolveActivityType(workout)
  let met = 5.5
  if (act.id === 58) met = 8.0
  else if (act.id === 8) met = 6.0
  else if (act.id === 88 || act.id === 55) met = 7.5

  const cal = Math.round(met * userWeightKg * durHours)
  return Math.max(40, cal)
}

// Build the legacy Google Fit Takeout session representation for export only.
export function formatGoogleFitSession(workout, options = {}) {
  const act = resolveActivityType(workout)
  const startTimeMillis = workout.start || Date.now() - 3600000
  const endTimeMillis = workout.end || Date.now()
  const userWeight = options.userWeight || 75
  const calories = workout.calories || estimateCalories(workout, userWeight)

  const exercisesSummary = (workout.entries || []).map(e => {
    const ex = EXIDX[e.id] || { n: e.id }
    const doneSets = (e.sets || []).filter(s => s.done !== false)
    const totalReps = doneSets.reduce((sum, s) => sum + (s.r || 0), 0)
    const maxWeight = Math.max(0, ...doneSets.map(s => s.w || 0))
    return `${ex.n}: ${doneSets.length} sets, ${totalReps} reps${maxWeight > 0 ? ` (max ${maxWeight}kg)` : ''}`
  }).join('; ')

  return {
    id: `opengym_${workout.id || Date.now()}`,
    name: workout.name || 'Strength Workout',
    description: `Logged via openGym. Volume: ${fmtVol(workout.vol || 0, 'kg')}. ${exercisesSummary}`,
    startTimeMillis,
    endTimeMillis,
    modifiedTimeMillis: Date.now(),
    application: {
      detailsUrl: 'https://github.com/DuarteSantos8/openGym',
      name: 'openGym Fitness Tracker',
      version: '1.2.3'
    },
    activityType: act.id,
    activeTimeMillis: endTimeMillis - startTimeMillis,
    caloriesExpended: calories,
    totalVolumeKg: workout.vol || 0,
    exercisesCount: (workout.entries || []).length
  }
}

// Convert state to Google Fit Takeout export format (JSON)
export function exportGoogleHealthJSON(workouts, bodyweight = [], unit = 'kg') {
  const sessions = (workouts || []).map(w => formatGoogleFitSession(w))
  const weights = (bodyweight || []).map(b => ({
    date: b.d,
    timestampMillis: b.t || new Date(b.d).getTime(),
    weightKg: unit === 'lb' ? Math.round(b.w * 0.45359237 * 10) / 10 : b.w
  }))

  return {
    source: 'openGym',
    version: '1.2.3',
    exportDate: new Date().toISOString(),
    sessionsCount: sessions.length,
    weightsCount: weights.length,
    sessions,
    bodyWeightRecords: weights
  }
}

// Convert state to Google Fit Takeout compatible CSV format (Daily Activity Metrics)
export function exportGoogleHealthCSV(workouts, bodyweight = []) {
  const headers = ['Date', 'Activity Name', 'Activity Type', 'Duration (min)', 'Calories (kcal)', 'Volume (kg)', 'Exercises Count']
  const rows = [headers.join(',')]

  workouts.forEach(w => {
    const s = formatGoogleFitSession(w)
    const durMin = Math.round((s.endTimeMillis - s.startTimeMillis) / 60000)
    const d = w.d || todayISO(new Date(s.startTimeMillis))
    rows.push([
      `"${d}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${resolveActivityType(w).name}"`,
      durMin,
      s.caloriesExpended,
      s.totalVolumeKg,
      s.exercisesCount
    ].join(','))
  })

  return rows.join('\n')
}

// Parse Google Takeout Fit / Google Health CSV or JSON files
export function parseGoogleHealthImport(text) {
  const s = String(text).trim()
  // Check if JSON
  if (s.startsWith('{') || s.startsWith('[')) {
    try {
      const data = JSON.parse(s)
      if (data.sessions || (Array.isArray(data) && data[0]?.activityType)) {
        const rawSessions = data.sessions || data
        const workouts = rawSessions.map(sess => {
          const start = sess.startTimeMillis || Date.now()
          const end = sess.endTimeMillis || start + 3600000
          const d = new Date(start).toISOString().slice(0, 10)
          return {
            id: 'gh_' + (sess.id || start),
            d,
            start,
            end,
            name: sess.name || 'Google Fit Workout',
            vol: sess.totalVolumeKg || 0,
            calories: sess.caloriesExpended || 0,
            entries: [],
            importedFrom: 'Google Health'
          }
        })
        const bodyweight = (data.bodyWeightRecords || []).map(b => ({
          d: b.date || new Date(b.timestampMillis).toISOString().slice(0, 10),
          w: b.weightKg,
          t: b.timestampMillis
        }))
        return { kind: 'google_health', workouts, bodyweight, error: null }
      }
    } catch (e) {
      // not JSON, fallback to CSV parsing
    }
  }

  // Check if Google Fit CSV (e.g. Daily activity metrics.csv or Activities.csv)
  if (s.includes('Calories (kcal)') || s.includes('Daily activity metrics') || s.includes('Activity Type') || s.includes('Weight (kg)')) {
    const lines = s.split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) return { error: 'empty' }
    const header = lines[0].toLowerCase()
    
    // Weight CSV
    if (header.includes('weight')) {
      const bw = []
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',')
        if (parts.length >= 2) {
          const d = parts[0].replace(/"/g, '').trim()
          const w = parseFloat(parts[1].replace(/"/g, '').trim())
          if (d && !isNaN(w)) bw.push({ d: d.slice(0, 10), w, t: new Date(d).getTime() })
        }
      }
      return { kind: 'bodyweight', source: 'Google Fit', bodyweight: bw, workouts: [] }
    }

    // Workouts CSV
    const workouts = []
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',')
      if (parts.length >= 3) {
        const d = parts[0].replace(/"/g, '').trim().slice(0, 10)
        const name = parts[1] ? parts[1].replace(/"/g, '').trim() : 'Google Fit Session'
        const dur = parseFloat(parts[3] || '45') || 45
        const cal = parseFloat(parts[4] || '250') || 250
        const start = new Date(d + 'T10:00:00').getTime()
        workouts.push({
          id: 'gh_' + d + '_' + i,
          d,
          start,
          end: start + dur * 60000,
          name,
          vol: 0,
          calories: cal,
          entries: [],
          importedFrom: 'Google Health'
        })
      }
    }
    return { kind: 'google_health', workouts, bodyweight: [], error: null }
  }

  return { error: 'unrecognised' }
}
