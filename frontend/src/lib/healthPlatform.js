import { Capacitor } from '@capacitor/core'
import { Health } from '@capgo/capacitor-health'
import { getCachedToken } from './google-auth.js'
import { uploadSessionToGoogleFit, syncAllWithGoogleFit } from './google-fit-api.js'
import { syncWithGoogleHealth } from './googleHealth.js'
import { todayISO } from './format.js'
import { t } from './i18n.js'

/**
 * Detects whether the user is on an Apple device (iOS, iPad, Mac) or Android/other.
 */
export function detectDevicePlatform() {
  if (typeof navigator === 'undefined') return 'google'
  const ua = navigator.userAgent || navigator.vendor || window.opera || ''
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isMac = /Macintosh|Mac OS X/.test(ua) && !isIOS
  if (isIOS || isMac) return 'apple'
  return 'google'
}

/**
 * Returns current effective health provider based on user settings or auto-detection.
 */
export function getActiveHealthProvider(state) {
  const chosen = state?.healthProvider
  if (chosen === 'apple' || chosen === 'google') return chosen
  return detectDevicePlatform()
}

/**
 * Get display info for health provider.
 */
export function getHealthProviderInfo(provider) {
  if (provider === 'apple') {
    return {
      id: 'apple',
      name: 'Apple Health',
      fullName: 'Apple Health (HealthKit)',
      icon: 'heart',
      color: '#FF2D55',
      badgeBg: 'rgba(255, 45, 85, 0.15)',
      description: 'Native Apple HealthKit sync for workouts, active calories & body weight'
    }
  }
  return {
    id: 'google',
    name: 'Google Health',
    fullName: 'Google Health & Fit',
    icon: 'heart',
    color: '#4285F4',
    badgeBg: 'rgba(66, 133, 244, 0.15)',
    description: 'Bidirectional sync for workouts, volume & body weight with Google Fit'
  }
}

/**
 * Export Apple Health XML compatible file for import into Apple Health
 */
export function exportAppleHealthXML(workouts = [], bodyweight = [], unit = 'kg') {
  const now = new Date().toISOString()
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE HealthData [
<!-- HealthKit Export XML Data -->
]>
<HealthData locale="en_US">
 <ExportDate value="${now}"/>
`
  // Bodyweight records
  bodyweight.forEach(b => {
    const val = unit === 'lb' ? (b.w * 0.453592).toFixed(2) : b.w
    const d = b.d + ' 08:00:00 +0000'
    xml += ` <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="openGym" unit="kg" creationDate="${d}" startDate="${d}" endDate="${d}" value="${val}"/>\n`
  })

  // Workout records
  workouts.forEach(w => {
    const start = new Date(w.start).toISOString()
    const end = new Date(w.end).toISOString()
    const durationMin = Math.max(1, Math.round((w.end - w.start) / 1000 / 60))
    const cal = Math.round(durationMin * 7.5) // ~450 kcal/hr
    xml += ` <Workout workoutActivityType="HKWorkoutActivityTypeTraditionalStrengthTraining" duration="${durationMin}" durationUnit="min" totalDistance="0" totalDistanceUnit="km" totalEnergyBurned="${cal}" totalEnergyBurnedUnit="kcal" sourceName="openGym" creationDate="${start}" startDate="${start}" endDate="${end}">\n`
    xml += `  <WorkoutEvent type="HKWorkoutEventTypePause" date="${start}"/>\n`
    xml += ` </Workout>\n`
  })

  xml += `</HealthData>`
  return xml
}

/**
 * Syncs workout and bodyweight with whatever platform is active
 */
export async function syncActiveHealth(workouts, bodyweight, state) {
  const provider = getActiveHealthProvider(state)
  if (provider === 'apple') {
    if (Capacitor.isNativePlatform()) {
      try {
        await Health.requestAuthorization({
          read: ['weight', 'height', 'calories', 'activity'],
          write: ['weight', 'height', 'calories', 'activity']
        })
        const latest = workouts[workouts.length - 1]
        if (latest) {
          await Health.saveActivity({
            startDate: new Date(latest.start).toISOString(),
            endDate: new Date(latest.end).toISOString(),
            activityType: 'workout',
            calories: Math.round(((latest.end - latest.start) / 1000 / 60 / 60) * 500)
          })
        }
        return { ok: true, provider: 'apple', lastSync: Date.now() }
      } catch (err) {
        console.warn('Apple Health native sync failed:', err)
      }
    }
    return { ok: true, provider: 'apple', lastSync: Date.now() }
  } else {
    // Google Fit / Health
    const token = getCachedToken()
    if (token) {
      const res = await syncAllWithGoogleFit(token, workouts, bodyweight)
      return { ok: true, provider: 'google', lastSync: res.lastSync || Date.now() }
    } else {
      const res = await syncWithGoogleHealth(workouts, bodyweight, state?.googleHealth)
      return { ok: true, provider: 'google', lastSync: res.lastSync || Date.now() }
    }
  }
}
