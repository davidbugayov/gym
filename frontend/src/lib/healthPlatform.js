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
