import { Capacitor } from '@capacitor/core'
import { getCachedToken } from './google-auth.js'
import { syncAllWithGoogleHealth } from './google-fit-api.js'
import { logBodyWeightToHealth, logWorkoutToHealth } from './health.js'

export const weightSyncKey = (entry, unit = 'kg') => `weight:${entry.id || entry.d}:${entry.t || ''}:${Number(entry.w)}:${unit}`
export const workoutSyncKey = workout => `workout:${workout.id}`

// A single queue prevents manual sync and workout completion from sending the same record together.
let queue = Promise.resolve()
export function syncHealthRecords(getState, update, { automatic = false } = {}) {
  const job = queue.then(async () => {
    const state = getState()
    const gh = state.googleHealth || {}
    if (!gh.connected || (automatic && gh.autoSync === false)) return { ok: true, skipped: true, syncedWorkouts: 0, syncedWeights: 0 }
    const native = Capacitor.isNativePlatform() && gh.provider !== 'google-health-api'
    if (!native && gh.provider !== 'google-health-api') return { ok: false, errors: [{ error: 'not_connected' }], syncedWorkouts: 0, syncedWeights: 0 }
    const ledger = { ...(gh.sentRecords || {}) }
    // Existing installations keep their previous checkpoint; new records use individual receipts.
    const baseline = gh.syncBaseline ?? (gh.ledgerVersion === 1 ? 0 : gh.lastSync || 0)
    const pending = (key, timestamp) => !ledger[key] && timestamp > baseline
    const workouts = gh.syncWorkouts === false ? [] : (state.workouts || []).filter(w => !w.importedFrom && pending(workoutSyncKey(w), w.end))
    const weights = gh.syncBodyWeight === false ? [] : (state.bodyweight || []).filter(w => !w.importedFrom && pending(weightSyncKey(w, state.unit), w.t || new Date(`${w.d}T12:00:00`).getTime()))
    const record = (key, receipt) => {
      ledger[key] = receipt || true
      update(s => {
        if (!s.googleHealth?.connected || s.googleHealth.provider !== gh.provider || s.googleHealth.email !== gh.email) return
        s.googleHealth.sentRecords = { ...(s.googleHealth.sentRecords || {}), [key]: receipt || true }
      })
    }
    let result
    if (native) {
      result = { ok: true, syncedWorkouts: 0, syncedWeights: 0, errors: [] }
      for (const workout of workouts) {
        const key = workoutSyncKey(workout)
        const success = await logWorkoutToHealth(workout, { savedParts: ledger, onPart: record })
        if (success) { record(key, true); result.syncedWorkouts++ }
        else result.errors.push({ id: workout.id, error: 'health_permission_or_write_failed' })
      }
      for (const entry of weights) {
        if (await logBodyWeightToHealth(entry, state.unit)) { record(weightSyncKey(entry, state.unit), true); result.syncedWeights++ }
        else result.errors.push({ id: entry.d, error: 'health_permission_or_write_failed' })
      }
      result.ok = !result.errors.length
    } else {
      result = await syncAllWithGoogleHealth(getCachedToken(), workouts, weights, { unit: state.unit, onRecord: record })
    }
    const unresolved = Object.values(ledger).some(value => value?.pendingOperation)
    if (unresolved) { result.ok = false; result.errors = [...(result.errors || []), { error: 'google_health_operation_pending' }] }
    update(s => {
      if (!s.googleHealth?.connected || s.googleHealth.provider !== gh.provider || s.googleHealth.email !== gh.email) return
      if (result.ok) { s.googleHealth.lastSync = Date.now(); s.googleHealth.syncBaseline = baseline; s.googleHealth.ledgerVersion = 1; s.googleHealth.syncError = null }
      else s.googleHealth.syncError = result.errors?.[0]?.error || 'partial_sync'
      if (result.errors?.some(e => e.status === 401 || e.reason === 'MISSING_OAUTH_SCOPE')) s.googleHealth.authorizationRequired = true
    })
    return result
  })
  queue = job.catch(() => {})
  return job
}
