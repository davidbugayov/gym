import { create } from 'zustand'
import { api } from '../lib/api.js'
import { localTZ } from '../lib/format.js'
import { registerCustom } from '../lib/exercises.js'
import { DEMO, DEMO_SEEDED } from '../lib/demo.js'
import { MOBILE, nativeLoad, nativeSave, syncReminder } from '../lib/mobile.js'
import { notifySyncing, notifySynced, notifySaved, notifySavePulse } from '../lib/syncStatus.js'
import { LANG_STORAGE_KEY, readPersistedLanguage } from '../lib/languageStore.js'

const KEY = 'gym_state_v1'
export const DEF = {
  unit: 'kg', restSec: 90, restPresets: [60, 90, 120], sound: true, haptics: true, keepAwake: true, lang: 'en',
  theme: 'auto', themeConfig: { mode: 'auto', sunrise: '07:00', sunset: '20:00' }, accent: 'lime', body: 'male', targetW: null, warmup: true, cooldown: true,
  warmupCfg: { preset: 'standard', custom: false, ids: [] },
  cooldownCfg: { preset: 'standard', custom: false, ids: [] },
  bodyweight: [], routines: [], week: {}, dayPlan: {},
  exWeights: {}, workouts: [], active: null, customEx: [], gifSize: 'full',
  exNotes: {}, measurements: [],
  lastBackupAt: null, lastBackupDismissedAt: null,
  // effort: which per-set effort scale is logged — 'none' | 'rir' | 'rpe'. null, not 'none', so
  // that a profile which never chose (loaded state is overlaid on DEF, on every path: local,
  // server pull, backup import) still falls back to the `showRir` boolean this replaced and
  // keeps the column it had. See effortOf.
  reminder: { on: false, time: '08:00', tz: null }, effort: null,
  // AI Coach (issue: AI enablement). null until the profile opts in — a null namespace is the
  // same app it was before the feature existed, which is what Epic F asks for. Shape and
  // bounds live in lib/coach.js.
  coach: null
}
const clone = o => JSON.parse(JSON.stringify(o))

function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    const loaded = raw ? Object.assign(clone(DEF), JSON.parse(raw)) : clone(DEF)
    // Synchronize language with central localStorage system
    const savedLang = readPersistedLanguage()
    if (savedLang) loaded.lang = savedLang
    if (!loaded.themeConfig) {
      loaded.themeConfig = { mode: loaded.theme || 'auto', sunrise: '07:00', sunset: '20:00' }
    }

    // If active session wasn't in raw state (or was lost), check the periodic auto-save backup
    if (!loaded.active) {
      const backupRaw = localStorage.getItem('gym_active_session_backup_v1')
      if (backupRaw) {
        try {
          const backup = JSON.parse(backupRaw)
          if (backup?.active?.entries && (Date.now() - (backup.savedAt || 0) < 48 * 3600 * 1000)) {
            loaded.active = backup.active
            loaded._recoveredFromAutoSave = true
          }
        } catch (e) { /* ignore */ }
      }
    }
    return loaded
  } catch (e) { /* ignore */ }
  const fallback = clone(DEF)
  fallback.lang = readPersistedLanguage()
  return fallback
}

const hasData = st => !!((st.workouts || []).length || (st.routines || []).length || (st.bodyweight || []).length)

export const useStore = create((set, get) => {
  let pushTm = null
  let saveTm = null

  // Mobile build: mirror the state into a file in the app's data directory (survives WebView
  // storage eviction) and keep the native reminder schedule in step with the weekly plan.
  const nativePersist = () => {
    clearTimeout(saveTm)
    saveTm = setTimeout(() => { saveTm = null; nativeSave(get().S); syncReminder(get().S) }, 800)
  }

  const persist = (S, push = true) => {
    S._ts = Date.now()
    registerCustom(S.customEx)
    localStorage.setItem(KEY, JSON.stringify(S))
    // Maintain active workout backup in sync with store
    if (S.active) {
      try {
        localStorage.setItem('gym_active_session_backup_v1', JSON.stringify({
          active: S.active,
          savedAt: Date.now(),
          version: 1
        }))
      } catch (e) { /* ignore */ }
    } else {
      localStorage.removeItem('gym_active_session_backup_v1')
      localStorage.removeItem('gym_active_session_meta_v1')
    }
    set({ S })
    if (MOBILE) nativePersist()
    if (!S.active && !push) {
      notifySavePulse('Saved')
    }
    if (push && get().user) {
      clearTimeout(pushTm)
      pushTm = setTimeout(() => get().pushState(), 1500)
    }
  }

  // A setting changed right before switching away/closing the tab must not get lost mid-debounce
  // (e.g. setting the reminder time then immediately backgrounding to test it). On mobile the
  // same applies to the file mirror — backgrounding is often the last thing before the OS
  // kills the app.
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'hidden') return
      if (MOBILE && saveTm) {
        clearTimeout(saveTm)
        saveTm = null
        nativeSave(get().S)
      }
      if (pushTm) {
        clearTimeout(pushTm)
        pushTm = null
        get().pushState()
      }
    })
  }

  // Everything a sign-out leaves behind on this device, whichever way it was triggered.
  const clearLocalSession = () => {
    get().setUser(null)
    localStorage.removeItem('gym_guest')
    localStorage.removeItem('gym_dirty')
    localStorage.removeItem(KEY)
    localStorage.removeItem('gym_active_session_backup_v1')
    localStorage.removeItem('gym_active_session_meta_v1')
    const fresh = clone(DEF)
    fresh.lang = readPersistedLanguage()
    persist(fresh, false)
  }

  return {
    S: (() => { const s = loadState(); registerCustom(s.customEx); return s })(),
    user: (() => { try { return JSON.parse(localStorage.getItem('gym_user')) || null } catch { return null } })(),
    ready: false,
    // Instance capabilities from GET /api/config. `config.coach` is present only when the
    // owner has both enabled the Coach and connected a provider — every Coach entry point in
    // the app hangs off it, so an unconfigured instance renders exactly what it always did.
    config: null,

    // Mutate a draft of S via producer fn, then persist + schedule sync.
    update(mut, push = true) {
      const S = clone(get().S)
      mut(S)
      if (S.lang) {
        try {
          localStorage.setItem(LANG_STORAGE_KEY, S.lang)
        } catch (e) { /* ignore */ }
      }
      persist(S, push)
    },
    replaceState(S, push = false) { persist(clone(S), push) },

    isGuest: () => localStorage.getItem('gym_guest') === '1',
    setGuest(v) { if (v) localStorage.setItem('gym_guest', '1'); else localStorage.removeItem('gym_guest'); set({}) },

    setUser(u) {
      if (u) { localStorage.setItem('gym_user', JSON.stringify(u)); localStorage.removeItem('gym_guest') }
      else localStorage.removeItem('gym_user')
      set({ user: u })
    },

    async pushState() {
      if (!get().user) return
      clearTimeout(pushTm)
      notifySyncing('Syncing…')
      try {
        await api('/api/data', { method: 'PUT', body: JSON.stringify({ state: get().S }) })
        localStorage.removeItem('gym_dirty')
        notifySynced('Synced')
      } catch (e) {
        localStorage.setItem('gym_dirty', '1')
        notifySaved('Saved locally')
      }
    },
    async pullState() {
      try {
        notifySyncing('Syncing…')
        const { state } = await api('/api/data')
        const S = get().S
        const dirty = localStorage.getItem('gym_dirty') === '1'
        if (state && (!hasData(S) || ((state._ts || 0) >= (S._ts || 0) && !dirty))) {
          const active = S.active
          const next = Object.assign(clone(DEF), state)
          if (active) next.active = active
          // Preserve the user's explicit local device language selection
          const persistentLang = readPersistedLanguage()
          if (persistentLang) next.lang = persistentLang
          persist(next, false)
        } else if (hasData(S)) { await get().pushState() }
        notifySynced('Synced')
      } catch (e) {
        /* offline — keep local */
      }
    },

    async signOut() {
      try { await get().pushState(); await api('/api/logout', { method: 'POST', body: '{}' }) } catch (e) { /* */ }
      clearLocalSession()
    },

    // "Sign out everywhere": the server bumps this profile's session version, which kills every
    // session it has on any device — this browser included, so the app has to end up exactly
    // where a normal signOut leaves it. Unlike signOut the request is NOT swallowed: if it fails
    // the sessions elsewhere are all still valid, and wiping this device's copy of the data
    // would sign the user out of the one place the bump didn't reach. Caller reports the error.
    async signOutAll() {
      await get().pushState()   // never throws — stores gym_dirty and moves on when offline
      await api('/api/logout/all', { method: 'POST', body: '{}' })
      clearLocalSession()
    },

    // Demo build only: drop the seeded example profile back in (Settings → "Reset demo data").
    // Dynamic import so the generator never ships in a self-hosted bundle.
    async resetDemo() {
      const { buildDemoState } = await import('../lib/demoSeed.js')
      localStorage.removeItem('gym_dirty')
      persist(Object.assign(clone(DEF), buildDemoState()), false)
    },

    // Boot: ask the server who we are, then pull.
    async boot() {
      // Mobile build: no backend either — restore from the file mirror (the durable copy;
      // localStorage may have been evicted since the last run) and go straight in.
      if (MOBILE) {
        const saved = await nativeLoad()
        const S = get().S
        if (saved && (!hasData(S) || (saved._ts || 0) >= (S._ts || 0))) {
          persist(Object.assign(clone(DEF), saved), false)
        } else if (hasData(S)) {
          nativeSave(S)   // first run after an update from a file-less version: seed the mirror
        }
        get().setGuest(true)
        syncReminder(get().S)
        set({ ready: true })
        return
      }
      // Demo build (GitHub Pages): no backend at all — seed once, stay in guest mode.
      if (DEMO) {
        if (!localStorage.getItem(DEMO_SEEDED)) {
          localStorage.setItem(DEMO_SEEDED, '1')
          await get().resetDemo()
        }
        get().setGuest(true)
        set({ ready: true })
        return
      }
      // Instance capabilities are public and needed whether or not anyone is signed in.
      try { set({ config: await api('/api/config') }) } catch (e) { /* offline — assume nothing extra */ }
      try {
        const me = await api('/api/me')
        get().setUser(me.user)
        await get().pullState()
        // Re-stamp the reminder's timezone on every load — keeps it correct if you're travelling,
        // without needing to revisit Settings.
        const tz = localTZ()
        if (get().S.reminder?.on && get().S.reminder.tz !== tz) {
          get().update(s => { s.reminder = { ...s.reminder, tz } })
        }
      } catch (e) {
        if (e.status === 401) get().setUser(null)
      }
      set({ ready: true })
    }
  }
})

export { hasData }
