import { describe, it, expect, beforeEach, vi } from 'vitest'

// Ensure localStorage exists in test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map()
  globalThis.localStorage = {
    getItem: k => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear()
  }
}

import {
  persistActiveSessionNow,
  startPeriodicAutoSave,
  getActiveSessionBackup,
  clearActiveSessionBackup,
  subscribeAutoSave
} from './autosave.js'
import { useStore } from '../store/useStore.js'

describe('autosave engine', () => {
  beforeEach(() => {
    localStorage.clear()
    useStore.setState({
      S: {
        active: null,
        workouts: [],
        routines: [],
        week: {},
        dayPlan: {},
        exWeights: {}
      }
    })
  })

  it('safely handles persistActiveSessionNow when no active workout exists', () => {
    const res = persistActiveSessionNow()
    expect(res).toBe(false)
    expect(getActiveSessionBackup()).toBeNull()
  })

  it('correctly persists active workout to localStorage and meta tags', () => {
    const mockActive = {
      id: 'test-workout-1',
      name: 'Leg Day',
      start: Date.now() - 60000,
      cur: 0,
      entries: [
        { id: '0001', sets: [{ w: 100, r: 5, done: true }] }
      ]
    }

    useStore.setState({
      S: {
        ...useStore.getState().S,
        active: mockActive
      }
    })

    const res = persistActiveSessionNow()
    expect(res).toBe(true)

    const backup = getActiveSessionBackup()
    expect(backup).not.toBeNull()
    expect(backup.active.name).toBe('Leg Day')
    expect(backup.active.entries[0].sets[0].w).toBe(100)

    // Check meta key
    const metaRaw = localStorage.getItem('gym_active_session_meta_v1')
    expect(metaRaw).not.toBeNull()
    const meta = JSON.parse(metaRaw)
    expect(meta.name).toBe('Leg Day')
    expect(meta.completedSets).toBe(1)
  })

  it('notifies subscribers of save status updates', () => {
    const statuses = []
    const unsub = subscribeAutoSave(s => statuses.push(s))

    useStore.setState({
      S: {
        ...useStore.getState().S,
        active: { id: 'w1', name: 'Upper', start: Date.now(), cur: 0, entries: [] }
      }
    })

    persistActiveSessionNow()
    expect(statuses.length).toBeGreaterThanOrEqual(1)
    expect(statuses[statuses.length - 1].status).toBe('saved')

    unsub()
  })

  it('clears active session backup correctly', () => {
    useStore.setState({
      S: {
        ...useStore.getState().S,
        active: { id: 'w1', name: 'Upper', start: Date.now(), cur: 0, entries: [] }
      }
    })
    persistActiveSessionNow()
    expect(getActiveSessionBackup()).not.toBeNull()

    clearActiveSessionBackup()
    expect(getActiveSessionBackup()).toBeNull()
    expect(localStorage.getItem('gym_active_session_meta_v1')).toBeNull()
  })

  it('starts and stops periodic auto-save loop without errors', () => {
    vi.useFakeTimers()
    const stop = startPeriodicAutoSave(1000)

    useStore.setState({
      S: {
        ...useStore.getState().S,
        active: { id: 'w1', name: 'Upper', start: Date.now(), cur: 0, entries: [] }
      }
    })

    vi.advanceTimersByTime(2500)
    expect(getActiveSessionBackup()).not.toBeNull()

    stop()
    vi.useRealTimers()
  })
})
