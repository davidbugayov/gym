import re

with open("/Users/dsbugaev/StudioProject/gym/frontend/src/lib/starter.js", "r") as f:
    content = f.read()

new_specs = """
// ---------------- Superbiceps Programs ----------------

const ACHILLES_SPEC = [
  ['Ахиллес A', 'dumbbell', [['0289', 3, 10], ['0426', 3, 10], ['0251', 3, 10], ['0334', 3, 12]]],
  ['Ахиллес B', 'dumbbell', [['0292', 3, 10], ['0293', 3, 10], ['0313', 3, 12], ['0061', 3, 12]]],
  ['Ахиллес C', 'dumbbell', [['0413', 3, 10], ['0336', 3, 12], ['1459', 3, 10], ['0431', 3, 12]]]
]

const ACHILLES_2_SPEC = [
  ['Ахиллес-2 Push', 'dumbbell', [['0289', 4, 10], ['0426', 4, 10], ['0251', 4, 10], ['0334', 4, 12]]],
  ['Ахиллес-2 Pull', 'dumbbell', [['0292', 4, 10], ['0293', 4, 10], ['0313', 4, 12], ['0061', 4, 12]]],
  ['Ахиллес-2 Legs', 'dumbbell', [['0413', 4, 10], ['0336', 4, 12], ['1459', 4, 10], ['0431', 4, 12]]]
]

const ZEUS_SPEC = [
  ['Зевс Pull', 'pullup', [['2330', 4, 10], ['1473', 4, 10], ['1323', 3, 12]]],
  ['Зевс Push', 'bodyweight', [['0662', 4, 15], ['1326', 4, 10], ['0464', 3, 20]]],
  ['Зевс Legs/Core', 'bodyweight', [['1460', 4, 15], ['0274', 3, 20], ['0001', 4, 15]]]
]

const THESEUS_SPEC = [
  ['Тесей Push', 'barbell', [['0025', 3, 8], ['0047', 3, 8], ['0241', 3, 10]]],
  ['Тесей Pull', 'barbell', [['0027', 3, 8], ['2330', 3, 8], ['0313', 3, 10]]],
  ['Тесей Legs', 'barbell', [['0043', 3, 8], ['0085', 3, 10], ['0739', 3, 12]]]
]

const THESEUS_2_SPEC = [
  ['Тесей-2 Push', 'barbell', [['0025', 4, 6], ['0047', 4, 6], ['0241', 4, 8]]],
  ['Тесей-2 Pull', 'barbell', [['0027', 4, 6], ['2330', 4, 6], ['0313', 4, 8]]],
  ['Тесей-2 Legs', 'barbell', [['0043', 4, 6], ['0085', 4, 8], ['0739', 4, 10]]]
]

const JASON_SPEC = [
  ['Ясон Upper', 'barbell', [['0025', 4, 8], ['0047', 3, 10], ['2330', 3, 10], ['0313', 3, 12]]],
  ['Ясон Lower', 'legs', [['0739', 4, 12], ['0585', 3, 12], ['0605', 4, 15]]],
  ['Ясон Arms', 'barbell', [['0313', 4, 12], ['0334', 4, 12], ['0251', 3, 15]]]
]

const UNIVERSAL_SPEC = [
  ['Универсальный A', 'bodyweight', [['0662', 3, 15], ['1460', 3, 15], ['0001', 3, 20]]],
  ['Универсальный B', 'bodyweight', [['2330', 3, 8], ['1473', 3, 10], ['0274', 3, 15]]]
]

const BENCH_FOCUS_SPEC = [
  ['Жим Тяжелый', 'barbell', [['0025', 5, 5], ['0047', 4, 8], ['0241', 3, 10]]],
  ['Жим Легкий', 'barbell', [['0025', 3, 12], ['2330', 4, 10], ['0313', 3, 12]]],
  ['Подсобка', 'dumbbell', [['0289', 4, 10], ['0426', 3, 10], ['0334', 3, 12]]]
]

const COLOSSUS_SPEC = [
  ['Колосс 1', 'barbell', [['0025', 4, 8]]],
  ['Колосс 2', 'barbell', [['0027', 4, 8]]],
  ['Колосс 3', 'barbell', [['0043', 4, 8]]],
  ['Колосс 4', 'dumbbell', [['0047', 4, 10]]],
  ['Колосс 5', 'bodyweight', [['2330', 4, 10]]],
  ['Колосс 6', 'legs', [['0739', 4, 12]]],
  ['Колосс 7', 'bodyweight', [['0001', 4, 20]]]
]

export const makeRoutines ="""

new_programs = """
  { id: 'sb-achilles', name: 'АХИЛЛЕС', detail: '3 дня · Гантели и скамья (Superbiceps)', spec: ACHILLES_SPEC, days: [1, 3, 5], goals: ['muscle', 'fitness'], equip: ['dumbbell', 'gym'], requiredEquip: ['dumbbell'], altEquipGroups: [], levels: ['beginner', 'regular'], freq: [3, 3], minutes: 45 },
  { id: 'sb-achilles-2', name: 'АХИЛЛЕС-2', detail: '3 дня · Продолжение Ахиллеса (Superbiceps)', spec: ACHILLES_2_SPEC, days: [1, 3, 5], goals: ['muscle', 'fitness'], equip: ['dumbbell', 'gym'], requiredEquip: ['dumbbell'], altEquipGroups: [], levels: ['regular', 'advanced'], freq: [3, 3], minutes: 55 },
  { id: 'sb-zeus', name: 'ЗЕВС', detail: '3 дня · Универсальная турник, брусья (Superbiceps)', spec: ZEUS_SPEC, days: [1, 3, 5], goals: ['fitness', 'endurance'], equip: ['bodyweight'], requiredEquip: ['bodyweight'], altEquipGroups: [], levels: ['regular'], freq: [3, 3], minutes: 40 },
  { id: 'sb-theseus', name: 'ТЕСЕЙ', detail: '3 дня · Базовые упражнения в зале (Superbiceps)', spec: THESEUS_SPEC, days: [1, 3, 5], goals: ['muscle', 'fitness'], equip: ['barbell', 'gym'], requiredEquip: ['barbell', 'gym'], altEquipGroups: [], levels: ['regular'], freq: [3, 3], minutes: 60 },
  { id: 'sb-theseus-2', name: 'ТЕСЕЙ-2', detail: '3 дня · Новый уровень силы и массы (Superbiceps)', spec: THESEUS_2_SPEC, days: [1, 3, 5], goals: ['muscle'], equip: ['barbell', 'gym'], requiredEquip: ['barbell', 'gym'], altEquipGroups: [], levels: ['advanced'], freq: [3, 3], minutes: 65 },
  { id: 'sb-jason', name: 'ЯСОН', detail: '3 дня · Без становой и приседа (Superbiceps)', spec: JASON_SPEC, days: [1, 3, 5], goals: ['muscle'], equip: ['barbell', 'gym'], requiredEquip: ['barbell'], altEquipGroups: [], levels: ['regular', 'advanced'], freq: [3, 3], minutes: 50 },
  { id: 'sb-universal', name: 'Универсальный спортсмен', detail: '2 дня · Бюджетная программа (Superbiceps)', spec: UNIVERSAL_SPEC, days: [2, 5], goals: ['fitness'], equip: ['bodyweight'], requiredEquip: ['bodyweight'], altEquipGroups: [], levels: ['beginner'], freq: [2, 2], minutes: 30 },
  { id: 'sb-bench', name: 'Акцент на жим лежа', detail: '3 дня · Сниженная нагрузка на ноги (Superbiceps)', spec: BENCH_FOCUS_SPEC, days: [1, 3, 5], goals: ['muscle', 'fitness'], equip: ['barbell', 'gym'], requiredEquip: ['barbell'], altEquipGroups: [], levels: ['regular', 'advanced'], freq: [3, 3], minutes: 50 },
  { id: 'sb-colossus', name: 'КОЛОСС', detail: '7 дней · Универсальная программа (Superbiceps)', spec: COLOSSUS_SPEC, days: [1, 2, 3, 4, 5, 6, 0], goals: ['muscle', 'endurance'], equip: ['barbell', 'dumbbell', 'bodyweight', 'gym'], requiredEquip: ['gym'], altEquipGroups: [], levels: ['advanced'], freq: [7, 7], minutes: 40 },
]

// Fresh routine objects"""

content = content.replace("export const makeRoutines =", new_specs)
content = content.replace("]\n\n// Fresh routine objects", new_programs)

with open("/Users/dsbugaev/StudioProject/gym/frontend/src/lib/starter.js", "w") as f:
    f.write(content)
