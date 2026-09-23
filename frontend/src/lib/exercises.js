import { EXDB as RAW_EXDB } from './exercises-data.js'
import { t } from './i18n.js'

// Modern staple exercises added to extend and improve the upstream dataset
export const NEW_EXERCISES = [
  {
    id: '9001',
    n: 'barbell hip thrust',
    bp: 'upper legs',
    tg: 'glutes',
    eq: 'barbell',
    sm: ['hamstrings', 'quads', 'lower back'],
    st: [
      'Sit on the floor with a bench placed directly behind your upper back, resting a padded barbell across your hips.',
      'Plant your feet firmly on the floor roughly shoulder-width apart with shins nearly vertical at the top.',
      'Drive powerfully through your heels, squeezing your glutes to raise your hips until your torso and thighs form a straight horizontal line.',
      'Hold the peak lockout for 1 to 2 seconds while keeping your chin tucked toward your chest.',
      'Controlled and smoothly, lower your hips back toward the floor without losing tension.'
    ],
    cues: [
      'Tuck your chin to your chest to prevent lumbar hyperextension',
      'Drive primarily through the heels, keeping knees stacked over ankles',
      'Achieve complete posterior pelvic tilt at peak contraction'
    ],
    img: '0043-qXTaZnJ.jpg',
    gif: '0043-qXTaZnJ.gif'
  },
  {
    id: '9002',
    n: 'dumbbell bulgarian split squat',
    bp: 'upper legs',
    tg: 'glutes',
    eq: 'dumbbell',
    sm: ['quads', 'hamstrings', 'calves'],
    st: [
      'Stand roughly 2 feet in front of a flat bench holding dumbbells at your sides.',
      'Elevate your rear foot onto the bench behind you, resting the shoelaces on the padding.',
      'Lower your hips straight down by bending your front knee until your front thigh is parallel to the ground.',
      'Maintain a slight forward torso lean to maximize recruitment of the lead glute and hamstring.',
      'Drive through your front heel back to the top position. Complete sets on both legs.'
    ],
    cues: [
      'Keep front knee tracking in line with your second toe',
      'Maintain continuous tension by avoiding bouncing out of the hole',
      'Keep 85% of your weight distributed on the front working leg'
    ],
    img: '0289-eTzW4Fw.jpg',
    gif: '0289-eTzW4Fw.gif'
  },
  {
    id: '9003',
    n: 'cable face pull',
    bp: 'shoulders',
    tg: 'delts',
    eq: 'cable',
    sm: ['upper back', 'traps', 'rotator cuff'],
    st: [
      'Attach a rope attachment to a cable pulley positioned at upper chest or eye level.',
      'Grasp each end of the rope with an overhand grip (thumbs pointing backward) and step back.',
      'Pull the center of the rope directly toward your bridge of nose while pulling your hands outward.',
      'Externally rotate your shoulders at the finish so your knuckles face behind you in a double-bicep pose.',
      'Hold the squeeze on your rear delts and mid-traps for a full second, then return with control.'
    ],
    cues: [
      'Lead with your hands pulling apart, not just elbows back',
      'Keep ribs down and avoid leaning backward to compensate',
      'Focus on external rotation at the end of every repetition'
    ],
    img: '0334-DsgkuIt.jpg',
    gif: '0334-DsgkuIt.gif'
  },
  {
    id: '9004',
    n: 'nordic hamstring curl',
    bp: 'upper legs',
    tg: 'hamstrings',
    eq: 'body weight',
    sm: ['glutes', 'calves', 'lower back'],
    st: [
      'Kneel upright on a cushioned pad with your ankles securely locked under a barbell or held by a partner.',
      'Lock your hips in full extension and engage your core and glutes to form a rigid line from knees to head.',
      'Slowly lower your torso forward toward the floor purely by eccentric knee flexion.',
      'Resist gravity with your hamstrings for as deep as possible before catching yourself with your hands.',
      'Lightly push off the floor with your hands and pull vigorously with your hamstrings back to upright.'
    ],
    cues: [
      'Do not hinge at the hips — maintain a rigid straight line from knee to shoulder',
      'Aim for a 3 to 5 second controlled eccentric descent'
    ],
    img: '0585-X3Y8K8J.jpg',
    gif: '0585-X3Y8K8J.gif'
  },
  {
    id: '9005',
    n: 'incline dumbbell bench press',
    bp: 'chest',
    tg: 'pectorals',
    eq: 'dumbbell',
    sm: ['delts', 'triceps'],
    st: [
      'Adjust an incline bench between 30 and 45 degrees. Sit with a dumbbell on each knee.',
      'Kick the dumbbells up to shoulder level one by one as you lie back against the pad.',
      'Set your shoulder blades back and down with elbows angled at roughly 45 to 60 degrees.',
      'Press the dumbbells upward in a slight converging arc until your arms are fully extended over upper chest.',
      'Lower the weights under complete control until you feel a deep stretch in your upper pectorals.'
    ],
    cues: [
      'Keep shoulder blades packed against the bench throughout the lift',
      'Do not flare elbows 90 degrees wide to protect rotator cuffs',
      'Squeeze the upper chest tightly at the peak of the press'
    ],
    img: '0289-eTzW4Fw.jpg',
    gif: '0289-eTzW4Fw.gif'
  },
  {
    id: '9006',
    n: 'cable lateral raise',
    bp: 'shoulders',
    tg: 'delts',
    eq: 'cable',
    sm: ['traps', 'upper back'],
    st: [
      'Set a cable pulley to the lowest notch or knee height with a single D-handle attached.',
      'Stand sideways to the pulley and grasp the handle with your outside arm behind your back.',
      'With a slight bend in your elbow, raise your arm laterally out to the side up to shoulder level.',
      'Pause for a beat at parallel to ensure complete lateral deltoid isolation.',
      'Lower smoothly back to the starting point without letting the weight stack touch down.'
    ],
    cues: [
      'Lead the movement with your elbow, not your wrist or hand',
      'Maintain constant cable tension by never resting at the bottom',
      'Lean slightly away from the machine (10-15 degrees) for optimal tension profile'
    ],
    img: '0334-DsgkuIt.jpg',
    gif: '0334-DsgkuIt.gif'
  },
  {
    id: '9007',
    n: 'dumbbell romanian deadlift',
    bp: 'upper legs',
    tg: 'hamstrings',
    eq: 'dumbbell',
    sm: ['glutes', 'lower back', 'forearms'],
    st: [
      'Stand with feet hip-width apart holding a dumbbell in each hand against the front of your thighs.',
      'Set your shoulders back, brace your core, and keep a soft 15-degree bend in your knees.',
      'Hinge backward at the hips, pushing your pelvis toward the back wall while skimming the dumbbells down your legs.',
      'Descend until you feel a strong stretch in your hamstrings (usually mid-shin level) with flat spine.',
      'Drive your hips forward and contract your glutes and hamstrings to return to a full standing posture.'
    ],
    cues: [
      'Think "push hips to the wall behind you" rather than bending down',
      'Keep weights close to your body throughout the entire descent',
      'Do not allow your lumbar spine to round at the bottom'
    ],
    img: '0032-ila4NZS.jpg',
    gif: '0032-ila4NZS.gif'
  },
  {
    id: '9008',
    n: 'indoor rowing machine',
    bp: 'cardio',
    tg: 'cardio',
    eq: 'leverage machine',
    sm: ['upper back', 'hamstrings', 'quads', 'core'],
    st: [
      'Strap feet securely into the foot stretchers and set damper resistance to 3-5.',
      'Catch: Shins vertical, torso tilted forward at 1 o\'clock, arms straight forward grasping the handle.',
      'Drive: Push explosively through your legs, then swing your hips to 11 o\'clock and pull handle to sternum.',
      'Finish: Legs straight, slight backward body angle, elbows bent behind torso with relaxed shoulders.',
      'Recovery: Extend arms forward, hinge body forward at hips, then bend knees to slide back to the Catch.'
    ],
    cues: [
      'Power stroke breakdown: 60% legs, 20% core hinge, 20% arm pull',
      'Sequencing rule: Legs-Body-Arms on drive; Arms-Body-Legs on recovery'
    ],
    img: '0685-X84U40Q.jpg',
    gif: '0685-X84U40Q.gif'
  },
  {
    id: '9009',
    n: 'assault air bike',
    bp: 'cardio',
    tg: 'cardio',
    eq: 'leverage machine',
    sm: ['quads', 'shoulders', 'chest', 'core'],
    st: [
      'Adjust seat height so your knee has a slight 5-10 degree bend at the bottom of the pedal stroke.',
      'Grip the handles securely and place the balls of your feet in the center of the pedals.',
      'Push and pull dynamically with your upper body while driving through the pedals with your legs.',
      'Keep your core braced and shoulders down without swaying side to side.',
      'Maintain steady cadence or execute maximum effort sprints during high-intensity intervals.'
    ],
    cues: [
      'Synchronize your push-pull arm rhythm with your leg drive',
      'Keep your breathing steady and rhythmic during interval pushes'
    ],
    img: '0685-X84U40Q.jpg',
    gif: '0685-X84U40Q.gif'
  },
  {
    id: '9010',
    n: 'strict hanging leg raise',
    bp: 'waist',
    tg: 'abs',
    eq: 'body weight',
    sm: ['hip flexors', 'forearms', 'lats'],
    st: [
      'Hang from a secure pull-up bar with an overhand grip and engaged scapulae.',
      'Without swinging or using body momentum, contract your abdominals and raise your legs in front of you.',
      'Raise straight legs until they are at least parallel to the floor or your toes reach the bar.',
      'Tilt your pelvis upward at the top of the movement to fully shorten the rectus abdominis.',
      'Lower your legs slowly under control back to the dead hang position without swinging.'
    ],
    cues: [
      'Tuck pelvis up at the top rather than just lifting legs with hip flexors',
      'Squeeze legs together and point toes to stabilize momentum',
      'Control the 2-second eccentric lowering phase'
    ],
    img: '0001-2gPfomN.jpg',
    gif: '0001-2gPfomN.gif'
  }
]

export const EXDB = [...NEW_EXERCISES, ...RAW_EXDB]
export const EXIDX = {}
EXDB.forEach(e => { EXIDX[e.id] = e })
export const BODYPARTS = [...new Set(EXDB.map(e => e.bp))].sort()

// Bilingual search synonyms for intuitive cross-language exercise lookup
const RU_ALIASES = {
  'грудь': ['chest', 'pectorals', 'bench press', 'pushup', 'dip', 'fly'],
  'спина': ['back', 'lats', 'pull up', 'row', 'deadlift', 'pulldown'],
  'ноги': ['legs', 'quads', 'hamstrings', 'squat', 'lunges', 'calf', 'glutes'],
  'плечи': ['shoulders', 'delts', 'overhead press', 'lateral raise', 'military'],
  'бицепс': ['biceps', 'curl', 'upper arms'],
  'трицепс': ['triceps', 'pushdown', 'extension', 'dip'],
  'пресс': ['abs', 'waist', 'crunch', 'plank', 'sit up', 'hanging leg'],
  'ягодицы': ['glutes', 'hip thrust', 'deadlift', 'squat', 'split squat'],
  'руки': ['upper arms', 'lower arms', 'biceps', 'triceps', 'forearms'],
  'жим': ['press', 'bench', 'push'],
  'тяга': ['row', 'pull', 'deadlift'],
  'присед': ['squat'],
  'штанга': ['barbell'],
  'гантели': ['dumbbell', 'dumbbells'],
  'кардио': ['cardio', 'rowing', 'bike', 'run'],
  'турник': ['pull up', 'chin up', 'hanging'],
  'брусья': ['dip', 'dips']
}

export function matchesExerciseQuery(e, query) {
  if (!query) return true
  const q = query.toLowerCase().trim()
  if (e.n.toLowerCase().includes(q) || (e.tg && e.tg.includes(q)) || (e.eq && e.eq.includes(q)) || (e.bp && e.bp.includes(q)) || (e.desc || '').toLowerCase().includes(q)) {
    return true
  }
  // Check Russian aliases
  for (const [ruTerm, enKeywords] of Object.entries(RU_ALIASES)) {
    if (q.includes(ruTerm) || ruTerm.includes(q)) {
      if (enKeywords.some(k => e.n.toLowerCase().includes(k) || (e.tg && e.tg.includes(k)) || (e.bp && e.bp.includes(k)) || (e.eq && e.eq.includes(k)))) {
        return true
      }
    }
  }
  return false
}

// Get pro tips / execution cues for an exercise
export function getFormCues(ex) {
  if (ex?.cues && ex.cues.length > 0) return ex.cues
  // Generate helpful context cues based on target muscle and equipment
  const cues = []
  if (ex?.eq === 'barbell') cues.push(t('Keep bar path vertical and grip firmly locked'))
  if (ex?.eq === 'dumbbell') cues.push(t('Control the eccentric lowering phase for 2–3 seconds'))
  if (ex?.bp === 'chest') cues.push(t('Retract scapulae and keep chest proud throughout'))
  if (ex?.bp === 'back') cues.push(t('Pull with elbows and squeeze shoulder blades at peak'))
  if (ex?.tg === 'glutes' || ex?.bp === 'upper legs') cues.push(t('Drive through heels and maintain neutral lumbar spine'))
  if (ex?.bp === 'waist') cues.push(t('Exhale completely on contraction to deeply recruit core'))
  return cues
}

// Equipment options present in a given list of exercises, most common first
export function equipmentOf(list) {
  const c = {}
  list.forEach(e => { if (e.eq) c[e.eq] = (c[e.eq] || 0) + 1 })
  return Object.keys(c).sort((a, b) => c[b] - c[a] || (a < b ? -1 : 1))
}

// Custom exercises
let customIds = []
export function registerCustom(list) {
  customIds.forEach(id => delete EXIDX[id])
  customIds = (list || []).map(e => e.id)
  ;(list || []).forEach(e => { EXIDX[e.id] = e })
}
export const allExercises = st => [...(st.customEx || []), ...EXDB]

// Media CDN fallback to hasaneyldrm/exercises-dataset
const GITHUB_RAW = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/'
const CDN_FALLBACK_IMG = GITHUB_RAW + 'images/'
const CDN_FALLBACK_GIF = GITHUB_RAW + 'videos/'

const IMG_BASE = import.meta.env.VITE_IMG_BASE || '/img/'
const GIF_BASE = import.meta.env.VITE_GIF_BASE || '/gif/'

export const imgSrc = ex => (ex?.img ? (IMG_BASE + ex.img) : '')
export const gifSrc = ex => (ex?.gif ? (GIF_BASE + ex.gif) : '')

// Cardio exercises log time + speed instead of weight × reps.
export const isCardio = idOrEx => (typeof idOrEx === 'string' ? EXIDX[idOrEx] : idOrEx)?.bp === 'cardio'

export const exOr = id => EXIDX[id] ||
  { id, n: t('Unknown exercise'), bp: '', tg: '', eq: '', sm: [], st: [], missing: true }

// Find substitute / alternative exercises targeting the same target muscle or body part
export function findSubstitutes(ex, allList) {
  if (!ex) return []
  const list = allList || EXDB
  return list.filter(e => e.id !== ex.id && (
    (ex.tg && e.tg === ex.tg) ||
    (ex.bp && e.bp === ex.bp)
  )).sort((a, b) => {
    const aMatch = ex.tg && a.tg === ex.tg ? 2 : 1
    const bMatch = ex.tg && b.tg === ex.tg ? 2 : 1
    if (bMatch !== aMatch) return bMatch - aMatch
    return a.n.localeCompare(b.n)
  })
}

