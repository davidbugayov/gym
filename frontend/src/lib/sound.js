// WebAudio beeps + subtle chimes + haptics. `enabled` gates sound.
import { useStore } from '../store/useStore.js'
let audioCtx = null

export function getAudioContext() {
  try {
    if (!audioCtx && typeof window !== 'undefined') {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) audioCtx = new Ctx()
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }
  } catch (e) { /* */ }
  return audioCtx
}

// User-gesture warmup listener so AudioContext is active and ready when background timers fire
if (typeof window !== 'undefined') {
  const unlock = () => {
    try {
      const ctx = getAudioContext()
      if (ctx && ctx.state === 'running') {
        window.removeEventListener('pointerdown', unlock)
        window.removeEventListener('keydown', unlock)
        window.removeEventListener('touchstart', unlock)
      }
    } catch (e) { /* */ }
  }
  window.addEventListener('pointerdown', unlock, { passive: true })
  window.addEventListener('keydown', unlock, { passive: true })
  window.addEventListener('touchstart', unlock, { passive: true })
}

export function beep(enabled, freq, dur, when) {
  if (!enabled) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = freq || 880; o.type = 'sine'
    const t0 = ctx.currentTime + (when || 0)
    g.gain.setValueAtTime(0.001, t0)
    g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + (dur || 0.18))
    o.start(t0); o.stop(t0 + (dur || 0.18) + 0.05)
  } catch (e) { /* */ }
}

/**
 * Helper to play an acoustic bell / chime note with smooth attack,
 * warm harmonic overtone, and natural exponential decay.
 */
function playChimeNote(ctx, freq, startTime, duration = 0.45, peakGain = 0.14) {
  try {
    const o1 = ctx.createOscillator()
    const g1 = ctx.createGain()
    const o2 = ctx.createOscillator()
    const g2 = ctx.createGain()

    // Gentle low-pass filter to soften any harsh high frequencies
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(3200, startTime)

    // Fundamental tone
    o1.type = 'sine'
    o1.frequency.setValueAtTime(freq, startTime)

    // Subtle 2nd harmonic for bell warmth and presence
    o2.type = 'sine'
    o2.frequency.setValueAtTime(freq * 2, startTime)

    // Fundamental volume envelope: 18ms smooth ramp up, soft decay
    g1.gain.setValueAtTime(0.0001, startTime)
    g1.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.018)
    g1.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

    // Overtone volume envelope: quieter, decays faster for clean acoustic chime feel
    g2.gain.setValueAtTime(0.0001, startTime)
    g2.gain.exponentialRampToValueAtTime(peakGain * 0.22, startTime + 0.012)
    g2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.6)

    o1.connect(g1)
    o2.connect(g2)
    g1.connect(filter)
    g2.connect(filter)
    filter.connect(ctx.destination)

    o1.start(startTime)
    o1.stop(startTime + duration + 0.05)
    o2.start(startTime)
    o2.stop(startTime + duration + 0.05)
  } catch (e) { /* */ }
}

/**
 * Subtle sound alert for when the rest timer reaches zero:
 * Plays a warm, melodic two-tone chime (E5 -> A5) with soft attack and decay.
 */
export function playRestTimerAlert(enabled = true) {
  if (!enabled) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const t0 = ctx.currentTime + 0.02
    // First chime note: E5 (659.25 Hz)
    playChimeNote(ctx, 659.25, t0, 0.38, 0.12)
    // Resolving chime note: A5 (880.00 Hz)
    playChimeNote(ctx, 880.00, t0 + 0.16, 0.55, 0.15)
  } catch (e) { /* */ }
}

/**
 * Subtle soft tick for the final 3-2-1 countdown seconds.
 */
export function playRestTimerTick(enabled = true) {
  if (!enabled) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const t0 = ctx.currentTime
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(587.33, t0) // D5 soft blip
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07)
    o.connect(g)
    g.connect(ctx.destination)
    o.start(t0)
    o.stop(t0 + 0.08)
  } catch (e) { /* */ }
}

export function isHapticsSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

export function isHapticsEnabled() {
  try {
    const s = useStore?.getState?.()?.S
    return s ? s.haptics !== false : true
  } catch (e) {
    return true
  }
}

export function vibrate(p, force = false) {
  if (!force && !isHapticsEnabled()) return false
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      return navigator.vibrate(p)
    }
  } catch (e) { /* ignore */ }
  return false
}

let lastHapticTime = 0

/**
 * Light crisp tap for UI button clicks / touches (12ms)
 */
export function hapticClick() {
  return vibrate(12)
}

/**
 * Very light tick for segment / tab / chip selections (8ms)
 */
export function hapticSelection() {
  return vibrate(8)
}

/**
 * Physical feedback when completing a set, exercise, or entire workout:
 * - 'set': punchy, satisfying double pulse [45, 50, 45]
 * - 'exercise': escalating 3-pulse [50, 60, 50, 60, 90]
 * - 'workout': triumphant celebratory pattern [80, 60, 80, 60, 150, 100, 220]
 */
export function hapticSetComplete(type = 'set') {
  lastHapticTime = Date.now() + 150
  if (type === 'workout') {
    return vibrate([80, 60, 80, 60, 150, 100, 220])
  }
  if (type === 'exercise') {
    return vibrate([50, 60, 50, 60, 90])
  }
  return vibrate([45, 50, 45])
}

/**
 * Countdown tick for final 3, 2, 1 seconds (25ms)
 */
export function hapticTimerTick() {
  return vibrate(25)
}

/**
 * Rest timer milestone feedback:
 * - 'halfway': [35, 60, 35] (rest is 50% elapsed)
 * - 'thirtySeconds': [40, 70, 40] (30s remaining warning)
 * - 'tenSeconds': [50, 60, 60] (10s remaining warning — get ready!)
 * - 'complete': [250, 100, 250, 100, 350] (rest is over)
 * - 'workComplete': [200, 80, 200] (timed work hold finished)
 */
export function hapticTimerMilestone(type) {
  lastHapticTime = Date.now() + 150
  switch (type) {
    case 'halfway':
      return vibrate([35, 60, 35])
    case 'thirtySeconds':
      return vibrate([40, 70, 40])
    case 'tenSeconds':
      return vibrate([50, 60, 60])
    case 'complete':
      return vibrate([250, 100, 250, 100, 350])
    case 'workComplete':
      return vibrate([200, 80, 200])
    default:
      return vibrate(45)
  }
}

/**
 * Global listener that provides tactile haptic feedback when clicking/tapping buttons
 */
export function initGlobalHaptics() {
  if (typeof window === 'undefined') return

  const handlePointerDown = (e) => {
    // Only primary button
    if (e.button !== undefined && e.button !== 0) return
    const now = Date.now()
    if (now < lastHapticTime || now - lastHapticTime < 65) return

    const target = e.target
    if (!target || typeof target.closest !== 'function') return

    // Find any interactive button, clickable control, segmented button, chip, tab, checkbox, etc.
    const clickable = target.closest(
      'button, [role="button"], input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"], .btn, .iconbtn, .chip, .tabbtn, .seg-btn, .setgo, a.btn, .stepper-btn, .stp button, .check'
    )
    if (clickable && !clickable.disabled && !clickable.getAttribute('aria-disabled')) {
      lastHapticTime = now
      hapticClick()
    }
  }

  window.addEventListener('pointerdown', handlePointerDown, { passive: true, capture: true })
}

if (typeof window !== 'undefined') {
  initGlobalHaptics()
}


