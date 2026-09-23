// The ready-made programs. Shared by the Plan view's "Ready-made programs" sheet and
// by the demo build, which seeds a history on top of exactly these routines.
//
// Each program is inspired by a common training split structure. The specs use exercise
// ids from the local exercises database (exercises-data.js), not from any external source.
import { uid } from './format.js'

// Push / Pull / Legs — 3 days, balanced hypertrophy
const PPL_SPEC = [
  ['Push Day', 'barbell', [['0025', 4, 8], ['0047', 3, 10], ['0426', 3, 10], ['0334', 3, 12], ['0241', 3, 12], ['0251', 3, 10]]],
  ['Pull Day', 'pullup', [['2330', 4, 10], ['0027', 4, 8], ['1323', 3, 10], ['0031', 3, 10], ['0313', 3, 12]]],
  ['Leg Day', 'legs', [['0043', 4, 8], ['0085', 3, 10], ['0739', 3, 12], ['0585', 3, 12], ['0586', 3, 12], ['0605', 4, 15]]]
]

// Full Body — 3 days, simple strength and muscle
const FULL_BODY_SPEC = [
  ['Full Body A', 'barbell', [['0043', 4, 8], ['0025', 4, 8], ['0027', 4, 10], ['0334', 3, 12]]],
  ['Full Body B', 'dumbbell', [['0085', 4, 10], ['0047', 4, 10], ['2330', 3, 10], ['0313', 3, 12]]],
  ['Full Body C', 'kettlebell', [['0739', 4, 10], ['0426', 4, 10], ['1323', 3, 10], ['0251', 3, 12]]]
]

// 5×5 Strength — 3 days, barbell-focused linear progression
const FIVE_BY_FIVE_SPEC = [
  ['5×5 A', 'barbell', [['0043', 5, 5], ['0025', 5, 5], ['0027', 5, 5]]],
  ['5×5 B', 'barbell', [['0043', 5, 5], ['0047', 5, 5], ['2330', 5, 5]]]
]

// Upper / Lower Split — 4 days, alternating upper and lower body
const UPPER_LOWER_SPEC = [
  ['Upper A', 'barbell', [['0025', 4, 8], ['0027', 4, 8], ['0047', 3, 10], ['0091', 3, 10], ['0031', 3, 12], ['0030', 3, 10]]],
  ['Lower A', 'legs', [['0043', 4, 8], ['0085', 4, 10], ['0054', 3, 10], ['0585', 3, 12], ['1372', 4, 15], ['0605', 3, 12]]],
  ['Upper B', 'dumbbell', [['2330', 4, 10], ['0289', 4, 10], ['0091', 3, 10], ['0292', 3, 10], ['0313', 3, 12], ['0061', 3, 12]]],
  ['Lower B', 'barbell', [['0032', 4, 6], ['0042', 4, 8], ['0115', 3, 10], ['0586', 3, 12], ['0088', 4, 15], ['0001', 3, 15]]]
]

// Bodyweight HIIT — 3 days, high-intensity bodyweight circuits.
// Cardio-family exercises (bp 'cardio' in the DB) are stored as time or cardio entries —
// never as reps, so modeOf() and the Workout screen read them correctly.
const BODYWEIGHT_HIIT_SPEC = [
  ['Circuit A', 'bodyweight', [{ id: '1160', sets: 4, sec: 40, weight: 0, mode: 'time' }, ['3294', 4, 12], { id: '0630', sets: 4, sec: 40, weight: 0, mode: 'time' }, { id: '3220', sets: 4, sec: 45, weight: 0, mode: 'time' }, ['0003', 3, 20], ['0001', 3, 15]]],
  ['Circuit B', 'bodyweight', [['1473', 4, 12], ['3293', 4, 8], { id: '0501', sets: 4, sec: 40, weight: 0, mode: 'time' }, { id: '2612', sets: 4, min: 2, speed: 8 }, ['0006', 3, 20], ['0002', 3, 15]]],
  ['Circuit C', 'bodyweight', [{ id: '3360', sets: 4, sec: 40, weight: 0, mode: 'time' }, ['3294', 4, 10], { id: '3222', sets: 4, sec: 45, weight: 0, mode: 'time' }, { id: '0630', sets: 4, sec: 40, weight: 0, mode: 'time' }, ['0011', 3, 12], ['0014', 3, 15]]]
]

// Athletic Performance — 4 days, combining strength and conditioning
const ATHLETIC_SPEC = [
  ['Power Lower', 'barbell', [['0043', 5, 5], ['0032', 4, 5], ['1473', 3, 8], ['0054', 3, 8], ['1372', 3, 12]]],
  ['Power Upper', 'barbell', [['0025', 5, 5], ['0027', 4, 6], ['0091', 3, 8], ['0031', 3, 10], ['0030', 3, 8]]],
  ['Conditioning', 'figureRun', [{ id: '1160', sets: 5, sec: 40, weight: 0, mode: 'time' }, { id: '0630', sets: 4, sec: 40, weight: 0, mode: 'time' }, { id: '2612', sets: 4, min: 2, speed: 8 }, { id: '3220', sets: 4, sec: 30, weight: 0, mode: 'time' }, { id: '3361', sets: 3, sec: 45, weight: 0, mode: 'time' }, ['0001', 3, 15]]],
  ['Strength Full', 'dumbbell', [['0289', 4, 8], ['0292', 4, 8], ['0085', 3, 10], ['0047', 3, 10], ['0313', 3, 12], ['0001', 3, 15]]]
]

// Core & Mobility — 2 days, focused on core strength and flexibility
const CORE_MOBILITY_SPEC = [
  ['Core Strength', 'bodyweight', [['0001', 4, 15], ['0011', 4, 12], ['0003', 4, 20], ['0006', 3, 20], ['0002', 3, 15], ['0014', 3, 15]]],
  ['Mobility Flow', 'stretch', [['1512', 3, 30], ['1709', 3, 30], ['1713', 3, 30], ['1405', 3, 30], ['1368', 3, 20], ['1712', 3, 30]]]
]

// Arnold Schwarzenegger Golden Era Split — 3–6 days, antagonistic supersets & high volume
const ARNOLD_SPLIT_SPEC = [
  ['Chest & Back', 'barbell', [['0025', 4, 10], ['0027', 4, 10], ['9005', 4, 10], ['2330', 4, 10], ['0334', 3, 12]]],
  ['Shoulders & Arms', 'dumbbell', [['0047', 4, 10], ['9006', 4, 12], ['9003', 3, 15], ['0031', 4, 10], ['0030', 4, 12]]],
  ['Legs & Core', 'legs', [['0043', 4, 10], ['9001', 4, 10], ['9007', 3, 12], ['9004', 3, 8], ['9010', 4, 15]]]
]

// Glute & Lower Body Focus — 3 days, maximum glute and posterior chain development
const GLUTE_FOCUS_SPEC = [
  ['Glutes & Quads', 'legs', [['9001', 4, 8], ['9002', 3, 10], ['0043', 4, 8], ['0605', 3, 15]]],
  ['Posterior Chain', 'barbell', [['9007', 4, 10], ['9004', 4, 8], ['0032', 3, 5], ['0088', 4, 15]]],
  ['Glute Pump & Shape', 'dumbbell', [['9001', 4, 12], ['9002', 3, 12], ['0085', 3, 12], ['9010', 3, 15]]]
]

// Dumbbell-Only Home Workout — 3 days, full body with just adjustable dumbbells
const DUMBBELL_HOME_SPEC = [
  ['DB Upper Body', 'dumbbell', [['9005', 4, 10], ['0289', 4, 10], ['0292', 4, 10], ['0426', 3, 12], ['0313', 3, 12]]],
  ['DB Lower Body', 'dumbbell', [['9002', 4, 10], ['9007', 4, 10], ['0336', 3, 12], ['1373', 3, 20]]],
  ['DB Full Body Blitz', 'dumbbell', [['0289', 3, 10], ['0292', 3, 10], ['9002', 3, 10], ['0426', 3, 10], ['9010', 3, 15]]]
]

// Calisthenics & Street Workout Mastery — 3 days, pure bodyweight gymnastics
const CALISTHENICS_MASTERY_SPEC = [
  ['Bars & Dips Power', 'pullup', [['2330', 4, 8], ['0251', 4, 10], ['0662', 4, 12], ['9010', 4, 12]]],
  ['Legs & Core Tension', 'bodyweight', [['9004', 4, 8], ['1473', 4, 15], ['0514', 4, 20], ['9010', 4, 15]]],
  ['Full Body Flow', 'bodyweight', [['2330', 4, 8], ['0251', 4, 10], ['1460', 4, 12], ['0464', 3, 20]]]
]

// Conditioning & Ergometer HIIT — 3 days, rower and air bike metabolic conditioning
const CONDITIONING_SPEC = [
  ['Rower & Core Engine', 'figureRun', [{ id: '9008', sets: 5, min: 3, speed: 24 }, ['9010', 4, 15], { id: '0630', sets: 4, sec: 45, weight: 0, mode: 'time' }]],
  ['Air Bike HIIT', 'leverage', [{ id: '9009', sets: 6, sec: 30, weight: 0, mode: 'time' }, ['0534', 4, 15], { id: '1160', sets: 4, sec: 40, weight: 0, mode: 'time' }]],
  ['Ergometer Medley', 'cardio', [{ id: '9008', sets: 3, min: 5, speed: 22 }, { id: '9009', sets: 4, min: 3, speed: 60 }, ['0001', 3, 25]]]
]

// Russian Powerlifting Cycle (Русский цикл — 9 недель) from forum.athlete.ru/t7249
export const RUSSIAN_CYCLE_SPEC = [
  ['Русский цикл: Присед / Жим', 'barbell', [['0043', 6, 2], ['0025', 6, 2], ['0001', 3, 20]]],
  ['Русский цикл: Тяга / Спина', 'barbell', [['0032', 5, 3], ['0030', 4, 6], ['0027', 4, 8]]],
  ['Русский цикл: Жим / Брусья', 'barbell', [['0025', 6, 3], ['0043', 6, 2], ['0251', 4, 8]]]
]

// Muravyov Powerlifting System (Цикл Муравьева) from forum.athlete.ru/t7249
export const MURAVYOV_CYCLE_SPEC = [
  ['Муравьев: День 1 (Ноги / Грудь)', 'barbell', [['0043', 5, 5], ['0025', 4, 8], ['0289', 3, 10], ['0001', 3, 20]]],
  ['Муравьев: День 2 (Тяга / Плечи)', 'barbell', [['0032', 4, 5], ['0027', 4, 8], ['0047', 4, 8], ['0031', 3, 10]]],
  ['Муравьев: День 3 (Жим средний хват)', 'barbell', [['0025', 5, 5], ['0043', 4, 6], ['0251', 3, 10], ['0030', 3, 10]]]
]

// Butenko Bench Press Specialization (Жим по Бутенко) from forum.athlete.ru/t7249
export const BUTENKO_BENCH_SPEC = [
  ['Бутенко: Жим тяжелый', 'barbell', [['0025', 5, 3], ['0047', 4, 6], ['0030', 3, 8]]],
  ['Бутенко: База и Спина', 'barbell', [['0043', 4, 6], ['0032', 3, 5], ['0027', 4, 8], ['0031', 3, 10]]],
  ['Бутенко: Жим скоростной / Брусья', 'barbell', [['0025', 6, 4], ['0251', 4, 8], ['9006', 4, 12]]]
]

/* ---- Program Wizard programs (see lib/program-match.js for the matching logic) ----
   Every exercise id below comes from the local exercises database. */

// Strong Start — 3 days, beginner full body A/B/C, bodyweight + dumbbells
const STRONG_START_SPEC = [
  ['Full Body A', 'dumbbell', [['1760', 3, 10], ['0289', 3, 10], ['0293', 3, 10], ['0464', 2, 20], ['1373', 2, 15]]],
  ['Full Body B', 'dumbbell', [['0336', 3, 10], ['0426', 3, 10], ['0292', 3, 10], ['0872', 2, 15], ['1387', 2, 12]]],
  ['Full Body C', 'bodyweight', [['1460', 3, 12], ['0662', 3, 10], ['0251', 2, 8], ['0464', 2, 20], ['1373', 2, 15]]]
]

// Strength Growth — 3 days, barbell A/B/C with sensible 5×5 on the main lifts
const STRENGTH_GROWTH_SPEC = [
  ['Strength A', 'barbell', [['0043', 5, 5], ['0025', 5, 5], ['0027', 5, 5]]],
  ['Strength B', 'barbell', [['0032', 3, 5], ['0047', 4, 8], ['0091', 4, 8], ['0085', 3, 8]]],
  ['Strength C', 'barbell', [['0043', 4, 6], ['0027', 4, 8], ['0030', 3, 8], ['0061', 3, 10]]]
]

// Balance & Variety — 4 days, mixed bodyweight / dumbbell / kettlebell push-pull-legs + conditioning
const BALANCE_SPEC = [
  ['Push', 'dumbbell', [['0426', 4, 10], ['0289', 4, 10], ['0251', 3, 10], ['0334', 3, 12]]],
  ['Pull', 'pullup', [['0652', 4, 8], ['0292', 4, 10], ['0541', 3, 10], ['0313', 3, 12]]],
  ['Legs', 'kettlebell', [['0534', 4, 10], ['0336', 3, 10], ['0549', 3, 15], ['1373', 3, 15]]],
  ['Full Body', 'bodyweight', [{ id: '1160', sets: 3, sec: 40, weight: 0, mode: 'time' }, ['2133', 3, 30], { id: '0630', sets: 3, sec: 30, weight: 0, mode: 'time' }, ['0464', 3, 20]]]
]

// Burn & Run — 3 days, two gentle run sessions + one full-body circuit
const BURN_RUN_SPEC = [
  ['Easy Run', 'figureRun', [{ id: '0685', sets: 1, min: 30, speed: 8 }, ['1373', 2, 15], ['1368', 2, 20]]],
  ['Light Intervals', 'figureRun', [{ id: '0685', sets: 4, min: 5, speed: 9 }, { id: '3656', sets: 4, min: 1, speed: 11 }, { id: '0630', sets: 3, sec: 30, weight: 0, mode: 'time' }]],
  ['Circuit Day', 'bodyweight', [{ id: '1160', sets: 3, sec: 40, weight: 0, mode: 'time' }, ['1460', 3, 12], ['0662', 3, 12], ['0464', 3, 20], { id: '2612', sets: 3, min: 2, speed: 8 }]]
]

// Home Base — 2–3 days, bodyweight only, short full-body sessions with a simple progression
const HOME_BASE_SPEC = [
  ['Foundation', 'bodyweight', [['0659', 3, 10], ['1685', 3, 12], ['0815', 2, 10], ['0274', 2, 15], ['1373', 2, 15]]],
  ['Progression', 'bodyweight', [['0662', 3, 10], ['2368', 3, 10], ['3166', 3, 12], ['0872', 2, 15], ['1387', 2, 12]]],
  ['Stronger', 'bodyweight', [['0251', 3, 8], ['1460', 3, 12], ['0662', 3, 12], ['0464', 3, 20], ['1473', 2, 15]]]
]

// Universal warm-up and cool-down — prepended / appended to every workout session.
// Inspired by the Freeletics dynamic warm-up + static cool-down pattern.
export const WARMUP = [
  { id: '3224', sets: 1, sec: 45, weight: 0, mode: 'time', phase: 'warmup' }, // jack jump
  { id: '0630', sets: 1, sec: 45, weight: 0, mode: 'time', phase: 'warmup' }, // mountain climber
  { id: '1471', sets: 1, sec: 30, weight: 0, mode: 'time', phase: 'warmup' }  // inchworm
]

export const COOLDOWN = [
  { id: '1604', sets: 1, sec: 60, weight: 0, mode: 'time', phase: 'cooldown' }, // world greatest stretch
  { id: '1585', sets: 1, sec: 60, weight: 0, mode: 'time', phase: 'cooldown' }, // runners stretch
  { id: '1365', sets: 1, sec: 60, weight: 0, mode: 'time', phase: 'cooldown' }, // upper back stretch
  { id: '1511', sets: 1, sec: 45, weight: 0, mode: 'time', phase: 'cooldown' }  // hamstring stretch
]

// Legacy aliases – kept for backward compatibility
export const HERO_WARMUP = WARMUP
export const HERO_COOLDOWN = COOLDOWN

export const FREELETICS_SPEC = [
  ['Aphrodite', 'bodyweight', [{ id: '1160', sets: 5, sec: 40, weight: 0, mode: 'time' }, ['0514', 5, 25], ['0001', 5, 25]]],
  ['Morpheus', 'bodyweight', [['0662', 5, 20], { id: '2612', sets: 5, min: 1, speed: 10 }, ['1460', 5, 20]]],
  ['Athena', 'bodyweight', [{ id: '0630', sets: 5, sec: 40, weight: 0, mode: 'time' }, ['0001', 5, 25], ['0514', 5, 20]]]
]

export const makeRoutines = spec =>
  spec.map(([name, emoji, list]) => ({ id: uid(), name, emoji, ex: list.map(e => Array.isArray(e) ? { id: e[0], sets: e[1], reps: e[2], weight: 0 } : { ...e, weight: e.weight || 0 }) }))

export const freeleticsRoutines = () => makeRoutines(FREELETICS_SPEC)

// Ready-made programs with the metadata the Program Wizard matches on:
//   name / detail      — t() keys, translated in every locale
//   goals              — what the program is for (see GOALS in program-match.js)
//   equip              — what the program uses, for the summary chips and ranking
//   requiredEquip      — ALL of these must be available or the program is unusable
//   altEquipGroups     — alternatives: at least one group must be fully available.
//                        Empty list means no extra requirement beyond requiredEquip.
//   levels             — who it suits (see LEVELS)
//   freq               — [min, max] sessions per week it works with
//   minutes            — rough time per session, bucketed into the 20–30 / 35–45 / 50–70 answers
//   days               — the default Mon–Sun schedule (kept for the legacy path and the browse list)
// Note: 'gym' in a user's picks covers bodyweight / dumbbells / kettlebells, but never a
// barbell or outdoor running — see fitsEquipment() in program-match.js.
export const READY_PROGRAMS = [
  { id: 'ppl', name: 'Push / Pull / Legs', detail: '3 days · balanced hypertrophy', spec: PPL_SPEC, days: [1, 3, 5], goals: ['muscle', 'fitness'], equip: ['barbell', 'gym'], requiredEquip: ['gym', 'barbell'], altEquipGroups: [], levels: ['regular', 'advanced'], freq: [3, 3], minutes: 50 },
  { id: 'full-body', name: 'Full body', detail: '3 days · simple strength and muscle', spec: FULL_BODY_SPEC, days: [1, 3, 5], goals: ['muscle', 'fitness'], equip: ['barbell', 'dumbbell', 'kettlebell'], requiredEquip: ['gym'], altEquipGroups: [], levels: ['beginner', 'returning', 'regular'], freq: [3, 3], minutes: 40 },
  { id: 'five-by-five', name: '5×5 strength', detail: '3 days · barbell-focused', spec: FIVE_BY_FIVE_SPEC, days: [1, 3, 5, 1, 5], goals: ['muscle', 'fitness'], equip: ['barbell'], requiredEquip: ['barbell'], altEquipGroups: [], levels: ['regular', 'advanced'], freq: [3, 3], minutes: 60, alt: true },
  { id: 'upper-lower', name: 'Upper / Lower', detail: '4 days · strength and size', spec: UPPER_LOWER_SPEC, days: [1, 2, 4, 5], goals: ['muscle'], equip: ['barbell', 'gym', 'dumbbell'], requiredEquip: ['barbell', 'gym'], altEquipGroups: [], levels: ['regular', 'advanced'], freq: [4, 4], minutes: 60 },
  { id: 'bodyweight-hiit', name: 'Bodyweight circuits', detail: '3 days · high-intensity', spec: BODYWEIGHT_HIIT_SPEC, days: [1, 3, 5], goals: ['fatloss', 'endurance'], equip: ['bodyweight'], requiredEquip: ['bodyweight'], altEquipGroups: [], levels: ['returning', 'regular', 'advanced'], freq: [3, 3], minutes: 35 },
  { id: 'freeletics', name: 'Freeletics Bodyweight', detail: '3 days · iconic God workouts & high-intensity rounds', spec: FREELETICS_SPEC, days: [1, 3, 5], goals: ['fitness', 'endurance'], equip: ['bodyweight'], requiredEquip: ['bodyweight'], altEquipGroups: [], levels: ['beginner', 'returning', 'regular', 'advanced'], freq: [3, 3], minutes: 30 },
  { id: 'athletic', name: 'Athletic performance', detail: '4 days · power and conditioning', spec: ATHLETIC_SPEC, days: [1, 2, 4, 5], goals: ['fitness', 'endurance', 'muscle'], equip: ['barbell', 'bodyweight', 'dumbbell', 'gym'], requiredEquip: ['barbell', 'gym'], altEquipGroups: [], levels: ['regular', 'advanced'], freq: [4, 4], minutes: 60 },
  { id: 'core-mobility', name: 'Core & Mobility', detail: '2 days · recovery and stability', spec: CORE_MOBILITY_SPEC, days: [2, 5], goals: ['stress', 'fitness'], equip: ['bodyweight'], requiredEquip: ['bodyweight'], altEquipGroups: [], levels: ['beginner', 'returning', 'regular', 'advanced'], freq: [2, 2], minutes: 25 },
  { id: 'strong-start', name: 'Strong Start', detail: '3 days · beginner full body A/B/C', spec: STRONG_START_SPEC, days: [1, 3, 5], goals: ['muscle', 'fitness'], equip: ['bodyweight', 'dumbbell'], requiredEquip: [], altEquipGroups: [['dumbbell', 'bodyweight']], levels: ['beginner', 'returning'], freq: [3, 3], minutes: 40 },
  { id: 'strength-growth', name: 'Strength Growth', detail: '3 days · barbell A/B/C, 5×5 on the big lifts', spec: STRENGTH_GROWTH_SPEC, days: [1, 3, 5], goals: ['muscle', 'fitness'], equip: ['barbell'], requiredEquip: ['barbell'], altEquipGroups: [], levels: ['regular', 'advanced'], freq: [3, 3], minutes: 60 },
  { id: 'balance-variety', name: 'Balance & Variety', detail: '3–4 days · mixed push / pull / legs + conditioning', spec: BALANCE_SPEC, days: [1, 2, 4, 5], goals: ['fitness', 'muscle'], equip: ['bodyweight', 'dumbbell', 'kettlebell'], requiredEquip: ['bodyweight'], altEquipGroups: [['kettlebell', 'dumbbell']], levels: ['returning', 'regular'], freq: [3, 4], minutes: 45 },
  { id: 'burn-run', name: 'Burn & Run', detail: '3 days · easy runs + one full-body circuit', spec: BURN_RUN_SPEC, days: [1, 3, 5], goals: ['fatloss', 'endurance'], equip: ['run', 'bodyweight'], requiredEquip: ['run', 'bodyweight'], altEquipGroups: [], levels: ['beginner', 'returning', 'regular', 'advanced'], freq: [3, 3], minutes: 35 },
  { id: 'home-base', name: 'Home Base', detail: '2–3 days · short bodyweight full-body sessions', spec: HOME_BASE_SPEC, days: [1, 3, 5], goals: ['fitness', 'stress'], equip: ['bodyweight'], requiredEquip: ['bodyweight'], altEquipGroups: [], levels: ['beginner', 'returning'], freq: [2, 3], minutes: 25 }
]

export const SPECIAL_PROGRAMS = [
  { id: 'arnold-split', name: 'Arnold Schwarzenegger Split', detail: '3–6 days · antagonistic supersets & high volume hypertrophy', spec: ARNOLD_SPLIT_SPEC, days: [1, 3, 5], goals: ['muscle'], equip: ['barbell', 'dumbbell', 'gym'], requiredEquip: ['barbell', 'dumbbell'], altEquipGroups: [], levels: ['regular', 'advanced'], freq: [3, 6], minutes: 60 },
  { id: 'glute-focus', name: 'Glute & Posterior Chain Focus', detail: '3 days · hip thrusts, RDLs & targeted glute growth', spec: GLUTE_FOCUS_SPEC, days: [1, 3, 5], goals: ['muscle', 'fitness'], equip: ['barbell', 'dumbbell', 'gym'], requiredEquip: ['dumbbell'], altEquipGroups: [['barbell', 'dumbbell']], levels: ['beginner', 'returning', 'regular', 'advanced'], freq: [3, 3], minutes: 45 },
  { id: 'dumbbell-home', name: 'Dumbbell-Only Home System', detail: '3 days · complete full-body hypertrophy with dumbbells', spec: DUMBBELL_HOME_SPEC, days: [1, 3, 5], goals: ['muscle', 'fitness', 'fatloss'], equip: ['dumbbell'], requiredEquip: ['dumbbell'], altEquipGroups: [], levels: ['beginner', 'returning', 'regular'], freq: [3, 3], minutes: 40 },
  { id: 'calisthenics-mastery', name: 'Calisthenics & Street Mastery', detail: '3 days · bodyweight bars, dips & strict levers', spec: CALISTHENICS_MASTERY_SPEC, days: [1, 3, 5], goals: ['fitness', 'endurance', 'muscle'], equip: ['bodyweight'], requiredEquip: ['bodyweight'], altEquipGroups: [], levels: ['regular', 'advanced'], freq: [3, 3], minutes: 40 },
  { id: 'conditioning-longevity', name: 'Ergometer & Conditioning HIIT', detail: '3 days · rowing, air bike & functional engine', spec: CONDITIONING_SPEC, days: [1, 3, 5], goals: ['endurance', 'fatloss', 'fitness'], equip: ['gym', 'run'], requiredEquip: ['gym'], altEquipGroups: [], levels: ['returning', 'regular', 'advanced'], freq: [3, 3], minutes: 35 }
]

export const POWERLIFTING_CYCLES = [
  { id: 'russian-cycle', name: 'Russian Powerlifting Cycle (Русский цикл)', detail: '3 days · 9-week classic strength cycle from athlete.ru', spec: RUSSIAN_CYCLE_SPEC, days: [1, 3, 5], goals: ['muscle', 'fitness'], equip: ['barbell', 'gym'], requiredEquip: ['barbell'], altEquipGroups: [], levels: ['regular', 'advanced'], freq: [3, 3], minutes: 60, source: 'http://forum.athlete.ru/t7249/' },
  { id: 'muravyov-cycle', name: 'Muravyov Powerlifting System (Цикл Муравьева)', detail: '3 days · powerlifting periodization for natural lifters (athlete.ru)', spec: MURAVYOV_CYCLE_SPEC, days: [1, 3, 5], goals: ['muscle', 'fitness'], equip: ['barbell', 'gym'], requiredEquip: ['barbell'], altEquipGroups: [], levels: ['regular', 'advanced'], freq: [3, 3], minutes: 60, source: 'http://forum.athlete.ru/t7249/' },
  { id: 'butenko-bench', name: 'Butenko Bench Press Specialization (Жим по Бутенко)', detail: '3 days · bench press peak & hypertrophy cycle (athlete.ru)', spec: BUTENKO_BENCH_SPEC, days: [1, 3, 5], goals: ['muscle', 'fitness'], equip: ['barbell', 'gym'], requiredEquip: ['barbell'], altEquipGroups: [], levels: ['regular', 'advanced'], freq: [3, 3], minutes: 55, source: 'http://forum.athlete.ru/t7249/' }
]

export const ALL_PROGRAMS = [...READY_PROGRAMS, ...SPECIAL_PROGRAMS, ...POWERLIFTING_CYCLES]

// Fresh routine objects (new ids) — [push, pull, legs].
export const starterRoutines = () =>
  makeRoutines(PPL_SPEC)

// Mon–Sun slots for a given number of sessions per week.
const DAY_SLOTS = { 1: [3], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5] }

// Fresh routines plus the weekly schedule for one ready-made program.
// Without `sessions` this keeps the historical behaviour exactly (the demo build and the
// older tests rely on it). With `sessions` the program is trimmed to that many days per
// week — an A/B program alternates across the slots, the rest use the first routines.
export const readyProgram = (id, sessions) => {
  const program = ALL_PROGRAMS.find(item => item.id === id) || READY_PROGRAMS[0]
  const routines = makeRoutines(program.spec)
  const week = {}
  if (!sessions) {
    if (program.id === 'five-by-five') {
      week[1] = routines[0].id; week[3] = routines[1].id; week[5] = routines[0].id
    } else program.days.forEach((day, index) => { week[day] = (routines[index] || routines[index % routines.length]).id })
    return { ...program, routines, week }
  }
  const n = Math.max(1, Math.min(sessions, program.freq[1], program.alt ? program.freq[1] : program.spec.length))
  const routinesUsed = program.alt ? routines : routines.slice(0, n)
  const slots = DAY_SLOTS[Math.max(1, Math.min(sessions, program.freq[1]))] || DAY_SLOTS[3]
  slots.forEach((day, i) => { week[day] = routinesUsed[i % routinesUsed.length].id })
  return { ...program, routines: routinesUsed, week, sessions: n }
}
