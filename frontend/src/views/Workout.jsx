import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { exOr } from '../lib/exercises.js'
import { effectiveRoutine, lastEntryFor, bestWeightFor, buildSets, setsDoneActive, supersetUnits, unitOf, setLabel, modeOf, fmtSec, EFFORT, effortOf, stepEffort, capEffort } from '../lib/history.js'
import { fmtNum, fmtDate, todayISO, exCount, DAYN } from '../lib/format.js'
import { beep, vibrate, hapticClick, hapticSetComplete } from '../lib/sound.js'
import { t } from '../lib/i18n.js'
import { api } from '../lib/api.js'
import Media from '../components/Media.jsx'
import { startFlow, startFreeleticsFlow, exercisePicker, exConfigSheet, exerciseDetailSheet, topWeightSheet, finishWorkout, workoutCompleteSheet, confirmSheet, changeExerciseSheet, quickSwapSheet, showProgramSheet, switchTrainingSheet, exerciseNoteSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button, Check, NumberField, Segmented, TextField } from '../components/ui.jsx'
import { skipWorkoutPhase } from '../lib/workout-phases.js'
import { nextPrescription, applyPrescription } from '../lib/progression.js'
import { glyphOf } from '../lib/glyphs.js'
import { FREELETICS_SPEC } from '../lib/starter.js'
import { startPeriodicAutoSave, subscribeAutoSave, clearActiveSessionBackup } from '../lib/autosave.js'
import { HeaderSyncInline } from '../components/HeaderSync.jsx'

/* ---------- start chooser (no active workout) ---------- */
function StartChooser() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const todayR = effectiveRoutine(S, todayISO())
  const todayOvr = S.dayPlan[todayISO()] !== undefined
  const others = S.routines.filter(r => r !== todayR)
  return <div className="narrow training-home training-start">
    <div className="hdr">
      <div>
        <h1>{t('Start workout')}</h1>
        <div className="sub">{t(DAYN[new Date().getDay()])} — {todayR ? t('today is {0}', todayR.name) : t('rest day, but no one’s stopping you')}</div>
      </div>
    </div>

    {todayR && <div className="card hero-workout-card" style={{ borderColor: 'var(--acc)' }}>
      <h2 className="accent">{t("Today's plan")}{todayOvr ? ' · ' + t('rescheduled') : ''}</h2>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div><div className="big">{todayR.name}</div><div className="muted small">{exCount(todayR.ex.length)}</div></div>
        <span className="lrow-i" style={{ width: 38, height: 38, borderRadius: 9, fontSize: 22 }}><Icon name={glyphOf(todayR.emoji)} /></span>
      </div>
      <Button variant="primary" icon="play" onClick={() => startFlow(todayR.id)}>{t('Start {0}', todayR.name)}</Button>
    </div>}

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

    <details className="training-alternatives" open={!todayR}>
      <summary>{t('Choose another workout')}</summary>
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

    {others.length > 0 && <>
      <h4 className="sec">{t('Other routines')}</h4>
      <div className="workout-grid">
        {others.map(r => (
          <button
            key={r.id}
            type="button"
            className="workout-grid-card"
            onClick={() => startFlow(r.id)}
          >
            <div className="workout-grid-top">
              <span className="lrow-i"><Icon name={glyphOf(r.emoji)} /></span>
              <span className="tag acc" style={{ fontSize: 11, padding: '2px 7px' }}>{t('Start')}</span>
            </div>
            <div>
              <div className="workout-grid-name">{r.name}</div>
              <div className="workout-grid-meta">{exCount(r.ex.length)}</div>
            </div>
          </button>
        ))}
      </div>
    </>}
    <div style={{ height: 14 }} />
    <Button icon="shuffle" onClick={() => startFlow(null)}>{t('Freestyle workout (pick as you go)')}</Button>
    </details>
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
  const isBW = ex.eq === 'body weight' || entry.target?.bodyweight || entry.noWeight
  const setsHaveWeight = entry.sets.some(x => x.w > 0)
  const hasWeight = !cardio && (entry.noWeight ? false : (entry.hasWeight ? true : (isBW ? setsHaveWeight : (entry.target?.weight !== 0 || setsHaveWeight))))
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
      <div className="row between" style={{ alignItems: 'center', marginBottom: 10 }}>
        <div className="small muted" style={{ fontWeight: 600, textTransform: 'uppercase' }}>{t('Set Values')}</div>
        {!cardio && (
          <button
            type="button"
            className={'tag small ' + (hasWeight ? '' : 'acc')}
            style={{ cursor: 'pointer', border: hasWeight ? '1px dashed var(--sep)' : '1px solid var(--acc)' }}
            onClick={() => update(st => {
              const e = st.active.entries[entryIdx]
              if (!e) return
              if (hasWeight) {
                e.noWeight = true
                delete e.hasWeight
                e.sets.forEach(x => { delete x.w })
              } else {
                delete e.noWeight
                e.hasWeight = true
                e.sets.forEach(x => { x.w = x.w ?? 0 })
              }
            })}
          >
            <Icon name={hasWeight ? 'xmark' : 'plus'} size={10} style={{ marginRight: 3 }} />
            {hasWeight ? t('No weight') : t('Add weight')}
          </button>
        )}
      </div>
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
          {hasWeight && (
            <div style={{ flex: 1 }}>
              <div className="small dim" style={{ marginBottom: 4 }}>{t('Weight ({0})', S.unit)}</div>
              <div className="stp">
                <button type="button" onClick={() => mut(x => { x.w = Math.max(0, Math.round(((x.w || 0) - 2.5) * 10) / 10) })}><Icon name="minus" /></button>
                <span className="val"><NumberField decimal value={s.w ?? 0} onChange={v => mut(x => { x.w = v })} /></span>
                <button type="button" onClick={() => mut(x => { x.w = Math.round(((x.w || 0) + 2.5) * 10) / 10 })}><Icon name="plus" /></button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="row" style={{ gap: 12 }}>
          {hasWeight && (
            <div style={{ flex: 1 }}>
              <div className="small dim" style={{ marginBottom: 4 }}>{t('Weight ({0})', S.unit)}</div>
              <div className="stp">
                <button type="button" onClick={() => mut(x => { x.w = Math.max(0, Math.round(((x.w || 0) - 2.5) * 10) / 10) })}><Icon name="minus" /></button>
                <span className="val"><NumberField decimal value={s.w ?? 0} onChange={v => mut(x => { x.w = v })} /></span>
                <button type="button" onClick={() => mut(x => { x.w = Math.round(((x.w || 0) + 2.5) * 10) / 10 })}><Icon name="plus" /></button>
              </div>
            </div>
          )}
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

    {/* Set Cue / Note */}
    <div className="card" style={{ padding: 12, marginBottom: 16 }}>
      <div className="row between" style={{ alignItems: 'center', marginBottom: 8 }}>
        <div className="small muted" style={{ fontWeight: 600, textTransform: 'uppercase' }}>{t('Set Cue / Note')}</div>
        {s.note && (
          <button
            type="button"
            className="tag small"
            style={{ cursor: 'pointer', color: 'var(--red)', border: 'none', background: 'none', padding: 0 }}
            onClick={() => mut(x => { delete x.note })}
          >
            {t('Clear')}
          </button>
        )}
      </div>
      <TextField
        value={s.note || ''}
        onChange={e => mut(x => {
          const v = e.target.value
          if (v && v.trim()) x.note = v; else delete x.note
        })}
        placeholder={t('e.g. Pause 1s at bottom, smooth lockout, elbows tucked...')}
        maxLength={120}
      />
      <div className="small dim" style={{ marginTop: 6, lineHeight: 1.4 }}>{t('Track specific cues, adjustments or sensations directly on this set.')}</div>
    </div>

    {/* Quick actions */}
    <div className="row" style={{ gap: 8, marginBottom: 12 }}>
      <Button icon="play" onClick={() => mut(x => {
        x.done = !x.done
        if (x.done) {
          beep(S.sound, 1040, 0.12)
          hapticSetComplete('set')
        }
      })}>
        {s.done ? t('Mark as not done') : t('Mark as completed')}
      </Button>
      <Button icon="plus" onClick={duplicateSet}>{t('Duplicate set')}</Button>
    </div>

    <div style={{ marginBottom: 12 }}>
      <Button variant="tinted" icon="shuffle" onClick={() => {
        close()
        quickSwapSheet(ex, entry, newEx => {
          update(st => {
            const ent = st.active?.entries[entryIdx]
            if (!ent) return
            ent.id = newEx.id
            ent.target = { ...(ent.target || {}), id: newEx.id }
            const r = st.routines?.find(x => x.id === st.active.routineId)
            ent.plan = nextPrescription(st, { ...ent.target, id: newEx.id }, r)
          })
          useUI.getState().toast(t('Swapped to {0} · Set progress kept', t(newEx.n)))
        })
      }}>
        {t('Quick swap exercise (same muscle)')}
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
      if (s) {
        s.done = !s.done
        if (s.done) {
          beep(st.sound, 1040, 0.12)
          hapticSetComplete('set')
        }
      }
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
                <button type="button" className="btn-swap-ex btn-quick-swap" onClick={() => {
                  close()
                  quickSwapSheet(ex, entry, newEx => {
                    update(st => {
                      const ent = st.active?.entries[eIdx]
                      if (!ent) return
                      ent.id = newEx.id
                      ent.target = { ...(ent.target || {}), id: newEx.id }
                      const r = st.routines?.find(x => x.id === st.active.routineId)
                      ent.plan = nextPrescription(st, { ...ent.target, id: newEx.id }, r)
                    })
                    useUI.getState().toast(t('Swapped to {0} · Set progress kept', t(newEx.n)))
                  })
                }} title={t('Quick swap with another {0} exercise', t(ex.tg || ex.bp || 'muscle'))}>
                  <Icon name="shuffle" style={{ fontSize: 11 }} />
                  <span>{t('Quick swap')}</span>
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
                  {s.note && <span className="small accent" style={{ fontSize: 11, fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: 3, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.note}><Icon name="pencil" size={9} />{s.note}</span>}
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
                      {set.note && <div className="small accent" style={{ fontSize: 11, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                        <Icon name="pencil" size={9} /><span>{set.note}</span>
                      </div>}
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
function Elapsed({ start, label, showIcon = false }) {
  const [timeStr, setTimeStr] = useState('0:00')
  useEffect(() => {
    const tick = () => {
      const sTime = typeof start === 'number' ? start : (start ? new Date(start).getTime() : Date.now())
      const totalSec = Math.max(0, Math.floor((Date.now() - sTime) / 1000))
      const hrs = Math.floor(totalSec / 3600)
      const mins = Math.floor((totalSec % 3600) / 60)
      const secs = totalSec % 60
      const pad = n => String(n).padStart(2, '0')
      if (hrs > 0) {
        setTimeStr(`${hrs}:${pad(mins)}:${pad(secs)}`)
      } else {
        setTimeStr(`${mins}:${pad(secs)}`)
      }
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [start])

  if (label) {
    return (
      <span className="active-duration-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {showIcon && <Icon name="timer" style={{ width: 13, height: 13 }} />}
        <span>{label}:</span>
        <b style={{ fontVariantNumeric: 'tabular-nums' }}>{timeStr}</b>
      </span>
    )
  }

  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{timeStr}</span>
}

/* ---------- one exercise block (reps: weight×reps · time: a held duration · cardio: duration+speed) ---------- */
function ExerciseBlock({ entryIdx, compact, onToggle, onField, onAddSet, onRemoveSet, onStartTimed, onChangeSet, onChangeExercise, onQuickSwap, onToggleWeight }) {
  const S = useStore(s => s.S)
  const working = useUI(s => s.work)
  const resting = useUI(s => s.timer)
  const entry = S.active.entries[entryIdx]
  const ex = exOr(entry.id)
  const mode = modeOf({ ...(entry.target || {}), id: entry.id })
  const cardio = mode === 'cardio'
  const timed = mode === 'time'
  const last = lastEntryFor(S, entry.id)

  const [editingNoteIdx, setEditingNoteIdx] = useState(null)
  const [noteText, setNoteText] = useState('')

  useEffect(() => {
    setEditingNoteIdx(null)
    setNoteText('')
  }, [entryIdx])

  const handleStartEditNote = (idx, currentNote) => {
    setEditingNoteIdx(idx)
    setNoteText(currentNote || '')
  }

  const handleSaveNote = idx => {
    const trimmed = (noteText || '').trim()
    onField(idx, 'note', trimmed || null)
    setEditingNoteIdx(null)
    setNoteText('')
  }

  const handleDeleteNote = idx => {
    onField(idx, 'note', null)
    setEditingNoteIdx(null)
    setNoteText('')
  }

  const handleCancelNote = () => {
    setEditingNoteIdx(null)
    setNoteText('')
  }

  // Weight visibility:
  // If an exercise has no weight (bodyweight equipment without positive weight, or entry.noWeight is true,
  // or all sets have no weight / 0 weight and user removed weight), remove the weight column entirely!
  const isBW = ex.eq === 'body weight' || entry.target?.bodyweight || entry.noWeight
  const setsHaveWeight = entry.sets.some(s => s.w > 0)
  const hasWeight = !cardio && (entry.noWeight ? false : (entry.hasWeight ? true : (isBW ? setsHaveWeight : (entry.target?.weight !== 0 || setsHaveWeight))))

  // The same number the "confirm your working weight" sheet calls your best, so the two
  // never disagree inside one session: heaviest logged set, or the working weight you kept.
  const best = cardio || !hasWeight ? 0 : Math.max(bestWeightFor(S, entry.id), (S.exWeights[entry.id] || {}).w || 0)
  const maxDone = Math.max(0, ...entry.sets.filter(s => s.done).map(s => Number(s.w) || 0))
  const isNewPR = hasWeight && best > 0 && maxDone > best
  // What the progression policy decided for this session, and why (issue #17). Computed when
  // the session was built so the reason matches the numbers already in the rows.
  const plan = entry.plan

  let col1, col2, col3
  if (cardio) {
    col1 = { f: 'min', step: 1, dec: false, hd: t('Duration (min)') }
    col2 = { f: 'speed', step: 0.5, dec: true, hd: t('Speed (km/h)') }
    col3 = null
  } else if (timed) {
    col1 = { f: 'sec', step: 5, dec: false, hd: t('Seconds') }
    col2 = hasWeight ? { f: 'w', step: 2.5, dec: true, hd: t('Weight ({0})', S.unit) } : null
    col3 = null
  } else {
    // reps mode
    const kind = effortOf(S)
    const eff = EFFORT[kind]
    const colEff = eff ? { ...eff, eff: kind, dec: true, opt: true, hd: t(eff.hd) } : null

    if (hasWeight) {
      col1 = { f: 'w', step: 2.5, dec: true, hd: t('Weight ({0})', S.unit) }
      col2 = { f: 'r', step: 1, dec: false, hd: t('Reps') }
      col3 = colEff
    } else {
      // Bodyweight / reps only: remove weight column entirely!
      col1 = { f: 'r', step: 1, dec: false, hd: t('Reps') }
      col2 = null
      col3 = colEff
    }
  }

  const isEff3 = !!(col1 && col2 && col3)

  const workingSetIdx = entry.activeSetIdx !== undefined
    ? Math.min(entry.activeSetIdx, entry.sets.length - 1)
    : Math.max(0, entry.sets.findIndex(s => !s.done))

  // The effort column walks its own scale — see stepEffort. Weight and reps step up from 0
  // with no ceiling, as they always did.
  const bump = (s, i, col, dir) => {
    if (!col) return
    if (col.eff) return onField(i, col.f, stepEffort(col.eff, s[col.f], dir))
    onField(i, col.f, Math.max(0, Math.round(((s[col.f] || 0) + dir * col.step) * 100) / 100))
  }
  // Uses the shared stepper markup so a set row picks up the same control styling
  // as every other +/- field in the app.
  const cell = (s, i, col, cls) => {
    if (!col) return null
    return (
      <div className={'stp ' + cls} data-label={col.hd}>
        <button type="button" aria-label="Decrease" onClick={() => bump(s, i, col, -1)}><Icon name="minus" /></button>
        {/* a typed effort is capped — there is no RPE 12, and 12 reps in reserve is a warm-up */}
        <span className="val"><NumberField aria-label={col.hd} decimal={col.dec} nullable={col.opt} value={s[col.f] ?? ''}
          onChange={v => onField(i, col.f, col.eff ? capEffort(col.eff, v) : v)} /></span>
        <button type="button" aria-label="Increase" onClick={() => bump(s, i, col, 1)}><Icon name="plus" /></button>
      </div>
    )
  }
  return <>
    <div className="exercise-heading row between" style={{ marginBottom: 6, alignItems: 'center' }}>
      <div style={{ fontSize: compact ? 17 : 20, fontWeight: 600, letterSpacing: '-.02em', textTransform: 'capitalize', lineHeight: 1.2 }}>{t(ex.n)}</div>
      <div className="row" style={{ gap: 6, alignItems: 'center' }}>
        <button
          type="button"
          className="btn-swap-ex btn-quick-swap"
          onClick={() => onQuickSwap ? onQuickSwap(entryIdx) : (onChangeExercise && onChangeExercise(entryIdx))}
          title={t('Quick swap with another {0} exercise without losing set progress', t(ex.tg || ex.bp || 'muscle'))}
        >
          <Icon name="shuffle" style={{ fontSize: 12 }} />
          <span>{t('Quick swap')}</span>
        </button>
        <button className="iconbtn" aria-label={t('Details')} onClick={() => exerciseDetailSheet(ex)}><Icon name="info" /></button>
      </div>
    </div>

    <details open className="training-technique" key={'technique-' + entry.id} style={{ marginTop: 8, marginBottom: 12 }}>
      <summary>{t('Exercise technique')}</summary>
      <Media ex={ex} key={entry.id} compact={compact} minimizable />
    </details>

    {entry.sets[workingSetIdx] && !entry.sets.every(s => s.done) && <section className="training-focus" aria-label={t('Current set')}>
      <div className="training-focus-header">
        <span>{t('Set {0} of {1} · Working', workingSetIdx + 1, entry.sets.length)}</span>
        <button type="button" className="btn-ws-change" onClick={() => onChangeSet?.(workingSetIdx)}>
          <Icon name="pencil" /><span>{t('Change set')}</span>
        </button>
      </div>
      {entry.sets[workingSetIdx].tag && <div className="training-set-tag">{t(entry.sets[workingSetIdx].tag === 'W' ? 'Warm-up' : entry.sets[workingSetIdx].tag === 'D' ? 'Drop' : 'Failure')}</div>}
      <div className="training-focus-fields">
        {[col1, col2, col3].filter(Boolean).map((col, i) => <label className="training-focus-field" key={col.f}>
          <span>{col.hd}</span>
          {cell(entry.sets[workingSetIdx], workingSetIdx, col, 'focus-value-' + i)}
        </label>)}
      </div>
      {entry.sets[workingSetIdx].note && <p className="training-focus-note">{entry.sets[workingSetIdx].note}</p>}
      {resting && !working && <div className="training-rest-cue">{t('Rest')} · {fmtSec(resting.left)}</div>}
      {timed ? <Button variant="primary" icon="play" disabled={!!working} onClick={() => onStartTimed(workingSetIdx)}>
        {working?.entryIdx === entryIdx && working?.setIdx === workingSetIdx ? t('Set in progress') : t('Start set')}
      </Button> : <Button variant="primary" icon="check" disabled={!!working || entry.sets[workingSetIdx].done} onClick={() => onToggle(workingSetIdx)}>
        {t('Log set')}
      </Button>}
    </section>}

    <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
      {cardio && <span className="tag acc"><Icon name="figureRun" />{t('Cardio')}</span>}
      {(ex.tg || ex.bp) && <span className="tag">{t(ex.tg || ex.bp)}</span>}
      {ex.eq && <span className="tag">{t(ex.eq)}</span>}
      {!cardio && (
        <button
          type="button"
          className={'tag ' + (hasWeight ? '' : 'acc')}
          style={{
            cursor: 'pointer',
            border: hasWeight ? '1px dashed var(--sep)' : '1px solid var(--acc)',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}
          onClick={() => onToggleWeight?.(entryIdx)}
          title={hasWeight ? t('Switch to bodyweight / remove weight column') : t('Add weight column')}
        >
          <Icon name={hasWeight ? 'xmark' : 'plus'} style={{ fontSize: 10 }} />
          <span>{hasWeight ? t('No weight') : t('Add weight')}</span>
        </button>
      )}
      {isNewPR ? (
        <span
          className="pr pr-tada"
          key={`pr-badge-${entry.id}-${maxDone}`}
          style={{ gap: 4, fontWeight: 700 }}
          title={t('New Personal Record!')}
        >
          <Icon name="trophy" style={{ fontSize: 13 }} />
          <span>{t('New PR!')} {fmtNum(maxDone)} {S.unit}</span>
        </span>
      ) : (
        best > 0 && hasWeight && <span className="tag nocap">{t('Best:')} {fmtNum(best)} {S.unit}</span>
      )}
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

    <details className="training-journal" key={'journal-' + entry.id}>
      <summary>{t('All sets')} <span>{entry.sets.filter(s => s.done).length} / {entry.sets.length}</span></summary>
    <div className="card sets-card" style={{ marginTop: 0, marginBottom: 0 }}>
      {/* the header carries the same eff3 sizing as the rows, or the labels drift off their columns */}
      <div className={'sethead' + (isEff3 ? ' eff3' : '') + (!hasWeight ? ' no-weight' : '') + (timed ? ' timed' : '')}>
        <span className="n-sp" />
        <span className="col-sp c1-sp">{col1.hd}</span>
        {col2 && <span className="col-sp c2-sp">{col2.hd}</span>}
        {col3 && <span className="col-sp eff-sp">{col3.hd}</span>}
        {timed && <span className="go-sp">{t('Start')}</span>}
        <span className="note-sp" />
        <span className="ck-sp" />
      </div>
      {entry.sets.map((s, i) => {
        const isWorking = i === workingSetIdx && !s.done
        const isTimedWork = timed && working?.entryIdx === entryIdx && working?.setIdx === i
        const isSetPR = s.done && hasWeight && best > 0 && Number(s.w) > best && Number(s.w) === maxDone
        const tagClass = s.tag === 'W' ? ' tag-w' : s.tag === 'D' ? ' tag-d' : s.tag === 'F' ? ' tag-f' : (isWorking ? ' working' : '')
        const tagLabel = s.tag === 'W' ? 'W' : s.tag === 'D' ? 'D' : s.tag === 'F' ? 'F' : (i + 1)
        const isEditingThisNote = editingNoteIdx === i
        return <div key={i} className={'setrow' + (s.done ? ' done' : '') + (isWorking ? ' is-working' : '') + (isEff3 ? ' eff3' : '') + (!hasWeight ? ' no-weight' : '') + (timed ? ' timed' : '') + (isSetPR ? ' is-pr' : '') + (s.note ? ' has-note' : '') + (isEditingThisNote ? ' is-editing-note' : '')}>
          <div className="setrow-main">
            <button type="button" className={'n' + tagClass + (isSetPR ? ' is-pr' : '')} onClick={() => onChangeSet?.(i)} title={isSetPR ? t('Set {0} · New PR!', i + 1) : t('Set {0} · Tap to change set', i + 1)} aria-label={t('Set {0}', i + 1)}>
              {isSetPR ? <Icon name="trophy" style={{ fontSize: 11 }} /> : tagLabel}
            </button>
            {cell(s, i, col1, 'c1' + (col1.f === 'w' ? ' w' : col1.f === 'r' ? ' r' : ''))}
            {col2 && cell(s, i, col2, 'c2' + (col2.f === 'r' ? ' r' : col2.f === 'speed' ? ' speed' : col2.f === 'w' ? ' w' : ''))}
            {col3 && cell(s, i, col3, 'eff')}
            {isSetPR && (
              <span
                className="set-pr-badge pr-tada"
                title={t('New personal record: {0} {1}!', fmtNum(s.w), S.unit)}
              >
                <Icon name="trophy" size={10} />
                <span>PR</span>
              </span>
            )}
            {/* Timed holds use an explicit start control; completion is recorded by the timer. */}
            {timed && <button type="button" className={'setgo' + (isTimedWork ? ' is-timing' : '')}
              aria-label={isTimedWork ? fmtSec(working.left) : t('Start set')}
              disabled={s.done || (!!working && !isTimedWork)}
              onClick={() => onStartTimed(i)}>
              <Icon name={isTimedWork ? 'timer' : 'play'} />
              <span>{isTimedWork ? fmtSec(working.left) : t('Start')}</span>
            </button>}
            <button
              type="button"
              className={'set-note-icon-btn' + (s.note ? ' has-note' : '') + (isEditingThisNote ? ' is-editing' : '')}
              onClick={() => {
                if (isEditingThisNote) handleCancelNote()
                else handleStartEditNote(i, s.note)
              }}
              title={s.note ? t('Set cue: "{0}" (tap to edit)', s.note) : t('Add cue or note to set {0}', i + 1)}
              aria-label={s.note ? t('Edit cue for set {0}', i + 1) : t('Add cue for set {0}', i + 1)}
            >
              <Icon name="pencil" size={11} />
              {s.note && <span className="set-note-dot" />}
            </button>
            <Check checked={s.done} onChange={() => onToggle(i)} />
          </div>

          {/* Short text note / cue directly in the set row */}
          {isEditingThisNote ? (
            <div className="set-note-editor" onClick={e => e.stopPropagation()}>
              <div className="set-note-input-wrap">
                <Icon name="pencil" size={11} className="set-note-input-icon" />
                <input
                  type="text"
                  className="set-note-input"
                  value={noteText}
                  placeholder={t('Set cue or adjustment (e.g. pause 1s, keep tight)...')}
                  maxLength={120}
                  autoFocus
                  onChange={e => setNoteText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSaveNote(i)
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      handleCancelNote()
                    }
                  }}
                />
                {noteText && (
                  <button
                    type="button"
                    className="set-note-clear-btn"
                    onClick={() => setNoteText('')}
                    title={t('Clear text')}
                    aria-label={t('Clear text')}
                  >
                    <Icon name="xmark" size={10} />
                  </button>
                )}
              </div>
              <div className="set-note-actions">
                <button
                  type="button"
                  className="set-note-action-btn save"
                  onClick={() => handleSaveNote(i)}
                  title={t('Save cue')}
                  aria-label={t('Save cue')}
                >
                  <Icon name="check" size={12} />
                  <span>{t('Save')}</span>
                </button>
                {s.note && (
                  <button
                    type="button"
                    className="set-note-action-btn delete"
                    onClick={() => handleDeleteNote(i)}
                    title={t('Remove cue')}
                    aria-label={t('Remove cue')}
                  >
                    <Icon name="trash" size={11} />
                  </button>
                )}
                <button
                  type="button"
                  className="set-note-action-btn cancel"
                  onClick={handleCancelNote}
                  title={t('Cancel')}
                  aria-label={t('Cancel')}
                >
                  <Icon name="xmark" size={11} />
                </button>
              </div>
            </div>
          ) : s.note ? (
            <div
              className="set-note-display"
              onClick={() => handleStartEditNote(i, s.note)}
              role="button"
              tabIndex={0}
              title={t('Set cue: "{0}" (tap to edit)', s.note)}
              aria-label={t('Set cue: {0}. Tap to edit.', s.note)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleStartEditNote(i, s.note)
                }
              }}
            >
              <span className="set-note-tag">
                <Icon name="pencil" size={10} />
                <span>{t('Cue')}</span>
              </span>
              <span className="set-note-text">{s.note}</span>
              <span className="set-note-edit-hint" aria-hidden="true">
                <Icon name="pencil" size={9} />
              </span>
            </div>
          ) : isWorking ? (
            <button
              type="button"
              className="set-note-cue-prompt"
              onClick={() => handleStartEditNote(i, '')}
              title={t('Add cue or adjustment note for set {0}', i + 1)}
            >
              <Icon name="plus" size={10} />
              <span>{t('Add set cue / adjustment')}</span>
            </button>
          ) : null}
        </div>
      })}
      <div style={{ height: 8 }} />
      <div className="row">
        <Button size="sm" icon="minus" disabled={entry.sets.length <= 1} onClick={onRemoveSet}>{t('Remove set')}</Button>
        <Button size="sm" icon="plus" onClick={onAddSet}>{t('Add set')}</Button>
      </div>
    </div>
    </details>
  </>
}

/* ---------- active workout ---------- */
function ActiveWorkout() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const { startRest, stopRest, stopWork } = useUI()
  const A = S.active
  const units = supersetUnits(A.entries)
  const cur = Math.min(A.cur, Math.max(0, A.entries.length - 1))
  const unit = A.entries.length ? unitOf(units, cur) : []
  const unitIdx = units.findIndex(u => u === unit)
  const isSuperset = unit.length > 1
  const currentPhase = A.entries[unit[0]]?.phase || 'workout'

  const skipPhase = phase => {
    let nextIndex = -1
    update(s => { nextIndex = skipWorkoutPhase(s.active, phase) })
    stopRest()
    if (phase === 'cooldown' || nextIndex < 0) workoutCompleteSheet()
  }

  const [saveStatus, setSaveStatus] = useState({ status: 'saved', lastSaved: Date.now() })
  const [recoveredNotice, setRecoveredNotice] = useState(() => !!S._recoveredFromAutoSave)

  // Periodic auto-save loop: automatically preserves active workout session state to local storage
  // every 3 seconds and flushes on visibilitychange/unload to prevent data loss.
  useEffect(() => {
    const unsub = subscribeAutoSave(st => setSaveStatus(st))
    const stop = startPeriodicAutoSave(3000)
    return () => {
      unsub()
      stop()
    }
  }, [])

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
    if (v == null || (typeof v === 'string' && !v.trim())) delete e.sets[i][field]; else e.sets[i][field] = v
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
    useUI.getState().startWork(5, t('Get Ready!'), () => {
      useUI.getState().startWork(e.sets[i].sec || 45, t(exOr(e.id).n), elapsed => {
        mutEntry(idx, en => { en.sets[i].sec = elapsed })
        if (useStore.getState().S.active?.entries[idx]?.sets[i] && !useStore.getState().S.active.entries[idx].sets[i].done) toggle(idx, i)
      }, { entryIdx: idx, setIdx: i })
    }, { isPrepare: true })
  }

  const toggle = (idx, i) => {
    const m = modeAt(idx)
    const cardioEntry = m === 'cardio'
    const isLastUnit = unitIdx >= units.length - 1
    let askTop = false, exJustDone = false, workoutDone = false
    mutEntry(idx, e => {
      e.sets[i].done = !e.sets[i].done
      if (e.sets[i].done) delete e.sets[i].skipped
      if (e.sets[i].done) {
        beep(S.sound, 1040, 0.12)
        const prevBest = cardioEntry ? 0 : Math.max(bestWeightFor(S, e.id), (S.exWeights[e.id] || {}).w || 0)
        const setWeight = Number(e.sets[i].w) || 0
        if (prevBest > 0 && setWeight > prevBest) {
          useUI.getState().toast(t('New personal record: {0} {1}!', fmtNum(setWeight), S.unit))
        }
        const nextIncomplete = e.sets.findIndex((x, sIdx) => sIdx > i && !x.done)
        if (nextIncomplete !== -1) e.activeSetIdx = nextIncomplete
        else delete e.activeSetIdx

        const isLastExInUnit = idx === unit[unit.length - 1]
        const unitDone = unit.every(ui => (ui === idx ? e : A.entries[ui]).sets.every(x => x.done))

        if (unitDone) {
          stopRest()
          if (isLastUnit) workoutDone = true
          else {
            setTimeout(() => {
               update(s => { if (unitIdx + 1 < units.length) s.active.cur = units[unitIdx + 1][0] })
            }, 800)
          }
        } else if (isLastExInUnit) {
          startRest(S.restSec, () => {
             const st = useStore.getState().S.active
             if (!st) return
             const nextE = st.entries[idx]
             const nextI = nextE.activeSetIdx !== undefined ? nextE.activeSetIdx : nextE.sets.findIndex(s => !s.done)
             if (nextI >= 0) {
                 const md = modeOf({ ...(nextE.target || {}), id: nextE.id })
                 if (md === 'time') {
                    useUI.getState().startWork(5, t('Get Ready!'), () => {
                       useUI.getState().startWork(nextE.sets[nextI].sec || 45, t(exOr(nextE.id).n), elapsed => {
                          mutEntry(idx, en => { en.sets[nextI].sec = elapsed })
                          if (useStore.getState().S.active?.entries[idx]?.sets[nextI] && !useStore.getState().S.active.entries[idx].sets[nextI].done) toggle(idx, nextI)
                       }, { entryIdx: idx, setIdx: nextI })
                    }, { isPrepare: true })
                 } else {
                    useUI.getState().startWork(5, t('Get Ready!'), () => {
                       useUI.getState().toast(t('Go!'))
                    }, { isPrepare: true })
                 }
             }
          })
        }

        // Only reps training has a "working weight" worth confirming — a bodyweight plank
        // has nothing to put in that slider.
        if (e.sets.every(x => x.done)) { exJustDone = true; if (m === 'reps' && !e.asked && A.cycleStep == null) { e.asked = true; askTop = true } }

        if (workoutDone) {
          hapticSetComplete('workout')
        } else if (exJustDone) {
          hapticSetComplete('exercise')
        } else {
          hapticSetComplete('set')
        }
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
        const r = s.routines?.find(x => x.id === s.active.routineId)
        ent.plan = nextPrescription(s, { ...ent.target, id: newEx.id }, r)
      })
      useUI.getState().toast(t('Swapped to {0}', newEx.n))
    })
  }

  const handleQuickSwapExercise = entryIdx => {
    const entry = A.entries[entryIdx]
    if (!entry) return
    const curEx = exOr(entry.id)
    quickSwapSheet(curEx, entry, newEx => {
      update(s => {
        const ent = s.active?.entries[entryIdx]
        if (!ent) return
        ent.id = newEx.id
        ent.target = { ...(ent.target || {}), id: newEx.id }
        const r = s.routines?.find(x => x.id === s.active.routineId)
        ent.plan = nextPrescription(s, { ...ent.target, id: newEx.id }, r)
      })
      useUI.getState().toast(t('Swapped to {0} · Set progress kept', t(newEx.n)))
    })
  }

  const handleToggleWeight = entryIdx => {
    mutEntry(entryIdx, e => {
      const isBW = exOr(e.id).eq === 'body weight' || e.target?.bodyweight || e.noWeight
      const setsHaveWeight = e.sets.some(s => s.w > 0)
      const currentHasWeight = e.noWeight ? false : (e.hasWeight ? true : (isBW ? setsHaveWeight : (e.target?.weight !== 0 || setsHaveWeight)))

      if (currentHasWeight) {
        e.noWeight = true
        delete e.hasWeight
        e.sets.forEach(s => { delete s.w })
        useUI.getState().toast(t('Weight column removed'))
      } else {
        delete e.noWeight
        e.hasWeight = true
        e.sets.forEach(s => { s.w = s.w ?? 0 })
        useUI.getState().toast(t('Weight column added'))
      }
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

  return <div className="narrow training-console">
    <div className="hdr">
      <button className="iconbtn" aria-label={t('Discard')} onClick={() => confirmSheet({ title: t('Discard workout?'), message: t('The sets you logged in this session will be lost.'), confirmText: t('Discard'), danger: true, onConfirm: () => { clearActiveSessionBackup(); stopWork(); update(s => { s.active = null }); stopRest(); nav('/home') } })}><Icon name="xmark" /></button>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600 }}>{A.name}</span>
          <HeaderSyncInline />
        </div>
        <div className="sub">{t('{0} sets', done + '/' + total)}</div>
      </div>
      <button className="iconbtn" style={{ color: 'var(--acc)' }} aria-label={t('Finish')} onClick={finishWorkout}><Icon name="check" /></button>
    </div>
    <div className="wprog"><i style={{ width: (total ? done / total * 100 : 0) + '%' }} /></div>

    {recoveredNotice && (
      <div className="card" style={{
        padding: '9px 12px',
        margin: '8px 0 4px',
        background: 'rgba(16, 185, 129, 0.12)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        borderRadius: 'var(--r-sm, 8px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.86rem', color: 'var(--fg)' }}>
          <Icon name="shield" style={{ color: '#10b981', flexShrink: 0, width: 16, height: 16 }} />
          <span>{t('Workout session recovered from auto-save')}</span>
        </div>
        <button
          type="button"
          className="iconbtn"
          style={{ width: 24, height: 24, padding: 0 }}
          onClick={() => {
            setRecoveredNotice(false)
            update(s => { delete s._recoveredFromAutoSave }, false)
          }}
          aria-label={t('Dismiss')}
        >
          <Icon name="xmark" style={{ width: 14, height: 14 }} />
        </button>
      </div>
    )}

    <div id="workout-active-duration-field" className="training-session-status" role="status">
      <span>{t('Active duration')} <Elapsed start={A.start} /></span>
      <span className={saveStatus.status === 'error' ? 'training-save-error' : ''}>
        <Icon name={saveStatus.status === 'error' ? 'xmark' : saveStatus.status === 'saving' ? 'sync' : 'check'} />
        {saveStatus.status === 'error' ? t('Save error') : saveStatus.status === 'saving' ? t('Auto-saving…') : t('Auto-saved')}
      </span>
    </div>

    {A.entries.length ? <>
      {currentPhase !== 'workout' && <div className="card" style={{ marginTop: 8, marginBottom: 10, padding: 14, borderColor: 'var(--acc)' }}>
        <div className="row between" style={{ alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>{t(currentPhase === 'warmup' ? 'Warm-up' : 'Cooldown')}</div>
            <div className="muted small">{t(currentPhase === 'warmup' ? 'Dynamic movements to prepare your body' : 'Gentle stretches to wind down after your workout')}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => skipPhase(currentPhase)}>{t('Skip')}</Button>
        </div>
      </div>}
      <div className="row between" style={{ alignItems: 'center', marginTop: 8, marginBottom: 8, gap: 6, flexWrap: 'wrap' }}>
        <div className="muted small" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {currentPhase !== 'workout' && (
            <span className="fl-badge" style={{ margin: 0 }}>
              <Icon name="bolt" /> {currentPhase === 'warmup' ? t('Warm-up') : t('Cooldown')}
            </span>
          )}
          {A.isFreeletics && currentPhase === 'workout' && (
            <span className="fl-badge" style={{ margin: 0 }}>
              <Icon name="bolt" /> {t('Hero Rounds')}
            </span>
          )}
          <span>{isSuperset ? t('Superset {0} / {1}', unitIdx + 1, units.length) : t('Exercise {0} / {1}', unitIdx + 1, units.length)}</span>
          {A.isFreeletics && currentPhase === 'workout' && <span className="round-badge active">{t('Round {0}', currentRound)}</span>}
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
              onChangeExercise={handleSwapExercise}
              onQuickSwap={handleQuickSwapExercise}
              onToggleWeight={handleToggleWeight} />
          </div>)}
        </div>
      ) : (
        <ExerciseBlock entryIdx={cur} onToggle={i => toggle(cur, i)} onField={(i, f, v) => setField(cur, i, f, v)} onAddSet={() => addSet(cur)} onRemoveSet={() => removeSet(cur)} onStartTimed={i => startTimed(cur, i)}
          onChangeSet={i => useUI.getState().openSheet(cl => <ChangeSetSheet entryIdx={cur} setIdx={i} close={cl} />)}
          onChangeExercise={handleSwapExercise}
          onQuickSwap={handleQuickSwapExercise}
          onToggleWeight={handleToggleWeight} />
      )}
    </> : <div className="empty"><div className="ico"><Icon name="shuffle" /></div>{t('Freestyle workout — add your first exercise.')}</div>}

    {unitIdx >= 0 && unitIdx < units.length - 1 && <div className="training-next">
      <span>{t('Up next')}</span>
      <strong>{units[unitIdx + 1].map(idx => t(exOr(A.entries[idx].id).n)).join(' + ')}</strong>
    </div>}
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

  useEffect(() => {
    if (active) {
      document.body.classList.add('workout-active')
    } else {
      document.body.classList.remove('workout-active')
    }
    return () => document.body.classList.remove('workout-active')
  }, [!!active])

  return active ? <ActiveWorkout /> : <StartChooser />
}
