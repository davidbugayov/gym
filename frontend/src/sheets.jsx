import { useEffect, useRef, useState, useMemo } from 'react'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { EXDB, EXIDX, BODYPARTS, isCardio, allExercises, equipmentOf, exOr, findSubstitutes, getFormCues } from './lib/exercises.js'
import { fmtDate, fmtNum, fmtVol, fmtDur, durPart, todayISO, uid, exCount, DAYN, MONTHS_LONG, ACCENTS } from './lib/format.js'
import { lastEntryFor, bestWeightFor, buildSets, effectiveRoutineId, workoutVolume, setsDone, setsDoneActive, lastBW, supersetUnits, unitOf, setLabel, defaultConfig, cleanupSg, modeOf, effortOf, exLine } from './lib/history.js'
import { beep, vibrate, hapticSetComplete } from './lib/sound.js'
import { t, instrFor, getLang, INSTR_LANGS } from './lib/i18n.js'
import { nav } from './lib/nav.js'
import { READY_PROGRAMS, readyProgram, starterRoutines, makeRoutines, HERO_WARMUP, HERO_COOLDOWN } from './lib/starter.js'
import { getWarmup, getCooldown, WARMUP_POOL, COOLDOWN_POOL, WARMUP_PRESETS, COOLDOWN_PRESETS, warmupCategoryName, cooldownCategoryName } from './lib/warmup-cooldown.js'
import { matchPrograms, applyProgramToState, defaultUseSchedule, buildCustomWeek } from './lib/program-match.js'
import Media, { Thumb } from './components/Media.jsx'
import Stepper from './components/Stepper.jsx'
import Icon from './components/Icon.jsx'
import { Button, Slider, Switch, Segmented, SelectRow, TextArea } from './components/ui.jsx'
import { glyphOf, GLYPH_GROUPS, DEFAULT_GLYPH } from './lib/glyphs.js'
import BodyMap from './components/BodyMap.jsx'
import { loadOfWorkouts } from './lib/muscles.js'
import { parseImport, mergeImport } from './lib/import-csv.js'
import { buildPlanBundle, parsePlan, mergePlan, printPlan } from './lib/plan-share.js'
import { estimate1RM, best1RM, is1RMRecord, REP_CAP } from './lib/onerm.js'
import { nextPrescription, applyPrescription, policyFor, defaultIncrement, POLICIES_FOR, POLICY_NAME, POLICY_DESC } from './lib/progression.js'
import { MOBILE, shareExport } from './lib/mobile.js'
import { estimateCalories, exportGoogleHealthJSON, exportGoogleHealthCSV } from './lib/googleHealth.js'
import { readWorkoutsFromGoogleHealth, syncAllWithGoogleHealth } from './lib/google-fit-api.js'
import { ATHLETE_RU_URL, ATHLETE_PROGRAMS, parseProgramUrl, applyImportedProgram, isAthleteRuUrl } from './lib/import-url.js'
import { GoogleAuth } from '@southdevs/capacitor-google-auth'
import { Capacitor } from '@capacitor/core'
import { getHealthStatus, initHealth, logBodyWeightToHealth, logWorkoutToHealth } from './lib/health.js'
import { getCachedToken, googleSignIn, setCachedToken } from './lib/google-auth.js'
import { clearActiveSessionBackup } from './lib/autosave.js'
import { getExerciseTrend } from './lib/trends.js'
import { ExerciseTrendBadge, ExerciseTrendMini } from './components/ExerciseTrend.jsx'

const S = () => useStore.getState().S
const update = (...a) => useStore.getState().update(...a)
const ui = () => useUI.getState()
const toast = m => ui().toast(m)
const snd = () => S().sound

/* ============================ custom confirm dialog ============================ */
function ConfirmDialog({ title, message, confirmText, cancelText, danger, onConfirm, onCancel, close }) {
  return <div style={{ textAlign: 'center', padding: '4px 0' }}>
    {title && <h3 style={{ marginBottom: 8 }}>{title}</h3>}
    <div className="muted" style={{ marginBottom: 18, lineHeight: 1.5 }}>{message}</div>
    <button className={'btn ' + (danger ? 'danger' : 'primary')} onClick={() => { close(); onConfirm && onConfirm() }}>{confirmText || t('Confirm')}</button>
    <div style={{ height: 8 }} />
    <Button variant="ghost" className="dim" onClick={() => { close(); onCancel && onCancel() }}>{cancelText || t('Cancel')}</Button>
  </div>
}
// Themed replacement for window.confirm — callback-based (no blocking).
export function confirmSheet(opts) {
  ui().openSheet(close => <ConfirmDialog {...opts} close={close} />, { kind: 'center' })
}

/* ============================ starter plan ============================ */
export function loadStarterPlan() {
  const [push, pull, legs] = starterRoutines()
  update(st => {
    st.routines.push(push, pull, legs)
    st.week[1] = push.id; st.week[3] = pull.id; st.week[5] = legs.id
  })
  toast(t('Starter plan loaded — Mon Push · Wed Pull · Fri Legs'))
}

function ReadyProgramsSheet({ close }) {
  // "Show all programs" routes through the same ProgramPreview as the wizard, so the
  // weekly schedule is only ever changed when the user explicitly keeps the switch on.
  const add = (loaded, schedule) => {
    update(st => applyProgramToState(st, loaded, { schedule }))
    close()
    toast(t('Program loaded — {0}', t(loaded.name)))
  }
  const preview = program =>
    ui().openSheet(close => <ProgramPreview program={program} sessions={program.freq[1]} onAdd={add} close={close} />)
  return <>
    <h3>{t('Ready-made programs')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>{t('Choose a program to add to your plan.')}</div>
    <div className="list">
      {READY_PROGRAMS.map(program => <button key={program.id} className="item" style={{ width: '100%', textAlign: 'left' }} onClick={() => preview(program)}>
        <span className="lrow-i"><Icon name="sparkles" /></span>
        <div className="grow"><div className="tt">{t(program.name)}</div><div className="ss">{t(program.detail)}</div></div>
        <Icon name="chevronRight" className="chev" />
      </button>)}
    </div>
  </>
}

export function readyProgramsSheet() {
  return ui().openSheet(close => <ReadyProgramsSheet close={close} />)
}

/* ============================ program wizard ============================ */
// A local questionnaire that matches the user onto the ready-made programs in
// starter.js. Everything runs on-device: no network, no accounts, no generation —
// lib/program-match.js filters and scores READY_PROGRAMS against the answers, and
// nothing is written into the plan until the user taps "Add to my plan".
const WIZ_GOALS = [
  ['muscle', 'Build muscle'],
  ['fatloss', 'Burn fat'],
  ['fitness', 'General fitness'],
  ['endurance', 'Improve endurance'],
  ['stress', 'Stress relief & recovery']
]
const WIZ_EQUIP = [
  ['bodyweight', 'Bodyweight'],
  ['dumbbell', 'Dumbbells'],
  ['barbell', 'Barbell'],
  ['kettlebell', 'Kettlebells'],
  ['run', 'Running'],
  ['gym', 'Gym / mixed equipment']
]
const WIZ_LEVELS = [
  ['beginner', 'New to training'],
  ['returning', 'Getting back into it'],
  ['regular', 'Train regularly'],
  ['advanced', 'Advanced']
]
const WIZ_STEPS = ['goal', 'equip', 'level', 'time', 'results']

// One program preview: the week's routines with exercises, sets and reps. "Add" pushes
// NEW routines; the weekly schedule is only applied when the switch is on — an existing
// schedule is never replaced behind the user's back.
function ProgramPreview({ program, sessions, onAdd, close }) {
  const S = useStore(s => s.S)
  const loaded = readyProgram(program.id, sessions)
  const [useSchedule, setUseSchedule] = useState(() => defaultUseSchedule(S.week))
  // Which weekdays each session runs on — starts from the program's default slots and can be
  // re-picked (Hero Rounds-style), so the plan lands on the days you actually train.
  const [days, setDays] = useState(() => Object.keys(loaded.week).map(Number))
  const dayOrder = d => (d === 0 ? 7 : d)
  const sortedDays = () => days.slice().sort((a, b) => dayOrder(a) - dayOrder(b))
  const pick = d => {
    if (days.includes(d)) setDays(days.filter(x => x !== d))
    else if (days.length < sessions) setDays([...days, d])
  }
  const daysReady = !useSchedule || days.length === sessions
  const line = e => {
    const mode = modeOf(e)
    if (mode === 'cardio') return `${exOr(e.id).n} · ${e.sets} × ${e.min || 0} min @ ${fmtNum(e.speed || 0)} km/h`
    return exLine(e, S.unit) + ' · ' + exOr(e.id).n
  }
  return <>
    <h3>{t(program.name)}</h3>
    <div className="muted small" style={{ marginBottom: 10 }}>{t(program.detail)}</div>
    <div className="row" style={{ gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
      <span className="tag">{t('{0}× per week', loaded.sessions)}</span>
      <span className="tag">{t('{0} min per session', program.minutes)}</span>
      <span className="tag">{t('Equipment')}: {program.equip.map(e => t(WIZ_EQUIP.find(x => x[0] === e)[1])).join(' · ')}</span>
      <span className="tag">{t('Level')}: {program.levels.map(l => t(WIZ_LEVELS.find(x => x[0] === l)[1])).join(' · ')}</span>
    </div>
    <div className="list">
      {loaded.routines.map(r => <div key={r.id} className="item" style={{ display: 'block' }}>
        <div className="row" style={{ gap: 9, marginBottom: 4 }}>
          <span className="lrow-i"><Icon name={glyphOf(r.emoji)} /></span>
          <div className="tt">{r.name}</div>
        </div>
        {r.ex.map(e => <div key={e.id} className="small dim" style={{ padding: '2px 0 2px 44px' }}>{line(e)}</div>)}
      </div>)}
    </div>
    <div className="row between" style={{ padding: '10px 2px', borderTop: '1px solid var(--sep)', borderBottom: '1px solid var(--sep)', margin: '12px 0 6px', gap: 12 }}>
      <div><div className="tt" style={{ fontSize: 15 }}>{t('Use this weekly schedule')}</div><div className="small dim">{t('Replaces your current week. Days this plan leaves empty become rest days.')}</div></div>
      <Switch checked={useSchedule} onChange={setUseSchedule} />
    </div>
    {useSchedule && <>
      <div className="tt" style={{ margin: '12px 0 8px' }}>{t('Pick the days you train')}</div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 7 }}>
        {[1, 2, 3, 4, 5, 6, 0].map(d => <button key={d} className={'chip' + (days.includes(d) ? ' on' : '')} onClick={() => pick(d)}>{t(DAYN[d])}</button>)}
      </div>
      {!daysReady && <div className="muted small" style={{ marginTop: 8 }}>{t('Pick {0} days', sessions)}</div>}
    </>}
    <Button variant="primary" disabled={!daysReady}
      onClick={() => { onAdd(useSchedule ? { ...loaded, week: buildCustomWeek(sortedDays(), loaded.routines) } : loaded, useSchedule); close() }}>
      {t('Add to my plan')}
    </Button>
    <div style={{ height: 8 }} />
    <Button variant="ghost" className="dim" onClick={close}>{t('Cancel')}</Button>
  </>
}

function ProgramWizard({ close }) {
  const [step, setStep] = useState(0)
  const [prefs, setPrefs] = useState({ goals: [], equip: [], level: null, sessions: 3, duration: 'mid' })
  const key = WIZ_STEPS[step]
  const last = key === 'results'
  const set = patch => setPrefs(p => ({ ...p, ...patch }))

  const toggleGoal = g => set({
    goals: prefs.goals.includes(g) ? prefs.goals.filter(x => x !== g)
      : prefs.goals.length >= 3 ? prefs.goals : [...prefs.goals, g]
  })
  const toggleEquip = e => set({
    equip: prefs.equip.includes(e) ? prefs.equip.filter(x => x !== e) : [...prefs.equip, e]
  })

  // goal and equipment need at least one answer; the rest have defaults.
  const canNext = key === 'goal' ? prefs.goals.length > 0 : key === 'equip' ? prefs.equip.length > 0 : true
  const matches = last ? matchPrograms(READY_PROGRAMS, prefs) : []

  const add = (loaded, schedule) => {
    update(st => applyProgramToState(st, loaded, { schedule }))
    close()
    toast(t('Program loaded — {0}', t(loaded.name)))
  }
  const preview = program => ui().openSheet(close => <ProgramPreview program={program} sessions={prefs.sessions} onAdd={add} close={close} />)

  return <>
    {key === 'goal' && <>
      <h3>{t('Find your program')}</h3>
      <div className="muted small" style={{ marginBottom: 14 }}>{t('Answer a few questions and get ready-made programs that fit you. Nothing is added until you choose.')}</div>
      <div className="tt" style={{ marginBottom: 8 }}>{t('What is your goal?')}</div>
      <div className="muted small" style={{ marginBottom: 8 }}>{t('Pick up to three.')}</div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 7 }}>
        {WIZ_GOALS.map(([id, label]) => <button key={id} className={'chip' + (prefs.goals.includes(id) ? ' on' : '')} onClick={() => toggleGoal(id)}>{t(label)}</button>)}
      </div>
    </>}

    {key === 'equip' && <>
      <h3>{t('What can you train with?')}</h3>
      <div className="muted small" style={{ marginBottom: 8 }}>{t('Pick everything you have — the first pick matters most.')}</div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 7 }}>
        {WIZ_EQUIP.map(([id, label]) => <button key={id} className={'chip' + (prefs.equip.includes(id) ? ' on' : '')} onClick={() => toggleEquip(id)}>
          {prefs.equip.includes(id) ? (prefs.equip.indexOf(id) + 1) + '. ' : ''}{t(label)}
        </button>)}
      </div>
      <div className="muted small" style={{ marginTop: 10 }}>{t('Only programs that fit at least one pick are shown.')}</div>
    </>}

    {key === 'level' && <>
      <h3>{t('What is your level?')}</h3>
      <div className="list">
        {WIZ_LEVELS.map(([id, label]) => <div key={id} className="item" onClick={() => set({ level: id })}>
          <div className="grow"><div className="tt">{t(label)}</div></div>
          {prefs.level === id && <Icon name="check" className="accent" />}
        </div>)}
      </div>
    </>}

    {key === 'time' && <>
      <h3>{t('How often can you train?')}</h3>
      <div className="row" style={{ flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
        {[2, 3, 4, 5].map(n => <button key={n} className={'chip' + (prefs.sessions === n ? ' on' : '')} onClick={() => set({ sessions: n })}>{t('{0}× per week', n)}</button>)}
      </div>
      <div className="tt" style={{ marginBottom: 8 }}>{t('How long is one session?')}</div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 7 }}>
        {[['short', '20–30 min'], ['mid', '35–45 min'], ['long', '50–70 min']].map(([id, label]) =>
          <button key={id} className={'chip' + (prefs.duration === id ? ' on' : '')} onClick={() => set({ duration: id })}>{t(label)}</button>)}
      </div>
    </>}

    {last && <>
      <h3>{t('Good matches for you')}</h3>
      <div className="muted small" style={{ marginBottom: 12 }}>{t('These fit your answers. Nothing changes until you tap Add.')}</div>
      <div className="list">
        {matches.map(p => <div key={p.id} className="item" style={{ display: 'block' }}>
          <div className="row" style={{ gap: 9, alignItems: 'flex-start' }} onClick={() => preview(p)}>
            <span className="lrow-i"><Icon name="sparkles" /></span>
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="tt">{t(p.name)}</div>
              <div className="ss">{t(p.detail)}</div>
              <div className="row" style={{ gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                <span className="tag acc">{t('{0}× per week', p.freq[0] === p.freq[1] ? p.freq[0] : p.freq[0] + '–' + p.freq[1])}</span>
                <span className="tag">{t('{0} min per session', p.minutes)}</span>
                <span className="tag">{p.goals.map(g => t(WIZ_GOALS.find(x => x[0] === g)[1])).join(' · ')}</span>
                <span className="tag dim">{p.equip.map(e => t(WIZ_EQUIP.find(x => x[0] === e)[1])).join(' · ')}</span>
                <span className="tag dim">{p.levels.map(l => t(WIZ_LEVELS.find(x => x[0] === l)[1])).join(' · ')}</span>
              </div>
            </div>
            <Icon name="chevronRight" className="chev" />
          </div>
          <Button size="sm" variant="primary" onClick={() => preview(p)}>{t('Preview')}</Button>
        </div>)}
      </div>
      <div style={{ height: 10 }} />
      <Button variant="ghost" className="dim" onClick={() => { close(); readyProgramsSheet() }}>{t('Show all programs')}</Button>
    </>}

    <div className="row" style={{ gap: 10, marginTop: 14 }}>
      {step > 0 && <Button onClick={() => setStep(step - 1)} style={{ flex: 1 }}>{t('Back')}</Button>}
      {!last && <Button variant="primary" style={{ flex: 1 }} disabled={!canNext} onClick={() => setStep(step + 1)}>
        {key === 'time' ? t('Show matches') : t('Next')}
      </Button>}
    </div>
    {!canNext && <div className="dim small" style={{ textAlign: 'center', marginTop: 10 }}>{t('Pick at least one to continue.')}</div>}
    <div style={{ height: 8 }} />
  </>
}

export function programWizardSheet() {
  return ui().openSheet(close => <ProgramWizard close={close} />)
}

/* ============================ weight picker (shared: body weight + goal) ============================ */
// Fixed range, not a moving window — a window that resizes itself mid-drag (the previous
// attempt) makes the thumb's position unpredictable: every time it grows, everything already
// placed on it shifts toward one side. A static range never has that problem, at the cost of
// coarser precision per pixel — the +/- buttons cover exact values.
// The ceiling follows the profile's unit: 300 covers a body weight or a working weight in
// kg, but as pounds it cut off at 136 kg — below plenty of people's body weight, and well
// below an everyday squat.
const W_LO = 1
const wHi = unit => (unit === 'lb' ? 660 : 300)
function WeightInput({ value, setValue, unit }) {
  const W_HI = wHi(unit)
  const clamp = x => Math.max(W_LO, Math.min(W_HI, Math.round((x || 0) * 10) / 10))
  const sv = Math.max(W_LO, Math.min(W_HI, value))
  const onSlide = v => setValue(clamp(v))
  return <>
    <div className="bwstep">
      <button className="bw-pm" onClick={() => onSlide(value - 0.1)} aria-label="minus 0.1"><Icon name="minus" /></button>
      <div className="bw-read">{fmtNum(value)}<span className="u"> {unit}</span></div>
      <button className="bw-pm" onClick={() => onSlide(value + 0.1)} aria-label="plus 0.1"><Icon name="plus" /></button>
    </div>
    <div className="chips" style={{ justifyContent: 'center', margin: '8px 0' }}>
      <button className="chip" onClick={() => onSlide(value - 1)}>−1</button>
      <button className="chip" onClick={() => onSlide(value - 0.5)}>−0.5</button>
      <button className="chip" onClick={() => onSlide(value + 0.5)}>+0.5</button>
      <button className="chip" onClick={() => onSlide(value + 1)}>+1</button>
    </div>
    <Slider value={sv} min={W_LO} max={W_HI} step={0.5} onChange={onSlide} />
  </>
}

/* ============================ body weight ============================ */
function BwSheet({ required, onDone, close }) {
  const st = useStore(s => s.S)
  const unit = st.unit
  const bw = lastBW(st)
  const [v, setV] = useState(bw ? bw.w : 70)
  const save = () => {
    const n = Math.round((v || 0) * 10) / 10
    if (!n || n <= 0) { toast(t('Enter a valid weight')); return }
    update(s => {
      const iso = todayISO()
      const ex = s.bodyweight.find(b => b.d === iso)
      if (ex) { ex.w = n; ex.t = Date.now() } else s.bodyweight.push({ d: iso, w: n, t: Date.now() })
      s.bodyweight.sort((a, b) => (a.d < b.d ? -1 : 1))
    })
    close()
    if (onDone) onDone(n); else toast(t('Weight saved'))
  }
  const recent = [...st.bodyweight].reverse().slice(0, 3)
  const delEntry = d => update(s => { s.bodyweight = s.bodyweight.filter(b => b.d !== d) })
  return <>
    <h3>{required ? t('Quick check-in') : t('Log body weight')}</h3>
    <div className="muted small">{required ? t('Slide or tap to set your weight — tracked before every workout so your curve stays honest.') : t('Today') + ', ' + fmtDate(todayISO(), true)}</div>
    <WeightInput value={v} setValue={setV} unit={unit} />
    <div style={{ height: 14 }} />
    <Button variant="primary" onClick={save}>{required ? t('Save & start workout') : t('Save')}</Button>
    {required && <>
      <div style={{ height: 8 }} /><Button variant="ghost" className="dim" onClick={() => { close(); onDone && onDone(null) }}>{t('Start without weighing in')}</Button>
      <div style={{ height: 2 }} /><Button variant="ghost" className="dim" icon="reset" onClick={() => { close(); nav('/workout') }}>{t('Choose a different workout')}</Button>
      <div style={{ height: 2 }} /><Button variant="ghost" className="dim" icon="xmark" onClick={close}>{t('Cancel')}</Button>
    </>}
    {!required && recent.length > 0 && <>
      <h4 className="sec">{t('Recent weigh-ins')}</h4>
      <div className="list" style={{ gap: 0 }}>
        {recent.map(b => <div key={b.d} className="row between" style={{ padding: '9px 2px', borderBottom: '1px solid var(--sep)' }}>
          <span className="small muted">{fmtDate(b.d, true)}</span>
          <span className="row" style={{ gap: 12 }}><b>{fmtNum(b.w)} {unit}</b>
            <button className="iconbtn" style={{ width: 32, height: 30, borderRadius: 8, fontSize: 15, color: 'var(--red)' }} onClick={() => delEntry(b.d)} aria-label="delete"><Icon name="trash" /></button></span>
        </div>)}
      </div>
    </>}
  </>
}
export function bwSheet(opts = {}) {
  const h = ui().openSheet(close => <BwSheet {...opts} close={close} />, { locked: false })
  return h
}

/* ============================ import from another app ============================ */
// Shows what a parsed export would actually do before anything is written. An import is
// the one action where "just try it" is expensive — it's someone's entire training
// history — so the numbers, the unit conversion and the exercises we couldn't recognise
// are all on screen before the confirm button.
function ImportSummary({ parsed, close }) {
  const st = useStore(s => s.S)
  const isBW = parsed.kind === 'bodyweight'
  const have = isBW
    ? parsed.bodyweight.filter(b => st.bodyweight.some(x => x.d === b.d)).length
    : parsed.workouts.filter(w => st.workouts.some(x => x.d === w.d)).length
  const fresh = (isBW ? parsed.bodyweight.length : parsed.workouts.length) - have

  const doImport = () => {
    let res
    update(s => { res = mergeImport(s, parsed) })
    close()
    toast(isBW
      ? t('{0} weigh-ins imported', res.added)
      : t('{0} workouts imported', res.added))
  }

  return <>
    <h3>{parsed.source ? t('Import from {0}', parsed.source) : t('Import history')}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>
      {parsed.from === parsed.to ? fmtDate(parsed.from, true) : fmtDate(parsed.from, true) + ' – ' + fmtDate(parsed.to, true)}
    </div>

    <div className="tiles" style={{ textAlign: 'left' }}>
      {isBW ? <>
        <div className="tile"><div className="l">{t('Weigh-ins')}</div><div className="v" style={{ fontSize: '1.1rem' }}>{parsed.bodyweight.length}</div></div>
        <div className="tile"><div className="l">{t('New')}</div><div className="v" style={{ fontSize: '1.1rem' }}>{fresh}</div></div>
      </> : <>
        <div className="tile"><div className="l">{t('Workouts')}</div><div className="v" style={{ fontSize: '1.1rem' }}>{parsed.workouts.length}</div></div>
        <div className="tile"><div className="l">{t('Sets')}</div><div className="v" style={{ fontSize: '1.1rem' }}>{parsed.sets}</div></div>
        <div className="tile"><div className="l">{t('Exercises matched')}</div><div className="v" style={{ fontSize: '1.1rem' }}>{parsed.matched}</div></div>
        <div className="tile"><div className="l">{t('Added as your own')}</div><div className="v" style={{ fontSize: '1.1rem' }}>{parsed.created}</div></div>
      </>}
    </div>

    {parsed.mixedUnits ? <div className="small" style={{ color: 'var(--yellow)', marginBottom: 10 }}>
      {t('The file mixes kg and lb — each set is converted to {0}.', st.unit)}
    </div> : parsed.converted ? <div className="small" style={{ color: 'var(--yellow)', marginBottom: 10 }}>
      {t('The file is in {0} and your profile is in {1} — weights will be converted.', parsed.fileUnit, st.unit)}
    </div> : null}
    {!isBW && !parsed.fileUnit && !parsed.mixedUnits && <div className="small dim" style={{ marginBottom: 10 }}>
      {t('The file does not say which unit it uses — numbers are imported as they are.')}
    </div>}
    {have > 0 && <div className="small dim" style={{ marginBottom: 10 }}>
      {t('{0} days already have data here and will be left alone.', have)}
    </div>}
    {/* The file rated its sets. Say so: the column is off by default, so the ratings would
        otherwise arrive invisibly and look like they had been dropped. */}
    {!isBW && (parsed.rirSets + parsed.rpeSets) > 0 && <div className="small dim" style={{ marginBottom: 10 }}>
      {t(effortOf(st) === 'none'
        ? '{0} sets bring an {1} with them — switch on Effort per set in Settings to see it.'
        : '{0} sets bring an {1} with them.',
      parsed.rirSets || parsed.rpeSets, parsed.rirSets ? 'RIR' : 'RPE')}
    </div>}
    {!isBW && parsed.unmatchedNames.length > 0 && <>
      <h4 className="sec">{t('Not in the library — added as your own exercises')}</h4>
      <div className="mchips" style={{ marginBottom: 12 }}>
        {parsed.unmatchedNames.slice(0, 12).map(n => <span key={n} className="mchip capitalize">{n}</span>)}
        {parsed.unmatchedNames.length > 12 && <span className="mchip">+{parsed.unmatchedNames.length - 12}</span>}
      </div>
    </>}

    <Button variant="primary" onClick={doImport} disabled={!fresh}>
      {fresh ? t('Import') : t('Nothing new to import')}
    </Button>
    <div style={{ height: 8 }} />
    <Button variant="ghost" className="dim" onClick={close}>{t('Cancel')}</Button>
  </>
}

/** Read a CSV/XML export, then show what it would do. */
export function importFromApp(file, onDone) {
  const rd = new FileReader()
  rd.onload = () => {
    let parsed
    try { parsed = parseImport(String(rd.result), { unit: S().unit }) }
    catch (e) { toast(t('Could not read that file')); return }
    if (parsed.error === 'empty') { toast(t('That file is empty')); return }
    if (parsed.error) { toast(t("That file's columns aren't recognised — see the docs for supported apps.")); return }
    if (parsed.kind === 'bodyweight' ? !parsed.bodyweight.length : !parsed.workouts.length) {
      toast(t('Nothing to import from that file')); return
    }
    ui().openSheet(close => <ImportSummary parsed={parsed} close={close} />)
    onDone && onDone()
  }
  rd.onerror = () => toast(t('Could not read that file'))
  rd.readAsText(file)
}

/* ============================ target weight ============================ */
export function bwDeltaColor(delta, currentW) {
  if (!delta) return 'var(--label-2)'
  if (!S().targetW) return 'var(--label)'
  const up = S().targetW > currentW
  return (delta > 0) === up ? 'var(--acc)' : 'var(--red)'
}
function GoalSheet({ close }) {
  const st = S()
  const bw = lastBW(st)
  const [v, setV] = useState(st.targetW || (bw ? bw.w : 70))
  return <>
    <h3>{t('Target weight')}</h3>
    <div className="muted small">{t('Your goal is drawn as a line through the weight charts, and gains/losses are colored by whether they move toward it.')}</div>
    <WeightInput value={v} setValue={setV} unit={st.unit} />
    <div style={{ height: 14 }} />
    <Button variant="primary" onClick={() => {
      const n = Math.round((v || 0) * 10) / 10
      if (!n || n <= 0) { toast(t('Enter a valid weight')); return }
      update(s => { s.targetW = n }); close()
      const b = lastBW(S()); toast(t('Goal set: {0}', fmtNum(n) + ' ' + st.unit) + (b ? ' (' + t('{0} to go', fmtNum(Math.abs(n - b.w))) + ')' : ''))
    }}>{t('Save goal')}</Button>
    {st.targetW && <><div style={{ height: 8 }} /><Button variant="danger" onClick={() => { update(s => { s.targetW = null }); close(); toast(t('Goal removed')) }}>{t('Remove goal')}</Button></>}
  </>
}
export const goalSheet = () => ui().openSheet(close => <GoalSheet close={close} />)

/* ============================ exercise detail ============================ */
// Estimated 1RM for one exercise (issue #18): what the log already implies, plus a calculator
// for a set you have not done — so the number is reachable before there is any history.
function OneRM({ ex }) {
  const st = useStore(s => s.S)
  const best = best1RM(st, ex.id)
  const [w, setW] = useState(best ? best.w : (st.exWeights[ex.id] || {}).w || 20)
  const [r, setR] = useState(best ? best.r : 5)
  const est = estimate1RM(w, r)
  return <>
    <h4 className="sec">{t('Estimated 1RM')}</h4>
    {best && <div className="small" style={{ marginBottom: 8 }}>
      {t('From your log:')} <b className="accent">{fmtNum(best.est)} {st.unit}</b>
      <span className="dim"> · {t('{0} × {1} on {2}', fmtNum(best.w) + ' ' + st.unit, best.r, fmtDate(best.d, true))}</span>
    </div>}
    <div className="row cfgrow" style={{ marginBottom: 10 }}>
      <Stepper label={t('Weight ({0})', st.unit)} value={w} step={2.5} onChange={setW} />
      <Stepper label={t('Reps')} value={r} step={1} decimal={false} onChange={setR} />
    </div>
    <div className="row between" style={{ marginBottom: 4 }}>
      <span className="muted small">{t('Estimate')}</span>
      <b className="accent" style={{ fontSize: 20 }}>{est === null ? '—' : fmtNum(est) + ' ' + st.unit}</b>
    </div>
    <div className="small dim">{est === null
      ? t('Enter a weight and 1–{0} reps — beyond that an estimate is guesswork.', REP_CAP)
      : t('Epley formula — a calculation from one set, not a tested max.')}</div>
  </>
}

function ExerciseDetail({ ex, close }) {
  const st = useStore(s => s.S)
  const last = lastEntryFor(st, ex.id)
  const best = bestWeightFor(st, ex.id)
  const cues = getFormCues(ex)
  const subs = findSubstitutes(ex).slice(0, 4)

  return <>
    <h3 className="capitalize">{t(ex.n)}</h3>
    <Media ex={ex} />
    <div className="row" style={{ gap: 6, flexWrap: 'wrap', margin: '10px 0' }}>
      <span className="tag acc">{t(ex.bp)}</span>
      {ex.tg && <span className="tag"><Icon name="target" />{t(ex.tg)}</span>}
      <span className="tag"><Icon name="dumbbell" />{t(ex.eq)}</span>
      {(ex.sm || []).slice(0, 3).map((s, i) => <span key={i} className="tag">{t(s)}</span>)}
    </div>
    {ex.desc && <div className="exnote">{ex.desc}</div>}
    {best > 0 && <div className="small row" style={{ marginBottom: 6, gap: 5 }}><Icon name="trophy" style={{ fontSize: 14, color: 'var(--yellow)' }} />{t('Best:')} <b className="accent">{fmtNum(best)} {st.unit}</b>{last ? ` · ${t('last')} ${fmtDate(last.d)}: ${last.sets.map(s => setLabel(ex.id, s, last.target)).join(', ')}` : ''}</div>}
    
    {/* Technique Cues / Personal Note Field */}
    <div style={{ marginTop: 10, marginBottom: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--sep-op)' }}>
      <div className="row between" style={{ alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--label)' }}>
          <Icon name="sparkles" style={{ marginRight: 6, color: 'var(--acc)' }} />
          {t('Technique cues & notes')}
        </span>
        <Button size="sm" variant="ghost" icon="pencil" onClick={() => exerciseNoteSheet(ex.id)}>
          {st.exNotes?.[ex.id] ? t('Edit note') : t('Add note')}
        </Button>
      </div>
      {st.exNotes?.[ex.id] ? (
        <div style={{ fontSize: 13, color: 'var(--label-2)', lineHeight: 1.4 }}>
          {st.exNotes[ex.id]}
        </div>
      ) : (
        <div className="small dim">
          {t('No personal cues yet. Tap to document form cues or modifications.')}
        </div>
      )}
    </div>

    <Button variant="primary" icon="plus" style={{ margin: '10px 0 4px' }} onClick={() => addToRoutineSheet(ex)}>{t('Add to my plan')}</Button>
    {ex.custom && <div className="row" style={{ gap: 8, marginTop: 8 }}>
      <Button icon="pencil" style={{ flex: 1 }} onClick={() => { close(); customExSheet(ex) }}>{t('Edit')}</Button>
      <Button variant="danger" icon="trash" style={{ flex: 1 }} onClick={() => deleteCustomEx(ex, close)}>{t('Delete')}</Button>
    </div>}
    {!isCardio(ex) && <OneRM ex={ex} />}

    {cues.length > 0 && <>
      <h4 className="sec" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="sparkles" style={{ color: 'var(--acc)' }} />
        {t('Form Cues & Pro Tips')}
      </h4>
      <ul style={{ margin: '0 0 14px 0', paddingLeft: 18, fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--fg)' }}>
        {cues.map((c, i) => <li key={i} style={{ marginBottom: 4 }}>{c}</li>)}
      </ul>
    </>}

    {subs.length > 0 && <>
      <h4 className="sec">{t('Alternatives & Variations')}</h4>
      <div className="list" style={{ marginBottom: 12 }}>
        {subs.map(sub => (
          <div key={sub.id} className="item" style={{ cursor: 'pointer' }} onClick={() => { close(); exerciseDetailSheet(sub) }}>
            <Thumb ex={sub} />
            <div className="grow">
              <div className="tt capitalize">{sub.n}</div>
              <div className="ss capitalize">{t(sub.tg || sub.bp)} · {t(sub.eq)}</div>
            </div>
            <Icon name="chevronRight" className="chev" />
          </div>
        ))}
      </div>
    </>}

    {instrFor(ex).length > 0 &&<><h4 className="sec">{t('How to')}{!INSTR_LANGS.includes(getLang()) && <span className="dim" style={{ textTransform: 'none', letterSpacing: 0 }}> · {t('instructions in English')}</span>}</h4><ol className="steps-list">{instrFor(ex).map((s, i) => <li key={i}>{s}</li>)}</ol></>}
  </>
}
export const exerciseDetailSheet = ex => ui().openSheet(close => <ExerciseDetail ex={ex} close={close} />)

/* ============================ add to routine ============================ */
function AddToRoutine({ ex, close }) {
  const st = useStore(s => s.S)
  const pick = rid => {
    close()
    const isNew = rid === '_new'
    exConfigSheet(ex, null, cfg => {
      update(s => {
        let r = isNew ? { id: uid(), name: t('New routine'), emoji: DEFAULT_GLYPH, ex: [] } : s.routines.find(x => x.id === rid)
        if (isNew) s.routines.push(r)
        if (r) r.ex.push({ id: ex.id, ...cfg })
      })
      const r = isNew ? S().routines[S().routines.length - 1] : st.routines.find(x => x.id === rid)
      toast(t('“{0}” added to {1}', ex.n, r ? r.name : t('routine')))
      if (isNew && r) nav('/plan/r/' + r.id)
    }, null, isNew ? null : st.routines.find(x => x.id === rid))
  }
  return <>
    <h3 className="capitalize">{t('Add “{0}”', ex.n)}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>{t('Pick a routine — sets, reps & weight come next.')}</div>
    <div className="list">
      {st.routines.map(r => <div key={r.id} className="item" onClick={() => pick(r.id)}>
        <span className="lrow-i"><Icon name={glyphOf(r.emoji)} /></span>
        <div className="grow"><div className="tt">{r.name}</div><div className="ss">{exCount(r.ex.length)}</div></div>
        {r.ex.some(e => e.id === ex.id) && <span className="tag">{t('already in')}</span>}<Icon name="plus" className="chev" />
      </div>)}
      <div className="item" onClick={() => pick('_new')}><span className="lrow-i" style={{ background: 'var(--surface-3)' }}><Icon name="sparkles" /></span>
        <div className="grow"><div className="tt">{t('New routine')}</div><div className="ss">{t('Create one and start with this exercise')}</div></div><Icon name="plus" className="chev" /></div>
    </div>
  </>
}
export const addToRoutineSheet = ex => ui().openSheet(close => <AddToRoutine ex={ex} close={close} />)

/* ============================ custom exercises (issue #11) ============================ */
// Name + body part is all it takes — the exercise then behaves like any built-in one
// (planning, logging, PRs, stats), just without an animation.
function CustomExForm({ existing, prefill, onDone, close }) {
  const [n, setN] = useState(existing ? existing.n : (prefill || ''))
  const [bp, setBp] = useState(existing ? existing.bp : '')
  const [desc, setDesc] = useState(existing ? (existing.desc || '') : '')
  const save = () => {
    const name = n.trim()
    if (!name) { toast(t('Give it a name')); return }
    if (!bp) { toast(t('Pick a body part')); return }
    const dup = allExercises(S()).find(e => e.n.toLowerCase() === name.toLowerCase() && e.id !== (existing || {}).id)
    if (dup) { toast(t('“{0}” already exists', dup.n)); return }
    const d = desc.trim().slice(0, 1000)
    let id = existing && existing.id
    if (existing) update(s => { const c = (s.customEx || []).find(x => x.id === id); if (c) { c.n = name; c.bp = bp; c.desc = d } })
    else {
      id = 'c' + uid()
      update(s => { (s.customEx = s.customEx || []).push({ id, n: name, bp, desc: d, tg: '', eq: 'custom', custom: true }) })
    }
    close()
    toast(existing ? t('Saved') : t('“{0}” created', name))
    onDone && onDone(EXIDX[id])
  }
  return <>
    <h3>{existing ? t('Edit custom exercise') : t('Create your own exercise')}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>{t('Name it and pick a body part — it behaves like any other exercise, just without an animation.')}</div>
    <input className="input" placeholder={t('Exercise name')} value={n} onChange={e => setN(e.target.value)} />
    <div className="chips" style={{ margin: '12px 0' }}>
      {BODYPARTS.map(b => <button key={b} className={'chip' + (bp === b ? ' on' : '')} onClick={() => setBp(b)}>{t(b)}</button>)}
    </div>
    {bp === 'cardio' && <div className="small dim row" style={{ marginBottom: 10, gap: 5 }}><Icon name="figureRun" style={{ fontSize: 13 }} />{t('Cardio exercises log time + speed instead of weight × reps.')}</div>}
    <textarea className="input" rows={4} maxLength={1000} placeholder={t('Description (optional) — setup, cues, anything you want to remember')}
      value={desc} onChange={e => setDesc(e.target.value)} />
    <div style={{ height: 14 }} />
    <Button variant="primary" onClick={save}>{existing ? t('Save') : t('Create exercise')}</Button>
    {existing && <><div style={{ height: 8 }} /><Button variant="danger" icon="trash" onClick={() => { close(); deleteCustomEx(existing) }}>{t('Delete exercise')}</Button></>}
  </>
}
export const customExSheet = (existing, onDone, prefill) => ui().openSheet(close => <CustomExForm existing={existing} prefill={prefill} onDone={onDone} close={close} />)

export function deleteCustomEx(ex, afterDelete) {
  if (S().active?.entries.some(e => e.id === ex.id)) { toast(t('Finish your current workout first')); return }
  confirmSheet({
    title: t('Delete “{0}”?', ex.n),
    message: t('It will be removed from your routines. Already-logged workouts keep their sets.'),
    confirmText: t('Delete'), danger: true,
    onConfirm: () => {
      update(s => {
        s.customEx = (s.customEx || []).filter(x => x.id !== ex.id)
        s.routines.forEach(r => { r.ex = r.ex.filter(e => e.id !== ex.id); cleanupSg(r.ex) })
        // stamp the name into history entries so past workouts stay readable
        s.workouts.forEach(w => w.entries.forEach(e => { if (e.id === ex.id) e.n = ex.n }))
        delete s.exWeights[ex.id]
      })
      toast(t('Exercise deleted'))
      afterDelete && afterDelete()
    }
  })
}

/* ============================ exercise picker ============================ */
// Exercises already used in your routines or past workouts (for the "Chosen" filter + a marker).
function usageMap(st) {
  const u = {}
  st.routines.forEach(r => r.ex.forEach(e => { u[e.id] = (u[e.id] || 0) + 1 }))
  st.workouts.forEach(w => w.entries.forEach(e => { u[e.id] = (u[e.id] || 0) + 1 }))
  return u
}
function ExercisePicker({ onPick, close }) {
  const st = useStore(s => s.S)
  const usage = usageMap(st)
  const [q, setQ] = useState('')
  const [bp, setBp] = useState('')          // '' = all, '★' = chosen, else a body part
  const [eq, setEq] = useState('')          // '' = any equipment
  const [shown, setShown] = useState(50)
  const ql = q.toLowerCase().trim()
  const all = allExercises(st)
  let base = all.filter(e =>
    (bp === '★' ? usage[e.id] : (!bp || e.bp === bp)) &&
    (!ql || e.n.toLowerCase().includes(ql) || e.tg.includes(ql) || e.eq.includes(ql) || (e.desc || '').toLowerCase().includes(ql)))
  if (bp === '★') base = [...base].sort((a, b) => (usage[b.id] - usage[a.id]) || (a.n < b.n ? -1 : 1))
  const eqOpts = equipmentOf(base)
  // Drop the equipment filter if the search narrowed it away, so you never hit a dead end.
  const eqOn = eqOpts.includes(eq) ? eq : ''
  const f = eqOn ? base.filter(e => e.eq === eqOn) : base
  const chosenCount = Object.keys(usage).length
  return <>
    <h3>{t('Add exercise')}</h3>
    <div className="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <input className="input" placeholder={t('Search {0} exercises…', all.length)} value={q} onChange={e => { setQ(e.target.value); setShown(50) }} /></div>
    <div className="chips" style={{ margin: eqOpts.length > 1 ? '10px 0 6px' : '10px 0' }}>
      {chosenCount > 0 && <button className={'chip' + (bp === '★' ? ' on' : '')} onClick={() => { setBp('★'); setEq(''); setShown(50) }}><Icon name="starFill" style={{ fontSize: 12, display: 'inline-block', marginRight: 4, verticalAlign: '-1px' }} />{t('Chosen')} ({chosenCount})</button>}
      <button className={'chip nocap' + (!bp ? ' on' : '')} onClick={() => { setBp(''); setEq(''); setShown(50) }}>{t('All')}</button>
      {BODYPARTS.map(b => <button key={b} className={'chip' + (bp === b ? ' on' : '')} onClick={() => { setBp(b); setEq(''); setShown(50) }}>{t(b)}</button>)}
    </div>
    {eqOpts.length > 1 && <div className="chips" style={{ marginBottom: 10 }}>
      <button className={'chip nocap' + (!eqOn ? ' on' : '')} onClick={() => { setEq(''); setShown(50) }}>{t('Any equipment')}</button>
      {eqOpts.map(x => <button key={x} className={'chip' + (eqOn === x ? ' on' : '')} onClick={() => { setEq(x); setShown(50) }}>{t(x)}</button>)}
    </div>}
    <div className="list">
      {bp !== '★' && <div className="item" onClick={() => customExSheet(null, ex => onPick(ex), q.trim())}>
        <div className="thumb thumb-x"><Icon name="sparkles" /></div>
        <div className="grow"><div className="tt">{t('Create your own exercise')}</div><div className="ss">{t('name + body part, no animation')}</div></div><Icon name="plus" className="chev" />
      </div>}
      {f.slice(0, shown).map(e => <div key={e.id} className="item" onClick={() => onPick(e)}>
        <Thumb ex={e} /><div className="grow"><div className="tt capitalize">{t(e.n)}</div><div className="ss capitalize">{t(e.tg || e.bp)} · {t(e.eq)}</div></div>
        {usage[e.id] && <span className="tag acc"><Icon name="starFill" /></span>}<Icon name="plus" className="chev" />
      </div>)}
      {f.length === 0 && bp === '★' && <div className="empty">{t('Nothing chosen yet — add exercises and they’ll show up here.')}</div>}
    </div>
    {f.length > shown && <><div style={{ height: 8 }} /><Button onClick={() => setShown(s => s + 50)}>{t('Show more')}</Button></>}
  </>
}
export const exercisePicker = onPick => ui().openSheet(close => <ExercisePicker onPick={onPick} close={close} />)

/* ============================ change / substitute exercise picker ============================ */
function ChangeExerciseSheet({ currentEx, onSwap, close }) {
  const st = useStore(s => s.S)
  const all = allExercises(st)
  const current = currentEx ? exOr(currentEx.id || currentEx) : null
  const substitutes = current ? findSubstitutes(current, all) : []

  const [tab, setTab] = useState(substitutes.length > 0 ? 'sub' : 'all')
  const [q, setQ] = useState('')
  const [eq, setEq] = useState('')
  const [bp, setBp] = useState(tab === 'sub' && current ? current.bp : '')
  const [shown, setShown] = useState(40)

  const ql = q.toLowerCase().trim()
  let pool = tab === 'sub' ? substitutes : all
  if (bp && tab === 'all') pool = pool.filter(e => e.bp === bp)
  if (ql) pool = pool.filter(e => e.n.toLowerCase().includes(ql) || (e.tg && e.tg.includes(ql)) || (e.eq && e.eq.includes(ql)))
  const eqOpts = equipmentOf(pool)
  const eqOn = eqOpts.includes(eq) ? eq : ''
  const f = eqOn ? pool.filter(e => e.eq === eqOn) : pool

  const handlePick = ex => {
    close()
    onSwap(ex)
  }

  return <>
    <div className="row between" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
      <div>
        <h3 style={{ margin: 0 }}>{t('Change exercise')}</h3>
        {current && <div className="muted small" style={{ marginTop: 2 }}>
          {t('Replace “{0}”', current.n)}
        </div>}
      </div>
      <button type="button" className="iconbtn" onClick={close}><Icon name="xmark" /></button>
    </div>

    {current && (
      <div className="card" style={{ padding: '8px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Thumb ex={current} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="small muted" style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 700 }}>{t('Currently selected')}</div>
          <div style={{ fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>{t(current.n)}</div>
          <div className="small dim">{t(current.tg || current.bp)} · {t(current.eq)}</div>
        </div>
      </div>
    )}

    {substitutes.length > 0 && (
      <div style={{ marginBottom: 10 }}>
        <Segmented value={tab} onChange={v => { setTab(v); setShown(40) }} options={[
          { value: 'sub', label: t('Substitutes ({0})', substitutes.length) },
          { value: 'all', label: t('All exercises') }
        ]} />
      </div>
    )}

    <div className="search" style={{ marginBottom: 8 }}>
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <input className="input" placeholder={t('Search replacement…')} value={q} onChange={e => { setQ(e.target.value); setShown(40) }} />
    </div>

    {tab === 'all' && (
      <div className="chips" style={{ marginBottom: 8 }}>
        <button className={'chip nocap' + (!bp ? ' on' : '')} onClick={() => { setBp(''); setEq(''); setShown(40) }}>{t('All muscles')}</button>
        {BODYPARTS.map(b => <button key={b} className={'chip' + (bp === b ? ' on' : '')} onClick={() => { setBp(b); setEq(''); setShown(40) }}>{t(b)}</button>)}
      </div>
    )}

    {eqOpts.length > 1 && (
      <div className="chips" style={{ marginBottom: 10 }}>
        <button className={'chip nocap' + (!eqOn ? ' on' : '')} onClick={() => { setEq(''); setShown(40) }}>{t('Any equipment')}</button>
        {eqOpts.map(x => <button key={x} className={'chip' + (eqOn === x ? ' on' : '')} onClick={() => { setEq(x); setShown(40) }}>{t(x)}</button>)}
      </div>
    )}

    <div className="list">
      {f.slice(0, shown).map(e => <div key={e.id} className="item" onClick={() => handlePick(e)}>
        <Thumb ex={e} />
        <div className="grow">
          <div className="tt capitalize">{t(e.n)}</div>
          <div className="ss capitalize">{t(e.tg || e.bp)} · {t(e.eq)}</div>
        </div>
        <span className="tag acc">{t('Select')}</span>
      </div>)}
      {f.length === 0 && <div className="empty">{t('No matching exercises found.')}</div>}
    </div>
    {f.length > shown && <><div style={{ height: 8 }} /><Button onClick={() => setShown(s => s + 40)}>{t('Show more')}</Button></>}
  </>
}
export const changeExerciseSheet = (currentEx, onSwap) => ui().openSheet(close => <ChangeExerciseSheet currentEx={currentEx} onSwap={onSwap} close={close} />)

/* ============================ quick swap exercise sheet (same muscle group) ============================ */
function QuickSwapSheet({ currentEx, entry, onSwap, close }) {
  const st = useStore(s => s.S)
  const all = allExercises(st)
  const current = currentEx ? exOr(currentEx.id || currentEx) : null
  const targetMuscle = current?.tg || current?.bp || ''
  const bodyPart = current?.bp || ''

  // All substitutes targeting the same muscle group
  const sameMuscleExercises = useMemo(() => {
    if (!current) return []
    const subs = findSubstitutes(current, all)
    if (subs.length > 0) return subs
    return all.filter(e => e.id !== current.id && (e.bp === current.bp || e.tg === current.tg))
  }, [current, all])

  const [q, setQ] = useState('')
  const [eq, setEq] = useState('')
  const [shown, setShown] = useState(30)
  const [showAllMuscles, setShowAllMuscles] = useState(false)

  const completedSets = entry?.sets?.filter(s => s.done).length || 0
  const totalSets = entry?.sets?.length || 0

  const ql = q.toLowerCase().trim()
  let pool = showAllMuscles ? all.filter(e => e.id !== current?.id) : sameMuscleExercises
  if (ql) {
    pool = pool.filter(e => e.n.toLowerCase().includes(ql) || (e.tg && e.tg.toLowerCase().includes(ql)) || (e.eq && e.eq.toLowerCase().includes(ql)))
  }

  const eqOpts = equipmentOf(pool)
  const eqOn = eqOpts.includes(eq) ? eq : ''
  const f = eqOn ? pool.filter(e => e.eq === eqOn) : pool

  const handlePick = ex => {
    close()
    onSwap(ex)
  }

  const handleRandom = () => {
    if (!sameMuscleExercises.length) return
    const randomEx = sameMuscleExercises[Math.floor(Math.random() * sameMuscleExercises.length)]
    handlePick(randomEx)
  }

  return <>
    <div className="row between" style={{ alignItems: 'flex-start', marginBottom: 10 }}>
      <div>
        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{t('Quick Swap')}</h3>
          <span className="tag acc" style={{ fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="shuffle" style={{ fontSize: 10 }} />
            {t('Same muscle group')}
          </span>
        </div>
        {current && (
          <div className="muted small" style={{ marginTop: 2 }}>
            {t('Replace “{0}”', t(current.n))}
          </div>
        )}
      </div>
      <button type="button" className="iconbtn" onClick={close} aria-label={t('Close')}><Icon name="xmark" /></button>
    </div>

    {/* Set progress preserved banner */}
    <div className="card" style={{ padding: '10px 12px', marginBottom: 12, background: 'color-mix(in srgb, var(--acc) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--acc) 30%, transparent)' }}>
      <div className="row between" style={{ alignItems: 'center' }}>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <span style={{ color: 'var(--acc)', fontSize: 16, display: 'inline-flex' }}>
            <Icon name="checkCircleFill" />
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--fg)' }}>
              {t('Set progress kept')}
            </div>
            <div className="small muted">
              {t('{0} of {1} sets completed · Weights and reps preserved', completedSets, totalSets)}
            </div>
          </div>
        </div>
        {sameMuscleExercises.length > 1 && (
          <Button size="sm" variant="tinted" icon="shuffle" onClick={handleRandom} title={t('Pick a random substitute from this muscle group')}>
            {t('Random swap')}
          </Button>
        )}
      </div>
    </div>

    {/* Currently selected exercise info */}
    {current && (
      <div className="card" style={{ padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Thumb ex={current} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="small muted" style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 700 }}>{t('Currently selected')}</div>
          <div style={{ fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>{t(current.n)}</div>
          <div className="small dim">{t(current.tg || current.bp)} · {t(current.eq)}</div>
        </div>
      </div>
    )}

    {/* Search within this muscle group */}
    <div className="search" style={{ marginBottom: 8 }}>
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <input
        className="input"
        placeholder={t('Search in {0}…', t(targetMuscle || bodyPart || 'muscle group'))}
        value={q}
        onChange={e => { setQ(e.target.value); setShown(30) }}
      />
    </div>

    {/* Equipment filter chips */}
    {eqOpts.length > 1 && (
      <div className="chips" style={{ marginBottom: 10 }}>
        <button className={'chip nocap' + (!eqOn ? ' on' : '')} onClick={() => { setEq(''); setShown(30) }}>
          {t('Any equipment')}
        </button>
        {eqOpts.map(x => (
          <button key={x} className={'chip' + (eqOn === x ? ' on' : '')} onClick={() => { setEq(x); setShown(30) }}>
            {t(x)}
          </button>
        ))}
      </div>
    )}

    {/* Quick 1-tap alternatives carousel if multiple exist and no search is active */}
    {!ql && !eq && sameMuscleExercises.length > 0 && !showAllMuscles && (
      <div style={{ marginBottom: 10 }}>
        <div className="small muted" style={{ marginBottom: 6, fontWeight: 600 }}>{t('Quick alternatives')}</div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {sameMuscleExercises.slice(0, 5).map(e => (
            <button
              key={e.id}
              type="button"
              className="btn ghost"
              onClick={() => handlePick(e)}
              style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface-2)', border: '1px solid var(--sep)' }}
            >
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{t(e.n)}</span>
              <span className="tag small" style={{ fontSize: 10 }}>{t(e.eq)}</span>
            </button>
          ))}
        </div>
      </div>
    )}

    {/* List of matching substitutes */}
    <div className="list">
      {f.slice(0, shown).map(e => (
        <div key={e.id} className="item" onClick={() => handlePick(e)}>
          <Thumb ex={e} />
          <div className="grow">
            <div className="tt capitalize">{t(e.n)}</div>
            <div className="ss capitalize">{t(e.tg || e.bp)} · {t(e.eq)}</div>
          </div>
          <span className="tag acc" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="shuffle" style={{ fontSize: 10 }} />
            {t('Swap')}
          </span>
        </div>
      ))}
      {f.length === 0 && (
        <div className="empty" style={{ padding: '24px 12px' }}>
          <div>{t('No other exercises found for this muscle group.')}</div>
          {!showAllMuscles && (
            <div style={{ marginTop: 10 }}>
              <Button size="sm" variant="tinted" onClick={() => setShowAllMuscles(true)}>
                {t('Search all muscle groups instead')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>

    {f.length > shown && (
      <>
        <div style={{ height: 8 }} />
        <Button onClick={() => setShown(s => s + 30)}>{t('Show more')}</Button>
      </>
    )}

    {!showAllMuscles && (
      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <button
          type="button"
          className="btn ghost small"
          style={{ fontSize: 12, color: 'var(--dim)' }}
          onClick={() => setShowAllMuscles(true)}
        >
          {t('Looking for a different muscle? Browse all exercises')}
        </button>
      </div>
    )}
  </>
}
export const quickSwapSheet = (currentEx, entry, onSwap) => ui().openSheet(close => <QuickSwapSheet currentEx={currentEx} entry={entry} onSwap={onSwap} close={close} />)

/* ============================ exercise config ============================ */
// Progression settings for one exercise (issue #17). Shown inside the config sheet because
// "how does this lift go up" belongs next to sets and reps, not in a separate screen. Left
// on "follow the routine" it inherits, so most people never touch it.
function ProgressionFields({ ex, mode, c, setC, routine, unit }) {
  const options = POLICIES_FOR[mode] || ['off']
  if (options.length < 2) return null
  const inherited = policyFor({ id: ex.id }, routine, mode)
  const active = policyFor({ ...c, id: ex.id }, routine, mode)
  const inc = c.inc > 0 ? c.inc : (mode === 'time' ? 5 : defaultIncrement(ex.id, unit))
  return <>
    <h4 className="sec">{t('Progression')}</h4>
    <div className="sect-b" style={{ marginBottom: 8 }}>
      <SelectRow title={t('Rule')} sheetTitle={t('Progression')} value={c.prog || ''} onChange={v => setC(x => ({ ...x, prog: v || undefined }))}
        options={[{ value: '', label: t('Follow the routine ({0})', t(POLICY_NAME[inherited])) },
          ...options.map(p => ({ value: p, label: t(POLICY_NAME[p]) }))]} />
    </div>
    <div className="small dim" style={{ marginBottom: active === 'off' ? 18 : 10 }}>{t(POLICY_DESC[active])}</div>
    {active !== 'off' && <div className="row cfgrow" style={{ marginBottom: 18 }}>
      <Stepper label={mode === 'time' ? t('Step (seconds)') : t('Step ({0})', unit)} value={inc}
        step={mode === 'time' ? 5 : 1.25} decimal={mode !== 'time'} onChange={v => setC(x => ({ ...x, inc: v }))} />
      {active === 'double' && <Stepper label={t('Reps from')} value={c.repsMin || Math.max(1, (c.reps || 10) - 2)}
        step={1} decimal={false} onChange={v => setC(x => ({ ...x, repsMin: v }))} />}
    </div>}
  </>
}

function ExConfig({ ex, existing, onSave, onDelete, onSwap, close, routine }) {
  const st = useStore(s => s.S)
  const cardio = isCardio(ex.id)
  const [c, setC] = useState(existing || defaultConfig(ex.id))
  // Cardio keeps its own duration+speed form; the reps/time choice (issue #16) is offered for
  // everything else, which is where the gap was — planks, hangs, wall sits, loaded carries.
  const mode = cardio ? 'cardio' : modeOf({ ...c, id: ex.id })
  // Keep whatever the other mode already had (sets, weight) and fill only what is missing.
  const setMode = m => setC(x => ({ ...defaultConfig(ex.id, m), ...x, mode: m }))
  const save = () => {
    close()
    const sets = Math.max(1, Math.round(c.sets) || (cardio ? 1 : 3))
    // Only carry progression settings that differ from the inherited default, so a plan file
    // stays readable and "follow the routine" keeps meaning exactly that.
    const prog = {}
    if (c.prog) prog.prog = c.prog
    if (c.inc > 0) prog.inc = c.inc
    if (cardio) onSave({ sets, min: Math.max(1, Math.round(c.min) || 20), speed: Math.max(0, c.speed || 8) })
    else if (mode === 'time') onSave({ sets, mode: 'time', sec: Math.max(1, Math.round(c.sec) || 45), weight: Math.max(0, c.weight || 0), ...prog })
    else {
      const reps = Math.max(1, Math.round(c.reps) || 10)
      const out = { sets, mode: 'reps', reps, weight: Math.max(0, c.weight || 0), ...prog }
      if (policyFor({ ...c, id: ex.id }, routine, 'reps') === 'double') out.repsMin = Math.min(reps, Math.max(1, Math.round(c.repsMin) || Math.max(1, reps - 2)))
      onSave(out)
    }
  }
  return <>
    <h3 className="capitalize">{t(ex.n)}</h3>
    <Media ex={ex} />
    <div className="row" style={{ gap: 6, flexWrap: 'wrap', margin: '10px 0 14px' }}>
      {cardio && <span className="tag acc"><Icon name="figureRun" />{t('Cardio')}</span>}
      <span className="tag">{t(ex.tg || ex.bp)}</span><span className="tag">{t(ex.eq)}</span>
    </div>
    {ex.desc && <div className="exnote">{ex.desc}</div>}
    {!cardio && <div style={{ marginBottom: 14 }}>
      <Segmented className="seg-range" value={mode} onChange={setMode}
        options={[{ value: 'reps', label: t('Reps') }, { value: 'time', label: t('Time') }]} />
    </div>}
    <div className="row cfgrow" style={{ marginBottom: mode === 'time' ? 8 : 18 }}>
      {cardio ? <>
        <Stepper label={t('Intervals')} value={c.sets} step={1} decimal={false} onChange={v => setC(x => ({ ...x, sets: v }))} />
        <Stepper label={t('Minutes')} value={c.min} step={1} decimal={false} onChange={v => setC(x => ({ ...x, min: v }))} />
        <Stepper label={t('Speed (km/h)')} value={c.speed} step={0.5} onChange={v => setC(x => ({ ...x, speed: v }))} />
      </> : mode === 'time' ? <>
        <Stepper label={t('Sets')} value={c.sets} step={1} decimal={false} onChange={v => setC(x => ({ ...x, sets: v }))} />
        <Stepper label={t('Seconds')} value={c.sec} step={5} decimal={false} onChange={v => setC(x => ({ ...x, sec: v }))} />
        <Stepper label={t('Weight ({0})', st.unit)} value={c.weight} step={2.5} onChange={v => setC(x => ({ ...x, weight: v }))} />
      </> : <>
        <Stepper label={t('Sets')} value={c.sets} step={1} decimal={false} onChange={v => setC(x => ({ ...x, sets: v }))} />
        <Stepper label={t('Reps')} value={c.reps} step={1} decimal={false} onChange={v => setC(x => ({ ...x, reps: v }))} />
        <Stepper label={t('Weight ({0})', st.unit)} value={c.weight} step={2.5} onChange={v => setC(x => ({ ...x, weight: v }))} />
      </>}
    </div>
    {mode === 'time' && <div className="small dim" style={{ marginBottom: 18 }}>
      {t('A timer runs while you hold the set. Leave the weight at 0 for bodyweight holds.')}
    </div>}
    <ProgressionFields ex={ex} mode={mode} c={c} setC={setC} routine={routine} unit={st.unit} />
    <Button variant="primary" onClick={save}>{existing ? t('Save') : t('Add to routine')}</Button>
    {onSwap && <><div style={{ height: 8 }} /><Button variant="tinted" icon="shuffle" onClick={() => { close(); changeExerciseSheet(ex, onSwap) }}>{t('Swap / Change exercise')}</Button></>}
    {ex.custom && <><div style={{ height: 8 }} /><Button icon="pencil" onClick={() => { close(); customExSheet(ex) }}>{t('Edit or delete this exercise')}</Button></>}
    {onDelete && <><div style={{ height: 8 }} /><Button variant="danger" onClick={() => { close(); onDelete() }}>{t('Remove from routine')}</Button></>}
  </>
}
export const exConfigSheet = (ex, existing, onSave, onDelete, routine, onSwap) => ui().openSheet(close => <ExConfig ex={ex} existing={existing} onSave={onSave} onDelete={onDelete} routine={routine} onSwap={onSwap} close={close} />)

/* ============================ glyph picker ============================ */
// Grouped by what the glyph means for a training day, so picking one is a scan
// of four short rows rather than a hunt through twenty loose icons.
export const glyphPicker = (current, onPick) => {
  const cur = glyphOf(current)
  return ui().openSheet(close => <>
    <h3>{t('Pick an icon')}</h3>
    {GLYPH_GROUPS.map(g => (
      <div key={g.key} style={{ marginBottom: 14 }}>
        <div className="sect-t" style={{ padding: '0 2px 7px' }}>{t(g.key)}</div>
        <div className="glyph-grid">
          {g.items.map(n => (
            <button key={n} className={'glyph-cell' + (n === cur ? ' on' : '')}
              onClick={() => { close(); onPick(n) }} aria-label={n}>
              <Icon name={n} />
            </button>
          ))}
        </div>
      </div>
    ))}
    <div style={{ height: 4 }} />
  </>)
}

/* ============================ share / print / import a plan ============================ */
export const planToolsSheet = () => ui().openSheet(close => <PlanTools close={close} />)

function PlanTools({ close }) {
  const st = useStore(s => s.S)
  const user = useStore(s => s.user)
  const fileRef = useRef(null)
  const hasRoutines = (st.routines || []).some(r => r.ex && r.ex.length)

  const exportFile = async () => {
    const bundle = buildPlanBundle(st, user?.name ? t('{0}’s plan', user.name) : '')
    const json = JSON.stringify(bundle, null, 2)
    const name = 'gymly-plan-' + todayISO() + '.json'
    if (MOBILE) { try { await shareExport(json, name) } catch (e) { /* dismissed */ } close(); return }
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href)
    close(); toast(t('Plan file saved — send it to a friend'))
  }
  const pickFile = ev => {
    const f = ev.target.files[0]; ev.target.value = ''; if (!f) return
    const rd = new FileReader()
    rd.onload = () => {
      try { const bundle = parsePlan(rd.result); close(); planImportSheet(bundle) }
      catch (e) { toast(t('Import failed: {0}', e.message)) }
    }
    rd.readAsText(f)
  }

  return <>
    <h3>{t('Share your plan')}</h3>
    <div className="muted small" style={{ marginBottom: 16 }}>{t('Send your routines to a friend, or put your week on paper.')}</div>
    <Button variant="primary" icon="upload" onClick={exportFile} disabled={!hasRoutines}>{t('Export plan file')}</Button>
    <div className="dim small" style={{ margin: '7px 2px 0', lineHeight: 1.4 }}>{t('A small file a friend imports into their own Gymly — routines only, none of your workouts or weigh-ins.')}</div>
    {!MOBILE && <>
      <div style={{ height: 12 }} />
      <Button variant="tinted" icon="download" onClick={() => { close(); printPlan(st, user?.name || '') }} disabled={!hasRoutines}>{t('Print / Save as PDF')}</Button>
      <div className="dim small" style={{ margin: '7px 2px 0', lineHeight: 1.4 }}>{t('A clean one-page-per-plan printout — no exercise ever splits across a page.')}</div>
    </>}
    {!hasRoutines && <div className="dim small" style={{ margin: '12px 2px 0' }}>{t('Add an exercise to a routine first — an empty plan has nothing to share.')}</div>}
    <h4 className="sec">{t('Got a plan from a friend?')}</h4>
    <Button variant="ghost" icon="folder" onClick={() => fileRef.current?.click()}>{t('Import a plan file')}</Button>
    <input ref={fileRef} type="file" accept="application/json,.json" onChange={pickFile} hidden />
  </>
}

export const planImportSheet = bundle => ui().openSheet(close => <PlanImport bundle={bundle} close={close} />)

function PlanImport({ bundle, close }) {
  const [schedule, setSchedule] = useState(false)
  const apply = () => {
    update(s => mergePlan(s, bundle, { schedule }))
    close()
    toast(t('Added {0} routines to your plan', bundle.routineCount))
    nav('/plan')
  }
  return <>
    <h3>{bundle.name ? t('Import “{0}”', bundle.name) : t('Import this plan')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>
      {t(bundle.routineCount === 1 ? '{0} routine' : '{0} routines', bundle.routineCount)}
      {' · ' + exCount(bundle.exerciseCount)}
      {bundle.scheduledDays > 0
        ? ' · ' + t(bundle.scheduledDays === 1 ? 'scheduled on {0} day' : 'scheduled on {0} days', bundle.scheduledDays)
        : ''}
    </div>
    <div className="dim small" style={{ marginBottom: 14, lineHeight: 1.4 }}>{t('These are added as new routines — nothing you already have is changed.')}</div>
    {bundle.dropped > 0 && <div className="small" style={{ color: 'var(--yellow)', marginBottom: 14, lineHeight: 1.4 }}>
      {t(bundle.dropped === 1
        ? '{0} exercise in the file isn’t in your library and was left out.'
        : '{0} exercises in the file aren’t in your library and were left out.', bundle.dropped)}
    </div>}
    {bundle.scheduledDays > 0 && <div className="row between" style={{ padding: '10px 2px', borderTop: '1px solid var(--sep)', borderBottom: '1px solid var(--sep)', marginBottom: 16, gap: 12 }}>
      <div><div className="tt" style={{ fontSize: 15 }}>{t('Use this weekly schedule')}</div><div className="small dim">{t('Replaces your current Mon–Sun assignments.')}</div></div>
      <Switch checked={schedule} onChange={setSchedule} />
    </div>}
    <Button variant="primary" onClick={apply}>{t('Add to my plan')}</Button>
    <div style={{ height: 8 }} />
    <Button variant="ghost" className="dim" onClick={close}>{t('Cancel')}</Button>
  </>
}

/* ============================ exercise note (technique cues) ============================ */
export function exerciseNoteSheet(exId) {
  const ex = exOr(exId)
  ui().openSheet(close => <ExerciseNote ex={ex} close={close} />)
}

function ExerciseNote({ ex, close }) {
  const S = useStore(s => s.S)
  const [note, setNote] = useState(() => (S.exNotes || {})[ex.id] || '')
  const save = () => {
    update(s => {
      s.exNotes = s.exNotes || {}
      if (note.trim()) s.exNotes[ex.id] = note.trim()
      else delete s.exNotes[ex.id]
    })
    close()
    toast(t('Note saved'))
  }
  return <>
    <h3 className="capitalize">{t(ex.n)}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>
      {t('Document technique cues, form reminders or modifications for this exercise.')}
    </div>
    <textarea
      className="field area"
      style={{ minHeight: 110, marginBottom: 14, width: '100%' }}
      placeholder={t('e.g. Keep chest high, 2s pause at bottom, slight incline...')}
      value={note}
      onChange={e => setNote(e.target.value)}
      autoFocus
    />
    <div className="row" style={{ gap: 8 }}>
      <Button variant="primary" style={{ flex: 1 }} onClick={save}>{t('Save Note')}</Button>
      {note && (
        <Button variant="ghost" className="dim" onClick={() => { setNote(''); update(s => { if (s.exNotes) delete s.exNotes[ex.id] }); close(); toast(t('Note cleared')) }}>
          {t('Clear')}
        </Button>
      )}
    </div>
  </>
}

/* ============================ day override / assign ============================ */
function DayOverride({ iso, close }) {
  const st = useStore(s => s.S)
  const [expandedId, setExpandedId] = useState(null)
  const wd = new Date(iso + 'T12:00:00').getDay()
  const weeklyR = st.routines.find(r => r.id === st.week[wd])
  const hasOvr = st.dayPlan[iso] !== undefined
  const effId = effectiveRoutineId(st, iso)
  const set = v => {
    update(s => { if (!v) delete s.dayPlan[iso]; else s.dayPlan[iso] = v })
    close()
    toast(v === '' ? t('Back to weekly plan') : v === 'rest' ? t('{0} set to rest', fmtDate(iso)) : t('{0} planned for {1}', (st.routines.find(r => r.id === v) || {}).name, fmtDate(iso)))
  }

  const swapExerciseInRoutine = (routineId, exIdx, curEx) => {
    changeExerciseSheet(curEx, newEx => {
      update(s => {
        const r = s.routines.find(x => x.id === routineId)
        if (r && r.ex[exIdx]) {
          r.ex[exIdx] = { ...r.ex[exIdx], id: newEx.id }
        }
      })
      toast(t('Exercise changed to {0}', newEx.n))
    })
  }

  return <>
    <h3>{fmtDate(iso, true)}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>{t('Weekly plan:')} {weeklyR ? weeklyR.name : t('Rest')}{hasOvr && <span style={{ color: 'var(--orange)' }}> · {t('changed for this day')}</span>}<br />{t('Sick, missed a day or want a different session? Pick what to train instead.')}</div>
    <div className="list">
      {st.routines.map(r => {
        const isExp = expandedId === r.id
        const exPreview = (r.ex || []).slice(0, 3).map(e => exOr(e.id).n).join(' · ')
        return (
          <div key={r.id} style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="item" onClick={() => set(r.id)}>
              <span className="lrow-i"><Icon name={glyphOf(r.emoji)} /></span>
              <div className="grow">
                <div className="tt">{r.name}</div>
                <div className="ss">
                  {exCount(r.ex.length)}{exPreview ? ` · ${exPreview}${r.ex.length > 3 ? '…' : ''}` : ''}
                </div>
              </div>
              <button
                type="button"
                className="iconbtn"
                style={{ width: 32, height: 32, fontSize: 13, marginRight: 2 }}
                onClick={ev => { ev.stopPropagation(); setExpandedId(isExp ? null : r.id) }}
                title={t('View and change exercises')}
              >
                <Icon name={isExp ? 'chevronUp' : 'chevronDown'} />
              </button>
              {effId === r.id && <Icon name="check" className="accent" />}
            </div>

            {/* Expandable Exercise Details & Change */}
            {isExp && (
              <div className="day-routine-accordion">
                <div className="row between" style={{ alignItems: 'center', paddingBottom: 4, borderBottom: '1px solid var(--sep-op)' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{t('Exercises in {0}', r.name)}</span>
                  <button
                    type="button"
                    className="iconbtn"
                    style={{ width: 26, height: 26, fontSize: 12 }}
                    onClick={() => { close(); nav('/plan/r/' + r.id) }}
                    title={t('Edit routine in editor')}
                  >
                    <Icon name="pencil" />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(r.ex || []).map((e, idx) => {
                    const ex = exOr(e.id)
                    const spec = e.min !== undefined ? `${e.min}m` : e.sec !== undefined ? `${e.sec}s` : `${e.sets || 3}×${e.reps || 10}`
                    return (
                      <div key={idx} className="day-routine-ex-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, width: 18, color: 'var(--label-3)' }}>{idx + 1}</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t(ex.n)}
                            </div>
                            <div className="small muted">{spec} · {t(ex.eq)}</div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="tinted"
                          icon="shuffle"
                          onClick={ev => { ev.stopPropagation(); swapExerciseInRoutine(r.id, idx, ex) }}
                        >
                          {t('Change')}
                        </Button>
                      </div>
                    )
                  })}
                </div>

                <div className="row" style={{ gap: 8, marginTop: 4 }}>
                  <Button size="sm" variant="primary" style={{ flex: 1 }} onClick={() => set(r.id)}>
                    {t('Select for this day')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { close(); nav('/plan/r/' + r.id) }}>
                    {t('Edit in editor')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
      <div className="item" onClick={() => set('rest')}><span className="lrow-i" style={{ background: 'var(--surface-3)' }}><Icon name="moon" /></span><div className="grow"><div className="tt">{t('Rest / skip this day')}</div></div>{effId === null && <Icon name="check" className="accent" />}</div>
      {hasOvr && <div className="item" onClick={() => set('')}><span className="lrow-i" style={{ background: 'var(--surface-3)' }}><Icon name="reset" /></span><div className="grow"><div className="tt">{t('Back to weekly plan')}</div></div></div>}
    </div>
  </>
}
export const dayOverrideSheet = iso => ui().openSheet(close => <DayOverride iso={iso} close={close} />)

function DayAssign({ day, close }) {
  const st = useStore(s => s.S)
  const [expandedId, setExpandedId] = useState(null)
  const set = v => { update(s => { if (v) s.week[day] = v; else delete s.week[day] }); close() }

  const swapExerciseInRoutine = (routineId, exIdx, curEx) => {
    changeExerciseSheet(curEx, newEx => {
      update(s => {
        const r = s.routines.find(x => x.id === routineId)
        if (r && r.ex[exIdx]) {
          r.ex[exIdx] = { ...r.ex[exIdx], id: newEx.id }
        }
      })
      toast(t('Exercise changed to {0}', newEx.n))
    })
  }

  return <>
    <h3>{t(DAYN[day])}</h3>
    <div className="list">
      <div className="item" onClick={() => set('')}><span className="lrow-i" style={{ background: 'var(--surface-3)' }}><Icon name="moon" /></span><div className="grow"><div className="tt">{t('Rest day')}</div></div>{!st.week[day] && <Icon name="check" className="accent" />}</div>
      {st.routines.map(r => {
        const isExp = expandedId === r.id
        const exPreview = (r.ex || []).slice(0, 3).map(e => exOr(e.id).n).join(' · ')
        return (
          <div key={r.id} style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="item" onClick={() => set(r.id)}>
              <span className="lrow-i"><Icon name={glyphOf(r.emoji)} /></span>
              <div className="grow">
                <div className="tt">{r.name}</div>
                <div className="ss">
                  {exCount(r.ex.length)}{exPreview ? ` · ${exPreview}${r.ex.length > 3 ? '…' : ''}` : ''}
                </div>
              </div>
              <button
                type="button"
                className="iconbtn"
                style={{ width: 32, height: 32, fontSize: 13, marginRight: 2 }}
                onClick={ev => { ev.stopPropagation(); setExpandedId(isExp ? null : r.id) }}
                title={t('View and change exercises')}
              >
                <Icon name={isExp ? 'chevronUp' : 'chevronDown'} />
              </button>
              {st.week[day] === r.id && <Icon name="check" className="accent" />}
            </div>

            {/* Expandable Exercise Details & Change */}
            {isExp && (
              <div className="day-routine-accordion">
                <div className="row between" style={{ alignItems: 'center', paddingBottom: 4, borderBottom: '1px solid var(--sep-op)' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{t('Exercises in {0}', r.name)}</span>
                  <button
                    type="button"
                    className="iconbtn"
                    style={{ width: 26, height: 26, fontSize: 12 }}
                    onClick={() => { close(); nav('/plan/r/' + r.id) }}
                    title={t('Edit routine in editor')}
                  >
                    <Icon name="pencil" />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(r.ex || []).map((e, idx) => {
                    const ex = exOr(e.id)
                    const spec = e.min !== undefined ? `${e.min}m` : e.sec !== undefined ? `${e.sec}s` : `${e.sets || 3}×${e.reps || 10}`
                    return (
                      <div key={idx} className="day-routine-ex-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, width: 18, color: 'var(--label-3)' }}>{idx + 1}</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t(ex.n)}
                            </div>
                            <div className="small muted">{spec} · {t(ex.eq)}</div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="tinted"
                          icon="shuffle"
                          onClick={ev => { ev.stopPropagation(); swapExerciseInRoutine(r.id, idx, ex) }}
                        >
                          {t('Change')}
                        </Button>
                      </div>
                    )
                  })}
                </div>

                <div className="row" style={{ gap: 8, marginTop: 4 }}>
                  <Button size="sm" variant="primary" style={{ flex: 1 }} onClick={() => set(r.id)}>
                    {t('Assign to this day')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { close(); nav('/plan/r/' + r.id) }}>
                    {t('Edit in editor')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  </>
}
export const dayAssignSheet = day => ui().openSheet(close => <DayAssign day={day} close={close} />)

/* ============================ workout detail ============================ */
function WorkoutDetail({ w, close }) {
  const st = useStore(s => s.S)
  return <>
    <h3>{w.name}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>{[fmtDate(w.d, true), ...durPart(w.end - w.start), fmtVol(w.vol, st.unit), ...(w.bw ? [fmtNum(w.bw) + ' ' + st.unit] : [])].join(' · ')}</div>
    {w.entries.map((e, i) => {
      const ex = EXIDX[e.id]
      const trend = getExerciseTrend(w, e, st.workouts, st.unit)
      const exName = ex ? ex.n : (e.n || e.id)
      return <div key={i} className="row" style={{ marginBottom: 12, alignItems: 'flex-start' }}>
        {ex && <Thumb ex={ex} />}
        <div className="grow">
          <div className="row" style={{ alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span className="tt capitalize" style={{ fontWeight: 600 }}>{exName}</span>
            {w.prs && w.prs.includes(e.id) && <span className="pr"><Icon name="trophy" />PR</span>}
            <ExerciseTrendBadge trend={trend} exName={exName} />
          </div>
          <div className="ss">{e.sets.filter(s => s.done).map(s => setLabel(e.id, s, e.target)).join('  ·  ') || t('no sets')}</div>
        </div>
      </div>
    })}
    <Button variant="danger" onClick={() => confirmSheet({ title: t('Delete workout?'), message: t('This removes it from your history for good.'), confirmText: t('Delete'), danger: true, onConfirm: () => { update(s => { s.workouts = s.workouts.filter(x => x.id !== w.id) }); close(); toast(t('Workout deleted')) } })}>{t('Delete workout')}</Button>
  </>
}
export const workoutDetailSheet = w => ui().openSheet(close => <WorkoutDetail w={w} close={close} />)

/* ============================ calendar ============================ */
function Calendar({ start, close }) {
  const st = useStore(s => s.S)
  const [cur, setCur] = useState(() => { const d = start ? new Date(start) : new Date(); d.setDate(1); return d })
  const y = cur.getFullYear(), mo = cur.getMonth()
  const byDay = {}
  st.workouts.forEach(w => (byDay[w.d] = byDay[w.d] || []).push(w))
  const startOffset = (new Date(y, mo, 1).getDay() + 6) % 7
  const daysIn = new Date(y, mo + 1, 0).getDate()
  const monthWs = st.workouts.filter(w => w.d.startsWith(y + '-' + String(mo + 1).padStart(2, '0')))
  const monthVol = monthWs.reduce((a, w) => a + (w.vol || 0), 0)
  const monthMs = monthWs.reduce((a, w) => a + Math.max(0, (w.end || w.start) - w.start), 0)
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(<div key={'e' + i} />)
  for (let d = 1; d <= daysIn; d++) {
    const iso = y + '-' + String(mo + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0')
    const ws = byDay[iso], effId = effectiveRoutineId(st, iso), ovr = st.dayPlan[iso] !== undefined
    const dotCls = ws ? 'done' : ovr && effId ? 'ovr' : effId ? 'plan' : ''
    cells.push(<button key={d} className={'cal-d' + (ws ? ' has' : '') + (iso === todayISO() ? ' today' : '')} onClick={() => {
      if (!ws) { close(); dayOverrideSheet(iso); return }
      if (ws.length === 1) { close(); workoutDetailSheet(ws[0]); return }
      close(); ui().openSheet(c2 => <><h3>{fmtDate(iso, true)}</h3><div className="list">{ws.map(w => <WorkoutRow key={w.id} w={w} onClick={() => { c2(); workoutDetailSheet(w) }} />)}</div></>)
    }}><span>{d}</span><i className={dotCls} /></button>)
  }
  return <>
    <div className="row between" style={{ marginBottom: 2 }}>
      <button className="iconbtn" onClick={() => setCur(new Date(y, mo - 1, 1))} aria-label="Previous month"><Icon name="chevronLeft" /></button>
      <h3 style={{ margin: 0 }}>{t(MONTHS_LONG[mo])} {y}</h3>
      <button className="iconbtn" onClick={() => setCur(new Date(y, mo + 1, 1))} aria-label="Next month"><Icon name="chevronRight" /></button>
    </div>
    <div className="small muted" style={{ textAlign: 'center' }}>{monthWs.length ? `${t(monthWs.length === 1 ? '{0} workout' : '{0} workouts', monthWs.length)} · ${fmtDur(monthMs)} · ${fmtVol(monthVol, st.unit)}` : t('No workouts this month')}</div>
    <div className="cal-grid">{['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(l => <div key={l} className="cal-h">{t(l)}</div>)}{cells}</div>
    <div className="cal-legend">
      <span><i style={{ background: 'var(--acc)' }} />{t('Trained')}</span>
      <span><i style={{ background: 'var(--label-3)' }} />{t('Planned')}</span>
      <span><i style={{ background: 'var(--orange)' }} />{t('Rescheduled')}</span>
    </div>
    <div className="small dim" style={{ textAlign: 'center', marginTop: 10 }}>{t('Tap a trained day for details · tap any other day to plan a session')}</div>
  </>
}
export const calendarSheet = start => ui().openSheet(close => <Calendar start={start} close={close} />)

/* shared small workout row (used in lists) */
export function WorkoutRow({ w, onClick }) {
  const st = useStore(s => s.S)
  const glyph = glyphOf((st.routines.find(r => r.id === w.routineId) || {}).emoji)
  const completedEntries = (w.entries || []).filter(e => e.sets && e.sets.some(s => s.done))

  return <div className="item" onClick={onClick} style={{ alignItems: 'flex-start', paddingTop: 10, paddingBottom: 10 }}>
    <span className="lrow-i" style={{ width: 34, height: 34, borderRadius: 8, fontSize: 19, marginTop: 2 }}><Icon name={glyph} /></span>
    <div className="grow" style={{ minWidth: 0 }}>
      <div className="row between" style={{ alignItems: 'center' }}>
        <div className="tt" style={{ fontWeight: 600 }}>{w.name}</div>
        {w.prs && w.prs.length > 0 && <span className="pr" style={{ marginLeft: 6 }}><Icon name="trophy" />{w.prs.length} PR</span>}
      </div>
      <div className="ss">{[fmtDate(w.d, true), ...durPart(w.end - w.start), t('{0} sets', setsDone(w)), fmtVol(w.vol, st.unit)].join(' · ')}</div>
      {completedEntries.length > 0 && (
        <div className="wrow-exercises">
          {completedEntries.map(e => {
            const ex = EXIDX[e.id]
            const trend = getExerciseTrend(w, e, st.workouts, st.unit)
            const exName = ex ? ex.n : (e.n || e.id)
            return (
              <button
                type="button"
                key={e.id}
                className="wrow-ex-chip"
                title={trend.tooltip || ''}
                onClick={ev => {
                  ev.stopPropagation()
                  const rect = ev.currentTarget.getBoundingClientRect()
                  useUI.getState().toggleTrendTooltip(trend, rect, exName)
                }}
              >
                <span className="ex-name">{exName}</span>
                <ExerciseTrendMini trend={trend} interactive={false} />
              </button>
            )
          })}
        </div>
      )}
    </div>
    <Icon name="chevronRight" className="chev" style={{ marginTop: 8 }} />
  </div>
}

/* ============================ warmup / cooldown config ============================ */
function WarmupCooldownConfig({ mode, close }) {
  const st = useStore(s => s.S)
  const update = useStore(s => s.update)
  const isWarmup = mode === 'warmup'

  const pool = isWarmup ? WARMUP_POOL : COOLDOWN_POOL
  const presets = isWarmup ? WARMUP_PRESETS : COOLDOWN_PRESETS
  const cfgKey = isWarmup ? 'warmupCfg' : 'cooldownCfg'
  const catName = isWarmup ? warmupCategoryName : cooldownCategoryName
  const cfg = st[cfgKey] || {}
  const isCustom = !!cfg.custom

  const activePreset = cfg.preset || 'standard'
  const activeIds = isCustom
    ? (cfg.ids || [])
    : (presets[activePreset]?.ids || presets.standard.ids)

  const categories = [...new Set(pool.map(e => e.category))]

  const toggleExercise = id => {
    const ids = [...activeIds]
    const idx = ids.indexOf(id)
    if (idx >= 0) ids.splice(idx, 1)
    else ids.push(id)
    update(s => { s[cfgKey] = { ...s[cfgKey], custom: true, ids } })
  }

  const selectPreset = key => {
    update(s => { s[cfgKey] = { preset: key, custom: false, ids: [] } })
  }

  return <>
    <h3 className="capitalize">{isWarmup ? t('Warm-up exercises') : t('Cooldown exercises')}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>
      {isWarmup
        ? t('Dynamic exercises before your workout to raise heart rate and mobilize joints.')
        : t('Static stretches after your workout to restore flexibility and reduce tension.')}
    </div>

    {/* Presets */}
    <div className="muted small" style={{ fontWeight: 600, marginBottom: 6 }}>{t('Presets')}</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
      {Object.entries(presets).map(([key, preset]) => (
        <button
          key={key}
          type="button"
          className={`chip ${!isCustom && activePreset === key ? 'chip-active' : ''}`}
          style={{ padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}
          onClick={() => selectPreset(key)}
        >
          {t(preset.name)}
        </button>
      ))}
      <button
        type="button"
        className={`chip ${isCustom ? 'chip-active' : ''}`}
        style={{ padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}
        onClick={() => update(s => { s[cfgKey] = { ...s[cfgKey], custom: true, ids: [...activeIds] } })}
      >
        {t('Custom')}
      </button>
    </div>

    {/* Exercise list */}
    <div className="muted small" style={{ fontWeight: 600, marginBottom: 6 }}>
      {t('Exercises')} ({activeIds.length})
    </div>
    {categories.map(cat => {
      const catExercises = pool.filter(e => e.category === cat)
      return <div key={cat} style={{ marginBottom: 12 }}>
        <div className="muted small" style={{ fontWeight: 600, marginBottom: 4, color: 'var(--acc)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {catName(cat)}
        </div>
        {catExercises.map(ex => {
          const checked = activeIds.includes(ex.id)
          const exData = EXIDX[ex.id]
          return <label
            key={ex.id}
            className="row"
            style={{ gap: 10, padding: '6px 0', cursor: isCustom ? 'pointer' : 'default', opacity: isCustom ? 1 : (checked ? 1 : 0.4) }}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={!isCustom}
              onChange={() => toggleExercise(ex.id)}
              style={{ accentColor: 'var(--acc)', width: 18, height: 18, flexShrink: 0 }}
            />
            <Thumb ex={exData} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="capitalize" style={{ fontSize: 13, lineHeight: 1.3 }}>{exData ? exData.n : ex.label}</div>
              <div className="muted" style={{ fontSize: 11 }}>{ex.sec}s</div>
            </div>
          </label>
        })}
      </div>
    })}

    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={close}>{t('Done')}</Button>
  </>
}
export function warmupCooldownSheet(mode) {
  ui().openSheet(close => <WarmupCooldownConfig mode={mode} close={close} />)
}

/* ============================ workout lifecycle ============================ */
import { getActiveHealthProvider } from './lib/healthPlatform.js'

async function fetchAutoHealthParams() {
  const st = S()
  const provider = getActiveHealthProvider(st)
  let hw = null
  try {
    if (provider === 'apple' || Capacitor.getPlatform() === 'android') {
      const h = await import('./lib/health.js')
      hw = await h.getRecentWeightFromHealth()
      // also fetch activity if needed
      const act = await h.getRecentActivityFromHealth()
      if (act) update(s => { s.todayActivity = act })
    }
  } catch (e) {
    console.error('Failed to fetch auto health params', e)
  }
  return hw
}

export async function startFlow(routineId) {
  const autoWeight = await fetchAutoHealthParams()
  if (autoWeight) {
    update(s => {
      const iso = todayISO()
      const ex = s.bodyweight.find(b => b.d === iso)
      if (ex) { ex.w = autoWeight; ex.t = Date.now() } else s.bodyweight.push({ d: iso, w: autoWeight, t: Date.now() })
      s.bodyweight.sort((a, b) => (a.d < b.d ? -1 : 1))
    })
    beginWorkout(routineId, autoWeight)
    return
  }
  bwSheet({ required: true, onDone: bw => beginWorkout(routineId, bw) })
}

export async function beginFreeleticsWorkout(name, specList, bw) {
  const st = S()
  const buildEntries = (list, phase) => list.map(raw => {
    const cfg = Array.isArray(raw) ? { id: raw[0], sets: raw[1], reps: raw[2], weight: 0 } : raw
    const plan = nextPrescription(st, cfg, null)
    return { id: cfg.id, sg: cfg.sg, target: { ...cfg }, plan, phase: phase || cfg.phase, sets: applyPrescription(buildSets(st, cfg), plan) }
  })
  
  const entries = [
    ...buildEntries(HERO_WARMUP, 'warmup'),
    ...buildEntries(specList, 'workout'),
    ...buildEntries(HERO_COOLDOWN, 'cooldown')
  ]

  update(s => {
    s.active = { id: uid(), d: todayISO(), start: Date.now(), routineId: null, isFreeletics: true, name: `Hero Rounds · ${name}`, bw: bw || null, cur: 0, entries }
  })
  useUI.getState().stopRest()
  nav('/workout')
}

export async function startFreeleticsFlow(name, specList) {
  const autoWeight = await fetchAutoHealthParams()
  if (autoWeight) {
    update(s => {
      const iso = todayISO()
      const ex = s.bodyweight.find(b => b.d === iso)
      if (ex) { ex.w = autoWeight; ex.t = Date.now() } else s.bodyweight.push({ d: iso, w: autoWeight, t: Date.now() })
      s.bodyweight.sort((a, b) => (a.d < b.d ? -1 : 1))
    })
    beginFreeleticsWorkout(name, specList, autoWeight)
    return
  }
  bwSheet({ required: true, onDone: bw => beginFreeleticsWorkout(name, specList, bw) })
}

export function beginWorkout(routineId, bw) {
  const st = S()
  const r = routineId ? st.routines.find(x => x.id === routineId) : null
  // The prescription is applied as the session is built, so you walk up to the bar with the
  // right weight already on the screen instead of being told about it afterwards. `plan` is
  // kept on the entry purely so the workout can explain the number it chose.
  const buildPhaseEntries = (list, phase) => list.map(raw => {
    const cfg = Array.isArray(raw) ? { id: raw[0], sets: raw[1], reps: raw[2], weight: 0 } : raw
    const plan = nextPrescription(st, cfg, null)
    const sets = applyPrescription(buildSets(st, cfg), plan)
    if (phase === 'warmup') sets.forEach(s => s.tag = 'W')
    return { id: cfg.id, sg: cfg.sg, target: { ...cfg }, plan, phase: phase || cfg.phase, sets }
  })
  const mainEntries = (r ? r.ex : []).map(cfg => {
    const plan = nextPrescription(st, cfg, r)
    return { id: cfg.id, sg: cfg.sg, target: { ...cfg }, plan, sets: applyPrescription(buildSets(st, cfg), plan) }
  })
  // Inject warmup/cooldown for all workouts (including freestyle)
  const warmupList = getWarmup(st)
  const cooldownList = getCooldown(st)
  const entries = [
    ...buildPhaseEntries(warmupList, 'warmup'),
    ...mainEntries,
    ...buildPhaseEntries(cooldownList, 'cooldown')
  ]
  update(s => {
    s.active = { id: uid(), d: todayISO(), start: Date.now(), routineId, name: r ? r.name : t('Freestyle'), bw: bw || null, cur: 0, entries }
  })
  useUI.getState().stopRest()
  nav('/workout')
}
function TopWeight({ entryIdx, close }) {
  const st = useStore(s => s.S)
  const A = st.active
  // The workout can end underneath this sheet: finishing from the last exercise clears
  // `active`, and this re-renders before the sheet is torn down. Everything below is
  // read defensively and the sheet dismisses itself — reading A.entries straight took
  // the whole app down with it. Hooks still run unconditionally, so the bail-out has
  // to sit after every one of them.
  const entry = A ? A.entries[entryIdx] : null
  const ex = entry && EXIDX[entry.id]
  const maxSet = entry ? Math.max(0, ...entry.sets.filter(s => s.done).map(s => s.w || 0)) : 0
  const prevBest = entry ? Math.max((st.exWeights[entry.id] || {}).w || 0, bestWeightFor(st, entry.id)) : 0
  const [v, setV] = useState(entry ? (Math.max(maxSet, prevBest) || entry.target.weight || 0) : 0)
  useEffect(() => { if (!entry) close() }, [!entry])

  const units = supersetUnits(A ? A.entries : [])
  const unit = entry ? unitOf(units, entryIdx) : []
  const unitDone = !!entry && unit.every(i => A.entries[i].sets.every(s => s.done))
  const unitIdx = units.findIndex(u => u === unit)
  const isLastUnit = unitIdx === units.length - 1
  if (!entry || !ex) return null

  const commit = advance => {
    const n = Math.round((v || 0) * 10) / 10
    if (!isFinite(n) || n < 0) { toast(t('Enter a valid weight')); return }
    update(s => {
      s.active.entries[entryIdx].topW = n
      const cur = s.exWeights[entry.id]
      s.exWeights[entry.id] = { w: Math.max(n, cur ? cur.w : 0), d: todayISO() }
    })
    close()
    if (advance && unitDone) {
      if (isLastUnit) workoutCompleteSheet()               // whole workout done → finish/continue prompt
      else update(s => { s.active.cur = units[unitIdx + 1][0] })
    } else toast(t('Tracked — next time starts at {0}', fmtNum(S().exWeights[entry.id].w) + ' ' + st.unit))
  }
  return <>
    <h3 className="capitalize row" style={{ gap: 8 }}><Icon name="checkCircle" style={{ color: 'var(--acc)' }} />{t('{0} done', ex.n)}</h3>
    <div className="muted small">{t('Confirm the weight you worked with — your highest becomes the default next time.')}{!unitDone && unit.length > 1 ? ' ' + t('Then finish the superset partner.') : ''}</div>
    <WeightInput value={v} setValue={setV} unit={st.unit} />
    <div style={{ height: 10 }} />
    {prevBest > 0 ? <div className="small dim" style={{ textAlign: 'center', marginBottom: 12 }}>{t('Previous best:')} {fmtNum(prevBest)} {st.unit}{maxSet > prevBest && <span style={{ color: 'var(--yellow)' }}> — {t('new record!')}</span>}</div> : <div style={{ height: 4 }} />}
    {unitDone ? <>
      <Button variant="primary" trailingIcon={isLastUnit ? null : 'chevronRight'} onClick={() => commit(true)}>{isLastUnit ? t('Save') : t('Save & next exercise')}</Button>
      <div style={{ height: 8 }} /><Button variant="ghost" className="dim" onClick={() => commit(false)}>{t('Just close')}</Button>
    </> : <Button variant="primary" onClick={() => commit(false)}>{t('Save weight')}</Button>}
  </>
}
export const topWeightSheet = entryIdx => ui().openSheet(close => <TopWeight entryIdx={entryIdx} close={close} />)

// Shown when the last exercise's last set is checked — finish, or keep going.
function WorkoutComplete({ close }) {
  return <div style={{ textAlign: 'center', padding: '8px 0' }}>
    <div style={{ fontSize: 44, display: 'flex', justifyContent: 'center', color: 'var(--acc)' }}><Icon name="checkCircle" /></div>
    <h3 style={{ margin: '8px 0' }}>{t("That's the whole workout!")}</h3>
    <div className="muted small" style={{ marginBottom: 16 }}>{t('Every exercise done — great work. Finish up, or keep going and add another exercise.')}</div>
    <Button variant="primary" icon="flag" onClick={() => { close(); finishWorkout() }}>{t('Finish workout')}</Button>
    <div style={{ height: 8 }} />
    <Button onClick={() => { close(); useUI.getState().toast(t('Keep going — tap “+ Add exercise” below')) }}>{t('Continue workout')}</Button>
  </div>
}
export const workoutCompleteSheet = () => ui().openSheet(close => <WorkoutComplete close={close} />, { kind: 'center' })

// How the session felt, in one tap (F9). Optional forever — the Coach reads it when it is
// there and never asks twice. Stored on the finished workout itself, so a rating stays tied
// to the session it describes rather than living in a log nothing else can see.
function SessionRating({ w }) {
  const update = useStore(s => s.update)
  const [rating, setRating] = useState(w.rating || null)
  const [note, setNote] = useState('')
  const onWorkout = (s, fn) => { const rec = (s.workouts || []).find(x => x.id === w.id); if (rec) fn(rec) }
  const pick = v => {
    const next = v === rating ? null : v
    setRating(next)
    update(s => onWorkout(s, rec => { if (next) rec.rating = next; else delete rec.rating }))
  }
  const saveNote = () => update(s => onWorkout(s, rec => {
    const v = note.trim()
    if (v) rec.note = v.slice(0, 300); else delete rec.note
  }))
  return <div style={{ textAlign: 'left', marginTop: 16 }}>
    <h4 className="sec">{t('How did that feel?')}</h4>
    <Segmented
      options={[{ value: 'easy', label: t('Too easy') }, { value: 'right', label: t('About right') }, { value: 'hard', label: t('Brutal') }]}
      value={rating} onChange={pick} />
    {!!rating && <>
      <div style={{ height: 8 }} />
      <TextArea rows={2} maxLength={300} value={note} onChange={e => setNote(e.target.value)} onBlur={saveNote}
        placeholder={t('Anything worth remembering? (optional)')} />
    </>}
  </div>
}

function FinishSummary({ w, prs, e1prs = [], close }) {
  const st = useStore(s => s.S)
  const coachOn = !!useStore(s => s.config)?.coach?.enabled && !!st.coach?.consent?.agreedAt
  const cal = estimateCalories(w, lastBW(st)?.w || 75)

  return <div style={{ textAlign: 'center', padding: '8px 0' }}>
    <div style={{ fontSize: 44, display: 'flex', justifyContent: 'center', color: 'var(--acc)' }}><Icon name="trophy" /></div>
    <h3 style={{ margin: '8px 0' }}>{t('Workout complete!')}</h3>
    <div className="tiles" style={{ textAlign: 'left' }}>
      <div className="tile"><div className="l">{t('Duration')}</div><div className="v" style={{ fontSize: '1.1rem' }}>{fmtDur(w.end - w.start)}</div></div>
      <div className="tile"><div className="l">{t('Volume')}</div><div className="v" style={{ fontSize: '1.1rem' }}>{fmtVol(w.vol, st.unit)}</div></div>
      <div className="tile"><div className="l">{t('Sets')}</div><div className="v" style={{ fontSize: '1.1rem' }}>{setsDone(w)}</div></div>
      <div className="tile"><div className="l">{t('Est. Burn')}</div><div className="v" style={{ fontSize: '1.1rem' }}>{cal} kcal</div></div>
    </div>
    {(prs.length > 0 || e1prs.length > 0) && <div style={{ textAlign: 'left', marginBottom: 12 }}>
      {prs.map(id => <div key={id} className="small accent capitalize row" style={{ gap: 5 }}><Icon name="trophy" style={{ fontSize: 13 }} />{t('New PR:')} {(EXIDX[id] || {}).n || id}</div>)}
      {e1prs.map(p => <div key={p.id} className="small accent capitalize row" style={{ gap: 5 }}><Icon name="chartLine" style={{ fontSize: 13 }} />{t('Best estimated 1RM:')} {(EXIDX[p.id] || {}).n || p.id} · {fmtNum(p.est)} {st.unit}</div>)}
    </div>}

    {!Capacitor.isNativePlatform() && <GoogleHealthDisclosure compact />}

    <div className="row between" style={{ alignItems: 'center', background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 10, margin: '12px 0', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}>
        <Icon name="heart" style={{ color: '#4285F4' }} />
        <span>{st.googleHealth?.connected ? t('Google Health auto-synced') : t('Google Health')}</span>
      </div>
      <button className="chip" style={{ fontSize: '0.8rem', padding: '4px 10px', height: 28 }} onClick={() => googleHealthSheet()}>
        {st.googleHealth?.connected ? t('Synced') : t('Sync')}
      </button>
    </div>

    <h4 className="sec" style={{ textAlign: 'left' }}>{t('What you just trained')}</h4>
    <BodyMap load={loadOfWorkouts([w])} body={st.body} />
    {coachOn && <SessionRating w={w} />}
    <div style={{ height: 14 }} />
    <Button variant="primary" onClick={() => { close(); nav('/home') }}>{t('Nice!')}</Button>
  </div>
}
export function finishWorkout() {
  const A = S().active
  if (!A) return
  const done = setsDoneActive(A)
  const total = A.entries.reduce((n, e) => n + e.sets.length, 0)
  if (!done) { confirmSheet({ title: t('Nothing logged yet'), message: t('You haven’t checked off any sets. Finish the workout anyway?'), confirmText: t('Finish anyway'), onConfirm: doFinishWorkout }); return }
  if (done < total) { confirmSheet({ title: t('Finish early?'), message: t(total - done === 1 ? '{0} set still unchecked. Finish the workout now?' : '{0} sets still unchecked. Finish the workout now?', total - done), confirmText: t('Finish workout'), onConfirm: doFinishWorkout }); return }
  doFinishWorkout()
}

function GoogleHealthDisclosure({ compact = false }) {
  return <section
    role="note"
    aria-label={t('Google Health data use notice')}
    style={{
      textAlign: 'left',
      padding: compact ? 12 : 14,
      margin: compact ? '12px 0' : '0 0 14px',
      borderRadius: 12,
      border: '1px solid rgba(66, 133, 244, 0.45)',
      background: 'rgba(66, 133, 244, 0.09)',
      lineHeight: 1.5
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, color: '#4285F4' }}>
      <Icon name="heart" />
      <strong>{t('Google Health data use notice')}</strong>
    </div>
    <div className="small">{t('When connected, openGym sends completed workout summaries, exercise names, duration, estimated calories and cardio distance, plus body-weight measurements, to Google Health. During sync, it can also read recent Google Health workout summaries, including device-reported calories and distance, and add them to your training history for Coach recommendations. Workout sync is on by default; disconnect at any time.')}</div>
  </section>
}

function doFinishWorkout() {
  const st = S()
  const A = st.active
  if (!A) return
  const prs = []
  const e1prs = []
  A.entries.forEach(e => {
    const mx = Math.max(0, ...e.sets.filter(s => s.done).map(s => s.w))
    if (mx > 0 && mx > bestWeightFor(st, e.id)) prs.push(e.id)
    // A heavier estimate without a heavier top set is its own kind of progress —
    // same weight for more reps. Reported separately so it can't be read as a load PR.
    const rec = is1RMRecord(st, e.id, e)
    if (rec && !prs.includes(e.id)) e1prs.push({ id: e.id, ...rec })
  })
  const w = {
    id: A.id, d: A.d, start: A.start, end: Date.now(), routineId: A.routineId, name: A.name, bw: A.bw,
    // `target` (what the session prescribed) is kept alongside the sets: without it a
    // finished workout cannot say whether it hit its reps, and a timed session reads back
    // as "0 reps". It is what the progression engine works from.
    entries: A.entries.map(e => ({ id: e.id, sets: e.sets, topW: e.topW || null, target: e.target || null })).filter(e => e.sets.some(s => s.done)),
    prs
  }
  w.calories = estimateCalories(w, st.unit === 'lb'
    ? (st.bodyweight?.at(-1)?.w || 165) * 0.45359237
    : (st.bodyweight?.at(-1)?.w || 75))
  const estimatedDistance = w.entries.reduce((total, entry) => {
    if (modeOf(entry.target || {}, EXIDX[entry.id]) !== 'cardio') return total
    return total + entry.sets.filter(set => set.done).reduce((sum, set) => sum + (Number(set.min) || 0) * (Number(set.speed) || 0) / 60, 0)
  }, 0)
  if (estimatedDistance > 0) w.distanceKm = Math.round(estimatedDistance * 100) / 100
  w.vol = workoutVolume(w)
  clearActiveSessionBackup()
  update(s => {
    w.entries.forEach(e => {
      const mx = Math.max(0, ...e.sets.filter(x => x.done).map(x => x.w || 0), e.topW || 0)
      if (mx > 0) { const cur = s.exWeights[e.id]; if (!cur || mx > cur.w) s.exWeights[e.id] = { w: mx, d: w.d } }
    })
    s.workouts.push(w)
    s.active = null
  })

  // Auto-sync with Google Health if connected
  if (st.googleHealth?.connected && st.googleHealth?.provider === 'google-health-api' && st.googleHealth?.autoSync !== false) {
    const token = getCachedToken()
    const since = st.googleHealth.lastSync || 0
    const weights = st.googleHealth.syncBodyWeight === false ? [] : st.bodyweight.filter(entry => !since || (entry.t || new Date(entry.d).getTime()) > since)
    const sync = token
      ? syncAllWithGoogleHealth(token, st.googleHealth.syncWorkouts === false ? [] : [w], weights)
      : Promise.reject(new Error('google_fit_reauthentication_required'))
    sync.then(res => {
      update(s => {
        if (s.googleHealth && res.ok) s.googleHealth.lastSync = res.lastSync || Date.now()
      })
    }).catch(() => {})
  }

  useUI.getState().stopRest()
  
  // Log to Google Fit / HealthKit
  import('./lib/health.js').then(module => module.logWorkoutToHealth(w)).catch(console.error)
  
  // Schedule inactivity reminder
  import('./lib/notifications.js').then(module => module.scheduleInactivityReminder()).catch(console.error)

  beep(snd(), 880, 0.15); beep(snd(), 1100, 0.15, 0.18); beep(snd(), 1320, 0.3, 0.36)
  ui().openSheet(close => <FinishSummary w={w} prs={prs} e1prs={e1prs} close={close} />, { kind: 'center', locked: false })
}

/* ============================ Google Health Sheet ============================ */
function GoogleHealthSheet({ close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const gh = S.googleHealth || { connected: false, autoSync: true, syncWorkouts: true, syncBodyWeight: true, lastSync: null, email: '' }
  const [syncing, setSyncing] = useState(false)
  const isHealthConnect = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  const providerName = isHealthConnect ? 'Health Connect' : 'Google Health'

  const toggleConnected = async () => {
    if (gh.connected) {
      update(s => {
        s.googleHealth = s.googleHealth || {}
        s.googleHealth.connected = false
        s.googleHealth.email = ''
      })
      toast(t(isHealthConnect ? 'Disconnected from Health Connect' : 'Disconnected from Google Health'))
      if (isHealthConnect || !Capacitor.isNativePlatform()) {
        setCachedToken(null)
      } else {
        try { await GoogleAuth.signOut() } catch(e) {}
      }
      return
    }

    try {
      if (isHealthConnect) {
        const authorized = await initHealth()
        if (!authorized) {
          const status = await getHealthStatus().catch(() => null)
          toast(t(status?.available ? 'Health Connect permissions were not granted' : 'Health Connect is unavailable on this device'))
          return
        }
        update(s => {
          s.googleHealth = s.googleHealth || {}
          s.googleHealth.connected = true
          s.googleHealth.provider = 'health-connect'
          s.googleHealth.email = ''
        })
        toast(t('Connected to Health Connect'))
        return
      }

      let user
      if (Capacitor.isNativePlatform()) {
        await GoogleAuth.initialize()
        user = await GoogleAuth.signIn()
        setCachedToken(user.authentication?.accessToken || null)
      } else {
        const result = await googleSignIn(true)
        user = { email: result.user.email, name: result.user.displayName }
      }
      update(s => {
        s.googleHealth = s.googleHealth || {}
        s.googleHealth.connected = true
        s.googleHealth.email = user.email || 'user@gmail.com'
        if (s.googleHealth.provider !== 'google-health-api') s.googleHealth.lastSync = null
        s.googleHealth.provider = 'google-health-api'
      })
      toast(t('Connected to Google Health'))
    } catch (err) {
      toast(t('Google Auth failed'))
      console.error(err)
    }
  }

  const refreshGoogleHealthAccess = async () => {
    try {
      const result = await googleSignIn(true)
      setCachedToken(result.accessToken)
      update(s => {
        if (s.googleHealth) {
          s.googleHealth.authorizationRequired = false
          s.googleHealth.readAuthRequired = false
        }
      })
      toast(t('Google Health access updated'))
    } catch (err) {
      toast(t('Google Auth failed'))
      console.error(err)
    }
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    try {
      if (isHealthConnect) {
        const since = gh.lastSync || 0
        const workouts = S.workouts.filter(workout => !since || workout.end > since)
        const weights = gh.syncBodyWeight === false ? [] : S.bodyweight.filter(entry => !since || (entry.t || new Date(entry.d).getTime()) > since)
        const workoutResults = await Promise.all(workouts.map(logWorkoutToHealth))
        const weightResults = await Promise.all(weights.map(logBodyWeightToHealth))
        const syncedCount = workoutResults.filter(Boolean).length + weightResults.filter(Boolean).length
        if ((workouts.length || weights.length) && !syncedCount) {
          toast(t('Connect Health Connect before syncing'))
          return
        }
        update(s => {
          s.googleHealth = s.googleHealth || {}
          s.googleHealth.lastSync = Date.now()
        })
        toast(t('Synced with Health Connect ({0} records)', syncedCount))
        return
      }

      const token = getCachedToken()
      if (!token) {
        toast(t('Reconnect Google Health to authorise health data access'))
        return
      }
      const since = gh.lastSync || 0
      const workouts = gh.syncWorkouts === false ? [] : S.workouts.filter(workout => !since || workout.end > since)
      const weights = gh.syncBodyWeight === false ? [] : S.bodyweight.filter(entry => !since || (entry.t || new Date(entry.d).getTime()) > since)
      const [res, healthRead] = await Promise.all([
        syncAllWithGoogleHealth(token, workouts, weights),
        gh.importWorkouts === false ? Promise.resolve({ workouts: [] })
          : readWorkoutsFromGoogleHealth(token).then(items => ({ workouts: items }), error => ({ error, workouts: [] }))
      ])
      if (!res.ok) {
        const firstError = res.errors[0]
        const reason = String(firstError?.reason || '').toUpperCase()
        if (firstError?.status === 401 || reason === 'MISSING_OAUTH_SCOPE') {
          setCachedToken(null)
          update(s => { s.googleHealth.authorizationRequired = true })
          throw new Error(t('Reconnect Google Health to refresh its access permission.'))
        }
        if (firstError?.status === 403 && reason === 'API_PRIVATE_PREVIEW_ACCESS_DENIED') {
          throw new Error(t('Google Health has not allowed this account into its API preview. A project owner must add the account to the Google Cloud test-user list.'))
        }
        if (firstError?.status === 403 && ['SERVICE_DISABLED', 'ACCESS_NOT_CONFIGURED'].includes(reason)) {
          throw new Error(t('Google Health API is disabled for this Google Cloud project. A project owner must enable it in APIs & Services.'))
        }
        if (firstError?.status === 403 && reason === 'DISALLOWED_OAUTH_SCOPES') {
          throw new Error(t('Google has not approved the requested Google Health permission for this project yet.'))
        }
        if (firstError?.status === 403) {
          throw new Error(t('Google Health denied this account (403: {0}). Check the project test-user list and Health API access.', reason || 'unknown reason'))
        }
        throw new Error(firstError?.error || 'partial_sync')
      }
      update(s => {
        s.googleHealth = s.googleHealth || {}
        s.googleHealth.lastSync = res.lastSync || Date.now()
        const existing = new Set((s.workouts || []).map(workout => workout.id))
        const fresh = healthRead.workouts.filter(workout => !existing.has(workout.id))
        s.workouts = [...(s.workouts || []), ...fresh].sort((a, b) => (a.d || '').localeCompare(b.d || ''))
      })
      if (healthRead.error?.status === 401 || healthRead.error?.status === 403) {
        const reason = String(healthRead.error.reason || '').toUpperCase()
        if (healthRead.error.status === 401 || reason === 'MISSING_OAUTH_SCOPE') {
          setCachedToken(null)
          update(s => { s.googleHealth.authorizationRequired = true })
        }
      }
      toast(healthRead.error
        ? String(healthRead.error.reason || '').toUpperCase() === 'API_PRIVATE_PREVIEW_ACCESS_DENIED'
          ? t('Google Health has not allowed this account into its API preview. A project owner must add the account to the Google Cloud test-user list.')
          : t('Google Health sync sent {0} records, but could not read workout history. Check OAuth read scope and test-user access.', res.syncedWorkouts + res.syncedWeights)
        : t('Google Health sync finished ({0} sent, {1} received)', res.syncedWorkouts + res.syncedWeights, healthRead.workouts.length))
    } catch (e) {
      toast(t('Google Health sync failed: {0}', e.message || 'Error'))
    } finally {
      setSyncing(false)
    }
  }

  const handleExportJSON = () => {
    const data = exportGoogleHealthJSON(S.workouts, S.bodyweight, S.unit)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `openGym-google-health-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast(t('Google Health JSON exported'))
  }

  const handleExportCSV = () => {
    const csv = exportGoogleHealthCSV(S.workouts, S.bodyweight)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `openGym-google-health-${todayISO()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast(t('Google Health CSV exported'))
  }

  return <>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4285F4' }}>
        <Icon name="heart" />
      </div>
      <div>
        <h3 style={{ margin: 0 }}>{t(providerName)}</h3>
        <div className="muted small">{t(isHealthConnect ? 'Sync active calories and body weight on this Android device' : 'Send completed workouts and body weight to Google Health')}</div>
      </div>
    </div>

    {!isHealthConnect && <GoogleHealthDisclosure />}

    <div className="sec-card" style={{ background: 'var(--surface-2)', padding: 14, borderRadius: 12, marginBottom: 14 }}>
      <div className="row between" style={{ alignItems: 'center', marginBottom: gh.connected ? 10 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: gh.connected ? 'var(--acc)' : 'var(--fg-muted)' }} />
          <b style={{ fontSize: '0.95rem' }}>{gh.connected ? t('Connected') : t('Not connected')}</b>
        </div>
        <Button size="sm" variant={gh.connected ? 'tinted' : 'primary'} onClick={gh.connected && gh.authorizationRequired && !isHealthConnect ? refreshGoogleHealthAccess : toggleConnected}>
          {gh.connected ? (gh.authorizationRequired && !isHealthConnect ? t('Grant access') : t('Disconnect')) : t('Connect')}
        </Button>
      </div>

      {gh.connected && (
        <div style={{ fontSize: '0.85rem', color: 'var(--fg-muted)' }}>
          {!isHealthConnect && <div>{t('Account')}: <b style={{ color: 'var(--fg)' }}>{gh.email || ''}</b></div>}
          {gh.lastSync && <div style={{ marginTop: 4 }}>{t('Last synced')}: {new Date(gh.lastSync).toLocaleString()}</div>}
        </div>
      )}
    </div>

    <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
      <div className="row between" style={{ alignItems: 'center' }}>
        <span style={{ fontSize: '0.95rem' }}>{t('Auto-sync completed workouts')}</span>
        <Switch checked={gh.autoSync !== false} onChange={v => update(s => { s.googleHealth = s.googleHealth || {}; s.googleHealth.autoSync = v })} />
      </div>
      <div className="row between" style={{ alignItems: 'center' }}>
        <span style={{ fontSize: '0.95rem' }}>{t('Sync body weight entries')}</span>
        <Switch checked={gh.syncBodyWeight !== false} onChange={v => update(s => { s.googleHealth = s.googleHealth || {}; s.googleHealth.syncBodyWeight = v })} />
      </div>
    </div>

    <Button variant="primary" icon="refresh" loading={syncing} onClick={handleSyncNow} style={{ marginBottom: 10 }}>
      {syncing ? t(isHealthConnect ? 'Syncing with Health Connect…' : 'Syncing with Google Health…') : t(isHealthConnect ? 'Sync with Health Connect' : 'Sync now ({0} workouts)', S.workouts.length)}
    </Button>

    <div className="row" style={{ gap: 8, marginBottom: 14 }}>
      <Button variant="tinted" icon="download" style={{ flex: 1 }} onClick={handleExportJSON}>
        {t('Export JSON')}
      </Button>
      <Button variant="tinted" icon="download" style={{ flex: 1 }} onClick={handleExportCSV}>
        {t('Export CSV')}
      </Button>
    </div>

    <div className="small dim" style={{ lineHeight: 1.5, textAlign: 'center' }}>
      {t(isHealthConnect ? 'Health Connect keeps your health data on this device and is managed in Android settings.' : 'Google Health sync sends workouts and body weight, and reads exercise summaries for calories and distance. You can disconnect at any time.')}
    </div>
  </>
}
export const googleHealthSheet = () => ui().openSheet(close => <GoogleHealthSheet close={close} />)

/* ============================ change set sheet ============================ */
function ChangeSet({ entryIdx, setIdx, onSave, onDelete, close }) {
  const st = useStore(s => s.S)
  const update = useStore(s => s.update)
  const A = st.active
  const entry = A?.entries?.[entryIdx]
  const curSet = entry?.sets?.[setIdx]
  const ex = entry && exOr(entry.id)
  const mode = entry && modeOf({ ...(entry.target || {}), id: entry.id })

  const [reps, setReps] = useState(curSet?.r ?? entry?.target?.reps ?? 10)
  const [weight, setWeight] = useState(curSet?.w ?? entry?.target?.weight ?? 0)
  const [sec, setSec] = useState(curSet?.sec ?? entry?.target?.sec ?? 45)
  const [min, setMin] = useState(curSet?.min ?? entry?.target?.min ?? 20)
  const [speed, setSpeed] = useState(curSet?.speed ?? entry?.target?.speed ?? 8)
  const [tag, setTag] = useState(curSet?.tag || 'working')
  const [done, setDone] = useState(!!curSet?.done)
  const [applyAll, setApplyAll] = useState(false)

  if (!entry || !curSet) return null

  const handleSave = () => {
    update(s => {
      const e = s.active?.entries?.[entryIdx]
      if (!e) return
      const startIdx = applyAll ? setIdx : setIdx
      const endIdx = applyAll ? e.sets.length : setIdx + 1
      for (let i = startIdx; i < endIdx; i++) {
        const targetSet = e.sets[i]
        if (!targetSet) continue
        if (mode === 'cardio') {
          targetSet.min = min
          targetSet.speed = speed
        } else if (mode === 'time') {
          targetSet.sec = sec
          targetSet.w = weight
        } else {
          targetSet.r = reps
          targetSet.w = weight
        }
        if (tag === 'working') delete targetSet.tag
        else targetSet.tag = tag
        if (i === setIdx) {
          if (!targetSet.done && done) {
            hapticSetComplete('set')
          }
          targetSet.done = done
        }
      }
    }, true)
    onSave && onSave()
    close()
  }

  const handleDuplicate = () => {
    update(s => {
      const e = s.active?.entries?.[entryIdx]
      if (!e) return
      const clone = { ...e.sets[setIdx], done: false }
      e.sets.splice(setIdx + 1, 0, clone)
    }, true)
    close()
  }

  const handleDelete = () => {
    update(s => {
      const e = s.active?.entries?.[entryIdx]
      if (!e || e.sets.length <= 1) return
      e.sets.splice(setIdx, 1)
    }, true)
    onDelete && onDelete()
    close()
  }

  return (
    <div style={{ padding: '4px 0 16px' }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>{t('Change set {0}', setIdx + 1)}</h3>
          <div className="sub" style={{ textTransform: 'capitalize' }}>{t(ex.n)}</div>
        </div>
        <button className="iconbtn" onClick={close} aria-label={t('Close')}><Icon name="xmark" /></button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div className="small dim" style={{ marginBottom: 6 }}>{t('Set type')}</div>
        <Segmented
          value={tag}
          onChange={setTag}
          options={[
            { value: 'working', label: t('Working') },
            { value: 'warmup', label: t('Warm-up') },
            { value: 'drop', label: t('Drop set') },
            { value: 'failure', label: t('Failure') }
          ]}
        />
      </div>

      {mode === 'reps' && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div className="small dim" style={{ marginBottom: 6 }}>{t('Target reps')}</div>
            <div style={{ marginBottom: 8 }}>
              <Stepper value={reps} onChange={setReps} step={1} min={1} />
            </div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {[5, 8, 10, 12, 15, 20, 25, 30].map(v => (
                <button
                  key={v}
                  type="button"
                  className={'tag tappable' + (reps === v ? ' acc' : '')}
                  onClick={() => setReps(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="small dim" style={{ marginBottom: 6 }}>{t('Weight ({0})', st.unit)}</div>
            <div style={{ marginBottom: 8 }}>
              <Stepper value={weight} onChange={setWeight} step={2.5} min={0} />
            </div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {[0, 10, 20, 40, 60, 80, 100].map(w => (
                <button
                  key={w}
                  type="button"
                  className={'tag tappable' + (weight === w ? ' acc' : '')}
                  onClick={() => setWeight(w)}
                >
                  {w === 0 ? t('Bodyweight') : `${w} ${st.unit}`}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {mode === 'time' && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div className="small dim" style={{ marginBottom: 6 }}>{t('Hold time (seconds)')}</div>
            <div style={{ marginBottom: 8 }}>
              <Stepper value={sec} onChange={setSec} step={5} min={5} />
            </div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {[15, 30, 45, 60, 90, 120].map(s => (
                <button
                  key={s}
                  type="button"
                  className={'tag tappable' + (sec === s ? ' acc' : '')}
                  onClick={() => setSec(s)}
                >
                  {s}s
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="small dim" style={{ marginBottom: 6 }}>{t('Added weight ({0})', st.unit)}</div>
            <Stepper value={weight} onChange={setWeight} step={2.5} min={0} />
          </div>
        </>
      )}

      {mode === 'cardio' && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div className="small dim" style={{ marginBottom: 6 }}>{t('Duration (minutes)')}</div>
            <Stepper value={min} onChange={setMin} step={1} min={1} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="small dim" style={{ marginBottom: 6 }}>{t('Speed (km/h)')}</div>
            <Stepper value={speed} onChange={setSpeed} step={0.5} min={1} />
          </div>
        </>
      )}

      <div className="card" style={{ padding: '10px 12px', margin: '12px 0 16px', background: 'var(--surface-2)' }}>
        <div className="row between" style={{ alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>{t('Apply to all remaining sets')}</div>
            <div className="small dim">{t('Update upcoming sets in this exercise to match')}</div>
          </div>
          <Switch value={applyAll} onChange={setApplyAll} />
        </div>
      </div>

      <div className="card" style={{ padding: '10px 12px', margin: '0 0 16px', background: 'var(--surface-2)' }}>
        <div className="row between" style={{ alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>{t('Mark completed')}</div>
            <div className="small dim">{done ? t('Set is logged as done') : t('Set is pending')}</div>
          </div>
          <Switch value={done} onChange={setDone} />
        </div>
      </div>

      <Button variant="primary" icon="check" onClick={handleSave} style={{ marginBottom: 8 }}>
        {t('Save changes')}
      </Button>

      <div className="row" style={{ gap: 8 }}>
        <Button variant="ghost" icon="plus" onClick={handleDuplicate} style={{ flex: 1 }}>
          {t('Duplicate')}
        </Button>
        {entry.sets.length > 1 && (
          <Button variant="ghost" danger icon="trash" onClick={handleDelete} style={{ flex: 1 }}>
            {t('Remove')}
          </Button>
        )}
      </div>
    </div>
  )
}

export const changeSetSheet = (entryIdx, setIdx, onSave, onDelete) =>
  ui().openSheet(close => <ChangeSet entryIdx={entryIdx} setIdx={setIdx} onSave={onSave} onDelete={onDelete} close={close} />)

export function startFreeleticsWorkout(routineName = 'Blaze') {
  const p = READY_PROGRAMS.find(x => x.id === 'freeletics')
  if (!p) return
  const routines = makeRoutines(p.spec)
  const targetRoutine = routines.find(r => r.name.toLowerCase() === routineName.toLowerCase()) || routines[0]
  const st = S()
  let existing = st.routines.find(r => r.name === targetRoutine.name)
  if (!existing) {
    existing = targetRoutine
    update(s => { s.routines.push(targetRoutine) })
  }
  startFlow(existing.id)
}

/* ============================ show program sheet ============================ */
function ShowProgramSheet({ close }) {
  const st = useStore(s => s.S)
  const [expandedRoutine, setExpandedRoutine] = useState(null)

  const matched = READY_PROGRAMS.find(p =>
    p.spec && p.spec.length === st.routines.length &&
    st.routines.every(r => p.spec.some(ps => ps.name.toLowerCase() === r.name.toLowerCase() || ps.id === r.id))
  )

  const totalExercises = st.routines.reduce((sum, r) => sum + r.ex.length, 0)
  const activeDaysCount = Object.keys(st.week).filter(k => st.week[k]).length

  return <>
    <div className="row between" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
      <div>
        <h3 style={{ margin: 0 }}>{t('Training Program')}</h3>
        <div className="muted small" style={{ marginTop: 2 }}>
          {matched ? t(matched.name) : t('Weekly training schedule & routines')}
        </div>
      </div>
      <button type="button" className="iconbtn" onClick={close}><Icon name="xmark" /></button>
    </div>

    {/* Program summary card */}
    <div className="card" style={{ padding: '12px 14px', marginBottom: 14 }}>
      <div className="row between" style={{ alignItems: 'center' }}>
        <div className="row" style={{ gap: 9, alignItems: 'center' }}>
          <span className="lrow-i" style={{ background: 'var(--acc)', color: 'var(--on-acc)', width: 36, height: 36, borderRadius: 8, fontSize: 18 }}>
            <Icon name="clipboard" />
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{matched ? t(matched.name) : t('Current Program')}</div>
            <div className="small muted">
              {activeDaysCount} {t('days/week')} · {st.routines.length} {t('routines')} · {totalExercises} {t('exercises')}
            </div>
          </div>
        </div>
        <Button size="sm" variant="tinted" icon="sparkles" onClick={() => { close(); readyProgramsSheet() }}>
          {t('Change')}
        </Button>
      </div>
    </div>

    {/* Weekly schedule overview */}
    <div className="sect-t" style={{ padding: '0 2px 8px', fontWeight: 600 }}>{t('Weekly Schedule')}</div>
    <div className="list" style={{ marginBottom: 16 }}>
      {[1, 2, 3, 4, 5, 6, 0].map(d => {
        const r = st.routines.find(x => x.id === st.week[d])
        return <div key={d} className="item" onClick={() => { close(); dayAssignSheet(d) }}>
          <div className="grow">
            <div className="tt">{t(DAYN[d])}</div>
          </div>
          {r ? (
            <span className="tag acc" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name={glyphOf(r.emoji)} /> {r.name} ({r.ex.length})
            </span>
          ) : (
            <span className="tag">{t('Rest day')}</span>
          )}
          <Icon name="pencil" className="chev" style={{ fontSize: 13 }} />
        </div>
      })}
    </div>

    {/* Program routines list */}
    <div className="sect-t" style={{ padding: '0 2px 8px', fontWeight: 600 }}>{t('Program Routines')}</div>
    <div className="list" style={{ marginBottom: 16 }}>
      {st.routines.map(r => {
        const isExp = expandedRoutine === r.id
        return <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--sep)', borderRadius: 'var(--r)', marginBottom: 8, overflow: 'hidden' }}>
          <div className="item" style={{ border: 'none' }} onClick={() => setExpandedRoutine(isExp ? null : r.id)}>
            <span className="lrow-i"><Icon name={glyphOf(r.emoji)} /></span>
            <div className="grow">
              <div className="tt">{r.name}</div>
              <div className="ss">{exCount(r.ex.length)} · {t(POLICY_NAME[r.prog || 'linear'])}</div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button type="button" className="iconbtn" style={{ width: 28, height: 28, fontSize: 12 }} onClick={ev => { ev.stopPropagation(); close(); nav('/plan/r/' + r.id) }} title={t('Edit routine')}>
                <Icon name="pencil" />
              </button>
              <Icon name={isExp ? 'chevronUp' : 'chevronDown'} className="chev" />
            </div>
          </div>
          {isExp && (
            <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--sep)', background: 'var(--surface-2)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {r.ex.map((e, idx) => {
                  const ex = exOr(e.id)
                  return <div key={idx} className="row between" style={{ fontSize: 13, alignItems: 'center' }}>
                    <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                      <span className="muted">{idx + 1}.</span>
                      <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{t(ex.n)}</span>
                    </div>
                    <span className="small dim">{exLine(e, st.unit)}</span>
                  </div>
                })}
              </div>
            </div>
          )}
        </div>
      })}
    </div>

    <div className="row" style={{ gap: 8 }}>
      <Button style={{ flex: 1 }} onClick={() => { close(); nav('/plan') }}>{t('Edit plan')}</Button>
      <Button style={{ flex: 1 }} variant="primary" icon="sparkles" onClick={() => { close(); programWizardSheet() }}>{t('Program wizard')}</Button>
    </div>
  </>
}
export const showProgramSheet = () => ui().openSheet(close => <ShowProgramSheet close={close} />)

/* ============================ switch training / change workout sheet ============================ */
function SwitchTrainingSheet({ close }) {
  const st = useStore(s => s.S)
  const A = st.active
  const hasLogged = A && setsDoneActive(A) > 0

  const handleSelectRoutine = r => {
    if (!A) {
      startFlow(r ? r.id : null)
      close()
      return
    }
    if (hasLogged) {
      confirmSheet({
        title: t('Change training?'),
        message: t('You already have logged sets. Do you want to switch completely to “{0}” or add its exercises to your current session?', r ? r.name : t('Freestyle')),
        confirmText: t('Switch workout'),
        cancelText: t('Add exercises'),
        onConfirm: () => {
          update(s => { s.active = null })
          startFlow(r ? r.id : null)
          close()
        },
        onCancel: () => {
          if (r) {
            update(s => {
              r.ex.forEach(e => {
                const full = { ...e }
                const plan = nextPrescription(s, full, r)
                s.active.entries.push({ id: e.id, target: { ...e }, plan, sets: applyPrescription(buildSets(s, full), plan) })
              })
            })
            toast(t('Added exercises from {0}', r.name))
          }
          close()
        }
      })
    } else {
      update(s => { s.active = null })
      startFlow(r ? r.id : null)
      close()
    }
  }

  const handleSelectFreeletics = godKey => {
    if (hasLogged) {
      confirmSheet({
        title: t('Start Hero Rounds?'),
        message: t('This will replace your current workout with the {0} workout.', godKey),
        confirmText: t('Start Hero Rounds'),
        danger: true,
        onConfirm: () => {
          update(s => { s.active = null })
          startFreeleticsWorkout(godKey)
          close()
        }
      })
    } else {
      update(s => { s.active = null })
      startFreeleticsWorkout(godKey)
      close()
    }
  }

  return <>
    <div className="row between" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
      <div>
        <h3 style={{ margin: 0 }}>{t('Change training')}</h3>
        <div className="muted small" style={{ marginTop: 2 }}>
          {A ? t('Currently active: {0}', A.name) : t('Pick a workout to start')}
        </div>
      </div>
      <button type="button" className="iconbtn" onClick={close}><Icon name="xmark" /></button>
    </div>

    {/* Your Routines */}
    <div className="sect-t" style={{ padding: '0 2px 8px', fontWeight: 600 }}>{t('Your Plan Routines')}</div>
    <div className="list" style={{ marginBottom: 16 }}>
      {st.routines.map(r => <div key={r.id} className="item" onClick={() => handleSelectRoutine(r)}>
        <span className="lrow-i"><Icon name={glyphOf(r.emoji)} /></span>
        <div className="grow">
          <div className="tt">{r.name}</div>
          <div className="ss">{exCount(r.ex.length)}</div>
        </div>
        <span className="tag acc">{t('Start')}</span>
      </div>)}
      <div className="item" onClick={() => handleSelectRoutine(null)}>
        <span className="lrow-i"><Icon name="shuffle" /></span>
        <div className="grow">
          <div className="tt">{t('Freestyle workout')}</div>
          <div className="ss">{t('Pick exercises as you go')}</div>
        </div>
        <span className="tag">{t('Start')}</span>
      </div>
    </div>

    {/* Hero Rounds Workouts */}
    <div className="sect-t" style={{ padding: '0 2px 8px', fontWeight: 600 }}>⚡ {t('Hero Rounds Workouts')}</div>
    <div className="list" style={{ marginBottom: 14 }}>
      <div className="item" onClick={() => handleSelectFreeletics('Blaze')}>
        <span className="lrow-i" style={{ background: 'var(--acc)', color: 'var(--on-acc)' }}><Icon name="bolt" /></span>
        <div className="grow">
          <div className="tt">Blaze</div>
          <div className="ss">5 rounds · Burpees, Jump Squats, Sit-ups</div>
        </div>
        <span className="tag acc">{t('Start')}</span>
      </div>
      <div className="item" onClick={() => handleSelectFreeletics('Titan')}>
        <span className="lrow-i" style={{ background: 'var(--acc)', color: 'var(--on-acc)' }}><Icon name="bolt" /></span>
        <div className="grow">
          <div className="tt">Titan</div>
          <div className="ss">5 rounds · Push-ups, Jumping Jacks, Lunges</div>
        </div>
        <span className="tag acc">{t('Start')}</span>
      </div>
      <div className="item" onClick={() => handleSelectFreeletics('Vortex')}>
        <span className="lrow-i" style={{ background: 'var(--acc)', color: 'var(--on-acc)' }}><Icon name="bolt" /></span>
        <div className="grow">
          <div className="tt">Vortex</div>
          <div className="ss">5 rounds · Climbers, Sit-ups, Jump Squats</div>
        </div>
        <span className="tag acc">{t('Start')}</span>
      </div>
    </div>

    <Button variant="ghost" className="dim" onClick={() => { close(); showProgramSheet() }}>
      {t('Show full program details')}
    </Button>
  </>
}
export const switchTrainingSheet = () => ui().openSheet(close => <SwitchTrainingSheet close={close} />)

/* ============================ Import Program from Web / athlete.ru ============================ */
function ImportUrlSheet({ initialUrl = ATHLETE_RU_URL, close }) {
  const [url, setUrl] = useState(initialUrl)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({
    source: ATHLETE_RU_URL,
    sourceName: 'athlete.ru (Тема t7249: Циклы Excel)',
    programs: ATHLETE_PROGRAMS
  })
  const [selectedId, setSelectedId] = useState('russian-cycle')
  const [applyWeek, setApplyWeek] = useState(true)

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const res = await parseProgramUrl(url)
      setData(res)
      if (res.programs?.length) {
        setSelectedId(res.programs[0].id)
      }
      toast(t('Detect cycles') + ': ' + (res.programs?.length || 0))
    } catch (e) {
      toast(t('Could not read that file'))
    } finally {
      setLoading(false)
    }
  }

  const selectedProgram = data.programs.find(p => p.id === selectedId) || data.programs[0]

  const handleImport = () => {
    if (!selectedProgram) return
    const st = S()
    const { routines } = applyImportedProgram(st, update, selectedProgram, { applyWeek })
    toast(t('Imported {0} to your plan', selectedProgram.title || selectedProgram.titleEn || selectedProgram.id))
    close()
    nav('/plan')
  }

  const lang = getLang()
  const isRu = lang === 'ru'

  return <>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
        <Icon name="globe" />
      </div>
      <div>
        <h3 style={{ margin: 0 }}>{t('Import program from Web / athlete.ru')}</h3>
        <div className="muted small">{t('athlete.ru, web links, or powerlifting cycles')}</div>
      </div>
    </div>

    {/* URL input bar */}
    <div style={{ marginBottom: 12 }}>
      <div className="row" style={{ gap: 6 }}>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="http://forum.athlete.ru/t7249/..."
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '0.88rem',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--fg)'
          }}
        />
        <Button size="sm" variant="tinted" loading={loading} onClick={handleAnalyze}>
          {t('Detect cycles')}
        </Button>
      </div>

      <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        <button
          className="chip"
          style={{ fontSize: '0.78rem', padding: '3px 8px' }}
          onClick={() => { setUrl(ATHLETE_RU_URL); handleAnalyze(); }}
        >
          🇷🇺 athlete.ru (t7249)
        </button>
      </div>
    </div>

    {/* Source badge */}
    <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 12, fontSize: '0.84rem' }}>
      <div className="muted">{t('Source')}:</div>
      <div style={{ fontWeight: 600, color: 'var(--fg)', marginTop: 2 }}>{data.sourceName}</div>
      <a href={data.source} target="_blank" rel="noopener noreferrer" className="dim small" style={{ wordBreak: 'break-all', display: 'inline-block', marginTop: 2 }}>
        {data.source}
      </a>
    </div>

    {/* Program selector pills */}
    <div style={{ marginBottom: 14 }}>
      <div className="sec-t" style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, color: 'var(--fg-muted)' }}>
        {t('athlete.ru Powerlifting Cycles')} ({data.programs.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.programs.map(prog => {
          const active = prog.id === selectedId
          return (
            <div
              key={prog.id}
              onClick={() => setSelectedId(prog.id)}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: active ? '2px solid var(--acc)' : '1px solid var(--border)',
                background: active ? 'var(--surface-2)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div className="row between" style={{ alignItems: 'center' }}>
                <b style={{ fontSize: '0.92rem', color: active ? 'var(--acc)' : 'var(--fg)' }}>
                  {isRu ? prog.title : (prog.titleEn || prog.title)}
                </b>
                <span className="tag" style={{ fontSize: '0.75rem' }}>{prog.duration || '9 недель'}</span>
              </div>
              <div className="small muted" style={{ marginTop: 4 }}>
                {isRu ? prog.description : (prog.descriptionEn || prog.description)}
              </div>
            </div>
          )
        })}
      </div>
    </div>

    {/* Details for chosen program */}
    {selectedProgram && (
      <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 10, marginBottom: 14 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>
          📋 {t('Routines in this program')}:
        </div>
        <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
          {selectedProgram.spec.map(([rName, emoji, exList], i) => (
            <div key={i} style={{ fontSize: '0.85rem', padding: '6px 8px', background: 'var(--surface-1)', borderRadius: 6 }}>
              <b>{rName}</b>: {exList.map(e => {
                const ex = EXIDX[Array.isArray(e) ? e[0] : e.id]
                const name = ex ? t(ex.n) : (Array.isArray(e) ? e[0] : e.id)
                const sets = Array.isArray(e) ? `${e[1]}×${e[2]}` : `${e.sets}×${e.reps || 'reps'}`
                return `${name} (${sets})`
              }).join(', ')}
            </div>
          ))}
        </div>

        {selectedProgram.notes && selectedProgram.notes.length > 0 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            <b>💡 {t('Progression')}:</b>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {selectedProgram.notes.slice(0, 3).map((n, i) => <li key={i} style={{ marginBottom: 2 }}>{n}</li>)}
            </ul>
          </div>
        )}
      </div>
    )}

    {/* Weekly schedule toggle */}
    <div className="row between" style={{ alignItems: 'center', marginBottom: 16, padding: '4px 0' }}>
      <span style={{ fontSize: '0.92rem' }}>{t('Assign to Mon / Wed / Fri schedule')}</span>
      <Switch checked={applyWeek} onChange={setApplyWeek} />
    </div>

    {/* Buttons */}
    <Button variant="primary" icon="download" onClick={handleImport} style={{ marginBottom: 8 }}>
      {t('Import to My Plan')}
    </Button>
    <Button variant="ghost" className="dim" onClick={close}>
      {t('Cancel')}
    </Button>
  </>
}
export const importUrlSheet = (url) => ui().openSheet(close => <ImportUrlSheet initialUrl={url} close={close} />)
