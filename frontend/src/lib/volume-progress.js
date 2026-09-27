import { EXIDX } from './exercises.js'

/**
 * Calculates volume (weight * reps) for a single workout entry's completed sets.
 */
export function entryVolume(entry) {
  if (!entry || !Array.isArray(entry.sets)) return 0
  return entry.sets.reduce((sum, s) => {
    if (!s || !s.done) return sum
    const w = Math.max(0, Number(s.w) || 0)
    const r = Math.max(0, Number(s.r) || 0)
    return sum + (w * r)
  }, 0)
}

/**
 * Returns timestamp in ms for a workout object.
 */
export function workoutTimestamp(w) {
  if (w.start && !isNaN(Number(w.start))) return Number(w.start)
  if (w.d) {
    const ts = new Date(w.d + 'T12:00:00').getTime()
    if (!isNaN(ts)) return ts
  }
  return 0
}

/**
 * Extracts and calculates volume progress for the top 3 most used exercises over the last 3 months (or specified window).
 *
 * @param {Array} workouts - list of workouts from S.workouts
 * @param {Object} options - { days: 90, now: Date.now(), limit: 3, allTimeFallback: true }
 * @returns {Object} { exercises: Array, timeRange: { start, end }, maxVolume: number, totalWorkoutsInWindow: number }
 */
export function getTopExercisesVolumeProgress(workouts = [], options = {}) {
  const days = options.days ?? 90
  const now = options.now ?? Date.now()
  const limit = options.limit ?? 3
  const cutoff = now - days * 86400000

  // Filter workouts within the window
  const inWindowWorkouts = (workouts || [])
    .filter(w => {
      const ts = workoutTimestamp(w)
      return ts >= cutoff && ts <= now + 86400000
    })
    .sort((a, b) => workoutTimestamp(a) - workoutTimestamp(b))

  // If inWindowWorkouts has data, we prioritize it.
  // If inWindowWorkouts is completely empty, optionally use all workouts if allTimeFallback is enabled
  const hasWindowData = inWindowWorkouts.length > 0
  const activeWorkouts = hasWindowData || !options.allTimeFallback ? inWindowWorkouts : [...workouts].sort((a, b) => workoutTimestamp(a) - workoutTimestamp(b))

  // Map to store per-exercise metrics across workouts in the window
  const exStats = new Map()

  for (const w of activeWorkouts) {
    const ts = workoutTimestamp(w)
    const dateStr = w.d || new Date(ts).toISOString().slice(0, 10)
    if (!Array.isArray(w.entries)) continue

    // Track which exercises were performed in this workout to count distinct sessions
    const seenInExInThisWorkout = new Set()

    for (const e of w.entries) {
      if (!e || !e.id) continue
      const id = e.id
      const vol = entryVolume(e)
      const doneSets = (e.sets || []).filter(s => s && s.done)
      const doneSetsCount = doneSets.length
      const totalReps = doneSets.reduce((acc, s) => acc + (Number(s.r) || 0), 0)
      const maxWeight = doneSets.reduce((acc, s) => Math.max(acc, Number(s.w) || 0), 0)

      // Skip entries with no completed sets
      if (doneSetsCount === 0 && vol === 0) continue

      if (!exStats.has(id)) {
        exStats.set(id, {
          id,
          name: EXIDX[id]?.n || id,
          sessions: 0,
          totalVolume: 0,
          totalSets: 0,
          totalReps: 0,
          maxWeightEver: 0,
          sessionMap: new Map() // dateStr -> session aggregate
        })
      }

      const stat = exStats.get(id)
      if (!seenInExInThisWorkout.has(id)) {
        stat.sessions++
        seenInExInThisWorkout.add(id)
      }

      stat.totalVolume += vol
      stat.totalSets += doneSetsCount
      stat.totalReps += totalReps
      if (maxWeight > stat.maxWeightEver) stat.maxWeightEver = maxWeight

      // Aggregate into sessionMap for that workout date
      if (stat.sessionMap.has(dateStr)) {
        const prev = stat.sessionMap.get(dateStr)
        prev.volume += vol
        prev.setsCount += doneSetsCount
        prev.repsCount += totalReps
        prev.maxWeight = Math.max(prev.maxWeight, maxWeight)
      } else {
        stat.sessionMap.set(dateStr, {
          t: ts,
          d: dateStr,
          date: new Date(ts),
          volume: vol,
          setsCount: doneSetsCount,
          repsCount: totalReps,
          maxWeight
        })
      }
    }
  }

  // Sort candidate exercises by:
  // 1. Most used (number of sessions in window) descending
  // 2. Total volume in window descending
  // 3. Total sets in window descending
  const rankedExercises = Array.from(exStats.values())
    .sort((a, b) => {
      if (b.sessions !== a.sessions) return b.sessions - a.sessions
      if (b.totalVolume !== a.totalVolume) return b.totalVolume - a.totalVolume
      return b.totalSets - a.totalSets
    })

  // Select top N exercises
  const topExercises = rankedExercises.slice(0, limit).map((stat, index) => {
    const points = Array.from(stat.sessionMap.values()).sort((a, b) => a.t - b.t)
    const firstVol = points.length > 0 ? points[0].volume : 0
    const latestVol = points.length > 0 ? points[points.length - 1].volume : 0
    const peakVol = points.reduce((m, p) => Math.max(m, p.volume), 0)
    const avgVol = points.length > 0 ? Math.round(stat.totalVolume / points.length) : 0
    const growth = latestVol - firstVol
    const growthPct = firstVol > 0 ? Math.round(((latestVol - firstVol) / firstVol) * 100) : null

    return {
      id: stat.id,
      name: stat.name,
      rank: index + 1,
      sessions: stat.sessions,
      totalVolume: stat.totalVolume,
      totalSets: stat.totalSets,
      totalReps: stat.totalReps,
      maxWeightEver: stat.maxWeightEver,
      avgVolume: avgVol,
      peakVolume: peakVol,
      firstVolume: firstVol,
      latestVolume: latestVol,
      growth,
      growthPct,
      points
    }
  })

  // Determine overall bounds
  let maxVolume = 0
  topExercises.forEach(ex => {
    ex.points.forEach(p => {
      if (p.volume > maxVolume) maxVolume = p.volume
    })
  })

  // Effective time range
  const startTime = hasWindowData ? cutoff : (topExercises[0]?.points[0]?.t || cutoff)
  const endTime = now

  return {
    exercises: topExercises,
    allCandidateCount: rankedExercises.length,
    timeRange: { start: startTime, end: endTime },
    maxVolume,
    totalWorkoutsInWindow: activeWorkouts.length
  }
}
