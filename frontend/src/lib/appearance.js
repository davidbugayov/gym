import { ACCENTS } from './format.js'

const LEGACY_ACCENTS = { '#30d158': 'lime', '#0a84ff': 'sky', '#ff9f0a': 'orange', '#bf5af2': 'violet', '#ff375f': 'pink', '#ff453a': 'red', '#40c8e0': 'teal', '#ffd60a': 'gold' }
export const ACCENT_LABELS = { lime: 'Lime', sky: 'Sky blue', orange: 'Orange', violet: 'Violet', pink: 'Pink', red: 'Red', teal: 'Teal', gold: 'Gold' }

export function normalizeAccent(value) {
  const key = typeof value === 'string' ? value.toLowerCase().trim() : ''
  return Object.hasOwn(ACCENTS, key) ? key : LEGACY_ACCENTS[key] || Object.keys(ACCENTS).find(k => ACCENTS[k] === key) || 'lime'
}

export function applyAppearance(theme, accent, doc = document) {
  const root = doc.documentElement
  root.dataset.theme = theme === 'light' ? 'light' : 'dark'
  root.dataset.accent = normalizeAccent(accent)
  // Old builds stored inline accent tokens, which override the theme selectors.
  for (const token of ['--acc', '--acc-2', '--on-acc', '--acc-soft', '--acc-line']) root.style.removeProperty(token)
  const meta = doc.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = root.dataset.theme === 'light' ? '#f3f4ed' : '#101210'
}
