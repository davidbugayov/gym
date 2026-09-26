import { describe, expect, it } from 'vitest'
import {
  timeStrToMinutes,
  minutesToTimeStr,
  calcSolarTimes,
  isDaytime,
  resolveEffectiveTheme
} from './theme.js'

describe('Theme management and automatic sunset/sunrise switching', () => {
  it('converts time strings to minutes and back accurately', () => {
    expect(timeStrToMinutes('00:00')).toBe(0)
    expect(timeStrToMinutes('07:30')).toBe(450)
    expect(timeStrToMinutes('20:15')).toBe(1215)
    expect(minutesToTimeStr(450)).toBe('07:30')
    expect(minutesToTimeStr(1215)).toBe('20:15')
  })

  it('determines daytime vs nighttime correctly against sunrise and sunset', () => {
    // 07:00 (420m) to 20:00 (1200m)
    const morning = new Date(2026, 8, 25, 10, 30) // 10:30 AM
    const afternoon = new Date(2026, 8, 25, 15, 0) // 3:00 PM
    const nightLate = new Date(2026, 8, 25, 22, 15) // 10:15 PM
    const nightEarly = new Date(2026, 8, 25, 4, 45) // 4:45 AM

    expect(isDaytime('07:00', '20:00', morning)).toBe(true)
    expect(isDaytime('07:00', '20:00', afternoon)).toBe(true)
    expect(isDaytime('07:00', '20:00', nightLate)).toBe(false)
    expect(isDaytime('07:00', '20:00', nightEarly)).toBe(false)
  })

  it('resolves effective theme automatically based on sunrise and sunset', () => {
    const configDay = { mode: 'auto', sunrise: '06:00', sunset: '22:00' }
    const configNight = { mode: 'auto', sunrise: '12:00', sunset: '13:00' } // If current time is not 12-13, it will be dark

    const resolvedLight = resolveEffectiveTheme('auto', { mode: 'auto', sunrise: '00:00', sunset: '23:59' })
    expect(resolvedLight).toBe('light')

    const resolvedDark = resolveEffectiveTheme('auto', { mode: 'auto', sunrise: '23:58', sunset: '23:59' })
    // Unless running at exactly 23:58, this will resolve to dark
    const now = new Date()
    if (now.getHours() !== 23 || now.getMinutes() !== 58) {
      expect(resolvedDark).toBe('dark')
    }
  })

  it('respects manual overrides when specified', () => {
    expect(resolveEffectiveTheme('light', { mode: 'light' })).toBe('light')
    expect(resolveEffectiveTheme('dark', { mode: 'dark' })).toBe('dark')
  })

  it('calculates solar sunrise and sunset times', () => {
    const times = calcSolarTimes(new Date(2026, 5, 21), 45, 0) // Summer solstice
    expect(times).toHaveProperty('sunrise')
    expect(times).toHaveProperty('sunset')
    expect(typeof times.sunrise).toBe('string')
    expect(typeof times.sunset).toBe('string')
  })
})
