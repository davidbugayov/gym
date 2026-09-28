import { EXIDX, EXDB } from './exercises.js'
import { MUSCLES, MUSCLE_NAME, musclesOf, loadOfRoutine } from './muscles.js'
import { t } from './i18n.js'

export const MUSCLE_CATEGORIES = {
  push: {
    key: 'push',
    label: 'Push',
    color: '#0a84ff',
    bg: 'rgba(10, 132, 255, 0.12)',
    icon: 'arrowUp',
    muscles: ['chest', 'deltoids', 'triceps', 'serratus']
  },
  pull: {
    key: 'pull',
    label: 'Pull',
    color: '#30d158',
    bg: 'rgba(48, 209, 88, 0.12)',
    icon: 'arrowDown',
    muscles: ['upper-back', 'trapezius', 'biceps', 'forearm']
  },
  legs: {
    key: 'legs',
    label: 'Legs & Glutes',
    color: '#ff9f0a',
    bg: 'rgba(255, 159, 10, 0.12)',
    icon: 'dumbbell',
    muscles: ['quadriceps', 'hamstring', 'gluteal', 'calves', 'adductors', 'hip-flexors', 'tibialis']
  },
  core: {
    key: 'core',
    label: 'Core & Trunk',
    color: '#bf5af2',
    bg: 'rgba(191, 90, 242, 0.12)',
    icon: 'shield',
    muscles: ['abs', 'obliques', 'lower-back']
  }
}

export const MUSCLE_TO_CATEGORY = {}
Object.entries(MUSCLE_CATEGORIES).forEach(([catKey, cat]) => {
  cat.muscles.forEach(m => {
    MUSCLE_TO_CATEGORY[m] = catKey
  })
})

// Top staple exercise IDs for each muscle group (guaranteed high-quality movements)
export const STAPLE_EXERCISE_IDS = {
  chest: ['0025', '0289', '0033', '9005', '0251'], // Bench press, DB bench, Push-up, Incline DB, Dip
  deltoids: ['0334', '9003', '0379', '0296', '1012'], // Lateral raise, Face pull, DB shoulder press, DB overhead
  'upper-back': ['0027', '0015', '2330', '0239', '0198'], // Bent over row, Pull-up, Lat pulldown, Cable row
  trapezius: ['0094', '0385', '9003'], // Barbell shrug, DB shrug, Face pull
  serratus: ['0033', '0653'], // Push-up, Pullover
  biceps: ['0031', '0294', '0313', '0285'], // Barbell curl, DB curl, Incline DB curl, Hammer curl
  triceps: ['0019', '0868', '0264', '0310'], // Dip, Tricep pushdown, Skull crusher, Overhead extension
  forearm: ['0030', '0855', '0450'], // Wrist curl, Reverse curl, Farmer walk
  quadriceps: ['0043', '2287', '0585', '9002', '0026'], // Full squat, Leg press, Leg extension, Split squat
  hamstring: ['0085', '0586', '0599', '9004', '0098'], // RDL, Lying leg curl, Seated leg curl, Nordic curl
  gluteal: ['9001', '9002', '0085', '0043', '0476'], // Hip thrust, Bulgarian split squat, RDL, Squat
  calves: ['1372', '0854', '0587'], // Standing calf raise, Seated calf raise, Leg press calf raise
  abs: ['0472', '3544', '0277', '0001'], // Hanging leg raise, Side plank, Cable crunch, Ab rollout
  obliques: ['0716', '0687', '0245', '3544'], // Russian twist, Woodchopper, Side plank
  'lower-back': ['0032', '0460', '0085'], // Deadlift, Back extension, RDL
  adductors: ['0574', '0600'], // Copenhagen plank, Cable adduction
  'hip-flexors': ['0472', '0514'], // Hanging leg raise, Lunge
  tibialis: ['0853'] // Tibialis raise
}

/**
 * Returns recommended exercises for filling a specific muscle gap.
 */
export function getRecommendedExercisesForMuscle(muscleSlug, limit = 4, excludeIds = []) {
  const excludeSet = new Set(excludeIds || [])
  const results = []
  const seenIds = new Set()

  // 1. Check curated staple exercises first
  const curatedIds = STAPLE_EXERCISE_IDS[muscleSlug] || []
  for (const id of curatedIds) {
    if (results.length >= limit) break
    if (excludeSet.has(id) || seenIds.has(id)) continue
    const ex = EXIDX[id]
    if (ex) {
      results.push(ex)
      seenIds.add(id)
    }
  }

  // 2. Search all catalog exercises if needed
  if (results.length < limit) {
    const matches = EXDB.filter(e => {
      if (excludeSet.has(e.id) || seenIds.has(e.id)) return false
      const m = musclesOf(e)
      return (m[muscleSlug] || 0) >= 0.7
    }).sort((a, b) => {
      // Prioritize common equipment (barbell, dumbbell, cable, body weight)
      const eqRank = eq => {
        if (eq === 'barbell') return 5
        if (eq === 'dumbbell') return 4
        if (eq === 'cable') return 3
        if (eq === 'body weight') return 2
        return 1
      }
      const diff = eqRank(b.eq) - eqRank(a.eq)
      if (diff !== 0) return diff
      return String(a.n).localeCompare(String(b.n))
    })

    for (const ex of matches) {
      if (results.length >= limit) break
      results.push(ex)
      seenIds.add(ex.id)
    }
  }

  return results
}

/**
 * Comprehensive analysis of a routine's muscle engagement and potential training gaps.
 */
export function analyzeRoutineMuscleEngagement(routine) {
  const exList = Array.isArray(routine?.ex) ? routine.ex.filter(e => e && e.id) : []
  const routineExIds = exList.map(e => e.id)
  const load = loadOfRoutine(routine)

  // Map each muscle to its contributing exercises in this routine
  const contributions = {}
  MUSCLES.forEach(m => { contributions[m] = [] })

  exList.forEach(item => {
    const ex = EXIDX[item.id] || { id: item.id, n: item.id }
    const mWeights = musclesOf(ex)
    const plannedSets = Number(item.sets) || 1

    Object.entries(mWeights).forEach(([slug, weight]) => {
      if (weight > 0 && contributions[slug]) {
        contributions[slug].push({
          id: ex.id,
          name: ex.n,
          sets: plannedSets,
          weight,
          effectiveSets: Math.round(weight * plannedSets * 10) / 10
        })
      }
    })
  })

  // Calculate total planned and effective sets
  let totalEffectiveSets = 0
  MUSCLES.forEach(m => {
    totalEffectiveSets += load[m] || 0
  })
  totalEffectiveSets = Math.round(totalEffectiveSets * 10) / 10

  // Category volumes
  const categoryVolumes = {
    push: { sets: 0, pct: 0, count: 0 },
    pull: { sets: 0, pct: 0, count: 0 },
    legs: { sets: 0, pct: 0, count: 0 },
    core: { sets: 0, pct: 0, count: 0 }
  }

  MUSCLES.forEach(m => {
    const s = load[m] || 0
    const cat = MUSCLE_TO_CATEGORY[m]
    if (cat && categoryVolumes[cat]) {
      categoryVolumes[cat].sets += s
      if (s > 0) categoryVolumes[cat].count++
    }
  })

  Object.keys(categoryVolumes).forEach(cat => {
    categoryVolumes[cat].sets = Math.round(categoryVolumes[cat].sets * 10) / 10
    categoryVolumes[cat].pct = totalEffectiveSets > 0
      ? Math.round((categoryVolumes[cat].sets / totalEffectiveSets) * 100)
      : 0
  })

  // Muscle breakdown list
  const muscleBreakdown = MUSCLES.map(slug => {
    const sets = Math.round((load[slug] || 0) * 10) / 10
    let status = 'untrained'
    if (sets >= 3) status = 'primary'
    else if (sets >= 1) status = 'moderate'
    else if (sets > 0) status = 'secondary'

    return {
      slug,
      name: MUSCLE_NAME[slug] || slug,
      category: MUSCLE_TO_CATEGORY[slug] || 'other',
      effectiveSets: sets,
      percentage: totalEffectiveSets > 0 ? Math.round((sets / totalEffectiveSets) * 100) : 0,
      status,
      contributions: contributions[slug] || []
    }
  }).sort((a, b) => b.effectiveSets - a.effectiveSets || a.name.localeCompare(b.name))

  // Push / Pull balance
  const pushSets = categoryVolumes.push.sets
  const pullSets = categoryVolumes.pull.sets
  let pushPullRatio = 1
  let pushPullStatus = 'balanced'

  if (pushSets > 0 || pullSets > 0) {
    if (pullSets === 0 && pushSets >= 3) {
      pushPullRatio = 99
      pushPullStatus = 'push_heavy'
    } else if (pushSets === 0 && pullSets >= 3) {
      pushPullRatio = 0.01
      pushPullStatus = 'pull_heavy'
    } else {
      pushPullRatio = Math.round((pushSets / Math.max(0.1, pullSets)) * 10) / 10
      if (pushPullRatio >= 1.8) pushPullStatus = 'push_heavy'
      else if (pushPullRatio <= 0.55) pushPullStatus = 'pull_heavy'
      else pushPullStatus = 'balanced'
    }
  }

  // Quad / Hamstring balance
  const quadSets = load.quadriceps || 0
  const hamSets = load.hamstring || 0
  let quadHamRatio = 1
  let quadHamStatus = 'balanced'

  if (quadSets > 0 || hamSets > 0) {
    if (hamSets === 0 && quadSets >= 3) {
      quadHamRatio = 99
      quadHamStatus = 'quad_dominant'
    } else if (quadSets === 0 && hamSets >= 3) {
      quadHamRatio = 0.01
      quadHamStatus = 'hamstring_dominant'
    } else {
      quadHamRatio = Math.round((quadSets / Math.max(0.1, hamSets)) * 10) / 10
      if (quadHamRatio >= 2.0) quadHamStatus = 'quad_dominant'
      else if (quadHamRatio <= 0.5) quadHamStatus = 'hamstring_dominant'
      else quadHamStatus = 'balanced'
    }
  }

  // Identify Potential Gaps
  const gaps = []

  if (exList.length > 0) {
    const hasPrimaryHamstring = exList.some(item => (musclesOf(EXIDX[item.id] || {})['hamstring'] || 0) >= 0.7)
    const hasPrimaryBiceps = exList.some(item => (musclesOf(EXIDX[item.id] || {})['biceps'] || 0) >= 0.7)
    const hasPrimaryTriceps = exList.some(item => (musclesOf(EXIDX[item.id] || {})['triceps'] || 0) >= 0.7)
    const hasPrimaryDelts = exList.some(item => (musclesOf(EXIDX[item.id] || {})['deltoids'] || 0) >= 0.7)
    const hasPrimaryUpperBack = exList.some(item => (musclesOf(EXIDX[item.id] || {})['upper-back'] || 0) >= 0.7)
    const hasPrimaryGlutes = exList.some(item => (musclesOf(EXIDX[item.id] || {})['gluteal'] || 0) >= 0.7)

    // 1. Quad Dominance / Hamstring Gap
    if (quadSets >= 3 && (hamSets < 1.8 || (!hasPrimaryHamstring && quadSets >= 4))) {
      gaps.push({
        id: 'gap_hamstrings',
        type: 'imbalance',
        severity: 'high',
        muscle: 'hamstring',
        title: t('Hamstrings & Posterior Knee Stability'),
        description: t('Quads are heavily loaded ({0} sets) with minimal opposing hamstring work. Adding knee flexion or hip hinge balances knee joint torque.', quadSets),
        recommendedExercises: getRecommendedExercisesForMuscle('hamstring', 3, routineExIds)
      })
    }

    // 2. Push/Pull Imbalance (High push, missing pull)
    if (pushSets >= 4 && (pullSets < 2 || pushSets / Math.max(0.1, pullSets) >= 1.8)) {
      gaps.push({
        id: 'gap_upper_back_push_heavy',
        type: 'imbalance',
        severity: 'high',
        muscle: 'upper-back',
        title: t('Upper Back & Scapular Retraction'),
        description: t('High pressing volume ({0} push sets) without enough horizontal or vertical pulling. This can lead to internal shoulder rotation over time.', pushSets),
        recommendedExercises: getRecommendedExercisesForMuscle('upper-back', 3, routineExIds)
      })
    }

    // 3. Pull/Push Imbalance (High pull, missing push)
    if (pullSets >= 5 && pushSets < 2) {
      gaps.push({
        id: 'gap_chest_pull_heavy',
        type: 'imbalance',
        severity: 'medium',
        muscle: 'chest',
        title: t('Anterior Pressing Volume'),
        description: t('Session has strong pulling volume ({0} sets) but lacks horizontal pressing for anterior symmetry.', pullSets),
        recommendedExercises: getRecommendedExercisesForMuscle('chest', 3, routineExIds)
      })
    }

    // 4. Missing Direct Upper-Back / Lats in an Upper Session
    const isUpperSession = (pushSets + pullSets) >= 4 && categoryVolumes.legs.sets <= 2
    if (isUpperSession && (!hasPrimaryUpperBack || (load['upper-back'] || 0) < 2)) {
      if (!gaps.some(g => g.muscle === 'upper-back')) {
        gaps.push({
          id: 'gap_lats_upper_session',
          type: 'neglected_muscle',
          severity: 'high',
          muscle: 'upper-back',
          title: t('Upper Back & Lats Gap'),
          description: t('This upper body session includes almost no dedicated upper back work. Rows or pulldowns build posture and bench press stability.'),
          recommendedExercises: getRecommendedExercisesForMuscle('upper-back', 3, routineExIds)
        })
      }
    }

    // 5. Missing Direct Biceps Isolation in Pull/Upper Focus
    if ((load['upper-back'] || 0) >= 3 && !hasPrimaryBiceps && (load.biceps || 0) < 1.8) {
      gaps.push({
        id: 'gap_biceps',
        type: 'direct_isolation',
        severity: 'medium',
        muscle: 'biceps',
        title: t('Direct Biceps Stimulation'),
        description: t('Biceps receive indirect assistance during pulling, but direct flexion work is missing for arm development and elbow tendon resilience.'),
        recommendedExercises: getRecommendedExercisesForMuscle('biceps', 3, routineExIds)
      })
    }

    // 6. Missing Direct Triceps Isolation in Push Focus
    if ((load.chest || 0) >= 3 && !hasPrimaryTriceps && (load.triceps || 0) < 1.8) {
      gaps.push({
        id: 'gap_triceps',
        type: 'direct_isolation',
        severity: 'medium',
        muscle: 'triceps',
        title: t('Direct Triceps Stimulation'),
        description: t('Chest pressing provides compound assistance, but isolated elbow extension builds lockout strength and arm mass.'),
        recommendedExercises: getRecommendedExercisesForMuscle('triceps', 3, routineExIds)
      })
    }

    // 7. Missing Lateral Delts / Rear Delts
    if ((load.chest || 0) >= 3 && !hasPrimaryDelts && (load.deltoids || 0) < 1.8) {
      gaps.push({
        id: 'gap_deltoids',
        type: 'neglected_muscle',
        severity: 'medium',
        muscle: 'deltoids',
        title: t('Lateral & Rear Shoulders'),
        description: t('Pressing hits primarily the anterior shoulder head. Lateral raises or face pulls create shoulder width and joint stability.'),
        recommendedExercises: getRecommendedExercisesForMuscle('deltoids', 3, routineExIds)
      })
    }

    // 8. Core / Abdominal Gap in Full Body or Multi-Compound Sessions
    const isBigSession = exList.length >= 4
    if (isBigSession && (load.abs || 0) === 0 && (load.obliques || 0) === 0) {
      gaps.push({
        id: 'gap_core',
        type: 'neglected_muscle',
        severity: 'low',
        muscle: 'abs',
        title: t('Direct Core & Anti-Extension'),
        description: t('No direct abdominal or trunk stabilization exercises found. Adding 2-3 sets of hanging leg raises or ab rollouts reinforces lumbar spine protection.'),
        recommendedExercises: getRecommendedExercisesForMuscle('abs', 3, routineExIds)
      })
    }

    // 9. Glute / Posterior Hip Extension Gap in Leg Sessions
    if (categoryVolumes.legs.sets >= 4 && !hasPrimaryGlutes && (load.gluteal || 0) < 2) {
      gaps.push({
        id: 'gap_glutes',
        type: 'neglected_muscle',
        severity: 'medium',
        muscle: 'gluteal',
        title: t('Gluteal & Hip Extension'),
        description: t('Leg session has little dedicated hip drive. Hip thrusts or Romanian deadlifts maximize sprint power and protect the lower back.'),
        recommendedExercises: getRecommendedExercisesForMuscle('gluteal', 3, routineExIds)
      })
    }

    // 10. Calves Omission in Lower Body Sessions
    if (categoryVolumes.legs.sets >= 5 && (load.calves || 0) === 0) {
      gaps.push({
        id: 'gap_calves',
        type: 'neglected_muscle',
        severity: 'low',
        muscle: 'calves',
        title: t('Calves & Ankle Plantarflexion'),
        description: t('Lower leg calves are unaddressed. Calf raises strengthen the Achilles tendon and lower leg power.'),
        recommendedExercises: getRecommendedExercisesForMuscle('calves', 3, routineExIds)
      })
    }
  }

  // Summary counts
  const engagedMuscles = MUSCLES.filter(m => (load[m] || 0) > 0)
  const primaryMuscles = MUSCLES.filter(m => (load[m] || 0) >= 3)
  const untrainedMuscles = MUSCLES.filter(m => (load[m] || 0) === 0)

  return {
    routineId: routine?.id,
    routineName: routine?.name || t('Routine'),
    load,
    totalEffectiveSets,
    totalExercises: exList.length,
    categoryVolumes,
    pushPullBalance: {
      pushSets,
      pullSets,
      ratio: pushPullRatio,
      status: pushPullStatus
    },
    quadHamBalance: {
      quadSets,
      hamSets,
      ratio: quadHamRatio,
      status: quadHamStatus
    },
    muscleBreakdown,
    engagedMusclesCount: engagedMuscles.length,
    primaryMusclesCount: primaryMuscles.length,
    untrainedMusclesCount: untrainedMuscles.length,
    coverageScore: Math.round((engagedMuscles.length / MUSCLES.length) * 100),
    gaps
  }
}
