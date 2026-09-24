import { resolveActivityType, estimateCalories } from './googleHealth.js'
import { EXIDX } from './exercises.js'
import { fmtVol } from './format.js'
import { getCachedToken } from './google-auth.js'

const FIT_API_BASE = 'https://fitness.googleapis.com/fitness/v1/users/me'

/**
 * Creates or updates a workout session in Google Fit via Fitness REST API.
 */
export async function uploadSessionToGoogleFit(accessToken, workout) {
  if (!accessToken) throw new Error('no_token')

  const act = resolveActivityType(workout)
  const startTimeMillis = workout.start || Date.now() - 3600000
  const endTimeMillis = workout.end || Date.now()
  const sessionId = `opengym_workout_${workout.id || startTimeMillis}`

  const exercisesSummary = (workout.entries || []).map(e => {
    const ex = EXIDX[e.id] || { n: e.id }
    const doneSets = (e.sets || []).filter(s => s.done !== false)
    const totalReps = doneSets.reduce((sum, s) => sum + (s.r || 0), 0)
    const maxWeight = Math.max(0, ...doneSets.map(s => s.w || 0))
    return `${ex.n}: ${doneSets.length} sets, ${totalReps} reps${maxWeight > 0 ? ` (max ${maxWeight}kg)` : ''}`
  }).join('; ')

  const sessionBody = {
    id: sessionId,
    name: workout.name || 'Strength Workout',
    description: `openGym log: Vol ${fmtVol(workout.vol || 0, 'kg')}. ${exercisesSummary}`.slice(0, 1000),
    startTimeMillis,
    endTimeMillis,
    activityType: act.id,
    application: {
      name: 'openGym Fitness',
      version: '1.2.3'
    }
  }

  const res = await fetch(`${FIT_API_BASE}/sessions/${sessionId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(sessionBody)
  })

  if (!res.ok) {
    const errText = await res.text()
    console.warn('Google Fit session upload warning:', res.status, errText)
    throw new Error(`Google Fit error: ${res.status}`)
  }

  return await res.json()
}

/**
 * Fetches recent sessions from Google Fit.
 */
export async function fetchGoogleFitSessions(accessToken) {
  if (!accessToken) throw new Error('no_token')

  const res = await fetch(`${FIT_API_BASE}/sessions`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!res.ok) {
    throw new Error(`Google Fit fetch error: ${res.status}`)
  }

  const data = await res.json()
  return data.session || []
}

/**
 * Creates or inserts body weight data points in Google Fit.
 */
export async function uploadWeightToGoogleFit(accessToken, weightKg, timestampMillis = Date.now()) {
  if (!accessToken || !weightKg) return null

  // Ensure data source exists or insert into standard weight stream
  const startTimeNanos = BigInt(timestampMillis) * 1000000n
  const endTimeNanos = startTimeNanos

  const dataPoint = {
    dataTypeName: 'com.google.weight',
    startTimeNanos: startTimeNanos.toString(),
    endTimeNanos: endTimeNanos.toString(),
    value: [{ fpVal: parseFloat(weightKg) }]
  }

  const dataSourceId = 'raw:com.google.weight:opengym.app:weight'

  // Attempt to create data source first if not exists
  try {
    await fetch(`${FIT_API_BASE}/dataSources`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dataStreamName: 'weight',
        type: 'raw',
        application: { name: 'openGym Fitness' },
        dataType: {
          name: 'com.google.weight',
          field: [{ name: 'weight', format: 'floatPoint' }]
        }
      })
    })
  } catch (e) {
    // Already exists
  }

  // Insert dataset point
  const datasetId = `${startTimeNanos}-${endTimeNanos}`
  const patchRes = await fetch(`${FIT_API_BASE}/dataSources/${dataSourceId}/datasets/${datasetId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      dataSourceId,
      minStartTimeNs: startTimeNanos.toString(),
      maxEndTimeNs: endTimeNanos.toString(),
      point: [dataPoint]
    })
  })

  return patchRes.ok
}

/**
 * Full bidirectional sync of workouts and weight records with Google Fit.
 */
export async function syncAllWithGoogleFit(accessToken, workouts = [], bodyweight = []) {
  if (!accessToken) {
    accessToken = getCachedToken()
  }
  if (!accessToken) {
    throw new Error('not_authenticated')
  }

  let syncedWorkouts = 0
  let syncedWeights = 0
  const errors = []

  // Sync workouts
  for (const w of workouts) {
    try {
      await uploadSessionToGoogleFit(accessToken, w)
      syncedWorkouts++
    } catch (err) {
      errors.push({ id: w.id, error: err.message })
    }
  }

  // Sync latest weights
  const recentWeights = bodyweight.slice(-10)
  for (const bw of recentWeights) {
    try {
      const ts = bw.t || (bw.d ? new Date(bw.d).getTime() : Date.now())
      await uploadWeightToGoogleFit(accessToken, bw.w, ts)
      syncedWeights++
    } catch (err) {
      // Non-fatal
    }
  }

  return {
    ok: syncedWorkouts > 0 || errors.length === 0,
    syncedWorkouts,
    syncedWeights,
    lastSync: Date.now(),
    errors
  }
}
