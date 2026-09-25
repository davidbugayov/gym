import { describe, expect, it } from 'vitest'
import { getWarmup, getCooldown } from './warmup-cooldown.js'

const config = (overrides = {}) => ({
  warmup: true,
  cooldown: true,
  warmupCfg: { preset: 'standard', custom: false, ids: [] },
  cooldownCfg: { preset: 'standard', custom: false, ids: [] },
  ...overrides
})

describe('workout-specific warm-up and cooldown', () => {
  it('selects mobility and activation for the muscles in a pull workout', () => {
    const routine = { ex: [{ id: '1429' }, { id: '0031' }] }
    const ids = getWarmup(config(), routine).map(entry => entry.id)
    expect(ids.some(id => ['3224', '0630', '3223', '3220', '3222', '3219', '3221', '3655', '3636', '3656'].includes(id))).toBe(true)
    expect(ids).toContain('3360')
    expect(ids).not.toEqual(['3224', '0630', '1471', '1685', '3561', '1368'])
  })

  it('uses leg stretches after a lower-body session', () => {
    const routine = { ex: [{ id: '0043' }, { id: '0085' }] }
    const ids = getCooldown(config(), routine).map(entry => entry.id)
    expect(ids).toContain('1511')
    expect(ids).not.toContain('1271')
  })

  it('respects a custom selection and disabled phases', () => {
    const state = config({
      warmupCfg: { custom: true, ids: ['1428'] },
      cooldown: false
    })
    expect(getWarmup(state, { ex: [{ id: '0043' }] }).map(entry => entry.id)).toEqual(['1428'])
    expect(getCooldown(state, { ex: [{ id: '0043' }] })).toEqual([])
  })
})
