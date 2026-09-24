import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./google-auth.js', () => ({ getCachedToken: () => null }))

import { readWorkoutsFromGoogleHealth, syncAllWithGoogleHealth } from './google-fit-api.js'

describe('Google Health API writes', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('writes an exercise session and a body-weight measurement to the v4 API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ done: true }) })
    vi.stubGlobal('fetch', fetchMock)
    const start = Date.parse('2026-09-24T10:00:00Z')
    const result = await syncAllWithGoogleHealth('test-token', [
      { id: 'workout-1', name: 'Strength', start, end: start + 3600000, calories: 250, distanceKm: 5, entries: [{ id: '9001' }] }
    ], [{ id: 'weight-1', w: 72.5, t: start }])

    expect(result).toMatchObject({ ok: true, syncedWorkouts: 1, syncedWeights: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls.every(([, options]) => options.method === 'POST')).toBe(true)
    expect(fetchMock.mock.calls[0][0]).toBe('https://health.googleapis.com/v4/users/me/dataTypes/exercise/dataPoints')
    const exercise = JSON.parse(fetchMock.mock.calls[0][1].body).exercise
    expect(exercise.exerciseType).toBe('STRENGTH_TRAINING')
    expect(exercise.interval.startTime).toBe(new Date(start).toISOString())
    expect(exercise.metricsSummary.caloriesKcal).toBe(250)
    expect(exercise.metricsSummary.distanceMillimeters).toBe(5000000)
    expect(exercise.displayName).toContain('barbell hip thrust')

    expect(fetchMock.mock.calls[1][0]).toBe('https://health.googleapis.com/v4/users/me/dataTypes/weight/dataPoints')
    const weight = JSON.parse(fetchMock.mock.calls[1][1].body).weight
    expect(weight.weightGrams).toBe(72500)
    expect(weight.sampleTime.physicalTime).toBe(new Date(start).toISOString())
    expect(weight.sampleTime.utcOffset).toMatch(/^-?\d+s$/)
  })

  it('imports Google Health session summaries with device calories and distance', async () => {
    const start = Date.parse('2026-09-24T10:00:00Z')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ dataPoints: [{
        name: 'users/me/dataTypes/exercise/dataPoints/run-1',
        exercise: {
          interval: { startTime: new Date(start).toISOString(), endTime: new Date(start + 1800000).toISOString() },
          exerciseType: 'RUNNING',
          displayName: 'Morning run',
          activeDuration: '1500s',
          metricsSummary: { caloriesKcal: 380, distanceMillimeters: 5000000 }
        }
      }] })
    })
    vi.stubGlobal('fetch', fetchMock)

    const workouts = await readWorkoutsFromGoogleHealth('test-token')
    expect(fetchMock.mock.calls[0][0]).toContain('/exercise/dataPoints?pageSize=25')
    expect(fetchMock.mock.calls[0][1].method).toBeUndefined()
    expect(workouts).toHaveLength(1)
    expect(workouts[0]).toMatchObject({
      d: '2026-09-24', name: 'Morning run', healthExerciseType: 'RUNNING',
      calories: 380, distanceKm: 5, activeDuration: 1500000, importedFrom: 'Google Health'
    })
  })

  it('reports API authorization failures instead of claiming success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => 'forbidden' }))
    const result = await syncAllWithGoogleHealth('test-token', [
      { id: 'workout-1', start: 1000, end: 2000 }
    ], [])
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatchObject({ id: 'workout-1', status: 403 })
  })

  it('preserves the Google Health denial reason so the app can show the right fix', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => JSON.stringify({
        error: {
          code: 403,
          status: 'PERMISSION_DENIED',
          details: [{ reason: 'API_PRIVATE_PREVIEW_ACCESS_DENIED' }]
        }
      })
    }))
    const result = await syncAllWithGoogleHealth('test-token', [
      { id: 'workout-1', start: 1000, end: 2000 }
    ], [])

    expect(result.errors[0]).toMatchObject({ status: 403, reason: 'API_PRIVATE_PREVIEW_ACCESS_DENIED' })
  })
})
