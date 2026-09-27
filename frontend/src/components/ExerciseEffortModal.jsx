import { useState, useMemo } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { getExerciseEffortHistory, displayScale, toScale, effortLevel, EFFORT_ROWS } from '../lib/effort.js'
import { fmtNum, fmtDate } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { Thumb } from './Media.jsx'
import Icon from './Icon.jsx'
import { Button, Segmented } from './ui.jsx'

/**
 * ExerciseEffortModal — Detailed modal/sheet displaying chronological RPE/RIR effort history,
 * specific session values and dates, detailed set-by-set breakdown, and scale comparison.
 */
export default function ExerciseEffortModal({ exercise, workouts = null, close }) {
  const S = useStore(s => s.S)
  const defaultScale = displayScale(S)
  const [scale, setScale] = useState(defaultScale)
  const [timeRange, setTimeRange] = useState('all') // '3m' | '1y' | 'all'
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [showGuide, setShowGuide] = useState(false)

  const allWorkouts = workouts || S.workouts || []
  const exerciseId = exercise?.id || exercise

  // Get all recorded effort sessions for this exercise (unlimited)
  const rawSessions = useMemo(() => {
    return getExerciseEffortHistory({ ...S, workouts: allWorkouts }, exerciseId, 0)
  }, [allWorkouts, exerciseId, S.effort])

  // Filter sessions according to selected time range ('3m', '1y', 'all')
  const filteredRawSessions = useMemo(() => {
    if (!rawSessions || !rawSessions.length) return []
    if (timeRange === 'all') return rawSessions

    const now = Date.now()
    const days = timeRange === '3m' ? 90 : 365
    const cutoffMs = now - days * 86400000

    return rawSessions.filter(s => {
      const sessionMs = s.ts || (s.date ? new Date(s.date + 'T12:00:00').getTime() : 0)
      return sessionMs >= cutoffMs
    })
  }, [rawSessions, timeRange])

  // Map filtered sessions to user's currently selected scale (RPE or RIR)
  const sessions = useMemo(() => {
    return filteredRawSessions.map(s => {
      const val = toScale(scale, s.rir)
      const lvl = effortLevel(s.rir)
      return {
        ...s,
        val,
        level: lvl,
        scale
      }
    })
  }, [filteredRawSessions, scale])

  if (!rawSessions || rawSessions.length === 0) {
    return (
      <div className="effort-modal-content">
        <div className="effort-modal-header">
          {exercise?.n && <Thumb ex={exercise} />}
          <div>
            <h3>{exercise?.n ? t(exercise.n) : t('Exercise Effort')}</h3>
            <div className="dim small">{t('No rated sets recorded yet')}</div>
          </div>
        </div>
        <div className="effort-empty-state">
          <Icon name="gauge" className="effort-empty-icon" />
          <p>{t('Rate the RPE or RIR of your working sets during workouts to see intensity trends, session-by-session comparisons, and recovery insights here.')}</p>
        </div>
        <Button variant="primary" onClick={close} style={{ width: '100%', marginTop: 16 }}>
          {t('Close')}
        </Button>
      </div>
    )
  }

  const hasFilteredSessions = sessions.length > 0
  const latest = hasFilteredSessions ? sessions[sessions.length - 1] : null
  const first = hasFilteredSessions ? sessions[0] : null
  const scaleUpper = scale.toUpperCase()

  // Calculate intensity trend (delta in RPE equivalent)
  const latestRpe = latest ? 10 - latest.rir : 0
  const firstRpe = first ? 10 - first.rir : 0
  const delta = hasFilteredSessions ? Math.round((latestRpe - firstRpe) * 10) / 10 : 0
  const trend = delta > 0.2 ? 'up' : delta < -0.2 ? 'down' : 'flat'
  const trendArrow = trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'
  const trendColor =
    trend === 'up'
      ? 'var(--orange, #ff9f0a)'
      : trend === 'down'
      ? 'var(--teal, #40c8e0)'
      : 'var(--label-3, rgba(235, 235, 245, 0.4))'

  // Average over all sessions
  const avgVal = hasFilteredSessions
    ? Math.round((sessions.reduce((acc, s) => acc + s.val, 0) / sessions.length) * 10) / 10
    : 0
  const totalSets = sessions.reduce((acc, s) => acc + (s.setsCount || 0), 0)

  // Chart coordinate calculations
  const chartW = 300
  const chartH = 90
  const padX = 24
  const padY = 16
  const usableW = chartW - padX * 2
  const usableH = chartH - padY * 2

  // Intensities where higher = harder (closer to failure)
  const intensities = sessions.map(s => 10 - s.rir)
  const minI = intensities.length ? Math.min(...intensities) : 0
  const maxI = intensities.length ? Math.max(...intensities) : 0
  const rangeI = Math.max(1, maxI - minI)

  const points = sessions.map((s, idx) => {
    const x = sessions.length === 1
      ? chartW / 2
      : padX + (idx / (sessions.length - 1)) * usableW
    const y = padY + (1 - (intensities[idx] - minI) / rangeI) * usableH
    return {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      session: s
    }
  })

  let pathD = ''
  let areaD = ''
  if (points.length === 2) {
    pathD = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
    areaD = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[1].x} ${chartH} L ${points[0].x} ${chartH} Z`
  } else if (points.length > 2) {
    pathD = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i]
      const p1 = points[i + 1]
      const mx = (p0.x + p1.x) / 2
      pathD += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`
    }
    const lastX = points[points.length - 1].x
    const firstX = points[0].x
    areaD = `${pathD} L ${lastX} ${chartH} L ${firstX} ${chartH} Z`
  }

  // Chronologically reversed sessions list (most recent first)
  const reverseSessions = [...sessions].reverse()

  return (
    <div className="effort-modal-content">
      {/* Header */}
      <div className="effort-modal-header">
        {exercise?.n && <Thumb ex={exercise} />}
        <div className="grow" style={{ minWidth: 0 }}>
          <h3 className="capitalize" style={{ margin: 0, fontSize: 19 }}>
            {exercise?.n ? t(exercise.n) : t('Exercise Effort')}
          </h3>
          <div className="dim small capitalize" style={{ marginTop: 2 }}>
            {exercise?.tg || exercise?.bp ? t(exercise.tg || exercise.bp) : ''}
            {exercise?.eq ? ` · ${t(exercise.eq)}` : ''}
          </div>
        </div>
      </div>

      {/* Filter & Scale Controls */}
      <div className="effort-controls-card">
        {/* Time Window Filter */}
        <div className="effort-control-row">
          <span className="dim small font-semibold">{t('Time Range:')}</span>
          <Segmented
            className="seg-range"
            value={timeRange}
            onChange={v => {
              setTimeRange(v)
              setSelectedSessionId(null)
            }}
            options={[
              { value: 'all', label: t('All time') },
              { value: '3m', label: t('Last 3 months') },
              { value: '1y', label: t('Last year') }
            ]}
          />
        </div>

        {/* Scale Switcher */}
        <div className="effort-control-row">
          <span className="dim small font-semibold">{t('View Scale:')}</span>
          <Segmented
            value={scale}
            onChange={setScale}
            options={[
              { value: 'rpe', label: 'RPE (1–10)' },
              { value: 'rir', label: 'RIR (0–5+)' }
            ]}
          />
        </div>
      </div>

      {!hasFilteredSessions ? (
        <div className="effort-empty-range">
          <Icon name="clock" className="effort-empty-icon" />
          <div className="font-semibold" style={{ marginBottom: 4 }}>
            {t('No effort recorded in this time range')}
          </div>
          <p className="dim small" style={{ margin: '0 0 14px' }}>
            {timeRange === '3m'
              ? t('No rated sessions found for the last 3 months.')
              : t('No rated sessions found for the last year.')}
          </p>
          <Button size="sm" onClick={() => setTimeRange('all')}>
            {t('Show All time')} ({rawSessions.length})
          </Button>
        </div>
      ) : (
        <>
          {/* Highlights Summary Grid */}
          <div className="effort-stats-grid">
            <div className="effort-stat-card">
              <div className="effort-stat-label">{t('Latest')}</div>
              <div className="effort-stat-val" style={{ color: latest.level.color }}>
                {fmtNum(latest.val)} <span className="effort-stat-unit">{scaleUpper}</span>
              </div>
              <div className="effort-stat-sub">
                {fmtDate(latest.date)}
              </div>
            </div>

            <div className="effort-stat-card">
              <div className="effort-stat-label">{t('Trend')}</div>
              <div className="effort-stat-val" style={{ color: trendColor }}>
                {trendArrow} {delta > 0 ? `+${fmtNum(delta)}` : fmtNum(delta)}
              </div>
              <div className="effort-stat-sub">
                {trend === 'up' ? t('Harder') : trend === 'down' ? t('Lighter') : t('Steady')}
              </div>
            </div>

            <div className="effort-stat-card">
              <div className="effort-stat-label">{t('Average')}</div>
              <div className="effort-stat-val">
                {fmtNum(avgVal)} <span className="effort-stat-unit">{scaleUpper}</span>
              </div>
              <div className="effort-stat-sub">
                {t('{0} sets rated', totalSets)}
              </div>
            </div>
          </div>

          {/* Visual Chart Card */}
          <div className="effort-chart-container">
            <div className="row between items-center" style={{ marginBottom: 6 }}>
              <div className="small font-semibold dim">{t('Progression Timeline')}</div>
              <div className="small dim">
                {t('{0} sessions', sessions.length)}
              </div>
            </div>

            <div className="effort-svg-wrap">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="effort-full-svg"
                aria-label="Effort trend chart"
              >
                <defs>
                  <linearGradient id="effort-chart-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--purple, #bf5af2)" stopOpacity="0.36" />
                    <stop offset="100%" stopColor="var(--purple, #bf5af2)" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Horizontal baseline guides */}
                <line x1={padX} y1={padY} x2={chartW - padX} y2={padY} stroke="var(--sep)" strokeDasharray="3 3" />
                <line x1={padX} y1={chartH / 2} x2={chartW - padX} y2={chartH / 2} stroke="var(--sep)" strokeDasharray="3 3" />
                <line x1={padX} y1={chartH - padY} x2={chartW - padX} y2={chartH - padY} stroke="var(--sep)" strokeDasharray="3 3" />

                {areaD && <path d={areaD} fill="url(#effort-chart-grad)" />}
                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="var(--purple, #bf5af2)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Points */}
                {points.map((p, idx) => {
                  const isSelected = selectedSessionId === p.session.workoutId
                  const isLatest = idx === points.length - 1
                  return (
                    <g
                      key={p.session.workoutId + idx}
                      className="effort-chart-point-group"
                      onClick={() => setSelectedSessionId(isSelected ? null : p.session.workoutId)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isSelected ? 6 : isLatest ? 4.5 : 3.5}
                        fill={p.session.level.color || 'var(--purple, #bf5af2)'}
                        stroke="var(--bg-el, #1c1c1e)"
                        strokeWidth="2"
                      />
                      {/* Value tag above point */}
                      <text
                        x={p.x}
                        y={Math.max(10, p.y - 7)}
                        textAnchor="middle"
                        className="effort-chart-tag"
                      >
                        {fmtNum(p.session.val)}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>

            {/* Date labels under chart */}
            <div className="effort-chart-dates">
              <span>{fmtDate(first.date)}</span>
              {points.length > 2 && <span>{fmtDate(points[Math.floor(points.length / 2)].session.date)}</span>}
              <span>{fmtDate(latest.date)}</span>
            </div>
          </div>
        </>
      )}

      {/* Guide / Reference Accordion */}
      <div className="effort-guide-accordion">
        <button
          type="button"
          className="effort-guide-toggle"
          onClick={() => setShowGuide(!showGuide)}
        >
          <div className="row items-center gap-2">
            <Icon name="info" className="effort-info-icon" />
            <span>{t('RPE / RIR Scale Guide & Conversions')}</span>
          </div>
          <Icon name={showGuide ? 'chevron-up' : 'chevron-down'} />
        </button>

        {showGuide && (
          <div className="effort-guide-content">
            <div className="efftbl" style={{ margin: '8px 0 10px' }}>
              <div className="r hd">
                <span className="n">{t('RIR')}</span>
                <span className="n">{t('RPE')}</span>
                <span className="f">{t('How it felt')}</span>
              </div>
              {EFFORT_ROWS.map(([rir, rpe, feel], i) => (
                <div key={rir} className={'r' + (i === 2 ? ' on' : '')}>
                  <span className="n">{rir}</span>
                  <span className="n">{rpe}</span>
                  <span className="f">{t(feel)}</span>
                </div>
              ))}
            </div>
            <div className="dim small" style={{ lineHeight: 1.45 }}>
              {t('RPE ≈ 10 − RIR. Rated working sets usually land between 1–3 RIR (7–9 RPE).')}
            </div>
          </div>
        )}
      </div>

      {/* Session History List */}
      {hasFilteredSessions && (
        <div className="effort-sessions-section">
          <div className="small font-semibold dim" style={{ marginBottom: 10 }}>
            {t('Recorded Workout Sessions')} ({sessions.length})
          </div>

          <div className="effort-sessions-list">
            {reverseSessions.map((session, sIdx) => {
              const isSelected = selectedSessionId === session.workoutId
              const isMostRecent = sIdx === 0

              return (
                <div
                  key={session.workoutId || session.date + sIdx}
                  className={`effort-session-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedSessionId(isSelected ? null : session.workoutId)}
                >
                  <div className="effort-session-top">
                    <div className="effort-session-date-col">
                      <div className="effort-session-date">
                        {fmtDate(session.date, true)}
                        {isMostRecent && <span className="effort-recent-badge">{t('Latest')}</span>}
                      </div>
                      <div className="dim small">
                        {session.setsCount} {session.setsCount === 1 ? t('set') : t('sets')} rated
                      </div>
                    </div>

                    <div className="effort-session-val-col">
                      <div
                        className="effort-session-badge"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${session.level.color} 15%, transparent)`,
                          borderColor: `color-mix(in srgb, ${session.level.color} 30%, transparent)`,
                          color: session.level.color
                        }}
                      >
                        <span className="effort-session-badge-scale">{scaleUpper}</span>
                        <span className="effort-session-badge-num">{fmtNum(session.val)}</span>
                      </div>
                      <div className="effort-session-feel dim small">
                        {scale === 'rpe'
                          ? `${session.rir} RIR (${t(session.level.feel)})`
                          : `${10 - session.rir} RPE (${t(session.level.feel)})`}
                      </div>
                    </div>
                  </div>

                  {/* Per-Set Breakdown for this session */}
                  {session.sets && session.sets.length > 0 && (
                    <div className="effort-sets-table">
                      {session.sets.map((set, setIdx) => {
                        const setVal = scale === 'rpe' ? set.rpe : set.rir
                        const otherVal = scale === 'rpe' ? set.rir : set.rpe
                        const otherScale = scale === 'rpe' ? 'RIR' : 'RPE'

                        return (
                          <div key={setIdx} className="effort-set-row">
                            <div className="effort-set-num">
                              {set.tag === 'W' ? (
                                <span className="effort-warmup-pill">{t('Warmup')}</span>
                              ) : (
                                <span>#{set.setNum || setIdx + 1}</span>
                              )}
                            </div>

                            <div className="effort-set-load">
                              {set.w != null && set.w > 0 ? (
                                <span className="effort-set-weight">{fmtNum(set.w)} {S.unit || 'kg'}</span>
                              ) : null}
                              {set.r != null ? (
                                <span className="effort-set-reps"> × {set.r} {t('reps')}</span>
                              ) : null}
                            </div>

                            <div className="effort-set-rating">
                              {setVal != null ? (
                                <span className="effort-set-rating-val">
                                  @ <strong>{fmtNum(setVal)} {scaleUpper}</strong>
                                  {otherVal != null && (
                                    <span className="dim"> ({fmtNum(otherVal)} {otherScale})</span>
                                  )}
                                </span>
                              ) : (
                                <span className="dim">—</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Done Button */}
      <div style={{ marginTop: 20 }}>
        <Button variant="primary" onClick={close} style={{ width: '100%' }}>
          {t('Done')}
        </Button>
      </div>
    </div>
  )
}

/**
 * Convenience helper to open the ExerciseEffortModal from anywhere
 */
export function openExerciseEffortModal(exercise, workouts = null) {
  return useUI.getState().openSheet(close => (
    <ExerciseEffortModal exercise={exercise} workouts={workouts} close={close} />
  ))
}
