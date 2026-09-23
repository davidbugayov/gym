// Periodic auto-save engine for active workout sessions.
// Preserves the state of S.active in local storage to prevent data loss
// if the browser crashes, tab is closed, or device goes to sleep.

import { useStore } from '../store/useStore.js'
import { notifySaving, notifySaved, notifySyncError } from './syncStatus.js'

export const AUTOSAVE_KEY = 'gym_active_session_backup_v1'
export const AUTOSAVE_META_KEY = 'gym_active_session_meta_v1'
export const AUTOSAVE_INTERVAL_MS = 3000 // auto-save every 3 seconds

let autoSaveTimer = null
let listenersRegistered = false
const subscribers = new Set()
let lastSavedSignature = ''

/**
 * Notify subscribers of auto-save events (e.g. { status: 'saved', lastSaved: Date.now() })
 */
function notifySubscribers(event) {
  subscribers.forEach(cb => {
    try { cb(event) } catch (e) { /* ignore */ }
  })
}

export function subscribeAutoSave(callback) {
  subscribers.add(callback)
  return () => subscribers.delete(callback)
}

/**
 * Synchronously persist the current active workout session to local storage.
 */
export function persistActiveSessionNow(explicit = false) {
  try {
    const S = useStore.getState().S
    const active = S?.active
    if (!active) {
      lastSavedSignature = ''
      return false
    }

    const payload = {
      active,
      savedAt: Date.now(),
      version: 1
    }

    const completedSets = active.entries ? active.entries.reduce((acc, e) => acc + (e.sets ? e.sets.filter(s => s.done).length : 0), 0) : 0

    // Construct lightweight change signature to avoid unnecessary continuous visual flashing
    const signature = (active.name || '') + '|' + (active.cur || 0) + '|' + (active.entries ? active.entries.map(e =>
      (e.id || '') + ':' + (e.activeSetIdx !== undefined ? e.activeSetIdx : '') + ':' + (e.sets || []).map(s => (s.done ? '1' : '0') + '-' + (s.r || 0) + '-' + (s.w || 0) + '-' + (s.sec || 0)).join(',')
    ).join(';') : '')

    const hasChanged = explicit || signature !== lastSavedSignature

    if (hasChanged) {
      notifySaving('Auto-saving…')
    }

    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload))
    localStorage.setItem(AUTOSAVE_META_KEY, JSON.stringify({
      savedAt: payload.savedAt,
      name: active.name,
      entriesCount: active.entries?.length || 0,
      completedSets
    }))

    // Also guarantee the main store in localStorage has latest state snapshot
    localStorage.setItem('gym_state_v1', JSON.stringify(S))

    if (hasChanged) {
      lastSavedSignature = signature
      notifySaved('Auto-saved')
    }

    notifySubscribers({ status: 'saved', lastSaved: payload.savedAt })
    return true
  } catch (err) {
    console.error('Failed to auto-save active workout session:', err)
    notifySyncError('Save error')
    notifySubscribers({ status: 'error', error: err })
    return false
  }
}

/**
 * Remove active session backup from local storage (when workout finishes or is discarded).
 */
export function clearActiveSessionBackup() {
  lastSavedSignature = ''
  try {
    localStorage.removeItem(AUTOSAVE_KEY)
    localStorage.removeItem(AUTOSAVE_META_KEY)
    notifySubscribers({ status: 'cleared', lastSaved: null })
  } catch (err) {
    /* ignore */
  }
}

/**
 * Check if a valid uncompleted backup session exists in local storage.
 */
export function getSavedActiveSessionBackup() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.active || !parsed.active.entries) return null

    // If backup is older than 48 hours, consider it expired
    const maxAge = 48 * 60 * 60 * 1000
    if (Date.now() - (parsed.savedAt || 0) > maxAge) {
      return null
    }

    return parsed
  } catch (err) {
    return null
  }
}

export const getActiveSessionBackup = getSavedActiveSessionBackup

/**
 * Start the periodic auto-save loop.
 */
export function startPeriodicAutoSave(intervalMs = AUTOSAVE_INTERVAL_MS) {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer)
  }

  // Register window lifecycle flush handlers once
  if (!listenersRegistered && typeof window !== 'undefined') {
    const handleFlush = () => {
      persistActiveSessionNow()
    }

    window.addEventListener('beforeunload', handleFlush)
    window.addEventListener('pagehide', handleFlush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        handleFlush()
      }
    })
    listenersRegistered = true
  }

  // Run immediate save
  persistActiveSessionNow()

  // Run periodic interval
  autoSaveTimer = setInterval(() => {
    const active = useStore.getState().S?.active
    if (active) {
      persistActiveSessionNow()
    } else {
      stopPeriodicAutoSave()
    }
  }, intervalMs)

  return () => stopPeriodicAutoSave()
}

/**
 * Stop the periodic auto-save loop.
 */
export function stopPeriodicAutoSave() {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer)
    autoSaveTimer = null
  }
}
