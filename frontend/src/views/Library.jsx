import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { EXDB, BODYPARTS, allExercises, equipmentOf, matchesExerciseQuery } from '../lib/exercises.js'
import { personalRecordFor } from '../lib/history.js'
import { fmtNum, fmtDate } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { Thumb } from '../components/Media.jsx'
import { exerciseDetailSheet, addToRoutineSheet, customExSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import ExerciseEffortSparkline from '../components/ExerciseEffortSparkline.jsx'

export default function Library() {
  const S = useStore(s => s.S)
  const [q, setQ] = useState('')
  const [bp, setBp] = useState('')
  const [eq, setEq] = useState('')
  const [shown, setShown] = useState(40)
  const base = allExercises(S).filter(e => (!bp || e.bp === bp) && matchesExerciseQuery(e, q))
  const eqOpts = equipmentOf(base)
  // Keep the first results in view; show the extra equipment row once the list is narrowed.
  const showEquipment = eqOpts.length > 1 && Boolean(bp || q.trim())
  const eqOn = showEquipment && eqOpts.includes(eq) ? eq : ''
  const f = eqOn ? base.filter(e => e.eq === eqOn) : base

  const createExercise = <div className="item" onClick={() => customExSheet(null, ex => exerciseDetailSheet(ex), q.trim())}>
    <div className="thumb thumb-x"><Icon name="sparkles" /></div>
    <div className="grow"><div className="tt">{t('Create your own exercise')}</div><div className="ss">{t('name + body part, no animation')}</div></div><Icon name="plus" className="chev" />
  </div>

  return <div className="exercise-library">
    <div className="hdr">
      <div>
        <h1>{t('Exercises')}</h1>
        <div className="sub">{t('{0} exercises with animations', EXDB.length)}</div>
      </div>
    </div>
    <div className="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <input className="input" placeholder={t('Search…')} value={q} onChange={e => { setQ(e.target.value); setShown(40) }} /></div>
    <div className="chips">
      <button className={'chip nocap' + (!bp ? ' on' : '')} onClick={() => { setBp(''); setEq(''); setShown(40) }}>{t('All')}</button>
      {BODYPARTS.map(b => <button key={b} className={'chip' + (bp === b ? ' on' : '')} onClick={() => { setBp(b); setEq(''); setShown(40) }}>{t(b)}</button>)}
    </div>
    {showEquipment && <div className="chips equipment-chips">
      <button className={'chip nocap' + (!eqOn ? ' on' : '')} onClick={() => { setEq(''); setShown(40) }}>{t('Any equipment')}</button>
      {eqOpts.map(x => <button key={x} className={'chip' + (eqOn === x ? ' on' : '')} onClick={() => { setEq(x); setShown(40) }}>{t(x)}</button>)}
    </div>}

    <div className="list">
      {f.slice(0, shown).map(e => {
        const pr = personalRecordFor(S, e.id)
        const name = t(e.n)
        return <div key={e.id} className="item" onClick={() => exerciseDetailSheet(e)}>
          <Thumb ex={e} />
          <div className="grow"><div className="tt">{name.charAt(0).toLocaleUpperCase() + name.slice(1)}</div><div className="ss capitalize">{t(e.tg || e.bp)} · {t(e.eq)}</div></div>
          <div className="item-badges">
            <ExerciseEffortSparkline exercise={e} />
            {pr && (
              <div
                className={`pr-badge trend-${pr.trend || 'first'}`}
                title={
                  pr.trend === 'up'
                    ? `${t('New personal record!')} +${fmtNum(pr.diff)} ${S.unit || 'kg'} (${t('prev')}: ${fmtNum(pr.prevWeight)} ${S.unit || 'kg'}) · ${pr.date ? fmtDate(pr.date) : ''}`
                    : pr.trend === 'down'
                    ? `${fmtNum(pr.weight)} ${S.unit || 'kg'} · ${pr.date ? fmtDate(pr.date) : ''}`
                    : `${t('First recorded personal best')}: ${fmtNum(pr.weight)} ${S.unit || 'kg'} · ${pr.date ? fmtDate(pr.date) : ''}`
                }
              >
                <div className="pr-main">
                  <Icon name="trophy" className="pr-icon" />
                  <span className="pr-tag">PR</span>
                  {pr.trend === 'up' && (
                    <span className="pr-arrow up" title={`+${fmtNum(pr.diff)} ${S.unit || 'kg'}`}>
                      <Icon name="arrowUp" size={11} />
                    </span>
                  )}
                  {pr.trend === 'down' && (
                    <span className="pr-arrow down">
                      <Icon name="arrowDown" size={11} />
                    </span>
                  )}
                  {pr.trend === 'first' && (
                    <span className="pr-arrow first" title={t('First record')}>
                      <span className="pr-first-dot">•</span>
                    </span>
                  )}
                  <span className="pr-weight">{fmtNum(pr.weight)} {S.unit || 'kg'}</span>
                </div>
                {pr.date && <div className="pr-date">{fmtDate(pr.date)}</div>}
              </div>
            )}
          </div>
          <Button size="sm" variant="tinted" icon="plus" onClick={ev => { ev.stopPropagation(); addToRoutineSheet(e) }}>{t('Plan')}</Button>
        </div>
      })}
      {f.length === 0 && <div className="empty"><div className="ico"><Icon name="magnifier" /></div>{t('No match')}</div>}
      {createExercise}
    </div>
    {f.length > shown && <><div style={{ height: 10 }} /><Button onClick={() => setShown(s => s + 40)}>{t('Show more')}</Button></>}
  </div>
}
