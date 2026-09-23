import { create } from 'zustand'

let dismissTimer = null

export const useSyncStatus = create((set, get) => ({
  status: 'idle', // 'idle' | 'saving' | 'syncing' | 'saved' | 'synced' | 'error'
  label: '',
  lastSaved: null,

  startSaving(label = 'Auto-saving…') {
    if (dismissTimer) clearTimeout(dismissTimer)
    set({ status: 'saving', label })
  },

  finishSaving(label = 'Auto-saved', delay = 1400) {
    if (dismissTimer) clearTimeout(dismissTimer)
    set({ status: 'saved', label, lastSaved: Date.now() })
    dismissTimer = setTimeout(() => {
      set({ status: 'idle', label: '' })
    }, delay)
  },

  startSyncing(label = 'Syncing…') {
    if (dismissTimer) clearTimeout(dismissTimer)
    set({ status: 'syncing', label })
  },

  finishSyncing(label = 'Synced', delay = 1400) {
    if (dismissTimer) clearTimeout(dismissTimer)
    set({ status: 'synced', label, lastSaved: Date.now() })
    dismissTimer = setTimeout(() => {
      set({ status: 'idle', label: '' })
    }, delay)
  },

  setError(label = 'Save error', delay = 2600) {
    if (dismissTimer) clearTimeout(dismissTimer)
    set({ status: 'error', label })
    dismissTimer = setTimeout(() => {
      set({ status: 'idle', label: '' })
    }, delay)
  },

  triggerSavePulse(label = 'Auto-saved', delay = 1200) {
    if (dismissTimer) clearTimeout(dismissTimer)
    set({ status: 'saving', label: 'Auto-saving…' })
    setTimeout(() => {
      set({ status: 'saved', label, lastSaved: Date.now() })
      dismissTimer = setTimeout(() => {
        set({ status: 'idle', label: '' })
      }, delay)
    }, 280)
  }
}))

export const notifySaving = (label) => useSyncStatus.getState().startSaving(label)
export const notifySaved = (label, delay) => useSyncStatus.getState().finishSaving(label, delay)
export const notifySyncing = (label) => useSyncStatus.getState().startSyncing(label)
export const notifySynced = (label, delay) => useSyncStatus.getState().finishSyncing(label, delay)
export const notifySyncError = (label, delay) => useSyncStatus.getState().setError(label, delay)
export const notifySavePulse = (label, delay) => useSyncStatus.getState().triggerSavePulse(label, delay)
