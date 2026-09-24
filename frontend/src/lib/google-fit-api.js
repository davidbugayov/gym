import { estimateCalories } from './googleHealth.js'
import { getCachedToken } from './google-auth.js'
import { EXIDX } from './exercises.js'

const API = 'https://health.googleapis.com/v4/users/me/dataTypes'

function readApiError(status, detail) {
  let payload = null
  try { payload = JSON.parse(detail) } catch {}
  const apiError = payload?.error || {}
  const reason = apiError.details?.find(detail => detail.reason || detail.metadata?.reason)?.reason
    || apiError.details?.find(detail => detail.metadata?.reason)?.metadata?.reason
    || apiError.errors?.[0]?.reason
    || apiError.reason
    || apiError.status
    || null
  const error = new Error(`Google Health API ${status}`)
  error.status = status
  error.reason = String(reason || '').toUpperCase()
  error.detail = detail
  return error
}

function utcOffsetDuration(timestamp) {
  const minutes = -new Date(timestamp).getTimezoneOffset()
  return `${minutes * 60}s`
}

function exerciseType(workout) {
  const name = String(workout.name || '').toLowerCase()
  if (/hiit|interval/.test(name)) return 'HIIT'
  if (/circuit/.test(name)) return 'CIRCUIT_TRAINING'
  if (/calisthenic|body.?weight/.test(name)) return 'CALISTHENICS'
  if (/row/.test(name)) return 'ROWING_MACHINE'
  if (/bike|cycling/.test(name)) return 'STATIONARY_BIKE'
  return 'STRENGTH_TRAINING'
}

async function createDataPoint(token, type, payload) {
  const response = await fetch(`${API}/${type}/dataPoints`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!response.ok) {
    const detail = await response.text()
    throw readApiError(response.status, detail)
  }
  return response.json()
}

export async function uploadSessionToGoogleHealth(accessToken, workout) {
  const token = accessToken || getCachedToken()
  if (!token) throw new Error('not_authenticated')
  const startMs = Number(workout.start) || Date.now() - 3600000
  const endMs = Number(workout.end) || Date.now()
  if (endMs <= startMs) throw new Error('invalid_workout_time')
  const start = new Date(startMs).toISOString()
  const end = new Date(endMs).toISOString()
  const durationSeconds = Math.max(1, Math.round((endMs - startMs) / 1000))
  const exerciseNames = (workout.entries || []).map(entry => entry.name || EXIDX[entry.id]?.n || entry.id).filter(Boolean)
  const displayName = [workout.name || 'Strength workout', ...exerciseNames].join(' · ').slice(0, 120)
  const metricsSummary = {
    caloriesKcal: Number(workout.calories) || estimateCalories(workout)
  }
  const distanceKm = Number(workout.distanceKm)
  if (Number.isFinite(distanceKm) && distanceKm > 0) metricsSummary.distanceMillimeters = distanceKm * 1000000
  return createDataPoint(token, 'exercise', {
    dataSource: { recordingMethod: 'ACTIVELY_MEASURED' },
    exercise: {
      interval: {
        startTime: start,
        startUtcOffset: utcOffsetDuration(startMs),
        endTime: end,
        endUtcOffset: utcOffsetDuration(endMs)
      },
      exerciseType: exerciseType(workout),
      displayName,
      activeDuration: `${durationSeconds}s`,
      metricsSummary
    }
  })
}

function durationMillis(value) {
  const match = String(value || '').match(/^(\d+(?:\.\d+)?)s$/)
  return match ? Number(match[1]) * 1000 : 0
}

function importedExercise(point) {
  const exercise = point.exercise || {}
  const start = Date.parse(exercise.interval?.startTime || '')
  const end = Date.parse(exercise.interval?.endTime || '')
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  const metrics = exercise.metricsSummary || {}
  const activeDuration = durationMillis(exercise.activeDuration)
  return {
    id: `google_health_${point.name || start}`,
    d: new Date(start).toISOString().slice(0, 10),
    start,
    end,
    name: exercise.displayName || exercise.exerciseType?.replaceAll('_', ' ') || 'Google Health workout',
    healthExerciseType: exercise.exerciseType || null,
    calories: Number(metrics.caloriesKcal) || 0,
    distanceKm: Number(metrics.distanceMillimeters) > 0 ? Number(metrics.distanceMillimeters) / 1_000_000 : 0,
    activeDuration: activeDuration || end - start,
    entries: [],
    importedFrom: 'Google Health'
  }
}

/** Read the latest exercise summaries, including device-recorded calories and distance. */
export async function readWorkoutsFromGoogleHealth(accessToken, { pageSize = 25 } = {}) {
  const token = accessToken || getCachedToken()
  if (!token) throw new Error('not_authenticated')
  const params = new URLSearchParams({ pageSize: String(Math.min(25, Math.max(1, pageSize))) })
  const response = await fetch(`${API}/exercise/dataPoints?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!response.ok) {
    throw readApiError(response.status, await response.text())
  }
  const data = await response.json()
  return (data.dataPoints || []).map(importedExercise).filter(Boolean)
}

export async function uploadWeightToGoogleHealth(accessToken, weightKg, timestampMillis = Date.now()) {
  const token = accessToken || getCachedToken()
  const kg = Number(weightKg)
  if (!token) throw new Error('not_authenticated')
  if (!Number.isFinite(kg) || kg <= 0 || kg > 1000) throw new Error('invalid_weight')
  const timestamp = Number(timestampMillis) || Date.now()
  return createDataPoint(token, 'weight', {
    dataSource: { recordingMethod: 'ACTIVELY_MEASURED' },
    weight: {
      sampleTime: { physicalTime: new Date(timestamp).toISOString(), utcOffset: utcOffsetDuration(timestamp) },
      weightGrams: kg * 1000
    }
  })
}

// Upload only; Google Health API is not used here to read or import a user's health history.
export async function syncAllWithGoogleHealth(accessToken, workouts = [], bodyweight = []) {
  const token = accessToken || getCachedToken()
  if (!token) throw new Error('not_authenticated')
  let syncedWorkouts = 0
  let syncedWeights = 0
  const errors = []
  for (const workout of workouts) {
    try {
      await uploadSessionToGoogleHealth(token, workout)
      syncedWorkouts++
    } catch (error) {
      errors.push({ id: workout.id, error: error.message, status: error.status, reason: error.reason })
      if (error.status === 401) break
    }
  }
  for (const entry of bodyweight) {
    try {
      const timestamp = entry.t || (entry.d ? new Date(entry.d).getTime() : Date.now())
      await uploadWeightToGoogleHealth(token, entry.w, timestamp)
      syncedWeights++
    } catch (error) {
      errors.push({ id: entry.id || entry.d, error: error.message, status: error.status, reason: error.reason })
      if (error.status === 401) break
    }
  }
  return {
    ok: errors.length === 0,
    syncedWorkouts,
    syncedWeights,
    lastSync: Date.now(),
    errors
  }
}
