import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { lastBW, streakWeeks, effortOf } from '../lib/history.js'
import { fmtNum, fmtDate, fmtVol, todayISO, weekKey } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { bwSheet, goalSheet, calendarSheet, workoutDetailSheet, WorkoutRow, bwDeltaColor } from '../sheets.jsx'
import LineChart from '../components/LineChart.jsx'
import Heatmap from '../components/Heatmap.jsx'
import Icon from '../components/Icon.jsx'
import BodyMap, { BodyMapLegend } from '../components/BodyMap.jsx'
import { loadOfWorkouts, rankOf, MUSCLE_NAME } from '../lib/muscles.js'
import {
  hasEffort, displayScale, scaleName, toScale, effortSummary, effortWeeks,
  effortHistogram, isHardSet, HARD_RIR
} from '../lib/effort.js'
import { Button, Segmented } from '../components/ui.jsx'
import SwipeToDelete from '../components/SwipeToDelete.jsx'
import { useUI } from '../store/useUI.js'

import BodyMeasurementsCard from '../components/BodyMeasurementsCard.jsx'
import WeightTrendsCard from '../components/WeightTrendsCard.jsx'
import TopExercisesVolumeCard from '../components/TopExercisesVolumeCard.jsx'
import ExerciseWeightProgressionCard from '../components/ExerciseWeightProgressionCard.jsx'

// Which muscles the training in a window actually hit — and, the point of the card,
// which ones it keeps missing. Shading is relative within the window (lib/muscles.js).
function MuscleBalance({ S }) {
  const [win, setWin] = useState(7)
  const [hard, setHard] = useState(false)
  const [sel, setSel] = useState(null)
  const now = Date.now()
  const inWin = (S.workouts || []).filter(w => {
    if (!w || typeof w !== 'object') return false
    const date = typeof w.d === 'string' ? w.d : ''
    const timestamp = Number(w.start) || (date ? new Date(date).getTime() : NaN)
    return win === 0 ? true
      : win === 7 ? date && weekKey(date) === weekKey(todayISO())
        : Number.isFinite(timestamp) && timestamp > now - win * 86400000
  })
  // Counting only the sets taken near failure turns the map from "where did the volume go"
  // into "where did the stimulus go" — a muscle can lead on sets and still never be trained
  // hard. Offered only when the window holds ratings at all, since with none the hard map
  // would just be empty and read as "you trained nothing".
  const rated = inWin.some(w => (w.entries || []).some(e => (e?.sets || []).some(s => s?.done && isHardSet(s))))
  const on = hard && rated
  const load = loadOfWorkouts(inWin, on ? isHardSet : null)
  const { worked, missed } = rankOf(load)
  const top = worked.slice(0, 4)
  const max = worked.length ? load[worked[0]] : 0
  const sets = m => Math.round((load[m] || 0) * 10) / 10

  return <div className="card">
    <div className="row between" style={{ marginBottom: 8 }}>
      <h2 style={{ margin: 0 }}>{t('Muscle balance')} <span className="dim" style={{ textTransform: 'none', letterSpacing: 0 }}>· {on ? t('by hard sets') : t('by sets worked')}</span></h2>
      {rated && <Button size="sm" icon="flame" style={on ? { color: 'var(--yellow)' } : undefined}
        onClick={() => { setHard(h => !h); setSel(null) }}>{on ? t('Hard') : t('All')}</Button>}
    </div>
    <Segmented className="seg-range" value={win} onChange={v => { setWin(v); setSel(null) }}
      options={[{ value: 7, label: t('Week') }, { value: 30, label: '30d' }, { value: 90, label: '90d' }, { value: 0, label: t('All') }]} />
    {inWin.length ? <>
      <BodyMap className="tappable" load={load} body={S.body} selected={sel}
        onMuscle={m => setSel(s => (s === m ? null : m))} />
      <BodyMapLegend />
      {sel && <div className="mrow" style={{ borderTop: 'var(--hair) solid var(--sep)', marginTop: 4, paddingTop: 10 }}>
        <span className="nm"><b>{t(MUSCLE_NAME[sel])}</b></span>
        <span className="v">{sets(sel) ? t('{0} sets', sets(sel)) : on ? t('no hard sets') : t('not trained')}</span>
      </div>}
      {!sel && top.map(m => <div key={m} className="mrow">
        <span className="nm">{t(MUSCLE_NAME[m])}</span>
        <span className="bar"><i style={{ width: Math.round(load[m] / max * 100) + '%', background: on ? 'var(--yellow)' : undefined }} /></span>
        <span className="v">{t('{0} sets', sets(m))}</span>
      </div>)}
      {missed.length > 0 && <>
        <h4 className="sec" style={{ marginTop: 12 }}>{on ? t('No hard sets in this period') : t('Not trained in this period')}</h4>
        <div className="mchips">{missed.map(m => <span key={m} className="mchip miss">{t(MUSCLE_NAME[m])}</span>)}</div>
      </>}
      {!missed.length && worked.length > 0 &&
        <div className="muted small" style={{ marginTop: 10 }}>{on
          ? t('Every muscle group got at least one hard set in this period.')
          : t('Every muscle group got some work in this period.')}</div>}
    </> : <div className="muted small">{t('No workouts in this period yet.')}</div>}
  </div>
}

// How hard the training was — the half of the picture a volume chart cannot show. Everything
// is computed in RIR (lib/effort.js) and converted to whichever scale this profile reads.
// Every number carries how much of the training it speaks for: rating is optional and off by
// default, so a partly rated history is the normal case, and an average without its
// denominator would quietly speak for sets that were never rated.
function EffortCard({ S }) {
  const [win, setWin] = useState(90)
  const kind = displayScale(S)
  const hd = scaleName(kind)
  const sum = effortSummary(S, win)
  const weeks = effortWeeks(S, win)
  const hist = effortHistogram(S, win)
  const maxBin = Math.max(1, ...hist.map(b => b.n))
  // The week's set count rides along in the tooltip, because the pair is the reading:
  // volume up with effort up is fatigue piling up, volume up with effort flat is adaptation.
  const pts = weeks.map(w => ({ t: w.t, y: toScale(kind, w.rir), note: t('{0} sets', w.sets) }))
  // Bins run hardest-first in both scales: RIR 0 and RPE 10 are the same set.
  const binLabel = b => kind === 'rpe' ? (b.tail ? '≤ 6' : String(10 - b.rir)) : (b.tail ? b.rir + '+' : String(b.rir))

  return <div className="card">
    <h2>{t('Effort')} <span className="dim" style={{ textTransform: 'none', letterSpacing: 0 }}>· {t('how close to failure')}</span></h2>
    <Segmented className="seg-range" value={win} onChange={setWin}
      options={[{ value: 30, label: '30d' }, { value: 90, label: '90d' }, { value: 365, label: '1Y' }, { value: 0, label: t('All') }]} />
    {sum.rated === 0 ? <div className="muted small">{t('No rated sets in this period.')}</div> : <>
      <div className="row between" style={{ alignItems: 'flex-end', gap: 12 }}>
        <div>
          <div className="stat-v">{sum.avg == null ? '—' : fmtNum(toScale(kind, sum.avg)) + ' ' + hd}</div>
          <div className="small dim">{t('average effort')}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="stat-v" style={{ color: 'var(--yellow)' }}>{sum.hardPct == null ? '—' : Math.round(sum.hardPct * 100) + '%'}</div>
          <div className="small dim">{t('at {0} {1} or harder', hd, fmtNum(toScale(kind, HARD_RIR)))}</div>
        </div>
      </div>
      <div className="small dim" style={{ marginTop: 8 }}>{t('{0} of {1} finished sets rated', sum.rated, sum.done)}</div>
      {effortOf(S) === 'none' && <div className="small" style={{ color: 'var(--yellow)', marginTop: 4 }}>
        {t('Effort per set is switched off — turn it on in Settings to keep rating.')}
      </div>}
      {pts.length > 1 && <>
        <h4 className="sec" style={{ marginTop: 12 }}>{t('Week by week')}</h4>
        <div className="chart"><LineChart points={pts} h={140} unit={hd} color="var(--yellow)" invert={kind === 'rir'} /></div>
      </>}
      <h4 className="sec" style={{ marginTop: 12 }}>{t('Where the sets land')}</h4>
      {hist.map(b => <div key={b.rir} className="mrow">
        <span className="nm">{hd} {binLabel(b)}</span>
        <span className="bar"><i style={{ width: Math.round(b.n / maxBin * 100) + '%', background: b.rir <= HARD_RIR ? 'var(--yellow)' : 'var(--label-3)' }} /></span>
        <span className="v">{b.n ? b.n + ' · ' + Math.round(b.pct * 100) + '%' : '—'}</span>
      </div>)}
      <div className="small dim" style={{ marginTop: 8 }}>
        {t('Most working sets belong close to failure without living there — half at the floor and half at the top average out to a healthy-looking middle.')}
      </div>
    </>}
  </div>
}

// Stats = the analytics hub: all charts, progress and history live here.
export default function Stats() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)
  const [range, setRange] = useState(90)
  const now = Date.now()
  // Old backups and interrupted syncs can leave partial rows in otherwise valid arrays.
  // A single null workout previously reached streakWeeks() and crashed this whole route.
  const workouts = (Array.isArray(S?.workouts) ? S.workouts : [])
    .filter(w => w && typeof w === 'object')
    .map(w => {
      const dStr = typeof w.d === 'string' && w.d ? w.d : (w.start ? isoOf(new Date(Number(w.start))) : todayISO())
      return {
        ...w,
        d: dStr,
        vol: Number(w.vol) || workoutVolume(w),
        entries: (Array.isArray(w.entries) ? w.entries : [])
          .filter(e => e && typeof e === 'object')
          .map(e => ({ ...e, sets: Array.isArray(e.sets) ? e.sets.filter(Boolean) : [] }))
      }
    })
  const weights = (Array.isArray(S?.bodyweight) ? S.bodyweight : []).filter(b => b && typeof b === 'object')
  const statsS = { ...S, workouts, bodyweight: weights, measurements: Array.isArray(S?.measurements) ? S.measurements : [] }
  const anyEffort = hasEffort(statsS)
  const kind = displayScale(statsS)
  const hd = scaleName(kind)

  const validWeights = weights.filter(b => typeof b.d === 'string' && Number.isFinite(Number(b.w)) && Number(b.w) > 0)
  const bwPts = validWeights.filter(b => range === 0 || (Number(b.t) || new Date(b.d).getTime()) > now - range * 86400000)
    .map(b => ({ t: Number(b.t) || new Date(b.d).getTime(), y: Number(b.w), d: b.d }))
  const bw30 = validWeights.filter(b => (Number(b.t) || new Date(b.d).getTime()) > now - 30 * 86400000)
  const bwDelta30 = bw30.length > 1 ? bw30[bw30.length - 1].w - bw30[0].w : null
  const todayBW = validWeights.find(b => b.d === todayISO())
  const currentBW = lastBW(S)
  const monthW = workouts.filter(w => typeof w.d === 'string' && w.d.slice(0, 7) === todayISO().slice(0, 7)).length

  return <>
    <div className="hdr">
      <div><h1>{t('Stats')}</h1><div className="sub">{t('Progress & history')}</div></div>
      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        <Button size="sm" variant="primary" icon="scale" onClick={() => bwSheet()} title={t('Log body weight')}>
          {t('Log weight')}
        </Button>
        <button className="iconbtn" onClick={() => nav('/history')} aria-label={t('History')}><Icon name="history" /></button>
      </div>
    </div>

    {S?.active && (
      <div
        className="card tappable"
        onClick={() => nav('/workout')}
        role="button"
        tabIndex={0}
        style={{
          background: 'color-mix(in srgb, var(--surface) 92%, var(--acc))',
          border: '1.5px solid var(--acc)',
          marginBottom: 16,
          cursor: 'pointer'
        }}
      >
        <div className="row between" style={{ alignItems: 'center' }}>
          <div className="row" style={{ gap: 10, alignItems: 'center', minWidth: 0 }}>
            <span className="lrow-i" style={{ background: 'var(--acc)', color: 'var(--bg, #000)', flexShrink: 0 }}>
              <Icon name="play" />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{t('Workout in progress')}</div>
              <div className="small dim" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {S.active.name || t('Active workout')}
              </div>
            </div>
          </div>
          <Button size="sm" variant="primary" icon="play">
            {t('Resume')}
          </Button>
        </div>
      </div>
    )}

    <div className="tiles">
      <div className="tile"><div className="l"><Icon name="dumbbell" />{t('Workouts')}</div><div className="v">{workouts.length}</div></div>
      <div className="tile"><div className="l"><Icon name="calendar" />{t('This month')}</div><div className="v">{monthW}</div></div>
      <div className="tile"><div className="l"><Icon name="flame" />{t('Week streak')}</div><div className="v">{streakWeeks(statsS)}</div></div>
      <div
        className="tile tappable"
        onClick={() => bwSheet()}
        role="button"
        tabIndex={0}
        title={t('Log body weight')}
        style={{ cursor: 'pointer' }}
      >
        <div className="row between" style={{ width: '100%', alignItems: 'center' }}>
          <div className="l" style={{ margin: 0 }}><Icon name="scale" />{t('Weight')}</div>
          <span className="accent small" style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11 }}>
            <Icon name="plus" size={11} /> {t('Log')}
          </span>
        </div>
        <div className="v" style={{ fontSize: 22, color: bwDelta30 === null ? 'inherit' : bwDeltaColor(bwDelta30, (currentBW || {}).w || 0) }}>
          {currentBW ? `${fmtNum(currentBW.w)} ${S.unit}` : '—'}
        </div>
        <div className="small dim" style={{ fontSize: 11, marginTop: 2 }}>
          {bwDelta30 === null ? t('Tap to log') : (bwDelta30 > 0 ? '+' : '') + fmtNum(bwDelta30) + ' ' + S.unit + ' (30d)'}
        </div>
      </div>
    </div>

    <div className="card">
      <h2>{t('Activity — last 12 months')} <span className="dim" style={{ textTransform: 'none', letterSpacing: 0 }}>· {t('by time trained')}</span></h2>
      <Heatmap S={statsS} onDay={iso => { const ws = workouts.filter(w => w.d === iso); if (ws.length === 1) workoutDetailSheet(ws[0]); else if (ws.length) calendarSheet(iso) }} />
    </div>

    {workouts.length > 0 && <MuscleBalance S={statsS} />}
    {anyEffort && <EffortCard S={statsS} />}
    {workouts.length > 0 && <TopExercisesVolumeCard S={statsS} />}

    <div className="cols">
      <div className="card">
        <div className="row between" style={{ marginBottom: 8, alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>{t('Body weight')}</h2>
          <div className="row" style={{ gap: 8 }}>
            <Button size="sm" icon="target" style={S.targetW ? { color: 'var(--yellow)' } : undefined} onClick={goalSheet}>{S.targetW ? fmtNum(S.targetW) : t('Goal')}</Button>
            <Button size="sm" variant="primary" icon="plus" onClick={() => bwSheet()}>{t('Log weight')}</Button>
          </div>
        </div>
        <div
          className="row between"
          style={{
            background: 'var(--surface-2, rgba(255,255,255,0.04))',
            border: '1px solid var(--sep, rgba(255,255,255,0.08))',
            borderRadius: 'var(--r-md, 10px)',
            padding: '8px 12px',
            marginBottom: 10,
            alignItems: 'center',
            gap: 8
          }}
        >
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <Icon name="scale" size={15} className="dim" />
            <span className="small">
              {todayBW ? (
                <><b>{t('Today:')}</b> {fmtNum(todayBW.w)} {S.unit}</>
              ) : (
                <span className="muted">{t('No weigh-in logged today')}</span>
              )}
            </span>
          </div>
          <Button size="sm" variant={todayBW ? 'ghost' : 'primary'} icon={todayBW ? 'edit' : 'plus'} onClick={() => bwSheet()}>
            {todayBW ? t('Edit') : t('Quick log')}
          </Button>
        </div>
        <Segmented className="seg-range" value={range} onChange={setRange}
          options={[{ value: 30, label: '1M' }, { value: 90, label: '3M' }, { value: 365, label: '1Y' }, { value: 0, label: t('All') }]} />
        <div className="chart"><LineChart points={bwPts} h={160} unit={S.unit} goal={S.targetW} /></div>
      </div>

      <WeightTrendsCard S={statsS} />

      <BodyMeasurementsCard S={statsS} />

      <ExerciseWeightProgressionCard S={statsS} />
    </div>

    {workouts.length > 0 && <>
      <div className="row between" style={{ marginBottom: 10 }}>
        <h4 className="sec" style={{ margin: 0 }}>{t('Recent workouts')}</h4>
        <Button size="sm" variant="ghost" trailingIcon="chevronRight" onClick={() => nav('/history')}>{t('All')} {workouts.length}</Button>
      </div>
      <div className="list">
        {[...workouts].reverse().slice(0, 6).map(w => (
          <SwipeToDelete
            key={w.id}
            onDelete={() => {
              update(s => { s.workouts = s.workouts.filter(x => x.id !== w.id) })
              toast(t('Workout deleted'))
            }}
            confirmTitle={t('Delete workout?')}
            confirmMessage={t('This removes it from your history for good.')}
          >
            <WorkoutRow w={w} onClick={() => workoutDetailSheet(w)} />
          </SwipeToDelete>
        ))}
      </div>
    </>}
  </>
}
