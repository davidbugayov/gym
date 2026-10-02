import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ native: false, upload: vi.fn(), workout: vi.fn(), weight: vi.fn() }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => mocks.native } }))
vi.mock('./google-auth.js', () => ({ getCachedToken: () => 'test-token' }))
vi.mock('./google-fit-api.js', () => ({ syncAllWithGoogleHealth: mocks.upload }))
vi.mock('./health.js', () => ({ logWorkoutToHealth: mocks.workout, logBodyWeightToHealth: mocks.weight }))
import { syncHealthRecords } from './health-sync.js'
const fixture = provider => ({ unit: 'lb', googleHealth: { connected: true, provider, email: '', ledgerVersion: 1 }, workouts: [{ id: 'one', start: 1000, end: 2000 }], bodyweight: [{ d: '2026-10-02', w: 165, t: 2000 }] })

describe('health sync consent, retries and queue', () => {
  beforeEach(() => { mocks.native = false; vi.clearAllMocks() })
  it('does not send disconnected or disabled automatic data', async () => {
    const state = fixture('google-health-api')
    state.googleHealth.connected = false
    await syncHealthRecords(() => state, fn => fn(state), { automatic: true })
    state.googleHealth.connected = true
    state.googleHealth.autoSync = false
    await syncHealthRecords(() => state, fn => fn(state), { automatic: true })
    expect(mocks.upload).not.toHaveBeenCalled()
  })
  it('retries failed records while preserving successful receipts', async () => {
    const state = fixture('google-health-api')
    mocks.upload.mockImplementationOnce(async (_, workouts, weights, options) => {
      options.onRecord('workout:one', 'remote-one')
      return { ok: false, errors: [{ error: 'network' }], syncedWorkouts: 1, syncedWeights: 0 }
    }).mockResolvedValueOnce({ ok: true, errors: [], syncedWorkouts: 0, syncedWeights: 1 })
    await syncHealthRecords(() => state, fn => fn(state))
    expect(state.googleHealth.lastSync).toBeUndefined()
    await syncHealthRecords(() => state, fn => fn(state))
    expect(mocks.upload.mock.calls[1][1]).toEqual([])
    expect(mocks.upload.mock.calls[1][2]).toHaveLength(1)
    expect(mocks.upload.mock.calls[1][3].unit).toBe('lb')
  })
  it('serializes simultaneous sync requests and respects record toggles', async () => {
    const state = fixture('google-health-api')
    state.googleHealth.syncBodyWeight = false
    mocks.upload.mockImplementation(async (_, workouts, weights, options) => {
      workouts.forEach(w => options.onRecord(`workout:${w.id}`, true))
      return { ok: true, errors: [], syncedWorkouts: workouts.length, syncedWeights: weights.length }
    })
    await Promise.all([syncHealthRecords(() => state, fn => fn(state)), syncHealthRecords(() => state, fn => fn(state))])
    expect(mocks.upload.mock.calls[0][2]).toEqual([])
    expect(mocks.upload.mock.calls[1][1]).toEqual([])
  })
  it('keeps old successful checkpoints when migrating to receipts', async () => {
    const state = fixture('google-health-api')
    delete state.googleHealth.ledgerVersion
    state.googleHealth.lastSync = 3000
    mocks.upload.mockResolvedValue({ ok: true, errors: [], syncedWorkouts: 0, syncedWeights: 0 })
    await syncHealthRecords(() => state, fn => fn(state))
    await syncHealthRecords(() => state, fn => fn(state))
    expect(mocks.upload.mock.calls.every(call => !call[1].length && !call[2].length)).toBe(true)
  })
  it('native sync respects consent and sends the configured weight unit', async () => {
    mocks.native = true
    const state = fixture('health-connect')
    state.googleHealth.syncWorkouts = false
    mocks.weight.mockResolvedValue(true)
    await syncHealthRecords(() => state, fn => fn(state))
    expect(mocks.workout).not.toHaveBeenCalled()
    expect(mocks.weight).toHaveBeenCalledWith(state.bodyweight[0], 'lb')
    await syncHealthRecords(() => state, fn => fn(state))
    expect(mocks.weight).toHaveBeenCalledTimes(1)
  })
})

it('retains an unresolved remote operation without resending or claiming success', async () => {
  const state = fixture('google-health-api')
  state.googleHealth.sentRecords = { 'workout:one': { pendingOperation: 'operations/one' } }
  state.googleHealth.syncBodyWeight = false
  mocks.native = false
  mocks.upload.mockResolvedValue({ ok: true, errors: [], syncedWorkouts: 0, syncedWeights: 0 })
  const result = await syncHealthRecords(() => state, fn => fn(state))
  expect(result.ok).toBe(false)
  expect(state.googleHealth.lastSync).toBeUndefined()
  expect(mocks.upload.mock.calls.at(-1)[1]).toEqual([])
})
