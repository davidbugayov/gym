import { useState, useMemo } from 'react'
import { useStore } from '../store/useStore.js'
import { EXDB, BODYPARTS, allExercises, equipmentOf } from '../lib/exercises.js'
import { bestWeightFor } from '../lib/history.js'
import { fmtNum } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { Thumb } from '../components/Media.jsx'
import { exerciseDetailSheet, addToRoutineSheet, customExSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button, Segmented } from '../components/ui.jsx'

// Categorize raw equipment strings into intuitive groups
function getEquipmentGroup(eq) {
  const e = (eq || '').toLowerCase()
  if (e.includes('dumbbell')) return { key: 'dumbbell', label: 'Dumbbells', icon: 'dumbbell' }
  if (e.includes('barbell') || e.includes('smith')) return { key: 'barbell', label: 'Barbell', icon: 'barbell' }
  if (e.includes('body weight') || e.includes('assisted')) return { key: 'bodyweight', label: 'Bodyweight', icon: 'bodyweight' }
  if (e.includes('cable') || e.includes('machine') || e.includes('ergometer') || e.includes('bike')) return { key: 'machine', label: 'Machines & Cables', icon: 'settings' }
  if (e.includes('kettlebell')) return { key: 'kettlebell', label: 'Kettlebell', icon: 'kettlebell' }
  return { key: 'other', label: 'Bands & Other', icon: 'sparkles' }
}

export default function Library() {
  const S = useStore(s => s.S)
  const [q, setQ] = useState('')
  const [bp, setBp] = useState('')
  const [eq, setEq] = useState('')
  const [groupByEq, setGroupByEq] = useState(false)
  const [shown, setShown] = useState(40)

  const ql = q.toLowerCase().trim()
  const base = allExercises(S).filter(e => (!bp || e.bp === bp) && (!ql || e.n.toLowerCase().includes(ql) || e.tg.includes(ql) || e.eq.includes(ql) || (e.desc || '').toLowerCase().includes(ql)))
  const eqOpts = equipmentOf(base)
  // Drop the equipment filter if the search narrowed it away, so you never hit a dead end.
  const eqOn = eqOpts.includes(eq) ? eq : ''
  const f = eqOn ? base.filter(e => e.eq === eqOn) : base

  // Grouped exercises by equipment category
  const grouped = useMemo(() => {
    if (!groupByEq) return null
    const groups = {
      bodyweight: { label: t('Bodyweight'), icon: 'bodyweight', items: [] },
      dumbbell: { label: t('Dumbbells'), icon: 'dumbbell', items: [] },
      barbell: { label: t('Barbell'), icon: 'barbell', items: [] },
      machine: { label: t('Machines & Cables'), icon: 'settings', items: [] },
      kettlebell: { label: t('Kettlebell'), icon: 'kettlebell', items: [] },
      other: { label: t('Bands & Other'), icon: 'sparkles', items: [] }
    }
    f.forEach(e => {
      const g = getEquipmentGroup(e.eq)
      if (groups[g.key]) groups[g.key].items.push(e)
      else groups.other.items.push(e)
    })
    return Object.entries(groups).filter(([_, val]) => val.items.length > 0)
  }, [f, groupByEq])

  return <>
    <div className="hdr">
      <div>
        <h1>{t('Exercises')}</h1>
        <div className="sub">{t('{0} exercises with animations', EXDB.length)}</div>
      </div>
      <Button
        size="sm"
        variant={groupByEq ? 'primary' : 'tinted'}
        icon={groupByEq ? 'list' : 'layers'}
        onClick={() => setGroupByEq(!groupByEq)}
      >
        {groupByEq ? t('Flat list') : t('Group by equipment')}
      </Button>
    </div>

    <div className="search" style={{ marginBottom: 10 }}><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <input className="input" placeholder={t('Search…')} value={q} onChange={e => { setQ(e.target.value); setShown(40) }} /></div>

    <div className="chips" style={{ marginBottom: 8 }}>
      <button className={'chip nocap' + (!bp ? ' on' : '')} onClick={() => { setBp(''); setEq(''); setShown(40) }}>{t('All')}</button>
      {BODYPARTS.map(b => <button key={b} className={'chip' + (bp === b ? ' on' : '')} onClick={() => { setBp(b); setEq(''); setShown(40) }}>{t(b)}</button>)}
    </div>

    {eqOpts.length > 1 && <div className="chips" style={{ marginBottom: 12 }}>
      <button className={'chip nocap' + (!eqOn ? ' on' : '')} onClick={() => { setEq(''); setShown(40) }}>{t('Any equipment')}</button>
      {eqOpts.map(x => <button key={x} className={'chip' + (eqOn === x ? ' on' : '')} onClick={() => { setEq(x); setShown(40) }}>{t(x)}</button>)}
    </div>}

    <div className="list">
      <div className="item" onClick={() => customExSheet(null, ex => exerciseDetailSheet(ex), q.trim())}>
        <div className="thumb thumb-x"><Icon name="sparkles" /></div>
        <div className="grow"><div className="tt">{t('Create your own exercise')}</div><div className="ss">{t('name + body part, no animation')}</div></div><Icon name="plus" className="chev" />
      </div>

      {groupByEq && grouped ? (
        grouped.map(([key, grp]) => (
          <div key={key} style={{ marginTop: 14 }}>
            <div className="row between" style={{ padding: '6px 4px', borderBottom: '1px solid var(--sep-op)', marginBottom: 8, alignItems: 'center' }}>
              <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                <span className="lrow-i" style={{ width: 24, height: 24, fontSize: 13, borderRadius: 6 }}>
                  <Icon name={grp.icon} />
                </span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{grp.label}</span>
              </div>
              <span className="tag" style={{ fontSize: 11 }}>{grp.items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {grp.items.map(e => {
                const best = bestWeightFor(S, e.id)
                return <div key={e.id} className="item" onClick={() => exerciseDetailSheet(e)}>
                  <Thumb ex={e} />
                  <div className="grow"><div className="tt capitalize">{e.n}</div><div className="ss capitalize">{t(e.tg || e.bp)} · {t(e.eq)}</div></div>
                  {best > 0 && <span className="tag acc">{fmtNum(best)}</span>}
                  <Button size="sm" variant="tinted" icon="plus" onClick={ev => { ev.stopPropagation(); addToRoutineSheet(e) }}>{t('Plan')}</Button>
                </div>
              })}
            </div>
          </div>
        ))
      ) : (
        f.slice(0, shown).map(e => {
          const best = bestWeightFor(S, e.id)
          return <div key={e.id} className="item" onClick={() => exerciseDetailSheet(e)}>
            <Thumb ex={e} />
            <div className="grow"><div className="tt capitalize">{e.n}</div><div className="ss capitalize">{t(e.tg || e.bp)} · {t(e.eq)}</div></div>
            {best > 0 && <span className="tag acc">{fmtNum(best)}</span>}
            <Button size="sm" variant="tinted" icon="plus" onClick={ev => { ev.stopPropagation(); addToRoutineSheet(e) }}>{t('Plan')}</Button>
          </div>
        })
      )}

      {f.length === 0 && <div className="empty"><div className="ico"><Icon name="magnifier" /></div>{t('No match')}</div>}
    </div>
    {!groupByEq && f.length > shown && <><div style={{ height: 10 }} /><Button onClick={() => setShown(s => s + 40)}>{t('Show more')}</Button></>}
  </>
}
