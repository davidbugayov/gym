import { workoutVolume } from './history.js'
import { isoOf } from './format.js'

/**
 * Computes 30-day daily total volume progression from completed workouts.
 *
 * @param {Array} workouts - All workouts (S.workouts)
 * @param {Object} options - { now: timestamp | Date, days: 30 }
 * @returns {Object} { days: Array, totalVolume, workoutsCount, activeDaysCount, avgDailyVolume, avgWorkoutVolume, avgActiveDayVolume, peakDay, trendPct, hasData }
 */
export function getVolumeProgression30Days(workouts = [], options = {}) {
  const numDays = options.days || 30
  const now = options.now ? new Date(options.now) : new Date()

  // Generate date buckets for the last 30 days ending today
  // Format: YYYY-MM-DD
  const days = []
  const dateMap = new Map()

  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000)
    const iso = d.toISOString().slice(0, 10)
    const entry = {
      date: iso,
      timestamp: new Date(iso + 'T12:00:00').getTime(),
      dayOfMonth: d.getDate(),
      month: d.getMonth() + 1,
      dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'short' }),
      volume: 0,
      workouts: [],
      setsCount: 0,
      repsCount: 0,
      hasWorkout: false
    }
    days.push(entry)
    dateMap.set(iso, entry)
  }

  // Iterate over workouts
  const safeWorkouts = (Array.isArray(workouts) ? workouts : []).filter(w => w && typeof w === 'object')

  let totalVolume = 0
  let totalWorkouts = 0

  for (const w of safeWorkouts) {
    const dStr = typeof w.d === 'string' && w.d ? w.d.slice(0, 10) : (w.start ? isoOf(new Date(Number(w.start))) : null)
    if (!dStr || !dateMap.has(dStr)) continue

    const bucket = dateMap.get(dStr)
    const vol = Number(w.vol) || workoutVolume(w) || 0

    // Count done sets and reps
    let setsCount = 0
    let repsCount = 0
    if (Array.isArray(w.entries)) {
      w.entries.forEach(e => {
        if (e && Array.isArray(e.sets)) {
          e.sets.forEach(s => {
            if (s && s.done) {
              setsCount++
              repsCount += Math.max(0, Number(s.r) || 0)
            }
          })
        }
      })
    }

    bucket.volume += vol
    bucket.setsCount += setsCount
    bucket.repsCount += repsCount
    bucket.hasWorkout = true
    bucket.workouts.push({
      id: w.id,
      name: w.name || 'Workout',
      volume: vol,
      setsCount,
      repsCount
    })

    totalVolume += vol
    totalWorkouts++
  }

  const activeDays = days.filter(d => d.hasWorkout && d.volume > 0)
  const activeDaysCount = activeDays.length

  // Peak volume day
  let peakDay = null
  let maxDayVol = 0
  days.forEach(d => {
    if (d.volume > maxDayVol) {
      maxDayVol = d.volume
      peakDay = d
    }
  })

  // 15-day comparison: First 15 days vs Second 15 days for progression trend
  const midPoint = Math.floor(numDays / 2)
  const firstHalf = days.slice(0, midPoint)
  const secondHalf = days.slice(midPoint)

  const firstHalfVol = firstHalf.reduce((sum, d) => sum + d.volume, 0)
  const secondHalfVol = secondHalf.reduce((sum, d) => sum + d.volume, 0)

  let trendPct = null
  if (firstHalfVol > 0) {
    trendPct = Math.round(((secondHalfVol - firstHalfVol) / firstHalfVol) * 1000) / 10
  } else if (secondHalfVol > 0) {
    trendPct = 100
  }

  const avgWorkoutVolume = totalWorkouts > 0 ? Math.round(totalVolume / totalWorkouts) : 0
  const avgActiveDayVolume = activeDaysCount > 0 ? Math.round(totalVolume / activeDaysCount) : 0
  const avgDailyVolume = Math.round(totalVolume / numDays)

  return {
    days,
    totalVolume,
    workoutsCount: totalWorkouts,
    activeDaysCount,
    avgWorkoutVolume,
    avgActiveDayVolume,
    avgDailyVolume,
    peakDay,
    firstHalfVol,
    secondHalfVol,
    trendPct,
    hasData: totalVolume > 0 || totalWorkouts > 0
  }
}
