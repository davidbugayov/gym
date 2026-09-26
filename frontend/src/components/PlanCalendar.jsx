import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { MONTHS_LONG, DAYN, fmtDate, fmtDur, fmtVol, fmtNum, durPart, exCount, todayISO } from '../lib/format.js'
import { effectiveRoutine, effectiveRoutineId, setsDone, setLabel } from '../lib/history.js'
import { glyphOf } from '../lib/glyphs.js'
import { exOr } from '../lib/exercises.js'
import { workoutDetailSheet, dayOverrideSheet, startFlow, calendarSyncSheet, singleWorkoutCalendarSheet } from '../sheets.jsx'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export default function PlanCalendar({ onSwitchToSchedule }) {
  const S = useStore(s => s.S)
  const [cur, setCur] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const [selectedDate, setSelectedDate] = useState(() => todayISO())

  const y = cur.getFullYear()
  const mo = cur.getMonth()

  // Workouts grouped by ISO date
  const byDay = {}
  S.workouts.forEach(w => {
    if (!w.d) return
    if (!byDay[w.d]) byDay[w.d] = []
    byDay[w.d].push(w)
  })

  // Monthly stats
  const monthPrefix = `${y}-${String(mo + 1).padStart(2, '0')}`
  const monthWs = S.workouts.filter(w => w.d && w.d.startsWith(monthPrefix))
  const monthVol = monthWs.reduce((acc, w) => acc + (w.vol || 0), 0)
  const monthMs = monthWs.reduce((acc, w) => acc + Math.max(0, (w.end || w.start) - w.start), 0)
  const uniqueDays = new Set(monthWs.map(w => w.d)).size

  // Calendar grid math (Monday-based week)
  const startOffset = (new Date(y, mo, 1).getDay() + 6) % 7
  const daysIn = new Date(y, mo + 1, 0).getDate()

  const prevMonth = () => setCur(new Date(y, mo - 1, 1))
  const nextMonth = () => setCur(new Date(y, mo + 1, 1))
  const goToday = () => {
    const d = new Date()
    d.setDate(1)
    setCur(d)
    setSelectedDate(todayISO())
  }

  // Selected date details
  const selWs = byDay[selectedDate] || []
  const selPlanned = effectiveRoutine(S, selectedDate)
  const selIsToday = selectedDate === todayISO()
  const selDayOfWeek = new Date(selectedDate + 'T12:00:00').getDay()
  const selHasOvr = S.dayPlan[selectedDate] !== undefined

  return (
    <div className="plan-cal-wrap">
      {/* Month Toolbar */}
      <div className="plan-cal-toolbar">
        <div className="plan-cal-month-nav">
          <button className="iconbtn" onClick={prevMonth} aria-label={t('Previous month')} title={t('Previous month')}>
            <Icon name="chevronLeft" />
          </button>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>
            {t(MONTHS_LONG[mo])} {y}
          </h2>
          <button className="iconbtn" onClick={nextMonth} aria-label={t('Next month')} title={t('Next month')}>
            <Icon name="chevronRight" />
          </button>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Button size="sm" variant="tinted" icon="calendar" onClick={goToday}>
            {t('Today')}
          </Button>
          <Button size="sm" variant="tinted" icon="download" onClick={calendarSyncSheet} title={t('Sync with System Calendar')}>
            {t('Sync Calendar')}
          </Button>
          {onSwitchToSchedule && (
            <Button size="sm" variant="ghost" icon="list" onClick={onSwitchToSchedule}>
              {t('Schedule')}
            </Button>
          )}
        </div>
      </div>

      {/* Monthly Summary Statistics */}
      <div className="plan-cal-stats">
        <div className="plan-cal-stat-item">
          <div className="plan-cal-stat-num">{monthWs.length}</div>
          <div className="plan-cal-stat-lbl">{t('Workouts')}</div>
        </div>
        <div className="plan-cal-stat-item">
          <div className="plan-cal-stat-num">{uniqueDays}</div>
          <div className="plan-cal-stat-lbl">{t('Days active')}</div>
        </div>
        <div className="plan-cal-stat-item">
          <div className="plan-cal-stat-num">{fmtVol(monthVol, S.unit)}</div>
          <div className="plan-cal-stat-lbl">{t('Volume')}</div>
        </div>
        <div className="plan-cal-stat-item">
          <div className="plan-cal-stat-num">{fmtDur(monthMs)}</div>
          <div className="plan-cal-stat-lbl">{t('Training time')}</div>
        </div>
      </div>

      {/* 7-Day Month Grid */}
      <div className="plan-cal-grid">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
          <div key={d} className="plan-cal-th">{t(d)}</div>
        ))}

        {/* Empty cells before month start */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} style={{ opacity: 0.2 }} />
        ))}

        {/* Days of Month */}
        {Array.from({ length: daysIn }).map((_, i) => {
          const d = i + 1
          const iso = `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          const ws = byDay[iso] || []
          const hasDone = ws.length > 0
          const plannedR = effectiveRoutine(S, iso)
          const isToday = iso === todayISO()
          const isSelected = iso === selectedDate

          const cellClasses = [
            'plan-cal-cell',
            hasDone ? 'completed' : '',
            !hasDone && plannedR ? 'planned' : '',
            isToday ? 'today' : '',
            isSelected ? 'selected' : ''
          ].filter(Boolean).join(' ')

          const totalVol = ws.reduce((sum, w) => sum + (w.vol || 0), 0)

          return (
            <div
              key={d}
              className={cellClasses}
              onClick={() => setSelectedDate(iso)}
              role="button"
              tabIndex={0}
              title={`${fmtDate(iso, true)}: ${hasDone ? `${ws.length} ${t('completed')}` : plannedR ? plannedR.name : t('Rest')}`}
            >
              <div className="plan-cal-cell-head">
                <span className="plan-cal-cell-num">{d}</span>
                {hasDone ? (
                  <span className="plan-cal-cell-dot" />
                ) : plannedR ? (
                  <Icon name={glyphOf(plannedR.emoji)} style={{ fontSize: 10, color: 'var(--label-2)' }} />
                ) : null}
              </div>

              {hasDone ? (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                  <span className="plan-cal-cell-chip">
                    {ws.length > 1 ? `${ws.length}×` : ws[0].name.replace(/^Freeletics · /, '')}
                  </span>
                  {totalVol > 0 && (
                    <span style={{ fontSize: 9, color: 'var(--acc)', fontWeight: 600 }}>
                      {fmtVol(totalVol, S.unit)}
                    </span>
                  )}
                </div>
              ) : plannedR ? (
                <div className="plan-cal-cell-plan-name">
                  {plannedR.name}
                </div>
              ) : (
                <div style={{ height: 14 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="cal-legend" style={{ margin: '4px 0 6px' }}>
        <span><i style={{ background: 'var(--acc)' }} />{t('Completed')}</span>
        <span><i style={{ background: 'var(--label-3)' }} />{t('Planned')}</span>
        <span><i style={{ background: 'var(--orange)' }} />{t('Rescheduled')}</span>
      </div>

      {/* Selected Day Interactive Summary */}
      <div className="plan-day-summary">
        <div className="plan-day-summary-hd">
          <div>
            <h3 style={{ margin: 0, fontSize: 17 }}>
              {fmtDate(selectedDate, true)}
              {selIsToday && <span className="tag acc" style={{ marginLeft: 8, fontSize: 11 }}>{t('Today')}</span>}
            </h3>
            <div className="small muted">
              {t(DAYN[selDayOfWeek])} · {selWs.length ? t('{0} workouts completed', selWs.length) : selPlanned ? t('Planned: {0}', selPlanned.name) : t('Rest day')}
            </div>
          </div>
          <Button size="sm" variant="tinted" icon="pencil" onClick={() => dayOverrideSheet(selectedDate)}>
            {t('Plan / Change')}
          </Button>
        </div>

        {/* If workouts were completed on this day */}
        {selWs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {selWs.map(w => {
              const dur = Math.max(0, (w.end || w.start) - w.start)
              const setsCount = setsDone(w)
              const glyph = glyphOf((S.routines.find(r => r.id === w.routineId) || {}).emoji)

              return (
                <div key={w.id} className="plan-day-workout-card">
                  <div className="row between" style={{ alignItems: 'center' }}>
                    <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                      <span className="lrow-i" style={{ width: 32, height: 32, borderRadius: 8, fontSize: 18 }}>
                        <Icon name={glyph} />
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{w.name}</div>
                        <div className="small muted">
                          {[fmtDur(dur), t('{0} sets', setsCount), fmtVol(w.vol, S.unit)].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </div>
                    {w.prs && w.prs.length > 0 && (
                      <span className="pr" style={{ fontSize: 11 }}>
                        <Icon name="trophy" /> {w.prs.length} PR
                      </span>
                    )}
                  </div>

                  {/* Exercises breakdown */}
                  {w.entries && w.entries.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                      {w.entries.map((e, idx) => {
                        const ex = exOr(e.id)
                        const completedSets = (e.sets || []).filter(s => s.done)
                        return (
                          <div key={idx} className="row between" style={{ fontSize: 13, padding: '3px 6px', borderRadius: 6, background: 'var(--surface)' }}>
                            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{ex.n}</span>
                            <span className="small muted">
                              {completedSets.map(s => setLabel(e.id, s, e.target)).join(', ') || t('no sets')}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="row" style={{ gap: 8, marginTop: 6 }}>
                    <Button size="sm" variant="tinted" icon="info" onClick={() => workoutDetailSheet(w)}>
                      {t('View workout details')}
                    </Button>
                    {w.routineId && (
                      <Button size="sm" variant="ghost" icon="play" onClick={() => startFlow(w.routineId)}>
                        {t('Repeat workout')}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : selPlanned ? (
          /* Planned routine for this day */
          <div className="plan-day-workout-card">
            <div className="row between" style={{ alignItems: 'center' }}>
              <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <span className="lrow-i" style={{ width: 34, height: 34, borderRadius: 8, fontSize: 19 }}>
                  <Icon name={glyphOf(selPlanned.emoji)} />
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{selPlanned.name}</div>
                  <div className="small muted">{exCount(selPlanned.ex.length)} {selHasOvr ? `· ${t('rescheduled')}` : ''}</div>
                </div>
              </div>
              <Button size="sm" variant="primary" icon="play" onClick={() => startFlow(selPlanned.id)}>
                {t('Start')}
              </Button>
            </div>

            {selPlanned.ex && selPlanned.ex.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {selPlanned.ex.map((e, idx) => {
                  const ex = exOr(e.id)
                  return (
                    <span key={idx} className="tag" style={{ textTransform: 'capitalize', fontSize: 12 }}>
                      {ex.n}
                    </span>
                  )
                })}
              </div>
            )}

            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              <Button size="sm" variant="tinted" icon="calendar" onClick={() => singleWorkoutCalendarSheet(selPlanned, selectedDate)}>
                {t('Add to Calendar')}
              </Button>
            </div>
          </div>
        ) : (
          /* Rest day */
          <div style={{ padding: '16px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span className="lrow-i" style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface-3)', fontSize: 20 }}>
              <Icon name="moon" />
            </span>
            <div>
              <div style={{ fontWeight: 600 }}>{t('Rest Day')}</div>
              <div className="small muted">{t('No workout scheduled for this date.')}</div>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              <Button size="sm" variant="tinted" icon="calendar" onClick={() => dayOverrideSheet(selectedDate)}>
                {t('Schedule workout')}
              </Button>
              <Button size="sm" variant="ghost" icon="play" onClick={() => startFlow(null)}>
                {t('Freestyle session')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
