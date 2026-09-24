import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./google-auth.js', () => ({ getCachedToken: () => null }))

import { syncAllWithGoogleHealth } from './google-fit-api.js'

describe('Google Health API writes', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('writes an exercise session and a body-weight measurement to the v4 API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ done: true }) })
    vi.stubGlobal('fetch', fetchMock)
    const start = Date.parse('2026-09-24T10:00:00Z')
    const result = await syncAllWithGoogleHealth('test-token', [
      { id: 'workout-1', name: 'Strength', start, end: start + 3600000, calories: 250 }
    ], [{ id: 'weight-1', w: 72.5, t: start }])

    expect(result).toMatchObject({ ok: true, syncedWorkouts: 1, syncedWeights: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe('https://health.googleapis.com/v4/users/me/dataTypes/exercise/dataPoints')
    const exercise = JSON.parse(fetchMock.mock.calls[0][1].body).exercise
    expect(exercise.exerciseType).toBe('STRENGTH_TRAINING')
    expect(exercise.interval.startTime).toBe(new Date(start).toISOString())
    expect(exercise.metricsSummary.caloriesKcal).toBe(250)

    expect(fetchMock.mock.calls[1][0]).toBe('https://health.googleapis.com/v4/users/me/dataTypes/weight/dataPoints')
    const weight = JSON.parse(fetchMock.mock.calls[1][1].body).weight
    expect(weight.weightGrams).toBe(72500)
    expect(weight.sampleTime.physicalTime).toBe(new Date(start).toISOString())
    expect(weight.sampleTime.utcOffset).toMatch(/^-?\d+s$/)
  })

  it('reports API authorization failures instead of claiming success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => 'forbidden' }))
    const result = await syncAllWithGoogleHealth('test-token', [
      { id: 'workout-1', start: 1000, end: 2000 }
    ], [])
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatchObject({ id: 'workout-1', status: 403 })
  })
})
