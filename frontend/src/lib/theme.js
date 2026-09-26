/**
 * Theme Management Module
 * Automatically resolves and switches between light and dark modes
 * based on device system time, sunrise/sunset schedule, or OS system settings.
 */

export const DEF_THEME_CONFIG = {
  mode: 'auto', // 'auto' (sunset to sunrise) | 'system' (OS prefers-color-scheme) | 'dark' | 'light'
  sunrise: '07:00',
  sunset: '20:00',
  lat: null,
  lon: null
}

/**
 * Converts 'HH:MM' string to minutes from midnight
 */
export function timeStrToMinutes(str) {
  if (!str || typeof str !== 'string') return 420
  const parts = str.split(':')
  if (parts.length < 2) return 420
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m)) return 420
  return Math.min(1439, Math.max(0, h * 60 + m))
}

/**
 * Converts minutes from midnight to 'HH:MM' string
 */
export function minutesToTimeStr(mins) {
  const norm = ((Math.round(mins) % 1440) + 1440) % 1440
  const h = Math.floor(norm / 60)
  const m = norm % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Calculates approximate solar sunrise & sunset times for a given date and coordinates.
 * Uses NOAA solar position algorithm.
 */
export function calcSolarTimes(date = new Date(), lat = 52.0, lon = 0.0) {
  try {
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24))
    const gamma = (2 * Math.PI / 365) * (dayOfYear - 1)
    
    // Solar declination
    const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
      - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    
    // Equation of time in minutes
    const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
      - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma))
    
    const latRad = (lat * Math.PI) / 180
    // Standard zenith for sunrise/sunset (90° 50' accounting for atmospheric refraction)
    const zenith = (90.833 * Math.PI) / 180
    
    const cosH = (Math.cos(zenith) - Math.sin(latRad) * Math.sin(decl)) / (Math.cos(latRad) * Math.cos(decl))
    
    // Check for polar day or polar night
    if (cosH > 1) {
      // Polar night — sun never rises
      return { sunrise: '12:00', sunset: '12:00', polar: 'night' }
    }
    if (cosH < -1) {
      // Polar day — sun never sets
      return { sunrise: '00:00', sunset: '23:59', polar: 'day' }
    }
    
    const haHours = (Math.acos(cosH) * 180 / Math.PI) / 15
    const tzOffsetHours = -date.getTimezoneOffset() / 60
    const solarNoonMins = 720 - 4 * lon - eqtime + tzOffsetHours * 60
    
    const sunriseMins = Math.round(solarNoonMins - haHours * 60)
    const sunsetMins = Math.round(solarNoonMins + haHours * 60)
    
    return {
      sunrise: minutesToTimeStr(sunriseMins),
      sunset: minutesToTimeStr(sunsetMins)
    }
  } catch (e) {
    return { sunrise: '07:00', sunset: '20:00' }
  }
}

/**
 * Checks whether it is currently daytime based on sunrise and sunset schedule.
 */
export function isDaytime(sunrise = '07:00', sunset = '20:00', now = new Date()) {
  const currentMins = now.getHours() * 60 + now.getMinutes()
  const riseMins = timeStrToMinutes(sunrise)
  const setMins = timeStrToMinutes(sunset)

  if (riseMins <= setMins) {
    return currentMins >= riseMins && currentMins < setMins
  } else {
    // Schedule spans past midnight
    return currentMins >= riseMins || currentMins < setMins
  }
}

/**
 * Resolves the effective active theme ('light' or 'dark').
 */
export function resolveEffectiveTheme(themeSetting, themeConfig = {}) {
  // If themeSetting is 'light' or 'dark' and themeConfig is not set, honor it
  // Otherwise default to automatic switching
  const mode = themeConfig?.mode || (themeSetting === 'light' || themeSetting === 'dark' || themeSetting === 'system' ? themeSetting : 'auto')

  if (mode === 'light') return 'light'
  if (mode === 'dark') return 'dark'

  if (mode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return isDaytime(themeConfig?.sunrise, themeConfig?.sunset) ? 'light' : 'dark'
  }

  // mode === 'auto' (sunset/sunrise based on device system time)
  const sunrise = themeConfig?.sunrise || '07:00'
  const sunset = themeConfig?.sunset || '20:00'
  return isDaytime(sunrise, sunset) ? 'light' : 'dark'
}

/**
 * Subscribes to time ticks, system theme changes, and window focus/visibility changes.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeThemeChange(callback) {
  if (typeof window === 'undefined') return () => {}

  // 1. OS dark/light mode preference change listener
  let removeMq = () => {}
  try {
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handleMq = () => callback()
      if (mq.addEventListener) {
        mq.addEventListener('change', handleMq)
        removeMq = () => mq.removeEventListener('change', handleMq)
      } else if (mq.addListener) {
        mq.addListener(handleMq)
        removeMq = () => mq.removeListener(handleMq)
      }
    }
  } catch (e) { /* ignore */ }

  // 2. Periodic timer to detect crossing sunrise or sunset time (every 20 seconds)
  const interval = setInterval(callback, 20000)

  // 3. Document visibility & window focus (e.g. unlocking device or resuming tab)
  const handleVisibility = () => {
    if (typeof document !== 'undefined' && !document.hidden) {
      callback()
    }
  }
  document.addEventListener('visibilitychange', handleVisibility)
  window.addEventListener('focus', handleVisibility)

  return () => {
    removeMq()
    clearInterval(interval)
    document.removeEventListener('visibilitychange', handleVisibility)
    window.removeEventListener('focus', handleVisibility)
  }
}
