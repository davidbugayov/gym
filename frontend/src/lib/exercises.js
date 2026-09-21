import { EXDB } from './exercises-data.js'
import { t } from './i18n.js'

export { EXDB }
export const EXIDX = {}
EXDB.forEach(e => { EXIDX[e.id] = e })
export const BODYPARTS = [...new Set(EXDB.map(e => e.bp))].sort()

// Standard equipment categories for grouping and high-level filtering
export const EQUIPMENT_GROUPS = [
  { id: 'dumbbells', name: 'Dumbbells', icon: 'dumbbell', items: ['dumbbell'] },
  { id: 'barbell', name: 'Barbell', icon: 'barbell', items: ['barbell', 'ez barbell', 'olympic barbell', 'trap bar'] },
  { id: 'bodyweight', name: 'Bodyweight', icon: 'figureStrength', items: ['body weight', 'assisted', 'weighted'] },
  { id: 'machines', name: 'Machines', icon: 'machine', items: ['leverage machine', 'cable', 'sled machine', 'smith machine', 'skierg machine', 'stationary bike', 'elliptical machine', 'stepmill machine', 'upper body ergometer'] },
  { id: 'bands', name: 'Bands & Balls', icon: 'sparkles', items: ['band', 'resistance band', 'medicine ball', 'stability ball', 'bosu ball', 'roller', 'wheel roller'] },
  { id: 'kettlebells', name: 'Kettlebells & Other', icon: 'kettlebell', items: ['kettlebell', 'rope', 'hammer', 'tire'] }
]

export function getEquipmentGroup(eq) {
  if (!eq) return 'Bodyweight'
  const low = String(eq).toLowerCase().trim()
  for (const g of EQUIPMENT_GROUPS) {
    if (g.items.includes(low)) return g.name
  }
  return 'Kettlebells & Other'
}

export function equipmentGroupsOf(list) {
  const counts = {}
  list.forEach(e => {
    const grp = getEquipmentGroup(e.eq)
    counts[grp] = (counts[grp] || 0) + 1
  })
  return EQUIPMENT_GROUPS
    .filter(g => counts[g.name] > 0)
    .map(g => ({ ...g, count: counts[g.name] }))
}

export function groupExercisesByEquipment(list) {
  const groupMap = {}
  EQUIPMENT_GROUPS.forEach(g => {
    groupMap[g.name] = { ...g, exercises: [] }
  })
  list.forEach(e => {
    const grp = getEquipmentGroup(e.eq)
    if (groupMap[grp]) {
      groupMap[grp].exercises.push(e)
    } else {
      groupMap['Kettlebells & Other'].exercises.push(e)
    }
  })
  return EQUIPMENT_GROUPS
    .map(g => groupMap[g.name])
    .filter(g => g.exercises.length > 0)
}

// Equipment options present in a given list of exercises, most common first (issue #6).
// Deriving them from the *already filtered* list keeps the chip row short and means
// every body-part × equipment combination on screen has results behind it.
export function equipmentOf(list) {
  const c = {}
  list.forEach(e => { if (e.eq) c[e.eq] = (c[e.eq] || 0) + 1 })
  return Object.keys(c).sort((a, b) => c[b] - c[a] || (a < b ? -1 : 1))
}

// Custom (user-created) exercises live in synced state S.customEx (issue #11) and are
// merged into the id index here so every EXIDX[id] lookup keeps working unchanged.
let customIds = []
export function registerCustom(list) {
  customIds.forEach(id => delete EXIDX[id])
  customIds = (list || []).map(e => e.id)
  ;(list || []).forEach(e => { EXIDX[e.id] = e })
}
// Full searchable catalogue — customs first so your own exercises are easy to find.
export const allExercises = st => [...(st.customEx || []), ...EXDB]

// Media CDN fallback so all 1,300+ exercises have images and animated GIFs
const IMG_BASE = import.meta.env.VITE_IMG_BASE || 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/images/'
const GIF_BASE = import.meta.env.VITE_GIF_BASE || 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/videos/'

export const imgSrc = ex => IMG_BASE + ex.img
export const gifSrc = ex => GIF_BASE + ex.gif

// Cardio exercises log time + speed instead of weight × reps.
export const isCardio = idOrEx => (typeof idOrEx === 'string' ? EXIDX[idOrEx] : idOrEx)?.bp === 'cardio'

// An id that resolves to nothing — a plan file built against a different exercise dataset,
// a custom exercise deleted on another device before the sync arrived — still has to
// render. A placeholder keeps it visible (and removable) instead of taking the whole view
// down on the first `ex.n`.
export const exOr = id => EXIDX[id] ||
  { id, n: t('Unknown exercise'), bp: '', tg: '', eq: '', sm: [], st: [], missing: true }
