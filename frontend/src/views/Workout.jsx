import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { exOr } from '../lib/exercises.js'
import { effectiveRoutine, lastEntryFor, bestWeightFor, buildSets, setsDoneActive, supersetUnits, unitOf, setLabel, modeOf, EFFORT, effortOf, stepEffort, capEffort } from '../lib/history.js'
import { fmtNum, fmtDate, todayISO, exCount, DAYN } from '../lib/format.js'
import { beep, vibrate } from '../lib/sound.js'
import { t } from '../lib/i18n.js'
import { api } from '../lib/api.js'
import Media from '../components/Media.jsx'
import { startFlow, startFreeleticsFlow, exercisePicker, exConfigSheet, exerciseDetailSheet, topWeightSheet, finishWorkout, workoutCompleteSheet, confirmSheet, changeExerciseSheet, showProgramSheet, switchTrainingSheet, exerciseNoteSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button, Check, NumberField, Segmented } from '../components/ui.jsx'
import { nextPrescription, applyPrescription } from '../lib/progression.js'
import { glyphOf } from '../lib/glyphs.js'
import { FREELETICS_SPEC } from '../lib/starter.js'

/* ---------- start chooser (no active workout) ---------- */
function StartChooser() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const todayR = effectiveRoutine(S, todayISO())
  const todayOvr = S.dayPlan[todayISO()] !== undefined
  const others = S.routines.filter(r => r !== todayR)
  return <div className="narrow">
    <div className="hdr">
      <div>
        <h1>{t('Start workout')}</h1>
        <div className="sub">{t(DAYN[new Date().getDay()])} — {todayR ? t('today is {0}', todayR.name) : t('rest day, but no one’s stopping you')}</div>
      </div>
      <button className="iconbtn" onClick={showProgramSheet} aria-label={t('Show program')} title={t('Show program')}>
        <Icon name="clipboard" />
      </button>
    </div>

    {/* Quick program info & switch banner */}
    <div className="card" style={{ padding: '10px 14px', marginBottom: 12 }}>
      <div className="row between" style={{ alignItems: 'center' }}>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <Icon name="sparkles" style={{ color: 'var(--acc)' }} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>{t('Training Program & Schedule')}</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Button size="sm" variant="tinted" icon="clipboard" onClick={showProgramSheet}>{t('Show program')}</Button>
        </div>
      </div>
    </div>

    {todayR && <div className="card" style={{ borderColor: 'var(--acc)' }}>
      <h2 className="accent">{t("Today's plan")}{todayOvr ? ' · ' + t('rescheduled') : ''}</h2>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div><div className="big">{todayR.name}</div><div className="muted small">{exCount(todayR.ex.length)}</div></div>
        <span className="lrow-i" style={{ width: 38, height: 38, borderRadius: 9, fontSize: 22 }}><Icon name={glyphOf(todayR.emoji)} /></span>
      </div>
      <Button variant="primary" icon="play" onClick={() => startFlow(todayR.id)}>{t('Start {0}', todayR.name)}</Button>
    </div>}

    {/* Hero Rounds Training Section */}
    <div className="fl-card" style={{ borderColor: 'var(--acc)', marginTop: 14 }}>
      <div className="fl-badge"><Icon name="bolt" /> {t('Hero Rounds Training')}</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{t('Named 5-Round Workouts')}</div>
      <div className="muted small">{t('High-intensity bodyweight rounds with rapid set transitions.')}</div>
      <div className="fl-grid">
        <button type="button" className="fl-god-btn" onClick={() => startFreeleticsFlow('Blaze', FREELETICS_SPEC[0][2])}>
          <div className="fl-god-name">⚡ {t('Blaze')}</div>
          <div className="fl-god-desc">{t('Burpees · Jump Squats · Sit-ups · 5 rounds')}</div>
        </button>
        <button type="button" className="fl-god-btn" onClick={() => startFreeleticsFlow('Titan', FREELETICS_SPEC[1][2])}>
          <div className="fl-god-name">⚡ {t('Titan')}</div>
          <div className="fl-god-desc">{t('Push-ups · Jumping Jacks · Lunges · 5 rounds')}</div>
        </button>
        <button type="button" className="fl-god-btn" onClick={() => startFreeleticsFlow('Vortex', FREELETICS_SPEC[2][2])}>
          <div className="fl-god-name">⚡ {t('Vortex')}</div>
          <div className="fl-god-desc">{t('Climbers · Sit-ups · Jump Squats · 5 rounds')}</div>
        </button>
      </div>
    </div>

    {others.length > 0 && <><h4 className="sec">{t('Other routines')}</h4>
      <div className="list">{others.map(r => <div key={r.id} className="item" onClick={() => startFlow(r.id)}>
        <span className="lrow-i"><Icon name={glyphOf(r.emoji)} /></span>
        <div className="grow"><div className="tt">{r.name}</div><div className="ss">{exCount(r.ex.length)}</div></div>
        <span className="tag acc">{t('Start')}</span></div>)}</div></>}
    <div style={{ height: 14 }} />
    <Button icon="shuffle" onClick={() => startFlow(null)}>{t('Freestyle workout (pick as you go)')}</Button>
    {!S.routines.length && <><div style={{ height: 10 }} /><Button variant="primary" onClick={() => nav('/plan')}>{t('Build a plan first')}</Button></>}
  </div>
}

/* ---------- quick change set sheet ---------- */
function ChangeSetSheet({ entryIdx, setIdx, close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const A = S.active
  if (!A || !A.entries[entryIdx] || !A.entries[entryIdx].sets[setIdx]) {
    close()
    return null
  }
  const entry = A.entries[entryIdx]
  const ex = exOr(entry.id)
  const s = entry.sets[setIdx]
  const mode = modeOf({ ...(entry.target || {}), id: entry.id })
  const cardio = mode === 'cardio'
  const timed = mode === 'time'
  const isWorking = entry.activeSetIdx === setIdx || (entry.activeSetIdx === undefined && entry.sets.findIndex(x => !x.done) === setIdx)

  const mut = fn => update(st => {
    const e = st.active.entries[entryIdx]
    if (e && e.sets[setIdx]) fn(e.sets[setIdx], e)
  }, true)

  const setTag = tag => mut(setObj => {
    if (!tag || tag === 'N') delete setObj.tag
    else setObj.tag = tag
  })

  const setAsActiveWorking = () => {
    update(st => {
      st.active.cur = entryIdx
      st.active.entries[entryIdx].activeSetIdx = setIdx
    })
    close()
  }

  const deleteSet = () => {
    if (entry.sets.length <= 1) return
    update(st => {
      st.active.entries[entryIdx].sets.splice(setIdx, 1)
      if (st.active.entries[entryIdx].activeSetIdx >= st.active.entries[entryIdx].sets.length) {
        delete st.active.entries[entryIdx].activeSetIdx
      }
    })
    close()
  }

  const duplicateSet = () => {
    update(st => {
      const copy = { ...st.active.entries[entryIdx].sets[setIdx], done: false }
      st.active.entries[entryIdx].sets.splice(setIdx + 1, 0, copy)
    })
    close()
  }

  return <div style={{ padding: '4px 0' }}>
    <div className="row between" style={{ alignItems: 'center', marginBottom: 12 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, textTransform: 'capitalize' }}>{t(ex.n)}</div>
        <div className="muted small">{t('Set {0} of {1}', setIdx + 1, entry.sets.length)}</div>
      </div>
      <button type="button" className="iconbtn" onClick={close}><Icon name="xmark" /></button>
    </div>

    {/* Working Set Status & Jump */}
    <div className="card" style={{ padding: 12, marginBottom: 14 }}>
      <div className="row between" style={{ alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600 }}>{isWorking ? t('Active Working Set') : t('Working Set Target')}</div>
          <div className="muted small">{isWorking ? t('This set is currently highlighted and active.') : t('Focus and log this set next.')}</div>
        </div>
        {!isWorking && (
          <Button size="sm" variant="primary" onClick={setAsActiveWorking}>{t('Work on this set')}</Button>
        )}
      </div>
    </div>

    {/* Set Type / Tag */}
    <div style={{ marginBottom: 16 }}>
      <div className="small muted" style={{ marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>{t('Set Type')}</div>
      <div className="row" style={{ gap: 6 }}>
        <button type="button" className={'btn ' + (!s.tag ? 'primary' : 'ghost')} style={{ flex: 1, padding: '8px 4px', fontSize: 13 }} onClick={() => setTag('N')}>
          {t('Normal')}
        </button>
        <button type="button" className={'btn ' + (s.tag === 'W' ? 'primary' : 'ghost')} style={{ flex: 1, padding: '8px 4px', fontSize: 13, color: s.tag === 'W' ? undefined : 'var(--yellow)' }} onClick={() => setTag('W')}>
          {t('Warm-up (W)')}
        </button>
        <button type="button" className={'btn ' + (s.tag === 'D' ? 'primary' : 'ghost')} style={{ flex: 1, padding: '8px 4px', fontSize: 13, color: s.tag === 'D' ? undefined : '#a855f7' }} onClick={() => setTag('D')}>
          {t('Drop (D)')}
        </button>
        <button type="button" className={'btn ' + (s.tag === 'F' ? 'primary' : 'ghost')} style={{ flex: 1, padding: '8px 4px', fontSize: 13, color: s.tag === 'F' ? undefined : 'var(--red)' }} onClick={() => setTag('F')}>
          {t('Failure (F)')}
        </button>
      </div>
    </div>

    {/* Set Values */}
    <div className="card" style={{ padding: 12, marginBottom: 16 }}>
      <div className="small muted" style={{ marginBottom: 10, fontWeight: 600, textTransform: 'uppercase' }}>{t('Set Values')}</div>
      {cardio ? (
        <div className="row" style={{ gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="small dim" style={{ marginBottom: 4 }}>{t('Duration (min)')}</div>
            <div className="stp">
              <button type="button" onClick={() => mut(x => { x.min = Math.max(1, (x.min || 1) - 1) })}><Icon name="minus" /></button>
              <span className="val"><NumberField value={s.min ?? 20} onChange={v => mut(x => { x.min = v })} /></span>
              <button type="button" onClick={() => mut(x => { x.min = (x.min || 1) + 1 })}><Icon name="plus" /></button>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="small dim" style={{ marginBottom: 4 }}>{t('Speed (km/h)')}</div>
            <div className="stp">
              <button type="button" onClick={() => mut(x => { x.speed = Math.max(1, Math.round(((x.speed || 8) - 0.5) * 10) / 10) })}><Icon name="minus" /></button>
              <span className="val"><NumberField decimal value={s.speed ?? 8} onChange={v => mut(x => { x.speed = v })} /></span>
              <button type="button" onClick={() => mut(x => { x.speed = Math.round(((x.speed || 8) + 0.5) * 10) / 10 })}><Icon name="plus" /></button>
            </div>
          </div>
        </div>
      ) : timed ? (
        <div className="row" style={{ gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="small dim" style={{ marginBottom: 4 }}>{t('Seconds')}</div>
            <div className="stp">
              <button type="button" onClick={() => mut(x => { x.sec = Math.max(5, (x.sec || 45) - 5) })}><Icon name="minus" /></button>
              <span className="val"><NumberField value={s.sec ?? 45} onChange={v => mut(x => { x.sec = v })} /></span>
              <button type="button" onClick={() => mut(x => { x.sec = (x.sec || 45) + 5 })}><Icon name="plus" /></button>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="small dim" style={{ marginBottom: 4 }}>{t('Weight ({0})', S.unit)}</div>
            <div className="stp">
              <button type="button" onClick={() => mut(x => { x.w = Math.max(0, Math.round(((x.w || 0) - 2.5) * 10) / 10) })}><Icon name="minus" /></button>
              <span className="val"><NumberField decimal value={s.w ?? 0} onChange={v => mut(x => { x.w = v })} /></span>
              <button type="button" onClick={() => mut(x => { x.w = Math.round(((x.w || 0) + 2.5) * 10) / 10 })}><Icon name="plus" /></button>
            </div>
          </div>
        </div>
      ) : (
        <div className="row" style={{ gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="small dim" style={{ marginBottom: 4 }}>{t('Weight ({0})', S.unit)}</div>
            <div className="stp">
              <button type="button" onClick={() => mut(x => { x.w = Math.max(0, Math.round(((x.w || 0) - 2.5) * 10) / 10) })}><Icon name="minus" /></button>
              <span className="val"><NumberField decimal value={s.w ?? 0} onChange={v => mut(x => { x.w = v })} /></span>
              <button type="button" onClick={() => mut(x => { x.w = Math.round(((x.w || 0) + 2.5) * 10) / 10 })}><Icon name="plus" /></button>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="small dim" style={{ marginBottom: 4 }}>{t('Reps')}</div>
            <div className="stp">
              <button type="button" onClick={() => mut(x => { x.r = Math.max(1, (x.r || 10) - 1) })}><Icon name="minus" /></button>
              <span className="val"><NumberField value={s.r ?? 10} onChange={v => mut(x => { x.r = v })} /></span>
              <button type="button" onClick={() => mut(x => { x.r = (x.r || 10) + 1 })}><Icon name="plus" /></button>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Quick actions */}
    <div className="row" style={{ gap: 8, marginBottom: 12 }}>
      <Button icon="play" onClick={() => mut(x => { x.done = !x.done })}>
        {s.done ? t('Mark as not done') : t('Mark as completed')}
      </Button>
      <Button icon="plus" onClick={duplicateSet}>{t('Duplicate set')}</Button>
    </div>

    <div style={{ marginBottom: 12 }}>
      <Button variant="tinted" icon="shuffle" onClick={() => {
        close()
        changeExerciseSheet(ex, newEx => {
          update(st => {
            const ent = st.active?.entries[entryIdx]
            if (!ent) return
            ent.id = newEx.id
            ent.target = { ...(ent.target || {}), id: newEx.id }
            const r = st.routines.find(x => x.id === st.active.routineId)
            ent.plan = nextPrescription(st, { ...ent.target, id: newEx.id }, r)
          })
          useUI.getState().toast(t('Swapped to {0}', newEx.n))
        })
      }}>
        {t('Change / Swap this exercise')}
      </Button>
    </div>

    {entry.sets.length > 1 && (
      <Button variant="danger" icon="trash" onClick={deleteSet}>{t('Delete this set')}</Button>
    )}
  </div>
}

/* ---------- working sets & rounds overview sheet ---------- */
function WorkingSetsSheet({ close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const A = S.active
  const [viewMode, setViewMode] = useState(A?.isFreeletics ? 'round' : 'ex')

  if (!A || !A.entries.length) {
    close()
    return null
  }

  const totalSets = A.entries.reduce((n, e) => n + e.sets.length, 0)
  const doneSets = setsDoneActive(A)
  const maxSets = Math.max(...A.entries.map(e => e.sets.length), 0)

  const jumpToSet = (entryIdx, setIdx) => {
    update(st => {
      st.active.cur = entryIdx
      st.active.entries[entryIdx].activeSetIdx = setIdx
    })
    close()
  }

  const toggleDone = (entryIdx, setIdx) => {
    update(st => {
      const s = st.active.entries[entryIdx].sets[setIdx]
      if (s) s.done = !s.done
    }, true)
  }

  const openChange = (entryIdx, setIdx) => {
    close()
    useUI.getState().openSheet(cl => <ChangeSetSheet entryIdx={entryIdx} setIdx={setIdx} close={cl} />)
  }

  return <div style={{ padding: '4px 0' }}>
    <div className="row between" style={{ alignItems: 'center', marginBottom: 12 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 19 }}>{t('Working Sets & Rounds')}</div>
        <div className="muted small">{doneSets} / {totalSets} {t('sets completed')}</div>
      </div>
      <button type="button" className="iconbtn" onClick={close}><Icon name="xmark" /></button>
    </div>

    {/* Mode toggle */}
    <div style={{ marginBottom: 14 }}>
      <Segmented value={viewMode} onChange={setViewMode} options={[
        { value: 'ex', label: t('By Exercise') },
        { value: 'round', label: A?.isFreeletics ? t('⚡ Hero Rounds ({0})', maxSets) : t('By Round ({0})', maxSets) }
      ]} />
    </div>

    {viewMode === 'ex' ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {A.entries.map((entry, eIdx) => {
          const ex = exOr(entry.id)
          const isCurrentEx = A.cur === eIdx
          const exDoneCount = entry.sets.filter(s => s.done).length
          const workingIdx = entry.activeSetIdx !== undefined ? entry.activeSetIdx : Math.max(0, entry.sets.findIndex(s => !s.done))

          return <div key={eIdx} className={'set-overview-item' + (isCurrentEx ? ' active-ex' : '')}>
            <div className="row between" style={{ alignItems: 'center', marginBottom: 8 }}>
              <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 700, textTransform: 'capitalize', fontSize: 15 }}>{eIdx + 1}. {t(ex.n)}</span>
                {isCurrentEx && <span className="round-badge active">{t('Active')}</span>}
              </div>
              <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                <button type="button" className="btn-swap-ex" onClick={() => {
                  close()
                  changeExerciseSheet(ex, newEx => {
                    update(st => {
                      const ent = st.active?.entries[eIdx]
                      if (!ent) return
                      ent.id = newEx.id
                      ent.target = { ...(ent.target || {}), id: newEx.id }
                      const r = st.routines.find(x => x.id === st.active.routineId)
                      ent.plan = nextPrescription(st, { ...ent.target, id: newEx.id }, r)
                    })
                    useUI.getState().toast(t('Swapped to {0}', newEx.n))
                  })
                }} title={t('Change / Swap this exercise')}>
                  <Icon name="shuffle" style={{ fontSize: 11 }} />
                  <span>{t('Change')}</span>
                </button>
                <span className="small muted">{exDoneCount}/{entry.sets.length}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {entry.sets.map((s, sIdx) => {
                const isWorking = isCurrentEx && sIdx === workingIdx && !s.done
                const tag = s.tag === 'W' ? 'W' : s.tag === 'D' ? 'D' : s.tag === 'F' ? 'F' : (sIdx + 1)
                const desc = s.min !== undefined ? `${s.min}m` : s.sec !== undefined ? `${s.sec}s` : `${s.w ? s.w + 'k×' : ''}${s.r}`

                return <div key={sIdx}
                  onClick={() => jumpToSet(eIdx, sIdx)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 9px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    border: isWorking ? '2px solid var(--acc)' : '1px solid var(--sep)',
                    background: s.done ? 'var(--surface-3)' : isWorking ? 'color-mix(in srgb, var(--acc) 15%, var(--surface))' : 'var(--surface)',
                    opacity: s.done ? 0.6 : 1
                  }}
                  title={t('Set {0}: {1} · Click to jump or change', sIdx + 1, desc)}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: s.done ? 'var(--acc)' : isWorking ? 'var(--acc)' : 'var(--surface-2)',
                    color: s.done || isWorking ? 'var(--on-acc)' : 'var(--label-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10
                  }}>
                    {s.done ? <Icon name="check" style={{ fontSize: 11 }} /> : tag}
                  </span>
                  <span>{desc}</span>
                  <button type="button" className="iconbtn" style={{ width: 18, height: 18, fontSize: 10, padding: 0 }}
                    onClick={ev => { ev.stopPropagation(); openChange(eIdx, sIdx) }}
                    title={t('Change set')}>
                    <Icon name="pencil" />
                  </button>
                </div>
              })}
            </div>
          </div>
        })}
      </div>
    ) : (
      /* Round view (Hero Rounds style) */
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: maxSets }).map((_, rIdx) => {
          const roundSets = A.entries.map((e, eIdx) => ({ entry: e, eIdx, set: e.sets[rIdx], sIdx: rIdx })).filter(x => x.set)
          const roundDone = roundSets.filter(x => x.set.done).length
          const isComplete = roundDone === roundSets.length

          return <div key={rIdx} className="set-overview-item" style={{ borderColor: isComplete ? 'var(--acc)' : undefined }}>
            <div className="row between" style={{ alignItems: 'center', marginBottom: 8 }}>
              <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                <span className={'round-badge ' + (roundDone > 0 && !isComplete ? 'active' : '')}>
                  <Icon name="bolt" style={{ fontSize: 12 }} /> {t('Round {0}', rIdx + 1)}
                </span>
                {isComplete && <span className="tag acc small">{t('Complete ✓')}</span>}
              </div>
              <span className="small muted">{roundDone}/{roundSets.length} {t('done')}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {roundSets.map(({ entry, eIdx, set, sIdx }) => {
                const ex = exOr(entry.id)
                const isWorking = A.cur === eIdx && (entry.activeSetIdx === sIdx || (entry.activeSetIdx === undefined && sIdx === entry.sets.findIndex(x => !x.done)))
                const desc = set.min !== undefined ? `${set.min} min` : set.sec !== undefined ? `${set.sec} sec` : `${set.w ? set.w + ' ' + S.unit + ' × ' : ''}${set.r} reps`

                return <div key={eIdx}
                  onClick={() => jumpToSet(eIdx, sIdx)}
                  className="row between"
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: set.done ? 'var(--surface-3)' : isWorking ? 'color-mix(in srgb, var(--acc) 12%, var(--surface))' : 'var(--surface)',
                    border: isWorking ? '1px solid var(--acc)' : '1px solid var(--sep)',
                    cursor: 'pointer',
                    alignItems: 'center'
                  }}>
                  <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                    <Check checked={set.done} onChange={() => toggleDone(eIdx, sIdx)} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>{t(ex.n)}</div>
                      <div className="small dim">{desc} {set.tag ? `(${set.tag})` : ''}</div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 4 }}>
                    <button type="button" className="iconbtn" style={{ width: 28, height: 28, fontSize: 12 }}
                      onClick={ev => { ev.stopPropagation(); openChange(eIdx, sIdx) }} title={t('Change set')}>
                      <Icon name="pencil" />
                    </button>
                    {isWorking && <span className="tag acc small">{t('Working')}</span>}
                  </div>
                </div>
              })}
            </div>
          </div>
        })}
      </div>
    )}
    <div style={{ height: 14 }} />
    <Button variant="tinted" icon="shuffle" onClick={() => { close(); switchTrainingSheet() }}>
      {t('Change training / Switch workout')}
    </Button>
  </div>
}

/* ---------- elapsed clock (isolated so the workout tree doesn't re-render every second) ---------- */
function Elapsed({ start }) {
  const [t, setT] = useState('0:00')
  useEffect(() => {
    const tick = () => { const s = Math.floor((Date.now() - start) / 1000); setT(Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')) }
    tick(); const iv = setInterval(tick, 1000); return () => clearInterval(iv)
  }, [start])
  return <span>{t}</span>
}

/* ---------- one exercise block (reps: weight×reps · time: a held duration · cardio: duration+speed) ---------- */
function ExerciseBlock({ entryIdx, compact, onToggle, onField, onAddSet, onRemoveSet, onStartTimed, onChangeSet, onChangeExercise }) {
  const S = useStore(s => s.S)
  const working = useUI(s => s.work)
  const entry = S.active.entries[entryIdx]
  const ex = exOr(entry.id)
  const mode = modeOf({ ...(entry.target || {}), id: entry.id })
  const cardio = mode === 'cardio'
  const timed = mode === 'time'
  const last = lastEntryFor(S, entry.id)
  // The same number the "confirm your working weight" sheet calls your best, so the two
  // never disagree inside one session: heaviest logged set, or the working weight you kept.
  const best = cardio ? 0 : Math.max(bestWeightFor(S, entry.id), (S.exWeights[entry.id] || {}).w || 0)
  // What the progression policy decided for this session, and why (issue #17). Computed when
  // the session was built so the reason matches the numbers already in the rows.
  const plan = entry.plan
  const col1 = cardio ? { f: 'min', step: 1, dec: false, hd: t('Duration (min)') }
    : timed ? { f: 'sec', step: 5, dec: false, hd: t('Seconds') }
      : { f: 'w', step: 2.5, dec: true, hd: t('Weight ({0})', S.unit) }
  const col2 = cardio ? { f: 'speed', step: 0.5, dec: true, hd: t('Speed (km/h)') }
    : timed ? { f: 'w', step: 2.5, dec: true, hd: t('Weight ({0})', S.unit) }
      : { f: 'r', step: 1, dec: false, hd: t('Reps') }
  // Effort (RIR or RPE, whichever the profile logs) only makes sense for weighted rep sets,
  // not cardio/timed holds, and is opt-in since it adds a third stepper to every row. `opt`
  // because an unlogged effort is not the same as 0 — RIR 0 says the set went to failure.
  const kind = effortOf(S)
  const eff = EFFORT[kind]
  const col3 = mode === 'reps' && eff ? { ...eff, eff: kind, dec: true, opt: true, hd: t(eff.hd) } : null

  const workingSetIdx = entry.activeSetIdx !== undefined
    ? Math.min(entry.activeSetIdx, entry.sets.length - 1)
    : Math.max(0, entry.sets.findIndex(s => !s.done))

  // The effort column walks its own scale — see stepEffort. Weight and reps step up from 0
  // with no ceiling, as they always did.
  const bump = (s, i, col, dir) => {
    if (col.eff) return onField(i, col.f, stepEffort(col.eff, s[col.f], dir))
    onField(i, col.f, Math.max(0, Math.round(((s[col.f] || 0) + dir * col.step) * 100) / 100))
  }
  // Uses the shared stepper markup so a set row picks up the same control styling
  // as every other +/- field in the app.
  const cell = (s, i, col, cls) => (
    <div className={'stp ' + cls}>
      <button aria-label="Decrease" onClick={() => bump(s, i, col, -1)}><Icon name="minus" /></button>
      {/* a typed effort is capped — there is no RPE 12, and 12 reps in reserve is a warm-up */}
      <span className="val"><NumberField decimal={col.dec} nullable={col.opt} value={s[col.f] ?? ''}
        onChange={v => onField(i, col.f, col.eff ? capEffort(col.eff, v) : v)} /></span>
      <button aria-label="Increase" onClick={() => bump(s, i, col, 1)}><Icon name="plus" /></button>
    </div>
  )
  return <>
    <Media ex={ex} key={entry.id} compact={compact} minimizable />
    <div className="row between" style={{ marginBottom: 6, alignItems: 'center' }}>
      <div style={{ fontSize: compact ? 17 : 20, fontWeight: 600, letterSpacing: '-.02em', textTransform: 'capitalize', lineHeight: 1.2 }}>{t(ex.n)}</div>
      <div className="row" style={{ gap: 6, alignItems: 'center' }}>
        <button type="button" className="btn-swap-ex" onClick={() => onChangeExercise && onChangeExercise(entryIdx)} title={t('Change / Swap exercise')}>
          <Icon name="shuffle" style={{ fontSize: 12 }} />
          <span>{t('Change')}</span>
        </button>
        <button className="iconbtn" aria-label={t('Details')} onClick={() => exerciseDetailSheet(ex)}><Icon name="info" /></button>
      </div>
    </div>
    <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
      {cardio && <span className="tag acc"><Icon name="figureRun" />{t('Cardio')}</span>}
      {(ex.tg || ex.bp) && <span className="tag">{t(ex.tg || ex.bp)}</span>}
      {ex.eq && <span className="tag">{t(ex.eq)}</span>}
      {best > 0 && <span className="tag nocap">{t('Best:')} {fmtNum(best)} {S.unit}</span>}
    </div>
    {last && <div className="small dim" style={{ marginBottom: 4 }}>{t('Last time')} ({fmtDate(last.d)}): {last.sets.map(s => setLabel(entry.id, s, last.target)).join(', ')}</div>}
    
    {/* Technique Cues / Exercise Note Banner */}
    {S.exNotes?.[entry.id] ? (
      <div className="ex-note-banner">
        <Icon name="sparkles" style={{ color: 'var(--acc)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, fontSize: 13 }}>{S.exNotes[entry.id]}</div>
        <button
          type="button"
          className="iconbtn"
          style={{ width: 22, height: 22, padding: 0 }}
          onClick={() => exerciseNoteSheet(entry.id)}
          title={t('Edit technique cue')}
        >
          <Icon name="pencil" style={{ fontSize: 11 }} />
        </button>
      </div>
    ) : (
      <button
        type="button"
        className="row"
        style={{ gap: 4, background: 'none', border: 'none', padding: '2px 0 6px', color: 'var(--label-3)', fontSize: 12, cursor: 'pointer' }}
        onClick={() => exerciseNoteSheet(entry.id)}
      >
        <Icon name="plus" style={{ fontSize: 11 }} />
        <span>{t('Add technique cue / note')}</span>
      </button>
    )}
    {plan && plan.why && plan.kind !== 'off' && <div className={'progline' + (plan.kind === 'deload' ? ' warn' : '')}>
      <Icon name={plan.kind === 'up' ? 'arrowUp' : plan.kind === 'deload' ? 'arrowDown' : 'lightbulb'} />
      <span>{t(...plan.why)}</span>
    </div>}

    {/* Working set indicator banner */}
    <div className="ws-bar">
      <div className="ws-pill">
        <span className="ws-dot" />
        <span>{t('Set {0} of {1} · Working', workingSetIdx + 1, entry.sets.length)}</span>
        {entry.sets[workingSetIdx]?.tag && (
          <span className="tag small" style={{ marginLeft: 4 }}>
            {entry.sets[workingSetIdx].tag === 'W' ? t('Warm-up') : entry.sets[workingSetIdx].tag === 'D' ? t('Drop') : t('Failure')}
          </span>
        )}
      </div>
      <button type="button" className="btn-ws-change" onClick={() => onChangeSet?.(workingSetIdx)}>
        <Icon name="pencil" style={{ fontSize: 13 }} />
        <span>{t('Change set')}</span>
      </button>
    </div>

    <div className="card" style={{ marginTop: 0, marginBottom: 0 }}>
      {/* the header carries the same eff3 sizing as the rows, or the labels drift off their columns */}
      <div className={'sethead' + (col3 ? ' eff3' : '')}><span className="n-sp" /><span className="w-sp">{col1.hd}</span><span className="r-sp">{col2.hd}</span>{col3 && <span className="eff-sp">{col3.hd}</span>}{timed && <span className="ck-sp" />}<span className="ck-sp" /></div>
      {entry.sets.map((s, i) => {
        const isWorking = i === workingSetIdx && !s.done
        const tagClass = s.tag === 'W' ? ' tag-w' : s.tag === 'D' ? ' tag-d' : s.tag === 'F' ? ' tag-f' : (isWorking ? ' working' : '')
        const tagLabel = s.tag === 'W' ? 'W' : s.tag === 'D' ? 'D' : s.tag === 'F' ? 'F' : (i + 1)
        return <div key={i} className={'setrow' + (s.done ? ' done' : '') + (isWorking ? ' is-working' : '') + (col3 ? ' eff3' : '')}>
          <button type="button" className={'n' + tagClass} onClick={() => onChangeSet?.(i)} title={t('Set {0} · Tap to change set', i + 1)} aria-label={t('Set {0}', i + 1)}>
            {tagLabel}
          </button>
          {cell(s, i, col1, 'w')}
          {cell(s, i, col2, 'r')}
          {col3 && cell(s, i, col3, 'eff')}
          {/* A timed set is started, not typed: the timer counts the hold down and checks the
              set off itself. The checkbox stays for anyone who timed it on their own watch. */}
          {timed && <button className="setgo" aria-label={t('Start set')} disabled={s.done || !!working}
            onClick={() => onStartTimed(i)}><Icon name="play" /></button>}
          <Check checked={s.done} onChange={() => onToggle(i)} />
        </div>
      })}
      <div style={{ height: 8 }} />
      <div className="row">
        <Button size="sm" icon="minus" disabled={entry.sets.length <= 1} onClick={onRemoveSet}>{t('Remove set')}</Button>
        <Button size="sm" icon="plus" onClick={onAddSet}>{t('Add set')}</Button>
      </div>
    </div>
  </>
}

/* ---------- active workout ---------- */
function ActiveWorkout() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const { startRest, stopRest } = useUI()
  const A = S.active
  const units = supersetUnits(A.entries)
  const cur = Math.min(A.cur, Math.max(0, A.entries.length - 1))
  const unit = A.entries.length ? unitOf(units, cur) : []
  const unitIdx = units.findIndex(u => u === unit)
  const isSuperset = unit.length > 1

  const total = A.entries.reduce((n, e) => n + e.sets.length, 0)
  const done = setsDoneActive(A)

  const currentRound = (() => {
    if (!A || !A.entries.length) return 1
    const maxS = Math.max(...A.entries.map(e => e.sets.length), 1)
    for (let r = 0; r < maxS; r++) {
      if (A.entries.some(e => e.sets[r] && !e.sets[r].done)) return r + 1
    }
    return maxS
  })()

  const mutEntry = (idx, fn) => update(s => { fn(s.active.entries[idx]) }, true)
  // Clearing an optional field drops the key rather than storing null, so a set only carries
  // what was actually logged — in the session, in history and in a backup.
  const setField = (idx, i, field, v) => mutEntry(idx, e => {
    if (v == null) delete e.sets[i][field]; else e.sets[i][field] = v
  })
  const modeAt = idx => modeOf({ ...(A.entries[idx].target || {}), id: A.entries[idx].id })
  const addSet = idx => mutEntry(idx, e => {
    const l = e.sets[e.sets.length - 1]
    const m = modeOf({ ...(e.target || {}), id: e.id })
    if (m === 'cardio') e.sets.push({ min: l ? l.min : (e.target.min || 20), speed: l ? l.speed : (e.target.speed || 8), done: false })
    else if (m === 'time') e.sets.push({ sec: l ? l.sec : (e.target.sec || 45), w: l ? (l.w || 0) : (e.target.weight || 0), done: false })
    else e.sets.push({ w: l ? l.w : 0, r: l ? l.r : e.target.reps, done: false })
  })
  const removeSet = idx => mutEntry(idx, e => { if (e.sets.length > 1) e.sets.pop() })

  // A timed set is held, not typed. The work timer records what was actually held — an early
  // finish logs 0:38 of a 0:45 target rather than crediting the full prescription — and then
  // checks the set off through the normal path, so rest, supersets and the finish prompt all
  // behave exactly as they do for a reps set.
  const startTimed = (idx, i) => {
    const e = A.entries[idx]
    useUI.getState().startWork(e.sets[i].sec || 45, exOr(e.id).n, elapsed => {
      mutEntry(idx, en => { en.sets[i].sec = elapsed })
      if (!useStore.getState().S.active.entries[idx].sets[i].done) toggle(idx, i)
    })
  }

  const toggle = (idx, i) => {
    const m = modeAt(idx)
    const cardioEntry = m === 'cardio'
    const isLastUnit = unitIdx >= units.length - 1
    let askTop = false, exJustDone = false, workoutDone = false
    mutEntry(idx, e => {
      e.sets[i].done = !e.sets[i].done
      if (e.sets[i].done) {
        beep(S.sound, 1040, 0.12); vibrate(30)
        const nextIncomplete = e.sets.findIndex((x, sIdx) => sIdx > i && !x.done)
        if (nextIncomplete !== -1) e.activeSetIdx = nextIncomplete
        else delete e.activeSetIdx

        const isLastExInUnit = idx === unit[unit.length - 1]
        const unitDone = unit.every(ui => (ui === idx ? e : A.entries[ui]).sets.every(x => x.done))
        if (isLastExInUnit && !unitDone) startRest(S.restSec)
        else if (unitDone) stopRest()
        if (unitDone && isLastUnit) workoutDone = true      // last exercise's last set → done
        // Only reps training has a "working weight" worth confirming — a bodyweight plank
        // has nothing to put in that slider.
        if (e.sets.every(x => x.done)) { exJustDone = true; if (m === 'reps' && !e.asked) { e.asked = true; askTop = true } }
      } else {
        e.activeSetIdx = i
      }
    })
    // reps: topWeight first (it chains into the finish/continue prompt on the last unit).
    // cardio/timed or already-confirmed: go straight to the prompt.
    if (askTop) topWeightSheet(idx)
    else if (workoutDone) workoutCompleteSheet()
    else if (exJustDone && cardioEntry) useUI.getState().toast(t('Cardio logged'))
    else if (exJustDone && m === 'time') useUI.getState().toast(t('Hold logged'))
  }

  const handleSwapExercise = entryIdx => {
    const entry = A.entries[entryIdx]
    if (!entry) return
    const curEx = exOr(entry.id)
    changeExerciseSheet(curEx, newEx => {
      update(s => {
        const ent = s.active?.entries[entryIdx]
        if (!ent) return
        ent.id = newEx.id
        ent.target = { ...(ent.target || {}), id: newEx.id }
        const r = s.routines.find(x => x.id === s.active.routineId)
        ent.plan = nextPrescription(s, { ...ent.target, id: newEx.id }, r)
      })
      useUI.getState().toast(t('Swapped to {0}', newEx.n))
    })
  }

  // Live-presence heartbeat so the admin dashboard can show who's training now. Signed-in only —
  // guests have no server session. Reads fresh state each tick so progress stays current.
  useEffect(() => {
    if (!useStore.getState().user) return
    let stopped = false
    const ping = active => {
      const A2 = useStore.getState().S.active
      if (!A2) return
      const u = supersetUnits(A2.entries)
      const c = Math.min(A2.cur, Math.max(0, A2.entries.length - 1))
      const ui = u.findIndex(x => x.includes(c))
      const tot = A2.entries.reduce((n, e) => n + e.sets.length, 0)
      api('/api/activity', { method: 'POST', body: JSON.stringify({
        active, name: A2.name, exIdx: ui + 1, exTotal: u.length,
        setsDone: setsDoneActive(A2), setsTotal: tot, startedAt: A2.start
      }) }).catch(() => {})
    }
    ping(true)
    const iv = setInterval(() => { if (!stopped) ping(true) }, 20000)
    return () => {
      stopped = true; clearInterval(iv)
      // best-effort "left" signal: sendBeacon survives a tab close, fetch covers in-app nav
      try { navigator.sendBeacon?.('/api/activity', new Blob([JSON.stringify({ active: false })], { type: 'application/json' })) } catch { /* */ }
      api('/api/activity', { method: 'POST', body: JSON.stringify({ active: false }) }).catch(() => {})
    }
  }, [])

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" aria-label={t('Discard')} onClick={() => confirmSheet({ title: t('Discard workout?'), message: t('The sets you logged in this session will be lost.'), confirmText: t('Discard'), danger: true, onConfirm: () => { update(s => { s.active = null }); stopRest(); nav('/home') } })}><Icon name="xmark" /></button>
      <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 600 }}>{A.name}</div><div className="sub"><Elapsed start={A.start} /> · {t('{0} sets', done + '/' + total)}</div></div>
      <button className="iconbtn" style={{ color: 'var(--acc)' }} aria-label={t('Finish')} onClick={finishWorkout}><Icon name="check" /></button>
    </div>
    <div className="wprog"><i style={{ width: (total ? done / total * 100 : 0) + '%' }} /></div>

    {A.entries.length ? <>
      <div className="row between" style={{ alignItems: 'center', marginTop: 8, marginBottom: 8, gap: 6, flexWrap: 'wrap' }}>
        <div className="muted small" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {A.isFreeletics && <span className="fl-badge" style={{ margin: 0 }}><Icon name="bolt" /> Hero Rounds</span>}
          <span>{isSuperset ? t('Superset {0} / {1}', unitIdx + 1, units.length) : t('Exercise {0} / {1}', unitIdx + 1, units.length)}</span>
          {A.isFreeletics && <span className="round-badge active">{t('Round {0}', currentRound)}</span>}
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button type="button" className="set-chip-btn" onClick={() => switchTrainingSheet()} title={t('Change training')}>
            <Icon name="shuffle" />
            <span>{t('Change training')}</span>
          </button>
          <button type="button" className="set-chip-btn" onClick={() => useUI.getState().openSheet(cl => <WorkingSetsSheet close={cl} />)}>
            <Icon name="list" />
            <span>{t('Show sets & change')}</span>
          </button>
        </div>
      </div>
      {isSuperset ? (
        <div className="ss-card">
          <div className="ss-hd"><Icon name="link" />{t('Superset · do these back-to-back, rest after both')}</div>
          {unit.map((idx, k) => <div key={idx} className="ss-ex">
            {k > 0 && <div className="ss-amp">+</div>}
            <ExerciseBlock entryIdx={idx} compact
              onToggle={i => toggle(idx, i)} onField={(i, f, v) => setField(idx, i, f, v)} onAddSet={() => addSet(idx)} onRemoveSet={() => removeSet(idx)} onStartTimed={i => startTimed(idx, i)}
              onChangeSet={i => useUI.getState().openSheet(cl => <ChangeSetSheet entryIdx={idx} setIdx={i} close={cl} />)}
              onChangeExercise={handleSwapExercise} />
          </div>)}
        </div>
      ) : (
        <ExerciseBlock entryIdx={cur} onToggle={i => toggle(cur, i)} onField={(i, f, v) => setField(cur, i, f, v)} onAddSet={() => addSet(cur)} onRemoveSet={() => removeSet(cur)} onStartTimed={i => startTimed(cur, i)}
          onChangeSet={i => useUI.getState().openSheet(cl => <ChangeSetSheet entryIdx={cur} setIdx={i} close={cl} />)}
          onChangeExercise={handleSwapExercise} />
      )}
    </> : <div className="empty"><div className="ico"><Icon name="shuffle" /></div>{t('Freestyle workout — add your first exercise.')}</div>}

    <div style={{ height: 12 }} />
    <div className="row">
      <Button icon="chevronLeft" disabled={unitIdx <= 0} onClick={() => update(s => { s.active.cur = units[unitIdx - 1][0] })}>{t('Prev')}</Button>
      <Button trailingIcon="chevronRight" disabled={unitIdx < 0 || unitIdx >= units.length - 1} onClick={() => update(s => { s.active.cur = units[unitIdx + 1][0] })}>{t('Next')}</Button>
    </div>
    <div style={{ height: 10 }} />
    <Button onClick={() => exercisePicker(ex => exConfigSheet(ex, null, cfg => update(s => {
      const full = { ...cfg, id: ex.id }
      const plan = nextPrescription(s, full, s.routines.find(r => r.id === s.active.routineId))
      s.active.entries.push({ id: ex.id, target: { ...cfg }, plan, sets: applyPrescription(buildSets(s, full), plan) })
      s.active.cur = s.active.entries.length - 1
    }), null, S.routines.find(r => r.id === A.routineId)))} icon="plus">{t('Add exercise')}</Button>
    <div style={{ height: 10 }} />
    {(() => {
      const exDone = A.entries.filter(e => e.sets.length && e.sets.every(s => s.done)).length
      const allDone = A.entries.length > 0 && exDone === A.entries.length
      return <button className={allDone ? 'btn primary' : 'btn ghost dim'} onClick={finishWorkout}>
        {allDone ? t('Finish workout') : t('Finish workout early · {0} exercises', exDone + '/' + A.entries.length)}
      </button>
    })()}
    <div style={{ height: 40 }} />
  </div>
}

export default function Workout() {
  const active = useStore(s => s.S.active)
  return active ? <ActiveWorkout /> : <StartChooser />
}
