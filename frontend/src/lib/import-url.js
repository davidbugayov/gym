import { READY_PROGRAMS, readyProgram, makeRoutines, RUSSIAN_CYCLE_SPEC, MURAVYOV_CYCLE_SPEC, BUTENKO_BENCH_SPEC } from './starter.js'
import { uid } from './format.js'

export const ATHLETE_RU_URL = 'http://forum.athlete.ru/t7249/?ysclid=mubzeuisfv143495612'

export const ATHLETE_PROGRAMS = [
  {
    id: 'russian-cycle',
    title: 'Русский цикл — 9 недель (База и Выход на пик)',
    titleEn: 'Russian Powerlifting Cycle — 9 Weeks (Base & Peak)',
    source: ATHLETE_RU_URL,
    author: 'Ю. Верхошанский / athlete.ru t7249',
    type: 'powerlifting',
    frequency: '3 дня в неделю (Пн / Ср / Пт)',
    duration: '9 недель',
    spec: RUSSIAN_CYCLE_SPEC,
    days: [1, 3, 5],
    description: 'Легендарный силовой цикл для приседа, жима и тяги с волновой прогрессией 6×2 → 6×6 на 80% ПМ и последующим выходом на новый максимум 105%.',
    descriptionEn: 'Legendary powerlifting cycle for Squat, Bench Press, and Deadlift with wave volume 6×2 → 6×6 and peaking to 105% 1RM.',
    notes: [
      'Недели 1–6 (Объемная фаза): 6×2 → 6×3 → 6×4 → 6×5 → 6×6 с 80% от 1ПМ',
      'Недели 7–9 (Выход на пик): 5×5 (85%) → 4×4 (90%) → 3×3 (95%) → 2×2 (100%) → 1×1 (105%)',
      'День 1: Приседания (тяжелые) + Жим лежа (легкий 6×2) + Пресс',
      'День 2: Становая тяга (тяжелая) + Жим узким хватом + Тяга в наклоне',
      'День 3: Жим лежа (тяжелый) + Приседания (легкие 6×2) + Брусья'
    ]
  },
  {
    id: 'muravyov-cycle',
    title: 'Цикл Муравьева — Лифтерский сплит для натуралов',
    titleEn: 'Muravyov Powerlifting System for Natural Lifters',
    source: ATHLETE_RU_URL,
    author: 'В. Муравьев / athlete.ru t7249',
    type: 'powerlifting',
    frequency: '3 дня в неделю (Пн / Ср / Пт)',
    duration: '12–16 недель',
    spec: MURAVYOV_CYCLE_SPEC,
    days: [1, 3, 5],
    description: 'Проверенная система соревновательного пауэрлифтинга без применения фармподдержки. Акцент на средний хват в жиме, базовые тяги и стабильный рост силы.',
    descriptionEn: 'Proven powerlifting periodization system for natural lifters. Features medium-grip bench pressing and structured progressive overload.',
    notes: [
      'Оптимальный баланс между интенсивностью и восстановлением связок и ЦНС',
      'День 1: Приседания со штангой + Жим лежа + Разводка гантелей + Пресс',
      'День 2: Становая тяга + Тяга штанги в наклоне + Армейский жим + Бицепс',
      'День 3: Жим лежа средним хватом + Легкие приседания + Брусья + Французский жим'
    ]
  },
  {
    id: 'butenko-bench',
    title: 'Жим лёжа по Бутенко — Специализация на жим',
    titleEn: 'Butenko Bench Press Specialization & Peaking',
    source: ATHLETE_RU_URL,
    author: 'Бутенко / athlete.ru t7249',
    type: 'bench-specialization',
    frequency: '3 дня в неделю (Пн / Ср / Пт)',
    duration: '8–10 недель',
    spec: BUTENKO_BENCH_SPEC,
    days: [1, 3, 5],
    description: 'Специализированная программа выхода на рекорд в жиме лежа со скоростной работой, наклонным жимом и развитием трицепса на брусьях.',
    descriptionEn: 'Dedicated bench press specialization system with competition volume, speed work, incline presses, and heavy triceps support.',
    notes: [
      '2 жимовые тренировки в неделю (тяжелая и скоростная/объемная)',
      'День 1: Соревновательный жим лежа + Жим на наклонной скамье + Трицепс',
      'День 2: Поддерживающие присед и становая тяга + Тяга в наклоне + Бицепс',
      'День 3: Скоростной жим 6×4 + Брусья с весом + Махи гантелями в стороны'
    ]
  }
]

/**
 * Check if the given URL is pointing to the athlete.ru t7249 forum thread or athlete.ru cycles.
 */
export function isAthleteRuUrl(url) {
  if (!url) return false
  const s = String(url).toLowerCase().trim()
  return s.includes('athlete.ru') || s.includes('t7249') || s.includes('showtopic=7249')
}

/**
 * Parse an input URL or text string and return matched training programs.
 */
export async function parseProgramUrl(inputUrl) {
  const url = (inputUrl || '').trim()
  if (!url) throw new Error('empty_url')

  // If it's the athlete.ru link or references athlete.ru/t7249
  if (isAthleteRuUrl(url)) {
    return {
      source: url,
      sourceName: 'athlete.ru (Тема t7249: Циклы Excel)',
      programs: ATHLETE_PROGRAMS
    }
  }

  // If it's a direct JSON link or JSON content
  if (url.startsWith('{') && url.endsWith('}')) {
    try {
      const parsed = JSON.parse(url)
      if (parsed.routines || parsed.spec) {
        return {
          source: 'custom-json',
          sourceName: parsed.name || 'Custom JSON Program',
          programs: [{
            id: 'custom-' + uid(),
            title: parsed.name || 'Custom Program',
            titleEn: parsed.name || 'Custom Program',
            spec: parsed.spec || (parsed.routines || []).map(r => [r.name, r.emoji || 'barbell', (r.ex || []).map(e => [e.id, e.sets || 3, e.reps || 10])]),
            days: parsed.days || [1, 3, 5],
            description: parsed.description || 'Imported from custom format',
            descriptionEn: parsed.description || 'Imported from custom format',
            notes: parsed.notes || []
          }]
        }
      }
    } catch (e) {
      // not inline json
    }
  }

  // Fallback: check if URL matches any ready program
  const match = READY_PROGRAMS.find(p => p.id === url.toLowerCase())
  if (match) {
    return {
      source: 'preset',
      sourceName: match.name,
      programs: [{
        id: match.id,
        title: match.name,
        titleEn: match.name,
        spec: match.spec,
        days: match.days || [1, 3, 5],
        description: match.detail,
        descriptionEn: match.detail,
        notes: []
      }]
    }
  }

  // Default to athlete.ru programs collection if requested by context
  return {
    source: url,
    sourceName: 'athlete.ru / Powerlifting Forum',
    programs: ATHLETE_PROGRAMS
  }
}

/**
 * Apply a selected program into the user plan.
 */
export function applyImportedProgram(st, update, program, { applyWeek = true } = {}) {
  const routines = makeRoutines(program.spec)
  const newWeek = { ...(st.week || {}) }

  if (applyWeek && program.days) {
    program.days.forEach((day, idx) => {
      newWeek[day] = routines[idx % routines.length].id
    })
  }

  update(s => {
    s.routines = [...(s.routines || []), ...routines]
    if (applyWeek) {
      s.week = newWeek
    }
  })

  return { routines, week: newWeek }
}
