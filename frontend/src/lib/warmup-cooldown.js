// Comprehensive warm-up and cool-down exercise library.
// Every exercise id comes from exercises-data.js (body weight only).
//
// The user picks a preset or customises their own selection in Settings.
// At workout start, `getWarmup(S)` / `getCooldown(S)` return the active list
// which `beginWorkout` prepends / appends to the session.

import { t } from './i18n.js'
import { EXIDX } from './exercises.js'

// ─── WARM-UP EXERCISES ──────────────────────────────────────────────────────
// Each entry: { id, label (t-key for the UI), sec, category }
// Categories:  cardio  — raise heart rate
//              dynamic — dynamic stretching / mobilisation
//              activation — glute / core activation
export const WARMUP_POOL = [
  // ── Cardio ──
  { id: '3224', label: 'Jack jump',                       sec: 45, category: 'cardio' },
  { id: '0630', label: 'Mountain climber',                 sec: 45, category: 'cardio' },
  { id: '3223', label: 'Star jump',                        sec: 40, category: 'cardio' },
  { id: '3220', label: 'Astride jumps',                    sec: 40, category: 'cardio' },
  { id: '3222', label: 'Semi squat jump',                  sec: 40, category: 'cardio' },
  { id: '3219', label: 'Scissor jumps',                    sec: 40, category: 'cardio' },
  { id: '3221', label: 'Half knee bends',                  sec: 40, category: 'cardio' },
  { id: '3655', label: 'Walking high knees lunge',         sec: 45, category: 'cardio' },
  { id: '3636', label: 'High knee against wall',           sec: 40, category: 'cardio' },
  { id: '3656', label: 'Short stride run',                 sec: 60, category: 'cardio' },

  // ── Dynamic mobilisation ──
  { id: '1471', label: 'Inchworm',                         sec: 30, category: 'dynamic' },
  { id: '1604', label: 'World greatest stretch',           sec: 45, category: 'dynamic' },
  { id: '1688', label: 'Lunge with twist',                 sec: 40, category: 'dynamic' },
  { id: '1687', label: 'Posterior step to overhead reach',  sec: 40, category: 'dynamic' },
  { id: '1685', label: 'Squat to overhead reach',          sec: 40, category: 'dynamic' },
  { id: '1686', label: 'Squat to overhead reach with twist', sec: 40, category: 'dynamic' },
  { id: '1167', label: 'Dynamic chest stretch',            sec: 30, category: 'dynamic' },
  { id: '3662', label: 'Pike-to-cobra push-up',            sec: 40, category: 'dynamic' },
  { id: '1468', label: 'Crab twist toe touch',             sec: 30, category: 'dynamic' },
  { id: '3360', label: 'Bear crawl',                       sec: 30, category: 'dynamic' },
  { id: '1428', label: 'Wrist circles',                    sec: 20, category: 'dynamic' },
  { id: '1368', label: 'Ankle circles',                    sec: 20, category: 'dynamic' },
  { id: '0257', label: 'Circles knee stretch',             sec: 20, category: 'dynamic' },

  // ── Activation ──
  { id: '3561', label: 'Glute bridge march',               sec: 40, category: 'activation' },
  { id: '3013', label: 'Low glute bridge on floor',        sec: 40, category: 'activation' },
  { id: '3699', label: 'Shoulder tap',                     sec: 30, category: 'activation' },
  { id: '2466', label: 'Bridge – mountain climber',        sec: 40, category: 'activation' },
]

// ─── COOL-DOWN / STRETCHING EXERCISES ────────────────────────────────────────
// Categories:  upper  — upper body stretches
//              lower  — lower body stretches
//              back   — back & spine
//              full   — full-body / compound stretches
export const COOLDOWN_POOL = [
  // ── Upper body ──
  { id: '1271', label: 'Chest and front of shoulder stretch', sec: 45, category: 'upper' },
  { id: '1259', label: 'Behind head chest stretch',        sec: 45, category: 'upper' },
  { id: '1365', label: 'Upper back stretch',               sec: 45, category: 'upper' },
  { id: '0669', label: 'Rear deltoid stretch',             sec: 40, category: 'upper' },
  { id: '0817', label: 'Triceps stretch',                  sec: 30, category: 'upper' },
  { id: '0643', label: 'Overhead triceps stretch',         sec: 30, category: 'upper' },
  { id: '0716', label: 'Side push neck stretch',           sec: 30, category: 'upper' },
  { id: '1403', label: 'Neck side stretch',                sec: 30, category: 'upper' },
  { id: '0721', label: 'Side wrist pull stretch',          sec: 20, category: 'upper' },
  { id: '1167', label: 'Dynamic chest stretch',            sec: 30, category: 'upper' },

  // ── Lower body ──
  { id: '1511', label: 'Hamstring stretch',                sec: 45, category: 'lower' },
  { id: '1585', label: 'Runners stretch',                  sec: 60, category: 'lower' },
  { id: '1576', label: 'Leg up hamstring stretch',         sec: 45, category: 'lower' },
  { id: '0613', label: 'Lying (side) quads stretch',       sec: 45, category: 'lower' },
  { id: '1564', label: 'Intermediate hip flexor and quad stretch', sec: 45, category: 'lower' },
  { id: '1512', label: 'All fours squad stretch',          sec: 45, category: 'lower' },
  { id: '1424', label: 'Seated glute stretch',             sec: 45, category: 'lower' },
  { id: '2567', label: 'Seated piriformis stretch',        sec: 45, category: 'lower' },
  { id: '2571', label: 'Rocking frog stretch',             sec: 45, category: 'lower' },
  { id: '1377', label: 'Calf stretch with hands against wall', sec: 40, category: 'lower' },
  { id: '1398', label: 'Standing calves calf stretch',     sec: 40, category: 'lower' },
  { id: '1390', label: 'Seated calf stretch',              sec: 40, category: 'lower' },
  { id: '1419', label: 'Iron cross stretch',               sec: 45, category: 'lower' },

  // ── Back & spine ──
  { id: '0690', label: 'Seated lower back stretch',        sec: 45, category: 'back' },
  { id: '1363', label: 'Spine stretch',                    sec: 45, category: 'back' },
  { id: '1358', label: 'Side lying floor stretch',         sec: 45, category: 'back' },
  { id: '0794', label: 'Standing lateral stretch',         sec: 40, category: 'back' },
  { id: '1346', label: 'Kneeling lat stretch',             sec: 40, category: 'back' },
  { id: '1405', label: 'Back pec stretch',                 sec: 40, category: 'back' },
  { id: '2329', label: 'Spine twist',                      sec: 40, category: 'back' },
  { id: '3639', label: 'Bent knee lying twist',            sec: 40, category: 'back' },

  // ── Full body ──
  { id: '1604', label: 'World greatest stretch',           sec: 60, category: 'full' },
  { id: '1688', label: 'Lunge with twist',                 sec: 45, category: 'full' },
]

// ─── PRESETS ──────────────────────────────────────────────────────────────────
// Each preset is a named set of exercise IDs from the pools above.
// The user can pick a preset or go full custom.

export const WARMUP_PRESETS = {
  quick:    { name: 'Quick (2 min)',      ids: ['3224', '0630', '1471'] },
  standard: { name: 'Standard (4 min)',   ids: ['3224', '0630', '1471', '1685', '3561', '1368'] },
  full:     { name: 'Full (6 min)',       ids: ['3224', '0630', '3223', '1471', '1604', '1685', '3561', '3699', '1428', '1368'] },
  cardio:   { name: 'Cardio focus',       ids: ['3224', '3223', '0630', '3220', '3655', '3636'] },
  mobility: { name: 'Mobility focus',     ids: ['1471', '1604', '1688', '1687', '1685', '1686', '1368', '1428'] },
}

export const COOLDOWN_PRESETS = {
  quick:    { name: 'Quick (2 min)',      ids: ['1604', '1585', '1365'] },
  standard: { name: 'Standard (4 min)',   ids: ['1604', '1585', '1365', '1511', '1271', '0690'] },
  full:     { name: 'Full (7 min)',       ids: ['1604', '1585', '1365', '1511', '1271', '1424', '0690', '1363', '0794', '0669'] },
  upper:    { name: 'Upper body',         ids: ['1271', '1259', '1365', '0669', '0817', '0716', '1346'] },
  lower:    { name: 'Lower body',         ids: ['1585', '1511', '1576', '0613', '1564', '1424', '1377'] },
}

// Default preset key
export const DEFAULT_WARMUP_PRESET = 'standard'
export const DEFAULT_COOLDOWN_PRESET = 'standard'

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

/** Category name for UI display */
export const warmupCategoryName = cat => {
  const map = { cardio: t('Cardio'), dynamic: t('Dynamic mobility'), activation: t('Activation') }
  return map[cat] || cat
}
export const cooldownCategoryName = cat => {
  const map = { upper: t('Upper body'), lower: t('Lower body'), back: t('Back & spine'), full: t('Full body') }
  return map[cat] || cat
}

/**
 * Given the store state S, return the warmup exercise list in the format
 * expected by buildEntries: [{ id, sets, sec, weight, mode, phase }]
 */
const warmFocus = {
  '3224': ['general'], '0630': ['general', 'core'], '3223': ['general'],
  '3220': ['general', 'lower'], '3222': ['general', 'lower'], '3219': ['general', 'lower'],
  '3221': ['general', 'lower'], '3655': ['general', 'lower'], '3636': ['general', 'lower'],
  '3656': ['general'], '1471': ['general', 'upper', 'lower', 'back'],
  '1604': ['lower', 'back'], '1688': ['lower', 'back'], '1687': ['lower', 'shoulders'],
  '1685': ['lower', 'shoulders'], '1686': ['lower', 'back', 'shoulders'],
  '1167': ['chest', 'shoulders'], '3662': ['chest', 'shoulders', 'arms'],
  '1468': ['back', 'core'], '3360': ['back', 'shoulders', 'arms', 'core'],
  '1428': ['arms'], '1368': ['lower'], '0257': ['lower'],
  '3561': ['lower'], '3013': ['lower'], '3699': ['shoulders', 'arms'], '2466': ['lower', 'core']
}
const coolFocus = {
  chest: ['upper'], shoulders: ['upper'], arms: ['upper'], lower: ['lower'],
  back: ['back', 'full'], core: ['back', 'full']
}
const focusFor = routine => {
  const groups = new Set()
  for (const cfg of routine?.ex || []) {
    const ex = EXIDX[cfg.id]
    const terms = [ex?.bp, ex?.tg, ex?.mg, ...(ex?.sm || [])].filter(Boolean).join(' ').toLowerCase()
    if (/chest|pectoral/.test(terms)) groups.add('chest')
    if (/shoulder|deltoid/.test(terms)) groups.add('shoulders')
    if (/back|lat|trap|rhomboid|spine/.test(terms)) groups.add('back')
    if (/biceps|triceps|forearm|arm/.test(terms)) groups.add('arms')
    if (/leg|quad|hamstring|glute|calf|hip/.test(terms)) groups.add('lower')
    if (/abs|core|waist/.test(terms)) groups.add('core')
  }
  return groups
}
const chooseContextIds = (pool, routine, phase) => {
  if (!routine?.ex?.length) return null
  const focuses = focusFor(routine)
  let candidates
  if (phase === 'warmup') {
    const wanted = new Set(['general', ...focuses])
    candidates = pool.filter(item => (warmFocus[item.id] || []).some(group => wanted.has(group)))
      .sort((a, b) => {
        const score = item => (warmFocus[item.id] || []).reduce((n, group) => n + (focuses.has(group) ? 2 : group === 'general' ? 1 : 0), 0)
        return score(b) - score(a)
      })
    const cardio = candidates.find(item => item.category === 'cardio')
    if (cardio) candidates = [cardio, ...candidates.filter(item => item !== cardio)]
  } else {
    const wanted = new Set([...focuses].flatMap(group => coolFocus[group] || []))
    candidates = pool.filter(item => wanted.has(item.category))
      .sort((a, b) => Number(a.category === 'full') - Number(b.category === 'full'))
  }
  const limit = phase === 'warmup' ? 6 : 5
  const picked = candidates.slice(0, limit).map(item => item.id)
  return picked.length ? picked : null
}

export function getWarmup(S, routine) {
  if (S.warmup === false) return []
  const cfg = S.warmupCfg || {}
  const preset = cfg.preset || DEFAULT_WARMUP_PRESET
  const ids = cfg.custom ? (cfg.ids || []) : (chooseContextIds(WARMUP_POOL, routine, 'warmup') || WARMUP_PRESETS[preset]?.ids || WARMUP_PRESETS[DEFAULT_WARMUP_PRESET].ids)
  const durations = cfg.durations || {}
  return ids.map(id => {
    const poolItem = WARMUP_POOL.find(e => e.id === id)
    const sec = durations[id] || poolItem?.sec || 30
    return { id, sets: 1, sec, weight: 0, mode: 'time', phase: 'warmup' }
  }).filter(e => WARMUP_POOL.some(p => p.id === e.id))
}

/**
 * Given the store state S, return the cooldown exercise list.
 */
export function getCooldown(S, routine) {
  if (S.cooldown === false) return []
  const cfg = S.cooldownCfg || {}
  const preset = cfg.preset || DEFAULT_COOLDOWN_PRESET
  const contextual = chooseContextIds(COOLDOWN_POOL, routine, 'cooldown')
  const ids = cfg.custom ? (cfg.ids || []) : (contextual || COOLDOWN_PRESETS[preset]?.ids || COOLDOWN_PRESETS[DEFAULT_COOLDOWN_PRESET].ids)
  const durations = cfg.durations || {}
  return ids.map(id => {
    const poolItem = COOLDOWN_POOL.find(e => e.id === id)
    const sec = durations[id] || poolItem?.sec || 45
    return { id, sets: 1, sec, weight: 0, mode: 'time', phase: 'cooldown' }
  }).filter(e => COOLDOWN_POOL.some(p => p.id === e.id))
}
