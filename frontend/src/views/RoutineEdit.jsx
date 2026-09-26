import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useStore } from '../store/useStore.js'
import { exOr } from '../lib/exercises.js'
import { uid } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { supersetUnits, cleanupSg, exLine } from '../lib/history.js'
import { Thumb } from '../components/Media.jsx'
import { glyphPicker, exercisePicker, exConfigSheet, confirmSheet, changeExerciseSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { glyphOf } from '../lib/glyphs.js'
import { Button, SelectRow } from '../components/ui.jsx'
import { POLICIES_FOR, POLICY_NAME, POLICY_DESC } from '../lib/progression.js'
import BodyMap from '../components/BodyMap.jsx'
import { loadOfRoutine, rankOf, MUSCLE_NAME } from '../lib/muscles.js'
import SwipeToDelete from '../components/SwipeToDelete.jsx'

export default function RoutineEdit() {
  const nav = useNavigate()
  const { id } = useParams()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const r = S.routines.find(x => x.id === id)
  const listRef = useRef(null)
  const [dragState, setDragState] = useState(null)
  const dragRef = useRef(null)
  dragRef.current = dragState

  useEffect(() => { if (!r) nav('/plan') }, [!!r])
  if (!r) return null

  // Ensure stable keys for items so reordering animates smoothly
  useEffect(() => {
    if (r && r.ex && r.ex.some(e => !e._uid)) {
      update(s => {
        const cur = s.routines.find(x => x.id === id)
        if (cur && cur.ex) {
          cur.ex.forEach(e => { if (!e._uid) e._uid = 'ex_' + uid() })
        }
      })
    }
  }, [id, r?.ex?.length])

  const edit = fn => update(s => { fn(s.routines.find(x => x.id === id).ex) })
  const move = (i, dir) => edit(ex => { const j = i + dir; if (j < 0 || j >= ex.length) return;[ex[i], ex[j]] = [ex[j], ex[i]]; cleanupSg(ex) })
  const toggleLink = i => edit(ex => {
    if (i < 1) return
    const cur = ex[i], prev = ex[i - 1]
    if (cur.sg && prev.sg && cur.sg === prev.sg) delete cur.sg
    else { const gid = prev.sg || ('sg' + uid()); prev.sg = gid; cur.sg = gid }
    cleanupSg(ex)
  })

  // Drag-and-drop reordering with smooth animation
  const startDrag = (index, e) => {
    if (e.button !== undefined && e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    const container = listRef.current
    if (!container) return
    const nodes = Array.from(container.querySelectorAll('.routine-item-wrap'))
    if (!nodes.length) return

    const rects = nodes.map(n => n.getBoundingClientRect())
    const itemHeights = rects.map(rc => rc.height)
    const itemTops = rects.map(rc => rc.top)

    setDragState({
      dragIndex: index,
      overIndex: index,
      startY: e.clientY,
      offsetY: 0,
      itemHeights,
      itemTops,
      isDropping: false
    })

    if (S.haptics !== false && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(14)
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
  }

  const onPointerMove = useCallback(e => {
    const cur = dragRef.current
    if (!cur || cur.isDropping) return
    const deltaY = e.clientY - cur.startY

    // Auto-scroll when dragging near viewport edges
    const margin = 80
    if (e.clientY < margin) {
      window.scrollBy({ top: -8, behavior: 'auto' })
    } else if (e.clientY > window.innerHeight - margin) {
      window.scrollBy({ top: 8, behavior: 'auto' })
    }

    const { dragIndex, itemHeights, itemTops } = cur
    const draggedHeight = itemHeights[dragIndex] || 60
    const draggedCenterY = itemTops[dragIndex] + draggedHeight / 2 + deltaY

    // Determine target slot
    let newOver = dragIndex
    for (let i = 0; i < itemTops.length; i++) {
      const h = itemHeights[i] || 60
      const mid = itemTops[i] + h / 2
      if (dragIndex < i) {
        if (draggedCenterY > mid - 8) newOver = i
      } else if (dragIndex > i) {
        if (draggedCenterY < mid + 8) newOver = Math.min(newOver, i)
      }
    }
    newOver = Math.max(0, Math.min(itemTops.length - 1, newOver))

    if (newOver !== cur.overIndex) {
      if (S.haptics !== false && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10)
      }
    }

    setDragState(prev => prev ? {
      ...prev,
      offsetY: deltaY,
      overIndex: newOver
    } : null)
  }, [S.haptics])

  const endDrag = useCallback(e => {
    const cur = dragRef.current
    if (!cur || cur.isDropping) return
    try {
      if (e?.currentTarget?.releasePointerCapture && e.pointerId !== undefined) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {}

    const { dragIndex, overIndex, itemTops } = cur
    if (dragIndex === overIndex) {
      setDragState(prev => prev ? { ...prev, isDropping: true, offsetY: 0 } : null)
      setTimeout(() => setDragState(null), 180)
      return
    }

    const targetOffset = itemTops[overIndex] - itemTops[dragIndex]
    setDragState(prev => prev ? { ...prev, isDropping: true, offsetY: targetOffset } : null)

    if (S.haptics !== false && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(18)
    }

    setTimeout(() => {
      edit(ex => {
        const [moved] = ex.splice(dragIndex, 1)
        ex.splice(overIndex, 0, moved)
        cleanupSg(ex)
      })
      setDragState(null)
    }, 220)
  }, [S.haptics, id])

  // Global window listeners while drag is active so cursor outside handle still smoothly tracks
  useEffect(() => {
    if (!dragState || dragState.isDropping) return
    const handleMove = ev => onPointerMove(ev)
    const handleUp = ev => endDrag(ev)
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [dragState?.dragIndex, dragState?.isDropping, onPointerMove, endDrag])

  const getItemStyle = i => {
    if (!dragState) return {}
    const { dragIndex, overIndex, offsetY, itemHeights, isDropping } = dragState
    const gap = 8

    if (i === dragIndex) {
      return {
        transform: `translate3d(0, ${offsetY}px, 0) scale(${isDropping ? 1 : 1.025})`,
        zIndex: isDropping ? 40 : 50,
        boxShadow: isDropping ? 'none' : '0 14px 32px -4px rgba(0, 0, 0, 0.45), 0 0 0 2px var(--acc)',
        transition: isDropping ? 'transform 0.22s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.22s ease' : 'none',
        pointerEvents: isDropping ? 'none' : 'auto'
      }
    }

    const draggedHeight = (itemHeights[dragIndex] || 60) + gap

    let translate = 0
    if (dragIndex < overIndex) {
      if (i > dragIndex && i <= overIndex) {
        translate = -draggedHeight
      }
    } else if (dragIndex > overIndex) {
      if (i >= overIndex && i < dragIndex) {
        translate = draggedHeight
      }
    }

    return {
      transform: `translate3d(0, ${translate}px, 0)`,
      transition: 'transform 0.24s cubic-bezier(0.2, 0, 0, 1)',
      pointerEvents: 'none'
    }
  }

  const units = supersetUnits(r.ex)
  const unitFirst = new Set(units.filter(u => u.length > 1).map(u => u[0]))
  const inSS = new Set(units.filter(u => u.length > 1).flat())

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/plan')} aria-label={t('Plan')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, margin: '0 12px' }}>
        <input className="input" defaultValue={r.name} style={{ fontWeight: 600, fontSize: 20, letterSpacing: '-.021em' }}
          onChange={e => update(s => { s.routines.find(x => x.id === id).name = e.target.value.trim() || t('Routine') })} />
      </div>
      <button className="iconbtn" aria-label={t('Pick an icon')} onClick={() => glyphPicker(r.emoji, g => update(s => { s.routines.find(x => x.id === id).emoji = g }))}><Icon name={glyphOf(r.emoji)} /></button>
    </div>

    <div className="sect-b" style={{ marginBottom: 16 }}>
      <SelectRow icon="chartLine" title={t('Progression')} sheetTitle={t('Progression')}
        value={r.prog || 'linear'} onChange={v => update(s => { s.routines.find(x => x.id === id).prog = v })}
        options={POLICIES_FOR.reps.map(p => ({ value: p, label: t(POLICY_NAME[p]), subtitle: t(POLICY_DESC[p]) }))} />
    </div>
    <div className="small dim" style={{ margin: '-10px 2px 16px' }}>
      {t('Applies to every exercise in this routine that does not set its own rule.')}
    </div>

    {r.ex.length ? (
      <div className="routine-reorder-list" ref={listRef}>
        {r.ex.map((e, i) => {
          const ex = exOr(e.id)
          const linkedPrev = i > 0 && e.sg && r.ex[i - 1].sg === e.sg
          const isItemDragged = dragState?.dragIndex === i

          return (
            <div
              key={e._uid || (e.id + '_' + i)}
              className={'routine-item-wrap' + (isItemDragged ? ' is-dragged' : '') + (dragState && !dragState.isDropping && isItemDragged ? ' is-active-drag' : '') + (dragState?.isDropping && isItemDragged ? ' is-dropping' : '')}
              style={getItemStyle(i)}
            >
              {unitFirst.has(i) && <div className="ss-label"><Icon name="link" />{t('Superset')}</div>}
              <div
                className={'item' + (inSS.has(i) ? ' in-ss' : '')}
                onClick={() => {
                  if (dragState) return
                  exConfigSheet(
                    ex,
                    e,
                    cfg => edit(x => { x[i] = { id: x[i].id, sg: x[i].sg, ...cfg } }),
                    () => edit(x => { x.splice(i, 1); cleanupSg(x) }),
                    r,
                    newEx => edit(x => { x[i] = { ...x[i], id: newEx.id } })
                  )
                }}
              >
                <button
                  type="button"
                  className={'iconbtn drag-handle' + (isItemDragged ? ' dragging' : '')}
                  aria-label={t('Drag to reorder')}
                  title={t('Drag to reorder')}
                  style={{
                    width: 28,
                    height: 44,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 'none',
                    marginRight: -4,
                    color: isItemDragged ? 'var(--acc)' : 'var(--label-2)'
                  }}
                  onPointerDown={ev => startDrag(i, ev)}
                >
                  <Icon name="grip" style={{ fontSize: 18 }} />
                </button>

                <Thumb ex={ex} />
                <div className="grow">
                  <div className="tt capitalize">{t(ex.n)}</div>
                  <div className="ss">{exLine(e, S.unit)}</div>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-swap-ex"
                    style={{ padding: '3px 7px', fontSize: 11 }}
                    onClick={ev => {
                      ev.stopPropagation()
                      changeExerciseSheet(ex, newEx => edit(x => { x[i] = { ...x[i], id: newEx.id } }))
                    }}
                    title={t('Change / Swap exercise')}
                  >
                    <Icon name="shuffle" style={{ fontSize: 11 }} />
                    <span>{t('Change')}</span>
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 'none', alignItems: 'center' }}>
                    {i > 0 && (
                      <button
                        className={'iconbtn' + (linkedPrev ? ' on-ss' : '')}
                        title={t('Superset with exercise above')}
                        style={{ width: 32, height: 28, borderRadius: 8, fontSize: 15 }}
                        onClick={ev => { ev.stopPropagation(); toggleLink(i) }}
                      >
                        <Icon name="link" />
                      </button>
                    )}
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button
                        className="iconbtn"
                        aria-label="Move up"
                        style={{ width: 28, height: 24, borderRadius: 7, fontSize: 12 }}
                        onClick={ev => { ev.stopPropagation(); move(i, -1) }}
                      >
                        <Icon name="chevronUp" />
                      </button>
                      <button
                        className="iconbtn"
                        aria-label="Move down"
                        style={{ width: 28, height: 24, borderRadius: 7, fontSize: 12 }}
                        onClick={ev => { ev.stopPropagation(); move(i, 1) }}
                      >
                        <Icon name="chevronDown" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    ) : (
      <div className="empty">
        <div className="ico"><Icon name="dumbbell" /></div>
        {t('No exercises yet — add your first one.')}
      </div>
    )}

    {/* Coverage of the routine as planned, so a gap shows up while you're building it
        rather than after a month of training around it. */}
    {r.ex.length > 0 && (() => {
      const load = loadOfRoutine(r)
      const { worked } = rankOf(load)
      return <div className="card" style={{ marginTop: 12 }}>
        <h2>{t('What this session hits')}</h2>
        <BodyMap load={load} body={S.body} />
        <div className="mchips">
          {worked.slice(0, 6).map(m => <span key={m} className="mchip">{t(MUSCLE_NAME[m])}</span>)}
        </div>
      </div>
    })()}

    <div className="small dim row" style={{ margin: '10px 2px', gap: 5 }}><Icon name="link" style={{ fontSize: 13 }} />{t('Tap the link button on an exercise to superset it with the one above — you’ll do them back-to-back.')}</div>
    <Button variant="primary" onClick={() => exercisePicker(ex => exConfigSheet(ex, null, cfg => edit(x => { x.push({ id: ex.id, _uid: 'ex_' + uid(), ...cfg }) }), null, r))} icon="plus">{t('Add exercise')}</Button>
    <div style={{ height: 10 }} />
    <Button variant="danger" onClick={() => confirmSheet({
      title: t('Delete routine?'), message: t('“{0}” and its exercises will be removed.', r.name), confirmText: t('Delete'), danger: true,
      onConfirm: () => {
        update(s => {
          s.routines = s.routines.filter(x => x.id !== id)
          Object.keys(s.week).forEach(k => { if (s.week[k] === id) delete s.week[k] })
          Object.keys(s.dayPlan).forEach(k => { if (s.dayPlan[k] === id) delete s.dayPlan[k] })
        })
        nav('/plan')
      }
    })}>{t('Delete routine')}</Button>
  </div>
}
