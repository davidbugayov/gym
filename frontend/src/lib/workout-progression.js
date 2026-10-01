import { workoutVolume } from './history.js'
import { fmtVol, fmtDate } from './format.js'
import { t } from './i18n.js'

/**
 * Calculates intensity and load metrics for a workout session.
 * In resistance training, intensity is primarily measured as Average Load per Repetition (Volume / Repetitions).
 * Additional intensity dimensions include peak load, set load, and rated effort (RPE/RIR) if present.
 *
 * @param {Object} w - Workout object
 * @returns {Object} { avgLoad, maxWeight, totalReps, weightedReps, totalSets, weightedSets, avgRpe, volume }
 */
export function calcWorkoutIntensity(w) {
  if (!w || !Array.isArray(w.entries)) {
    return {
      avgLoad: 0,
      maxWeight: 0,
      totalReps: 0,
      weightedReps: 0,
      totalSets: 0,
      weightedSets: 0,
      avgRpe: null,
      volume: 0
    }
  }

  const doneSets = []
  w.entries.forEach(e => {
    if (e && Array.isArray(e.sets)) {
      e.sets.forEach(s => {
        if (s && s.done) doneSets.push(s)
      })
    }
  })

  let weightedVol = 0
  let weightedReps = 0
  let totalReps = 0
  let maxWeight = 0
  let weightedSets = 0
  let ratedSetsCount = 0
  let rpeSum = 0

  doneSets.forEach(s => {
    const weight = Math.max(0, Number(s.w) || 0)
    const reps = Math.max(0, Number(s.r) || 0)
    totalReps += reps

    if (weight > 0) {
      weightedSets++
      weightedVol += weight * reps
      weightedReps += reps
      if (weight > maxWeight) maxWeight = weight
    }

    if (s.rpe != null && !isNaN(Number(s.rpe))) {
      ratedSetsCount++
      rpeSum += Number(s.rpe)
    } else if (s.rir != null && !isNaN(Number(s.rir))) {
      ratedSetsCount++
      rpeSum += 10 - Number(s.rir)
    }
  })

  // Average load per repetition (Volume / Reps)
  const avgLoad = weightedReps > 0
    ? Math.round((weightedVol / weightedReps) * 10) / 10
    : 0

  const avgRpe = ratedSetsCount > 0
    ? Math.round((rpeSum / ratedSetsCount) * 10) / 10
    : null

  const volume = Number(w.vol) || workoutVolume(w) || 0

  return {
    avgLoad,
    maxWeight: Math.round(maxWeight * 10) / 10,
    totalReps,
    weightedReps,
    totalSets: doneSets.length,
    weightedSets,
    avgRpe,
    volume
  }
}

/**
 * Returns previous sessions before the current workout.
 *
 * @param {Object} currentWorkout - The current workout being completed
 * @param {Array} allWorkouts - List of all workouts from store
 * @param {Object} options - { limit = 3, matchRoutine = false }
 * @returns {Array} List of previous workouts in chronological order (oldest to newest)
 */
export function getPreviousSessions(currentWorkout, allWorkouts = [], options = {}) {
  const limit = options.limit ?? 3
  const matchRoutine = !!options.matchRoutine

  if (!currentWorkout || !Array.isArray(allWorkouts) || !allWorkouts.length) {
    return []
  }

  const curTs = Number(currentWorkout.start) || (currentWorkout.d ? new Date(currentWorkout.d).getTime() : 0)
  const curId = currentWorkout.id

  const candidates = allWorkouts.filter(w => {
    if (!w || typeof w !== 'object') return false
    if (curId && w.id === curId) return false
    const ts = Number(w.start) || (w.d ? new Date(w.d).getTime() : 0)
    if (curTs && ts) {
      if (ts > curTs) return false
      if (ts === curTs && curId && w.id === curId) return false
    }
    // Only completed workouts with done sets or volume
    const vol = Number(w.vol) || workoutVolume(w) || 0
    const hasSets = Array.isArray(w.entries) && w.entries.some(e => Array.isArray(e.sets) && e.sets.some(s => s && s.done))
    return vol > 0 || hasSets
  })

  let filtered = candidates
  if (matchRoutine && currentWorkout.routineId) {
    const routineMatched = candidates.filter(w => w.routineId === currentWorkout.routineId)
    if (routineMatched.length > 0) {
      filtered = routineMatched
    }
  }

  // Sort descending (most recent first)
  filtered.sort((a, b) => {
    const aTs = Number(a.start) || (a.d ? new Date(a.d).getTime() : 0)
    const bTs = Number(b.start) || (b.d ? new Date(b.d).getTime() : 0)
    return bTs - aTs
  })

  // Take the previous N sessions, and return in chronological order (oldest to newest)
  return filtered.slice(0, limit).reverse()
}

/**
 * Compares current workout volume and intensity against previous sessions.
 *
 * @param {Object} currentWorkout - The current workout
 * @param {Array} previousSessions - The previous sessions (up to 3) in chronological order
 * @param {string} unit - Weight unit ('kg' | 'lb')
 * @returns {Object} Comprehensive comparison metrics and progression feedback
 */
export function compareWorkoutProgression(currentWorkout, previousSessions = [], unit = 'kg') {
  const currentMetrics = calcWorkoutIntensity(currentWorkout)
  const count = previousSessions.length

  if (count === 0) {
    return {
      hasBaseline: false,
      sessionsCount: 0,
      current: currentMetrics,
      feedback: {
        type: 'baseline',
        title: t('First session baseline'),
        description: t('Great job completing your workout! Your next sessions will compare against this baseline to track progressive overload.'),
        trend: 'neutral',
        badge: t('Baseline')
      },
      volume: {
        current: currentMetrics.volume,
        avgPrev: 0,
        diff: 0,
        pct: 0,
        trend: 'neutral'
      },
      intensity: {
        current: currentMetrics.avgLoad,
        avgPrev: 0,
        diff: 0,
        pct: 0,
        trend: 'neutral'
      },
      sessions: [{
        id: currentWorkout.id || 'current',
        date: currentWorkout.d || fmtDate(Date.now()),
        name: currentWorkout.name || t('Workout'),
        isCurrent: true,
        volume: currentMetrics.volume,
        intensity: currentMetrics.avgLoad,
        setsCount: currentMetrics.totalSets
      }]
    }
  }

  // Compute metrics for previous sessions
  const prevMetricsList = previousSessions.map(sess => ({
    workout: sess,
    metrics: calcWorkoutIntensity(sess)
  }))

  const prevVols = prevMetricsList.map(p => p.metrics.volume)
  const avgPrevVol = Math.round(prevVols.reduce((sum, v) => sum + v, 0) / count)
  const diffVol = Math.round(currentMetrics.volume - avgPrevVol)
  const pctVol = avgPrevVol > 0
    ? Math.round(((currentMetrics.volume - avgPrevVol) / avgPrevVol) * 1000) / 10
    : 0

  const volTrend = pctVol > 1.5 ? 'up' : pctVol < -1.5 ? 'down' : 'flat'

  // Intensity comparison (Average load per rep)
  const prevIntensities = prevMetricsList.map(p => p.metrics.avgLoad)
  const avgPrevIntensity = Math.round((prevIntensities.reduce((sum, v) => sum + v, 0) / count) * 10) / 10
  const diffIntensity = Math.round((currentMetrics.avgLoad - avgPrevIntensity) * 10) / 10
  const pctIntensity = avgPrevIntensity > 0
    ? Math.round(((currentMetrics.avgLoad - avgPrevIntensity) / avgPrevIntensity) * 1000) / 10
    : 0

  const intensityTrend = pctIntensity > 1.5 ? 'up' : pctIntensity < -1.5 ? 'down' : 'flat'

  // Progression Feedback generation
  const feedback = generateProgressionFeedback({
    pctVol,
    diffVol,
    pctIntensity,
    diffIntensity,
    unit,
    sessionsCount: count
  })

  // Format session-by-session list for progression display
  const sessions = [
    ...prevMetricsList.map(p => ({
      id: p.workout.id,
      date: p.workout.d || (p.workout.start ? fmtDate(p.workout.start) : ''),
      name: p.workout.name || t('Workout'),
      isCurrent: false,
      volume: p.metrics.volume,
      intensity: p.metrics.avgLoad,
      setsCount: p.metrics.totalSets,
      avgRpe: p.metrics.avgRpe
    })),
    {
      id: currentWorkout.id || 'current',
      date: currentWorkout.d || fmtDate(Date.now()),
      name: currentWorkout.name || t('Workout'),
      isCurrent: true,
      volume: currentMetrics.volume,
      intensity: currentMetrics.avgLoad,
      setsCount: currentMetrics.totalSets,
      avgRpe: currentMetrics.avgRpe
    }
  ]

  return {
    hasBaseline: true,
    sessionsCount: count,
    current: currentMetrics,
    volume: {
      current: currentMetrics.volume,
      avgPrev: avgPrevVol,
      diff: diffVol,
      pct: pctVol,
      trend: volTrend
    },
    intensity: {
      current: currentMetrics.avgLoad,
      avgPrev: avgPrevIntensity,
      diff: diffIntensity,
      pct: pctIntensity,
      trend: intensityTrend
    },
    feedback,
    sessions
  }
}

/**
 * Generates insightful, scientifically sound progressive overload feedback.
 */
export function generateProgressionFeedback({ pctVol, diffVol, pctIntensity, diffIntensity, unit, sessionsCount }) {
  const sessionWord = sessionsCount === 1 ? t('previous session') : t('previous {0} sessions', sessionsCount)
  const diffVolStr = fmtVol ? fmtVol(Math.abs(diffVol), unit) : `${Math.abs(diffVol)} ${unit}`

  // 1. Dual overload: both volume and intensity significantly up
  if (pctVol >= 2.0 && pctIntensity >= 2.0) {
    return {
      type: 'peak_overload',
      title: t('Peak progressive overload!'),
      description: t('Both volume (+{0}%) and intensity (+{1} {2}/rep) increased vs your {3}. Exceptional stimulus progression!', pctVol, diffIntensity, unit, sessionWord),
      trend: 'up',
      badge: t('Peak Overload')
    }
  }

  // 2. High intensity progression: load increased, volume maintained or close
  if (pctIntensity >= 2.0 && pctVol >= -5.0) {
    return {
      type: 'intensity_overload',
      title: t('Heavy stimulus progression'),
      description: t('Average load increased by +{0} {1}/rep (+{2}%) with strong volume retention vs your {3}. Great neuromuscular adaptation!', diffIntensity, unit, pctIntensity, sessionWord),
      trend: 'up',
      badge: t('Intensity Gain')
    }
  }

  // 3. Volume overload: tonnage increased, load maintained or close
  if (pctVol >= 3.0 && pctIntensity >= -5.0) {
    return {
      type: 'volume_overload',
      title: t('Volume overload achieved'),
      description: t('Total training volume grew by +{0} (+{1}%) compared to your {2}, driving muscle hypertrophy and work capacity.', diffVolStr, pctVol, sessionWord),
      trend: 'up',
      badge: t('Volume Overload')
    }
  }

  // 4. Heavy load with lower volume (e.g. low rep strength specialization)
  if (pctIntensity >= 3.0 && pctVol < -5.0) {
    return {
      type: 'strength_focus',
      title: t('High-intensity strength focus'),
      description: t('Heavier average load (+{0}%) with lower total volume vs your {1}. Effective for max strength adaptation without accumulating excess fatigue.', pctIntensity, sessionWord),
      trend: 'up',
      badge: t('Strength Focus')
    }
  }

  // 5. High volume with lighter load (hypertrophy / endurance density)
  if (pctVol >= 5.0 && pctIntensity < -5.0) {
    return {
      type: 'hypertrophy_pump',
      title: t('High-volume pump stimulus'),
      description: t('Pushed +{0}% more total volume with lighter load vs your {1} — great metabolic stress and conditioning stimulus.', pctVol, sessionWord),
      trend: 'up',
      badge: t('Volume Focus')
    }
  }

  // 6. Consistent pacing (within +/- 3%)
  if (Math.abs(pctVol) <= 3.0 && Math.abs(pctIntensity) <= 3.0) {
    return {
      type: 'steady',
      title: t('Consistent training pace'),
      description: t('Volume and load tracked steadily within your recent {0} baseline. Consistent training frequency builds long-term adaptation.', sessionWord),
      trend: 'flat',
      badge: t('Consistent')
    }
  }

  // 7. Controlled deload / recovery
  if (pctVol < -3.0 || pctIntensity < -3.0) {
    return {
      type: 'recovery',
      title: t('Lighter / recovery session'),
      description: t('Volume and load were reduced below your {0} average. Lower fatigue sessions support recovery and supercompensation.', sessionWord),
      trend: 'down',
      badge: t('Recovery')
    }
  }

  return {
    type: 'steady',
    title: t('Workout progression logged'),
    description: t('Your volume and intensity have been benchmarked against your {0}.', sessionWord),
    trend: 'flat',
    badge: t('Progress Logged')
  }
}
