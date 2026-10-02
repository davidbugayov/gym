import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ save: vi.fn(), check: vi.fn() }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@capgo/capacitor-health', () => ({ Health: { isAvailable: async () => ({ available: true }), checkAuthorization: mocks.check, saveSample: mocks.save } }))
import { logBodyWeightToHealth, logWorkoutToHealth } from './health.js'
describe('native health records', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.save.mockResolvedValue(); mocks.check.mockResolvedValue({ readAuthorized: [], writeAuthorized: ['weight', 'calories', 'distance'] }) })
  it('uses kilograms when the app stores pounds without requiring unrelated read permissions', async () => {
    expect(await logBodyWeightToHealth({ w: 165, t: 2000 }, 'lb')).toBe(true)
    expect(mocks.save.mock.calls[0][0].value).toBeCloseTo(74.84274105)
  })
  it('does not repeat a calorie write when retrying a failed distance write', async () => {
    mocks.save.mockResolvedValueOnce().mockRejectedValueOnce(new Error('distance failed')).mockResolvedValueOnce()
    const savedParts = {}
    const options = { savedParts, onPart: (key, value) => { savedParts[key] = value } }
    const workout = { id: 'one', start: 1000, end: 2000, distanceKm: 1 }
    expect(await logWorkoutToHealth(workout, options)).toBe(false)
    expect(await logWorkoutToHealth(workout, options)).toBe(true)
    expect(mocks.save.mock.calls.filter(([sample]) => sample.dataType === 'calories')).toHaveLength(1)
  })
  it('does not write invalid durations or denied data types', async () => {
    expect(await logWorkoutToHealth({ start: 2000, end: 1000 })).toBe(false)
    mocks.check.mockResolvedValue({ writeAuthorized: [] })
    expect(await logBodyWeightToHealth({ w: 70, t: 2000 })).toBe(false)
    expect(mocks.save).not.toHaveBeenCalled()
  })
})
