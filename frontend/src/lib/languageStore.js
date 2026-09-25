// Central Language State Management System using localStorage.
// Provides synchronous initial read, persistent storage, index and code mapping,
// global reactivity via useSyncExternalStore, and automatic synchronization across
// app components and storage events.

import { useSyncExternalStore } from 'react'

export const LANG_STORAGE_KEY = 'gymly_lang'
export const LEGACY_STORAGE_KEY = 'gym_lang'

export const LANGS = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  pt: 'Português',
  pl: 'Polski',
  tr: 'Türkçe',
  ru: 'Русский',
  zh: '中文',
  ko: '한국어',
  hi: 'हिन्दी'
}

export const LANG_CODES = Object.keys(LANGS)
export const INSTR_LANGS = ['en', 'es', 'fr', 'it', 'tr', 'ru', 'zh', 'hi', 'pl', 'ko']

const DATE_LOCALES = {
  en: 'en-GB',
  de: 'de-DE',
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
  pt: 'pt-PT',
  pl: 'pl-PL',
  tr: 'tr-TR',
  ru: 'ru-RU',
  zh: 'zh-CN',
  ko: 'ko-KR',
  hi: 'hi-IN'
}

const localePacks = import.meta.glob('../locales/*.js')
const instrPacks = import.meta.glob('../instr/*.js')

// Resolve persisted language code from localStorage or legacy fallbacks
export function readPersistedLanguage() {
  if (typeof window === 'undefined' || !window.localStorage) return 'en'
  try {
    // 1. Direct primary key
    const saved = localStorage.getItem(LANG_STORAGE_KEY)
    if (saved && LANGS[saved]) return saved

    // 2. Legacy key
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy && LANGS[legacy]) {
      localStorage.setItem(LANG_STORAGE_KEY, legacy)
      return legacy
    }

    // 3. Fallback from gym_state_v1 JSON if present
    const stateRaw = localStorage.getItem('gym_state_v1')
    if (stateRaw) {
      const parsed = JSON.parse(stateRaw)
      if (parsed?.lang && LANGS[parsed.lang]) {
        localStorage.setItem(LANG_STORAGE_KEY, parsed.lang)
        return parsed.lang
      }
    }

    // 4. Browser navigator language match if available
    if (typeof navigator !== 'undefined' && navigator.language) {
      const navLang = navigator.language.slice(0, 2).toLowerCase()
      if (LANGS[navLang]) {
        localStorage.setItem(LANG_STORAGE_KEY, navLang)
        return navLang
      }
    }
  } catch (e) {
    /* ignore storage read error */
  }
  return 'en'
}

// Global runtime state
let currentLang = readPersistedLanguage()
let dict = {}
let instr = null
let version = 0
let loadingPromise = null
const subscribers = new Set()

const notify = () => {
  version++
  subscribers.forEach(cb => {
    try { cb() } catch (e) { console.error('Error in language subscriber:', e) }
  })
}

// Synchronously / eagerly start loading dictionary if not English
async function loadBundle(code) {
  if (!LANGS[code]) code = 'en'
  if (code === 'en') {
    dict = {}
    instr = null
    notify()
    return
  }

  const loaderKey = '../locales/' + code + '.js'
  const instrKey = '../instr/' + code + '.js'

  try {
    const packPromise = localePacks[loaderKey] ? localePacks[loaderKey]() : Promise.resolve({ default: {} })
    const instrPromise = (INSTR_LANGS.includes(code) && instrPacks[instrKey])
      ? instrPacks[instrKey]()
      : Promise.resolve({ default: null })

    const [packMod, instrMod] = await Promise.all([packPromise, instrPromise])
    dict = packMod?.default || {}
    instr = instrMod?.default || null
  } catch (err) {
    console.error(`Failed to load translation bundle for "${code}":`, err)
    dict = {}
    instr = null
  }
  notify()
}

// Initial bundle pre-load
if (currentLang !== 'en') {
  loadingPromise = loadBundle(currentLang)
}

// Update HTML root tag
if (typeof document !== 'undefined') {
  document.documentElement.lang = currentLang
}

// Cross-tab storage synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === LANG_STORAGE_KEY && e.newValue && LANGS[e.newValue]) {
      if (e.newValue !== currentLang) {
        setLanguage(e.newValue, false)
      }
    }
  })
}

/**
 * Get current language code ('en', 'ru', etc.)
 */
export function getLanguage() {
  return currentLang
}

export const getLang = getLanguage

/**
 * Get current language index in LANG_CODES array
 */
export function getLanguageIndex() {
  return Math.max(0, LANG_CODES.indexOf(currentLang))
}

/**
 * Set current language by code or index, persist to localStorage,
 * update document lang attribute, load dictionary, and notify subscribers.
 * @param {string|number} codeOrIndex - e.g. 'ru' or 8
 * @param {boolean} [persist=true] - Whether to write to localStorage
 */
export async function setLanguage(codeOrIndex, persist = true) {
  let targetCode = typeof codeOrIndex === 'number'
    ? LANG_CODES[codeOrIndex] || 'en'
    : String(codeOrIndex || 'en').trim().toLowerCase()

  if (!LANGS[targetCode]) targetCode = 'en'

  // Persist to localStorage
  if (persist && typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, targetCode)
      localStorage.setItem(LEGACY_STORAGE_KEY, targetCode)
    } catch (e) {
      console.warn('Failed to persist language to localStorage:', e)
    }
  }

  // Update HTML tag
  if (typeof document !== 'undefined') {
    document.documentElement.lang = targetCode
  }

  currentLang = targetCode

  // Load bundle
  loadingPromise = loadBundle(targetCode)
  await loadingPromise

  // Also dispatch a browser event for any non-react listeners
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('gymly:language-change', { detail: { lang: targetCode } }))
    } catch (e) { /* ignore */ }
  }

  return targetCode
}

export const setLang = setLanguage

/**
 * Translate string using currently loaded dictionary
 */
export function t(s, ...args) {
  let v = dict[s] || s
  for (let i = 0; i < args.length; i++) {
    v = v.replaceAll('{' + i + '}', args[i])
  }
  return v
}

/**
 * Date locale identifier for toLocaleDateString()
 */
export function dateLocale() {
  return DATE_LOCALES[currentLang] || 'en-GB'
}

/**
 * Instructions for an exercise
 */
export const instrFor = ex => (instr && instr[ex.id]) || ex.st || []

/**
 * React hook for subscribing to language state changes.
 * Returns { lang, langIndex, version, setLanguage, t, dateLocale, LANGS, LANG_CODES }
 */
export function useLanguage() {
  const v = useSyncExternalStore(
    fn => {
      subscribers.add(fn)
      return () => subscribers.delete(fn)
    },
    () => version
  )

  return {
    lang: currentLang,
    langIndex: Math.max(0, LANG_CODES.indexOf(currentLang)),
    version: v,
    setLanguage,
    t,
    dateLocale,
    LANGS,
    LANG_CODES
  }
}

/**
 * Backward compatibility hook returning version counter.
 */
export function useLang() {
  return useSyncExternalStore(
    fn => {
      subscribers.add(fn)
      return () => subscribers.delete(fn)
    },
    () => version
  )
}
