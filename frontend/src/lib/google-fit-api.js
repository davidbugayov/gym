import { estimateCalories } from './googleHealth.js'
import { getCachedToken } from './google-auth.js'

const API = 'https://health.googleapis.com/v4/users/me/dataTypes'

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
    const error = new Error(`Google Health API ${response.status}`)
    error.status = response.status
    error.detail = detail
    throw error
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
      displayName: String(workout.name || 'Strength workout').slice(0, 120),
      activeDuration: `${durationSeconds}s`,
      metricsSummary: {
        caloriesKcal: Number(workout.calories) || estimateCalories(workout)
      }
    }
  })
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
      errors.push({ id: workout.id, error: error.message, status: error.status })
      if (error.status === 401) break
    }
  }
  for (const entry of bodyweight) {
    try {
      const timestamp = entry.t || (entry.d ? new Date(entry.d).getTime() : Date.now())
      await uploadWeightToGoogleHealth(token, entry.w, timestamp)
      syncedWeights++
    } catch (error) {
      errors.push({ id: entry.id || entry.d, error: error.message, status: error.status })
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

async function readDataPoints(token, type, start, end) {
  const url = `${API}/${type}/dataPoints?startTime=${new Date(start).toISOString()}&endTime=${new Date(end).toISOString()}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) return [];
  const data = await response.json();
  return data.dataPoints || [];
}

export async function getRecentWeightFromGoogleHealth(accessToken) {
  const token = accessToken || getCachedToken();
  if (!token) return null;
  const endDate = Date.now();
  const startDate = endDate - 30 * 24 * 60 * 60 * 1000; // 30 days
  try {
    const points = await readDataPoints(token, 'weight', startDate, endDate);
    if (points && points.length > 0) {
      // Assuming dataPoints are sorted or we just take the last one
      const lastPoint = points[points.length - 1];
      if (lastPoint.weight && lastPoint.weight.weightGrams) {
        return lastPoint.weight.weightGrams / 1000; // convert to kg
      }
    }
  } catch (err) {
    console.error('Failed to read weight from Google Health API:', err);
  }
  return null;
}

export async function getRecentActivityFromGoogleHealth(accessToken) {
  const token = accessToken || getCachedToken();
  if (!token) return null;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0); // Start of today

  try {
    const [stepsData, caloriesData] = await Promise.all([
      readDataPoints(token, 'steps', startDate.getTime(), endDate.getTime()).catch(() => []),
      readDataPoints(token, 'calories', startDate.getTime(), endDate.getTime()).catch(() => [])
    ]);

    const steps = stepsData.reduce((sum, pt) => sum + (pt.steps || 0), 0);
    const calories = caloriesData.reduce((sum, pt) => sum + (pt.calories || 0), 0);

    return { steps, calories };
  } catch (err) {
    console.error('Failed to read activity from Google Health API:', err);
    return null;
  }
}
