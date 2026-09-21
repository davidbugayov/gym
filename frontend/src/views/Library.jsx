import { useState, useMemo } from 'react'
import { useStore } from '../store/useStore.js'
import { EXDB, BODYPARTS, allExercises, equipmentOf, EQUIPMENT_GROUPS, getEquipmentGroup, equipmentGroupsOf, groupExercisesByEquipment } from '../lib/exercises.js'
import { bestWeightFor } from '../lib/history.js'
import { fmtNum } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { Thumb } from '../components/Media.jsx'
import { exerciseDetailSheet, addToRoutineSheet, customExSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

export default function Library() {
  const S = useStore(s => s.S)
  const [q, setQ] = useState('')
  const [bp, setBp] = useState('')
  const [eqGroup, setEqGroup] = useState('')
  const [eq, setEq] = useState('')
  const [groupByEq, setGroupByEq] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState({})
  const [shown, setShown] = useState(40)

  const ql = q.toLowerCase().trim()
  const all = allExercises(S)

  // Filter by body part and search query
  const base = useMemo(() => {
    return all.filter(e => {
      if (bp && e.bp !== bp) return false
      if (ql && !e.n.toLowerCase().includes(ql) && !e.tg.includes(ql) && !e.eq.includes(ql) && !(e.desc || '').toLowerCase().includes(ql)) {
        return false
      }
      return true
    })
  }, [all, bp, ql])

  // Equipment groups available in the current base filter
  const availGroups = useMemo(() => equipmentGroupsOf(base), [base])

  // If active group is not available anymore, reset it
  const activeEqGroup = availGroups.some(g => g.name === eqGroup) ? eqGroup : ''

  // Filter by equipment group
  const byGroup = useMemo(() => {
    if (!activeEqGroup) return base
    return base.filter(e => getEquipmentGroup(e.eq) === activeEqGroup)
  }, [base, activeEqGroup])

  // Specific sub-equipment options for the current group selection
  const eqOpts = useMemo(() => equipmentOf(byGroup), [byGroup])
  const eqOn = eqOpts.includes(eq) ? eq : ''

  // Final filtered list
  const f = useMemo(() => {
    if (!eqOn) return byGroup
    return byGroup.filter(e => e.eq === eqOn)
  }, [byGroup, eqOn])

  // Grouped exercises by equipment type
  const groupedExercises = useMemo(() => {
    return groupExercisesByEquipment(f)
  }, [f])

  const toggleGroup = name => {
    setCollapsedGroups(prev => ({ ...prev, [name]: !prev[name] }))
  }

  const renderExerciseItem = e => {
    const best = bestWeightFor(S, e.id)
    const eqG = getEquipmentGroup(e.eq)
    return (
      <div key={e.id} className="item" onClick={() => exerciseDetailSheet(e)}>
        <Thumb ex={e} />
        <div className="grow">
          <div className="tt capitalize">{e.n}</div>
          <div className="ss capitalize">
            {t(e.tg || e.bp)} · <span style={{ color: 'var(--accent)' }}>{t(eqG)}</span> {e.eq && e.eq !== eqG.toLowerCase() ? `(${t(e.eq)})` : ''}
          </div>
        </div>
        {best > 0 && <span className="tag acc">{fmtNum(best)}</span>}
        <Button size="sm" variant="tinted" icon="plus" onClick={ev => { ev.stopPropagation(); addToRoutineSheet(e) }}>
          {t('Plan')}
        </Button>
      </div>
    )
  }

  return <>
    <div className="hdr">
      <div>
        <h1>{t('Exercises')}</h1>
        <div className="sub">{t('{0} exercises with animations', EXDB.length)}</div>
      </div>
      <button
        className={'iconbtn' + (groupByEq ? ' on-ss' : '')}
        style={{ borderRadius: 10, padding: '6px 10px', width: 'auto', gap: 6, fontSize: 13 }}
        onClick={() => setGroupByEq(v => !v)}
        title={t('Group by equipment')}
      >
        <Icon name="folder" />
        <span style={{ fontSize: 12, fontWeight: 600 }}>{groupByEq ? t('Grouped view') : t('Flat list')}</span>
      </button>
    </div>

    <div className="search" style={{ marginBottom: 10 }}>
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <input
        className="input"
        placeholder={t('Search…')}
        value={q}
        onChange={e => { setQ(e.target.value); setShown(40) }}
      />
    </div>

    {/* Body part chips */}
    <div className="chips" style={{ marginBottom: 8 }}>
      <button className={'chip nocap' + (!bp ? ' on' : '')} onClick={() => { setBp(''); setEq(''); setShown(40) }}>
        {t('All')}
      </button>
      {BODYPARTS.map(b => (
        <button key={b} className={'chip' + (bp === b ? ' on' : '')} onClick={() => { setBp(b); setEq(''); setShown(40) }}>
          {t(b)}
        </button>
      ))}
    </div>

    {/* Equipment group filter chips (Dumbbells, Barbell, Bodyweight, Machines, etc.) */}
    <div className="chips" style={{ marginBottom: eqOpts.length > 1 ? 8 : 12 }}>
      <button
        className={'chip nocap' + (!activeEqGroup ? ' on' : '')}
        onClick={() => { setEqGroup(''); setEq(''); setShown(40) }}
      >
        <Icon name="list" style={{ fontSize: 12, marginRight: 4, verticalAlign: '-1px' }} />
        {t('All equipment')}
      </button>
      {availGroups.map(g => (
        <button
          key={g.name}
          className={'chip' + (activeEqGroup === g.name ? ' on' : '')}
          onClick={() => { setEqGroup(activeEqGroup === g.name ? '' : g.name); setEq(''); setShown(40) }}
        >
          <Icon name={g.icon} style={{ fontSize: 12, marginRight: 4, verticalAlign: '-1px' }} />
          {t(g.name)} ({g.count})
        </button>
      ))}
    </div>

    {/* Specific sub-equipment chips (e.g. leverage machine, cable, smith machine) */}
    {eqOpts.length > 1 && (
      <div className="chips" style={{ marginBottom: 12 }}>
        <button className={'chip nocap' + (!eqOn ? ' on' : '')} onClick={() => { setEq(''); setShown(40) }}>
          {t('Any equipment')}
        </button>
        {eqOpts.map(x => (
          <button key={x} className={'chip' + (eqOn === x ? ' on' : '')} onClick={() => { setEq(x); setShown(40) }}>
            {t(x)}
          </button>
        ))}
      </div>
    )}

    {/* List view */}
    <div className="list">
      <div className="item" onClick={() => customExSheet(null, ex => exerciseDetailSheet(ex), q.trim())}>
        <div className="thumb thumb-x"><Icon name="sparkles" /></div>
        <div className="grow">
          <div className="tt">{t('Create your own exercise')}</div>
          <div className="ss">{t('name + body part, no animation')}</div>
        </div>
        <Icon name="plus" className="chev" />
      </div>

      {groupByEq ? (
        // Grouped by equipment view
        groupedExercises.length > 0 ? (
          groupedExercises.map(grp => {
            const isCollapsed = !!collapsedGroups[grp.name]
            return (
              <div key={grp.name} style={{ marginBottom: 14 }}>
                <div
                  className="row between"
                  style={{
                    padding: '8px 12px',
                    background: 'var(--surface-2)',
                    borderRadius: 10,
                    cursor: 'pointer',
                    userSelect: 'none',
                    marginBottom: isCollapsed ? 0 : 6
                  }}
                  onClick={() => toggleGroup(grp.name)}
                >
                  <div className="row" style={{ gap: 8, fontWeight: 600 }}>
                    <span className="tag acc" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon name={grp.icon} />
                      {t(grp.name)}
                    </span>
                    <span className="small dim">{grp.exercises.length} {t('exercises')}</span>
                  </div>
                  <Icon name={isCollapsed ? 'chevronRight' : 'chevronDown'} className="chev" />
                </div>

                {!isCollapsed && (
                  <div className="list" style={{ marginTop: 4 }}>
                    {grp.exercises.map(renderExerciseItem)}
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="empty"><div className="ico"><Icon name="magnifier" /></div>{t('No match')}</div>
        )
      ) : (
        // Flat list view
        <>
          {f.slice(0, shown).map(renderExerciseItem)}
          {f.length === 0 && <div className="empty"><div className="ico"><Icon name="magnifier" /></div>{t('No match')}</div>}
        </>
      )}
    </div>

    {!groupByEq && f.length > shown && (
      <>
        <div style={{ height: 10 }} />
        <Button onClick={() => setShown(s => s + 40)}>{t('Show more')}</Button>
      </>
    )}
  </>
}
