import { effectiveRoutine, modeOf, workoutVolume } from './history.js'
import { isoOf } from './format.js'

export function recapMetrics(workout) {
  const result = { sets: 0, exercises: 0, reps: 0, seconds: 0, cardioMinutes: 0, volume: workoutVolume(workout) }
  for (const entry of workout.entries || []) {
    const sets = (entry.sets || []).filter(set => set.done)
    if (sets.length) result.exercises++
    result.sets += sets.length
    const mode = modeOf({ ...entry.target, id: entry.id })
    for (const set of sets) {
      if (mode === 'time') result.seconds += Number(set.sec) || 0
      else if (mode === 'cardio') result.cardioMinutes += Number(set.min) || 0
      else result.reps += Number(set.r) || 0
    }
  }
  return result
}

const signature = workout => (workout.entries || [])
  .filter(entry => entry.sets?.some(set => set.done))
  .map(entry => `${entry.id}:${modeOf({ ...entry.target, id: entry.id })}`)
  .sort().join('|')

export function previousComparableWorkout(workout, history = []) {
  const currentSignature = signature(workout)
  if (!currentSignature) return null
  return history.filter(previous => previous.id !== workout.id && previous.start < workout.start
    && previous.routineId === workout.routineId && signature(previous) === currentSignature)
    .sort((a, b) => b.start - a.start)[0] || null
}

export function nextScheduledWorkout(state, fromDate) {
  const date = new Date(fromDate + 'T12:00:00')
  for (let offset = 1; offset <= 7; offset++) {
    date.setDate(date.getDate() + 1)
    const iso = isoOf(date)
    const routine = effectiveRoutine(state, iso)
    if (routine) return { date: iso, routine }
  }
  return null
}
