import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const data = fs.readFileSync(path.join(rootDir, 'src/lib/exercises-data.js'), 'utf8')
const raw = data.slice(data.indexOf('['), data.lastIndexOf(']') + 1)
const exdb = JSON.parse(raw)

const newEx = [
  { id: '9001', n: 'barbell hip thrust' },
  { id: '9002', n: 'dumbbell bulgarian split squat' },
  { id: '9003', n: 'cable face pull' },
  { id: '9004', n: 'seated leg curl' },
  { id: '9005', n: 'cable lateral raise' },
  { id: '9006', n: 'dumbbell incline bench press' },
  { id: '9007', n: 'preacher curl' },
  { id: '9008', n: 'hanging leg raise' },
  { id: '9009', n: 'incline dumbbell curl' },
  { id: '9010', n: 'lying leg curl' }
]

const all = [...exdb, ...newEx]

const EXACT = {
  "3/4 sit-up": "подъемы туловища 3/4",
  "45° side bend": "боковые наклоны 45°",
  "air bike": "велосипед",
  "all fours squad stretch": "растяжка квадрицепсов на четвереньках",
  "alternate heel touchers": "попеременные касания пяток",
  "ankle circles": "круговые вращения стопами",
  "archer pull up": "подтягивания «лучник»",
  "archer push up": "отжимания «лучник»",
  "assisted hanging knee raise": "подъемы коленей в висе с поддержкой",
  "assisted hanging knee raise with throw down": "подъемы коленей в висе с броском",
  "assisted lying calves stretch": "растяжка икроножных лежа с поддержкой",
  "assisted lying glutes stretch": "растяжка ягодиц лежа с поддержкой",
  "assisted lying gluteus and piriformis stretch": "растяжка ягодичных и грушевидной мышцы",
  "assisted lying leg raise with lateral throw down": "подъемы ног лежа с боковым сбросом",
  "assisted lying leg raise with throw down": "подъемы ног лежа со сбросом",
  "assisted motion russian twist": "русский твист с поддержкой",
  "assisted parallel close grip pull-up": "подтягивания параллельным хватом в гравитроне",
  "assisted prone hamstring": "сгибание ног на животе с поддержкой",
  "assisted prone lying quads stretch": "растяжка квадрицепсов лежа на животе",
  "assisted prone rectus femoris stretch": "растяжка прямой мышцы бедра с поддержкой",
  "assisted pull-up": "подтягивания в гравитроне",
  "assisted seated pectoralis major stretch with stability ball": "растяжка грудных мышц сидя на фитболе",
  "assisted side lying adductor stretch": "растяжка приводящих мышц лежа на боку",
  "assisted sit-up": "подъемы туловища с фиксацией ног",
  "assisted standing chin-up": "подтягивания обратным хватом в гравитроне",
  "assisted standing pull-up": "подтягивания в гравитроне",
  "assisted standing triceps extension (with towel)": "разгибание на трицепс стоя с полотенцем",
  "assisted triceps dip (kneeling)": "отжимания на брусьях в гравитроне",
  "assisted wide-grip chest dip (kneeling)": "широкие отжимания на брусьях в гравитроне",
  "astride jumps (male)": "прыжки «ноги вместе — ноги врозь»",
  "back and forth step": "шаги вперед-назад",
  "back extension on exercise ball": "гиперэкстензия на фитболе",
  "back lever": "горизонт сзади (back lever)",
  "back pec stretch": "растяжка грудных мышц и спины",
  "backward jump": "прыжки назад",
  "balance board": "балансировочная доска",
  "barbell bench press": "жим штанги лежа",
  "barbell bent over row": "тяга штанги в наклоне",
  "barbell clean and press": "взятие на грудь и жим штанги",
  "barbell clean-grip front squat": "фронтальные приседания со штангой (тяжелоатлетический хват)",
  "barbell close-grip bench press": "жим штанги узким хватом",
  "barbell curl": "подъем штанги на бицепс",
  "barbell deadlift": "становая тяга со штангой",
  "barbell decline bench press": "жим штанги на скамье с обратным наклоном",
  "barbell front chest squat": "фронтальные приседания со штангой",
  "barbell front squat": "фронтальные приседания со штангой",
  "barbell full squat": "глубокие приседания со штангой",
  "barbell glute bridge": "ягодичный мостик со штангой",
  "barbell good morning": "наклоны со штангой (гуд морнинг)",
  "barbell hack squat": "гат-приседания со штангой",
  "barbell hip thrust": "ягодичный мост со штангой",
  "barbell incline bench press": "жим штанги на наклонной скамье",
  "barbell lunge": "выпады со штангой",
  "barbell lying triceps extension": "французский жим лежа со штангой",
  "barbell overhead squat": "приседания со штангой над головой",
  "barbell precher curl": "сгибания рук со штангой на скамье Скотта",
  "barbell reverse curl": "подъем штанги на бицепс обратным хватом",
  "barbell romanian deadlift": "румынская тяга со штангой",
  "barbell seated calf raise": "подъемы на носки сидя со штангой",
  "barbell seated overhead press": "армейский жим сидя со штангой",
  "barbell shrug": "шраги со штангой",
  "barbell side split squat": "боковые сплит-приседания со штангой",
  "barbell standing calf raise": "подъемы на носки стоя со штангой",
  "barbell standing overhead press": "армейский жим стоя со штангой",
  "barbell standing wide-grip curl": "подъем штанги на бицепс широким хватом",
  "barbell step-up": "зашагивания на платформу со штангой",
  "barbell stiff leg good morning": "наклоны «гуд морнинг» на прямых ногах",
  "barbell straight leg deadlift": "мертвая тяга на прямых ногах",
  "barbell sumo deadlift": "становая тяга «сумо» со штангой",
  "barbell upright row": "тяга штанги к подбородку",
  "barbell wrist curl": "сгибания запястий со штангой",
  "bear crawl": "медвежья походка",
  "bodyweight drop jump squat": "приседания с спрыгиванием и выпрыгиванием",
  "bodyweight incline push up": "отжимания с возвышенности",
  "bodyweight kneeling triceps extension": "разгибания на трицепс с колен",
  "bodyweight side lunge": "боковые выпады с собственным весом",
  "bodyweight squat": "воздушные приседания",
  "bodyweight standing calf raise": "подъемы на носки стоя",
  "bodyweight standing row": "австралийские подтягивания",
  "box jump": "прыжки на тумбу",
  "burpee": "бёрпи",
  "burpees": "бёрпи",
  "butt kicks": "бег с захлестом голени",
  "cable bench press": "жим на блоке лежа",
  "cable concentration extension (on stability ball)": "разгибания на трицепс на блоке (на фитболе)",
  "cable crossover": "сведение рук в кроссовере",
  "cable deadlift": "становая тяга на нижнем блоке",
  "cable decline fly": "сведение рук на блоке снизу вверх",
  "cable face pull": "тяга на лицо на блоке (фейспул)",
  "cable front raise": "подъем рук перед собой на нижнем блоке",
  "cable hammer curl (with rope)": "сгибания рук на блоке с канатом («молот»)",
  "cable incline fly": "сведение рук на блоке на наклонной скамье",
  "cable incline pushdown": "разгибания на трицепс на наклонном блоке",
  "cable kneeling crunch": "скручивания на блоке с колен («молитва»)",
  "cable lat pulldown full range of motion": "тяга верхнего блока широким хватом",
  "cable lateral raise": "махи в стороны на нижнем блоке",
  "cable low seated row": "горизонтальная тяга блока к поясу",
  "cable lying fly": "разведения рук на блоке лежа",
  "cable lying triceps extension": "французский жим на блоке лежа",
  "cable one arm curl": "сгибание одной руки на блоке",
  "cable one arm lateral raise": "махи одной рукой в сторону на блоке",
  "cable one arm tricep pushdown": "разгибание одной руки на блоке",
  "cable overhead triceps extension (rope attachment)": "французский жим из-за головы на блоке с канатом",
  "cable pushdown": "разгибания на трицепс на блоке",
  "cable reverse-grip pushdown": "разгибания на блоке обратным хватом",
  "cable rope seated row": "тяга канатного блока к поясу сидя",
  "cable seated chest press": "жим от груди на блоке сидя",
  "cable seated row": "тяга нижнего блока к поясу сидя",
  "cable standing fly": "сведение рук стоя в кроссовере",
  "cable standing one arm triceps extension": "разгибание одной руки стоя на блоке",
  "cable standing rear delt row (with rope)": "тяга канатной рукояти на задние дельты",
  "cable triceps pushdown (v-bar)": "разгибание на трицепс на блоке с V-рукоятью",
  "cable twist": "повороты корпуса на блоке",
  "calf raise": "подъемы на носки",
  "chest dip": "отжимания на брусьях",
  "chin-up": "подтягивания обратным хватом",
  "chin up": "подтягивания обратным хватом",
  "close-grip push-up": "отжимания узким хватом",
  "crunches": "скручивания на пресс",
  "crunch floor": "скручивания на полу",
  "dead bug": "упражнение «мертвый жук»",
  "decline push-up": "отжимания с ногами на возвышении",
  "diamond push-up": "алмазные отжимания",
  "donkey calf raise": "подъемы на носки «осликом»",
  "dumbbell alternate bicep curl": "попеременные сгибания рук с гантелями на бицепс",
  "dumbbell alternate hammer curl": "попеременные сгибания «молот» с гантелями",
  "dumbbell bench press": "жим гантелей лежа",
  "dumbbell bent over row": "тяга гантелей в наклоне",
  "dumbbell bicep curl": "сгибания рук с гантелями на бицепс",
  "dumbbell bulgarian split squat": "болгарские сплит-приседания с гантелями",
  "dumbbell concentration curl": "концентрированные сгибания на бицепс с гантелью",
  "dumbbell fly": "разведение гантелей лежа",
  "dumbbell goblet squat": "кубковые приседания с гантелью",
  "dumbbell hammer curl": "сгибания «молот» с гантелями",
  "dumbbell incline bench press": "жим гантелей на наклонной скамье",
  "dumbbell incline curl": "сгибания рук с гантелями на наклонной скамье",
  "dumbbell incline fly": "разведение гантелей на наклонной скамье",
  "dumbbell kickback": "разгибания руки назад с гантелью на трицепс",
  "dumbbell lateral raise": "махи гантелями в стороны",
  "dumbbell lunge": "выпады с гантелями",
  "dumbbell lying triceps extension": "французский жим с гантелями лежа",
  "dumbbell one arm bent-over row": "тяга одной гантели в наклоне",
  "dumbbell overhead triceps extension": "разгибание рук с гантелью из-за головы",
  "dumbbell preacher curl": "сгибания с гантелями на скамье Скотта",
  "dumbbell rear delt fly": "махи гантелями в наклоне на задние дельты",
  "dumbbell romanian deadlift": "румынская тяга с гантелями",
  "dumbbell seated bicep curl": "сгибания на бицепс с гантелями сидя",
  "dumbbell seated shoulder press": "жим гантелей сидя на плечи",
  "dumbbell shrug": "шраги с гантелями",
  "dumbbell side bend": "боковые наклоны с гантелью",
  "dumbbell standing overhead press": "жим гантелей стоя вверх",
  "dumbbell standing shoulder press": "жим гантелей стоя",
  "dumbbell sumo squat": "приседания сумо с гантелью",
  "dumbbell upright row": "тяга гантелей к подбородку",
  "farmers walk": "прогулка фермера",
  "flutter kicks": "махи ногами лежа («ножницы»)",
  "front plank": "классическая планка",
  "front plank with twist": "планка со скручиванием корпуса",
  "glute bridge": "ягодичный мостик",
  "hanging knee raise": "подъемы коленей в висе",
  "hanging leg raise": "подъемы ног в висе",
  "high knees": "бег с высоким подниманием колен",
  "incline dumbbell curl": "сгибания рук с гантелями на наклонной скамье",
  "incline push-up": "отжимания с руками на возвышении",
  "inverted row": "австралийские подтягивания",
  "jack burpee": "бёрпи «джампинг джек»",
  "jack jump (male)": "джампинг джек",
  "jumping jacks": "прыжки «джампинг джек»",
  "jump rope": "прыжки на скакалке",
  "jump squat": "приседания с выпрыгиванием",
  "inchworm": "гусеница (inchworm)",
  "inchworm v. 2": "гусеница (inchworm) v. 2",
  "kettlebell goblet squat": "кубковые приседания с гирей",
  "kettlebell one arm row": "тяга гири в наклоне одной рукой",
  "kettlebell swing": "махи гирей",
  "kettlebell windmill": "мельница с гирей",
  "lat pulldown": "тяга верхнего блока",
  "lateral band walk": "шаги в сторону с резинкой",
  "leg press": "жим ногами в тренажере",
  "lever chest press": "жим от груди в тренажере",
  "lever leg extension": "разгибание ног в тренажере",
  "lever lying leg curl": "сгибание ног лежа в тренажере",
  "lever seated leg curl": "сгибание ног сидя в тренажере",
  "lever shoulder press": "жим на плечи в тренажере",
  "lever standing calf raise": "подъемы на носки в тренажере стоя",
  "lying leg curl": "сгибания ног лежа",
  "lying leg raise": "подъемы прямых ног лежа",
  "mountain climber": "скалолаз",
  "one arm push-up": "отжимания на одной руке",
  "one leg floor calf raise": "подъемы на носок на одной ноге",
  "overhead squat": "приседания со снарядом над головой",
  "plank": "планка",
  "preacher curl": "сгибания на скамье Скотта",
  "pull-up": "подтягивания",
  "pull up": "подтягивания",
  "push-up": "отжимания",
  "push up": "отжимания",
  "push-up (wall)": "отжимания от стены",
  "reverse crunch": "обратные скручивания",
  "romanian deadlift": "румынская становая тяга",
  "rope climb": "лазание по канату",
  "rowing machine": "гребной тренажер",
  "run": "бег",
  "russian twist": "русский твист",
  "seated calf raise": "подъемы на носки сидя",
  "seated cable row": "тяга нижнего блока к поясу",
  "seated leg curl": "сгибания ног сидя в тренажере",
  "semi squat jump (male)": "полуприсед с выпрыгиванием",
  "short stride run": "бег с коротким шагом",
  "side plank": "боковая планка",
  "single leg deadlift": "тяга на одной ноге",
  "single leg glute bridge": "ягодичный мостик на одной ноге",
  "skater hops": "конькобежец (боковые прыжки)",
  "skull crusher": "французский жим",
  "sled 45в° leg press": "жим ногами в тренажере 45°",
  "sled 45° leg press": "жим ногами в тренажере 45°",
  "split squats": "сплит-приседания",
  "squat": "приседания",
  "squat to overhead reach": "приседание с вытягиванием рук вверх",
  "standing calf raise": "подъемы на носки стоя",
  "superman": "гиперэкстензия лежа на полу («супермен»)",
  "t-bar row": "тяга Т-грифа",
  "triceps dips": "отжимания на брусьях",
  "triceps dips floor": "обратные отжимания от пола на трицепс",
  "triceps pushdown": "разгибания на трицепс на блоке",
  "walking lunge": "выпады в движении",
  "wall sit": "стульчик у стены",
  "wheel rollerout": "прокатка с гимнастическим роликом",
  "runners stretch": "растяжка бегуна",
  "upper back stretch": "растяжка верхней части спины",
  "hamstring stretch": "растяжка задней поверхности бедра",
  "world greatest stretch": "лучшая в мире растяжка",
  "wrist circles": "круговые вращения кистями"
}

// Fallback pattern-based generator for all other exercises in the dataset
function autoTranslate(name) {
  if (EXACT[name]) return EXACT[name]
  const lower = name.toLowerCase()
  if (EXACT[lower]) return EXACT[lower]

  let res = lower

  // Equipment prefixes
  res = res.replace(/^barbell\s+/, 'со штангой: ')
  res = res.replace(/^dumbbell\s+/, 'с гантелями: ')
  res = res.replace(/^cable\s+/, 'на блоке: ')
  res = res.replace(/^band\s+/, 'с резинкой: ')
  res = res.replace(/^kettlebell\s+/, 'с гирей: ')
  res = res.replace(/^lever\s+/, 'в тренажере: ')
  res = res.replace(/^smith\s+/, 'в Смите: ')
  res = res.replace(/^bodyweight\s+/, '')
  res = res.replace(/^assisted\s+/, 'с поддержкой: ')

  // Common movement patterns
  const patterns = [
    [/bench press/, 'жим лежа'],
    [/incline bench press/, 'жим на наклонной скамье'],
    [/decline bench press/, 'жим на наклонной скамье головой вниз'],
    [/standing overhead press/, 'армейский жим стоя'],
    [/overhead press/, 'армейский жим'],
    [/shoulder press/, 'жим на плечи'],
    [/front squat/, 'фронтальные приседания'],
    [/full squat/, 'глубокие приседания'],
    [/squat/, 'приседания'],
    [/romanian deadlift/, 'румынская тяга'],
    [/deadlift/, 'становая тяга'],
    [/hip thrust/, 'ягодичный мост'],
    [/glute bridge/, 'ягодичный мостик'],
    [/bent over row/, 'тяга в наклоне'],
    [/seated row/, 'тяга сидя'],
    [/upright row/, 'тяга к подбородку'],
    [/lat pulldown/, 'тяга верхнего блока'],
    [/pulldown/, 'тяга верхнего блока'],
    [/push-up|push up/, 'отжимания'],
    [/pull-up|pull up/, 'подтягивания'],
    [/chin-up|chin up/, 'подтягивания обратным хватом'],
    [/lateral raise/, 'махи в стороны'],
    [/front raise/, 'махи вперед'],
    [/hammer curl/, 'сгибания «молот»'],
    [/bicep curl|biceps curl|curl/, 'сгибания на бицепс'],
    [/triceps extension|tricep extension/, 'разгибания на трицепс'],
    [/pushdown/, 'разгибания на блоке'],
    [/calf raise/, 'подъемы на носки'],
    [/leg extension/, 'разгибания ног'],
    [/leg curl/, 'сгибания ног'],
    [/leg press/, 'жим ногами'],
    [/lunge|lunges/, 'выпады'],
    [/shrug|shrugs/, 'шраги'],
    [/crunch|crunches/, 'скручивания'],
    [/sit-up|sit up/, 'подъемы туловища'],
    [/plank/, 'планка'],
    [/stretch/, 'растяжка'],
    [/jump/, 'прыжки']
  ]

  for (const [re, repl] of patterns) {
    if (re.test(res)) {
      res = res.replace(re, repl)
      break
    }
  }

  // If prefix was used, format nicely
  if (res.includes(': ')) {
    const parts = res.split(': ')
    res = parts[1].trim() + ' ' + parts[0].trim()
  }

  return res.trim()
}

const dict = {}
all.forEach(e => {
  if (e && e.n) {
    dict[e.n] = EXACT[e.n] || autoTranslate(e.n)
  }
})

// Also add title-cased or trimmed versions
Object.keys(dict).forEach(k => {
  dict[k.trim()] = dict[k]
})

const fileContent = `// Auto-generated Russian exercise translations dataset\nexport default ${JSON.stringify(dict, null, 2)};\n`
fs.writeFileSync(path.join(rootDir, 'src/locales/exercises-ru.js'), fileContent, 'utf8')
console.log('Generated exercises-ru.js successfully with ' + Object.keys(dict).length + ' entries.')
