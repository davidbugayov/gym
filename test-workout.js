import { beginWorkout } from './frontend/src/sheets.jsx'
import { useStore } from './frontend/src/store/useStore.js'
import { getWarmup, getCooldown } from './frontend/src/lib/warmup-cooldown.js'

const st = useStore.getState()
console.log('Warmups configured:', getWarmup(st))

beginWorkout(null)
const active = useStore.getState().active
console.log('Active entries:', active.entries.map(e => e.id))
