import { buildSets, effectiveRoutineId } from './history.js'
import { isCardio } from './exercises.js'
import { nextPrescription, applyPrescription } from './progression.js'
import { todayISO } from './format.js'

const STARTING_LOAD_KG = {
  dumbbell: { weight: 5, scope: 'each' },
  kettlebell: { weight: 8, scope: 'each' },
  barbell: { weight: 10, scope: 'total' },
  'ez barbell': { weight: 10, scope: 'total' },
  'olympic barbell': { weight: 20, scope: 'total' },
  'medicine ball': { weight: 3, scope: 'total' }
}

const validWeight = value => Number.isFinite(Number(value)) && Number(value) > 0

// A guide, never a replacement for the actual sets selected by the athlete.
// Plan and history use the same progression calculation as the workout screen.
export function weightGuideFor(S, ex) {
  if (!S || !ex || isCardio(ex)) return null
  const unit = S.unit === 'lb' ? 'lb' : 'kg'
  const scope = ex.eq === 'dumbbell' || ex.eq === 'kettlebell' ? 'each' : 'total'
  const result = (weight, source, weightScope = scope) => ({ weight: Number(weight), unit, source, scope: weightScope })

  const active = S.active?.entries?.find(entry => entry.id === ex.id)
  const activeWeight = active?.sets?.find(set => !set.done && validWeight(set.w))?.w
  if (validWeight(activeWeight)) return result(activeWeight, 'session')

  const routines = S.routines || []
  const todayId = effectiveRoutineId(S, todayISO())
  const planned = routines.find(r => r.id === todayId && r.ex?.some(cfg => cfg.id === ex.id))
    || routines.find(r => r.ex?.some(cfg => cfg.id === ex.id))
  if (planned) {
    const cfg = planned.ex.find(item => item.id === ex.id)
    const sets = applyPrescription(buildSets(S, cfg), nextPrescription(S, cfg, planned))
    const prescribed = sets.find(set => validWeight(set.w))?.w
    if (validWeight(prescribed)) return result(prescribed, 'plan')
  }

  const saved = S.exWeights?.[ex.id]?.w
  if (validWeight(saved)) return result(saved, 'saved')

  for (let i = (S.workouts || []).length - 1; i >= 0; i--) {
    const entry = S.workouts[i].entries?.find(item => item.id === ex.id)
    const used = entry?.sets?.filter(set => set.done && validWeight(set.w)) || []
    if (used.length) return result(used[used.length - 1].w, 'history')
  }

  const start = STARTING_LOAD_KG[ex.eq]
  if (!start) return null
  const weight = unit === 'lb' ? Math.round(start.weight * 2.20462 / 5) * 5 : start.weight
  return result(weight, 'starter', start.scope)
}
