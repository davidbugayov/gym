/**
 * trends.js — Exercise progression and volume/weight trend computation.
 *
 * Compares an exercise's performance in a given workout session with its
 * most recent prior completed session in history.
 */

/**
 * Formats a percentage with a sign.
 */
export function fmtPct(pct, withSign = true) {
  if (pct == null || isNaN(pct)) return '0.0%'
  const rounded = Math.round(pct * 10) / 10
  const formatted = rounded.toFixed(1)
  if (rounded > 0) return withSign ? `+${formatted}%` : `${formatted}%`
  if (rounded < 0) return `${formatted}%`
  return '0.0%'
}

/**
 * Calculates whether volume or weight increased, decreased, or stayed the same
 * compared to the previous session for that specific exercise, including
 * exact percentage changes.
 *
 * @param {Object} workout - The current workout object containing entries
 * @param {Object} entry - The exercise entry object inside this workout
 * @param {Array} allWorkouts - Complete list of workouts (S.workouts)
 * @param {string} unit - Current weight unit ('kg' | 'lb')
 * @returns {Object} Trend result object
 */
export function getExerciseTrend(workout, entry, allWorkouts = [], unit = 'kg') {
  if (!workout || !entry || !Array.isArray(allWorkouts) || !allWorkouts.length) {
    return { trend: 'none', label: '', text: '' }
  }

  const exId = entry.id
  const currentSets = (entry.sets || []).filter(s => s && s.done)
  if (!currentSets.length) {
    return { trend: 'none', label: '', text: '' }
  }

  const currentTs = workout.start || (workout.d ? new Date(workout.d).getTime() : 0)

  // Find previous workouts that happened before this workout
  let prevEntry = null
  let prevWorkout = null

  const pastWorkouts = allWorkouts
    .filter(w => {
      if (!w || w.id === workout.id) return false
      const wTs = w.start || (w.d ? new Date(w.d).getTime() : 0)
      if (wTs < currentTs) return true
      if (wTs === currentTs && w.id < workout.id) return true
      if (w.d && workout.d && w.d < workout.d) return true
      return false
    })
    .sort((a, b) => {
      const aTs = a.start || (a.d ? new Date(a.d).getTime() : 0)
      const bTs = b.start || (b.d ? new Date(b.d).getTime() : 0)
      return bTs - aTs
    })

  for (const w of pastWorkouts) {
    const found = (w.entries || []).find(e => e.id === exId)
    if (found && (found.sets || []).some(s => s && s.done)) {
      prevEntry = found
      prevWorkout = w
      break
    }
  }

  // 1. Current session stats
  const currentMaxW = Math.max(0, ...currentSets.filter(s => s.w != null).map(s => Number(s.w) || 0))
  const currentVol = currentSets.reduce((sum, s) => sum + (Number(s.w) || 0) * (Number(s.r) || 0), 0)
  const currentReps = currentSets.reduce((sum, s) => sum + (Number(s.r) || 0), 0)
  const currentSec = currentSets.reduce((sum, s) => sum + (Number(s.sec) || 0), 0)

  if (!prevEntry) {
    return {
      trend: 'first',
      label: '1st',
      text: '1st',
      tooltip: 'First logged session for this exercise',
      exerciseId: exId,
      currentMaxW,
      prevMaxW: null,
      diffW: 0,
      pctW: null,
      currentVol,
      prevVol: null,
      diffVol: 0,
      pctVol: null,
      currentReps,
      prevReps: null,
      diffReps: 0,
      pctReps: null,
      currentSec,
      prevSec: null,
      diffSec: 0,
      pctSec: null,
      hasWeight: currentMaxW > 0,
      hasReps: currentReps > 0,
      hasTime: currentSec > 0,
      prevDate: null,
      currentDate: workout.d || null,
      prevWorkout: null,
      currentWorkout: workout,
      prevSetsCount: 0,
      currentSetsCount: currentSets.length,
      unit
    }
  }

  const prevSets = prevEntry.sets.filter(s => s && s.done)

  // 2. Previous session stats
  const prevMaxW = Math.max(0, ...prevSets.filter(s => s.w != null).map(s => Number(s.w) || 0))
  const prevVol = prevSets.reduce((sum, s) => sum + (Number(s.w) || 0) * (Number(s.r) || 0), 0)
  const prevReps = prevSets.reduce((sum, s) => sum + (Number(s.r) || 0), 0)
  const prevSec = prevSets.reduce((sum, s) => sum + (Number(s.sec) || 0), 0)

  // 3. Absolute differences
  const diffW = +(currentMaxW - prevMaxW).toFixed(2)
  const diffVol = Math.round(currentVol - prevVol)
  const diffReps = currentReps - prevReps
  const diffSec = currentSec - prevSec

  // 4. Exact percentage differences
  const pctW = prevMaxW > 0
    ? +(((currentMaxW - prevMaxW) / prevMaxW) * 100).toFixed(1)
    : (prevMaxW === 0 && currentMaxW > 0 ? 100 : 0)

  const pctVol = prevVol > 0
    ? +(((currentVol - prevVol) / prevVol) * 100).toFixed(1)
    : (prevVol === 0 && currentVol > 0 ? 100 : 0)

  const pctReps = prevReps > 0
    ? +(((currentReps - prevReps) / prevReps) * 100).toFixed(1)
    : (prevReps === 0 && currentReps > 0 ? 100 : 0)

  const pctSec = prevSec > 0
    ? +(((currentSec - prevSec) / prevSec) * 100).toFixed(1)
    : (prevSec === 0 && currentSec > 0 ? 100 : 0)

  const hasWeight = currentMaxW > 0 || prevMaxW > 0
  const hasReps = currentReps > 0 || prevReps > 0
  const hasTime = currentSec > 0 || prevSec > 0

  const baseResult = {
    exerciseId: exId,
    currentMaxW,
    prevMaxW,
    diffW,
    pctW,
    currentVol,
    prevVol,
    diffVol,
    pctVol,
    currentReps,
    prevReps,
    diffReps,
    pctReps,
    currentSec,
    prevSec,
    diffSec,
    pctSec,
    hasWeight,
    hasReps,
    hasTime,
    prevDate: prevWorkout ? prevWorkout.d : null,
    currentDate: workout.d || null,
    prevWorkout,
    currentWorkout: workout,
    prevSetsCount: prevSets.length,
    currentSetsCount: currentSets.length,
    unit
  }

  // --- Weight-bearing exercise ---
  if (hasWeight) {
    if (diffW > 0) {
      return {
        ...baseResult,
        trend: 'up',
        metric: 'weight',
        primaryPct: pctW,
        text: `+${diffW} ${unit}`,
        tooltip: `Top weight: ${prevMaxW} → ${currentMaxW} ${unit} (+${diffW} ${unit}, ${fmtPct(pctW)})${diffVol ? ` · Volume: ${diffVol > 0 ? '+' : ''}${diffVol} ${unit} (${fmtPct(pctVol)})` : ''}`
      }
    }
    if (diffW < 0) {
      return {
        ...baseResult,
        trend: 'down',
        metric: 'weight',
        primaryPct: pctW,
        text: `${diffW} ${unit}`,
        tooltip: `Top weight: ${prevMaxW} → ${currentMaxW} ${unit} (${diffW} ${unit}, ${fmtPct(pctW)})${diffVol ? ` · Volume: ${diffVol > 0 ? '+' : ''}${diffVol} ${unit} (${fmtPct(pctVol)})` : ''}`
      }
    }

    // Weight is identical: evaluate volume
    if (diffVol > 0) {
      return {
        ...baseResult,
        trend: 'up',
        metric: 'volume',
        primaryPct: pctVol,
        text: `+${diffVol} ${unit} vol`,
        tooltip: `Volume: ${Math.round(prevVol)} → ${Math.round(currentVol)} ${unit} (+${diffVol} ${unit}, ${fmtPct(pctVol)} at ${currentMaxW} ${unit})`
      }
    }
    if (diffVol < 0) {
      return {
        ...baseResult,
        trend: 'down',
        metric: 'volume',
        primaryPct: pctVol,
        text: `${diffVol} ${unit} vol`,
        tooltip: `Volume: ${Math.round(prevVol)} → ${Math.round(currentVol)} ${unit} (${diffVol} ${unit}, ${fmtPct(pctVol)} at ${currentMaxW} ${unit})`
      }
    }

    // Weight and volume identical: evaluate reps
    if (diffReps > 0) {
      return {
        ...baseResult,
        trend: 'up',
        metric: 'reps',
        primaryPct: pctReps,
        text: `+${diffReps} reps`,
        tooltip: `Reps: ${prevReps} → ${currentReps} (+${diffReps} reps, ${fmtPct(pctReps)})`
      }
    }
    if (diffReps < 0) {
      return {
        ...baseResult,
        trend: 'down',
        metric: 'reps',
        primaryPct: pctReps,
        text: `${diffReps} reps`,
        tooltip: `Reps: ${prevReps} → ${currentReps} (${diffReps} reps, ${fmtPct(pctReps)})`
      }
    }

    return {
      ...baseResult,
      trend: 'same',
      metric: 'same',
      primaryPct: 0,
      text: '=',
      tooltip: `Same weight (${currentMaxW} ${unit}) and volume (${Math.round(currentVol)} ${unit}) (0.0% change)`
    }
  }

  // --- Bodyweight / Reps exercises ---
  if (hasReps) {
    if (diffReps > 0) {
      return {
        ...baseResult,
        trend: 'up',
        metric: 'reps',
        primaryPct: pctReps,
        text: `+${diffReps} reps`,
        tooltip: `Total reps: ${prevReps} → ${currentReps} (+${diffReps} reps, ${fmtPct(pctReps)})`
      }
    }
    if (diffReps < 0) {
      return {
        ...baseResult,
        trend: 'down',
        metric: 'reps',
        primaryPct: pctReps,
        text: `${diffReps} reps`,
        tooltip: `Total reps: ${prevReps} → ${currentReps} (${diffReps} reps, ${fmtPct(pctReps)})`
      }
    }
  }

  // --- Timed holds ---
  if (hasTime) {
    if (diffSec > 0) {
      return {
        ...baseResult,
        trend: 'up',
        metric: 'time',
        primaryPct: pctSec,
        text: `+${diffSec}s`,
        tooltip: `Duration: ${prevSec}s → ${currentSec}s (+${diffSec}s, ${fmtPct(pctSec)})`
      }
    }
    if (diffSec < 0) {
      return {
        ...baseResult,
        trend: 'down',
        metric: 'time',
        primaryPct: pctSec,
        text: `${diffSec}s`,
        tooltip: `Duration: ${prevSec}s → ${currentSec}s (${diffSec}s, ${fmtPct(pctSec)})`
      }
    }
  }

  return {
    ...baseResult,
    trend: 'same',
    metric: 'same',
    primaryPct: 0,
    text: '=',
    tooltip: 'Identical performance to previous session (0.0% change)'
  }
}
