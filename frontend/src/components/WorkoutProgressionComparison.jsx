import { useState, useMemo } from 'react'
import { fmtVol, fmtDate } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import {
  getPreviousSessions,
  compareWorkoutProgression
} from '../lib/workout-progression.js'

/**
 * WorkoutProgressionComparison — Post-workout progression comparison card.
 * Compares the current workout's intensity (average load per rep) and volume
 * against the user's previous 3 sessions to provide meaningful progression feedback.
 */
export default function WorkoutProgressionComparison({
  workout,
  allWorkouts = [],
  unit = 'kg'
}) {
  // If workout has a routineId, check if routine-specific previous sessions exist
  const hasRoutineMatches = useMemo(() => {
    if (!workout?.routineId) return false
    const matches = (allWorkouts || []).filter(
      w => w && w.id !== workout.id && w.routineId === workout.routineId
    )
    return matches.length > 0
  }, [workout, allWorkouts])

  // Default to 'routine' if matching routine history exists, otherwise 'all'
  const [scope, setScope] = useState(hasRoutineMatches ? 'routine' : 'all')
  const [showSessionList, setShowSessionList] = useState(false)

  // Retrieve previous sessions (up to 3) based on scope
  const previousSessions = useMemo(() => {
    return getPreviousSessions(workout, allWorkouts, {
      limit: 3,
      matchRoutine: scope === 'routine' && hasRoutineMatches
    })
  }, [workout, allWorkouts, scope, hasRoutineMatches])

  // Compute comparison analysis
  const comparison = useMemo(() => {
    return compareWorkoutProgression(workout, previousSessions, unit)
  }, [workout, previousSessions, unit])

  if (!workout) return null

  const { volume, intensity, feedback, sessions, hasBaseline, sessionsCount } = comparison

  // Max values for mini bar charts
  const maxVol = Math.max(...sessions.map(s => s.volume || 0), 1)
  const maxIntensity = Math.max(...sessions.map(s => s.intensity || 0), 1)

  const isUp = (pct) => pct > 1.5
  const isDown = (pct) => pct < -1.5

  return (
    <div className="pws-progression-wrap" style={{ textAlign: 'left', marginTop: 14 }}>
      {/* Header with scope toggle if routine matches exist */}
      <div className="pws-prog-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <div>
          <h4 className="sec" style={{ margin: 0, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--label-2)' }}>
            {t('Progression feedback')}
          </h4>
          <div className="small muted" style={{ fontSize: 11.5, marginTop: 2 }}>
            {hasBaseline
              ? t('vs previous {0} sessions', sessionsCount)
              : t('First session baseline')}
          </div>
        </div>

        {hasRoutineMatches && (
          <div className="pws-scope-toggle" style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 7, padding: 2, gap: 2 }}>
            <button
              type="button"
              onClick={() => setScope('routine')}
              className={`pws-scope-btn ${scope === 'routine' ? 'active' : ''}`}
              style={{
                border: 'none',
                background: scope === 'routine' ? 'var(--surface)' : 'transparent',
                color: scope === 'routine' ? 'var(--label)' : 'var(--label-3)',
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 5,
                cursor: 'pointer',
                boxShadow: scope === 'routine' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {t('Routine')}
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`pws-scope-btn ${scope === 'all' ? 'active' : ''}`}
              style={{
                border: 'none',
                background: scope === 'all' ? 'var(--surface)' : 'transparent',
                color: scope === 'all' ? 'var(--label)' : 'var(--label-3)',
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 5,
                cursor: 'pointer',
                boxShadow: scope === 'all' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {t('All')}
            </button>
          </div>
        )}
      </div>

      {/* Meaningful progression feedback banner */}
      <div
        className={`pws-feedback-card pws-feedback-${feedback.type || 'steady'}`}
        style={{
          background: feedback.trend === 'up'
            ? 'color-mix(in srgb, var(--acc) 10%, var(--surface))'
            : feedback.trend === 'down'
            ? 'color-mix(in srgb, var(--orange) 10%, var(--surface))'
            : 'var(--surface)',
          border: `1px solid ${
            feedback.trend === 'up'
              ? 'color-mix(in srgb, var(--acc) 30%, transparent)'
              : feedback.trend === 'down'
              ? 'color-mix(in srgb, var(--orange) 30%, transparent)'
              : 'var(--sep)'
          }`,
          borderRadius: 'var(--r-card, 12px)',
          padding: '12px 14px',
          marginBottom: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 13, color: feedback.trend === 'up' ? 'var(--acc)' : feedback.trend === 'down' ? 'var(--orange)' : 'var(--label)' }}>
            <Icon
              name={feedback.trend === 'up' ? 'trendUp' : feedback.trend === 'down' ? 'trendDown' : 'target'}
              style={{ fontSize: 16 }}
            />
            <span>{feedback.title}</span>
          </div>
          {feedback.badge && (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.02em',
                color: feedback.trend === 'up' ? 'var(--acc)' : feedback.trend === 'down' ? 'var(--orange)' : 'var(--label-2)',
                background: feedback.trend === 'up'
                  ? 'color-mix(in srgb, var(--acc) 16%, transparent)'
                  : feedback.trend === 'down'
                  ? 'color-mix(in srgb, var(--orange) 16%, transparent)'
                  : 'var(--surface-2)',
                padding: '2px 6px',
                borderRadius: 4
              }}
            >
              {feedback.badge}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--label-2)' }}>
          {feedback.description}
        </div>
      </div>

      {/* Dual comparison grid: Intensity & Volume */}
      <div
        className="pws-metric-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
          marginBottom: 12
        }}
      >
        {/* Intensity Metric Card */}
        <div
          className="pws-metric-card"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--sep)',
            borderRadius: 'var(--r-card, 12px)',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--label-3)' }}>
                {t('Intensity')}
              </span>
              {hasBaseline && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    color: isUp(intensity.pct) ? 'var(--acc)' : isDown(intensity.pct) ? 'var(--orange)' : 'var(--label-3)'
                  }}
                >
                  {intensity.pct > 0 ? `+${intensity.pct}%` : `${intensity.pct}%`}
                </span>
              )}
            </div>

            <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'monospace', color: 'var(--label)', lineHeight: 1.2 }}>
              {intensity.current > 0 ? `${intensity.current} ${unit}` : '—'}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--label-3)', marginTop: 2 }}>
              {t('load / rep')}
              {hasBaseline && ` · ${t('avg {0}', `${intensity.avgPrev} ${unit}`)}`}
            </div>
          </div>

          {/* Mini 4-bar sparkline for intensity */}
          {sessions.length > 1 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: 26, gap: 5 }}>
                {sessions.map((sess, idx) => {
                  const hRatio = maxIntensity > 0 ? Math.max(0.12, (sess.intensity || 0) / maxIntensity) : 0.12
                  return (
                    <div
                      key={sess.id || idx}
                      title={`${sess.name || t('Session')}: ${sess.intensity || 0} ${unit}/rep`}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        height: '100%'
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: `${Math.round(hRatio * 100)}%`,
                          borderRadius: '3px 3px 1px 1px',
                          background: sess.isCurrent
                            ? 'var(--acc)'
                            : 'color-mix(in srgb, var(--label-3) 45%, transparent)',
                          transition: 'height 0.3s ease'
                        }}
                      />
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--label-3)', marginTop: 3 }}>
                <span>{t('Prev')}</span>
                <span style={{ fontWeight: 600, color: 'var(--acc)' }}>{t('Now')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Volume Metric Card */}
        <div
          className="pws-metric-card"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--sep)',
            borderRadius: 'var(--r-card, 12px)',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--label-3)' }}>
                {t('Volume')}
              </span>
              {hasBaseline && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    color: isUp(volume.pct) ? 'var(--acc)' : isDown(volume.pct) ? 'var(--orange)' : 'var(--label-3)'
                  }}
                >
                  {volume.pct > 0 ? `+${volume.pct}%` : `${volume.pct}%`}
                </span>
              )}
            </div>

            <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'monospace', color: 'var(--label)', lineHeight: 1.2 }}>
              {fmtVol(volume.current, unit)}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--label-3)', marginTop: 2 }}>
              {t('tonnage')}
              {hasBaseline && ` · ${t('avg {0}', fmtVol(volume.avgPrev, unit))}`}
            </div>
          </div>

          {/* Mini 4-bar sparkline for volume */}
          {sessions.length > 1 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: 26, gap: 5 }}>
                {sessions.map((sess, idx) => {
                  const hRatio = maxVol > 0 ? Math.max(0.12, (sess.volume || 0) / maxVol) : 0.12
                  return (
                    <div
                      key={sess.id || idx}
                      title={`${sess.name || t('Session')}: ${fmtVol(sess.volume || 0, unit)}`}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        height: '100%'
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: `${Math.round(hRatio * 100)}%`,
                          borderRadius: '3px 3px 1px 1px',
                          background: sess.isCurrent
                            ? 'var(--acc)'
                            : 'color-mix(in srgb, var(--label-3) 45%, transparent)',
                          transition: 'height 0.3s ease'
                        }}
                      />
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--label-3)', marginTop: 3 }}>
                <span>{t('Prev')}</span>
                <span style={{ fontWeight: 600, color: 'var(--acc)' }}>{t('Now')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Session-by-session breakdown accordion / toggle */}
      {sessions.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setShowSessionList(prev => !prev)}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11.5,
              fontWeight: 600,
              color: 'var(--label-2)',
              cursor: 'pointer'
            }}
          >
            <Icon
              name={showSessionList ? 'chevronUp' : 'chevronDown'}
              style={{ fontSize: 13, color: 'var(--acc)' }}
            />
            <span>{showSessionList ? t('Hide session history') : t('View session-by-session history')}</span>
          </button>

          {showSessionList && (
            <div
              style={{
                marginTop: 6,
                background: 'var(--surface)',
                border: '1px solid var(--sep)',
                borderRadius: 'var(--r-card, 10px)',
                overflow: 'hidden',
                fontSize: 11.5
              }}
            >
              {sessions.map((sess, idx) => (
                <div
                  key={sess.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    borderBottom: idx < sessions.length - 1 ? '1px solid var(--sep)' : 'none',
                    background: sess.isCurrent ? 'color-mix(in srgb, var(--acc) 8%, var(--surface))' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    {sess.isCurrent ? (
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 3,
                          background: 'var(--acc)',
                          color: 'var(--on-acc, #000)'
                        }}
                      >
                        {t('Today')}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--label-3)', fontFamily: 'monospace' }}>
                        #{sessions.length - 1 - idx}
                      </span>
                    )}
                    <span
                      style={{
                        color: sess.isCurrent ? 'var(--label)' : 'var(--label-2)',
                        fontWeight: sess.isCurrent ? 600 : 400,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {sess.date ? fmtDate(sess.date) : sess.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'monospace', flexShrink: 0 }}>
                    <span title={t('Volume')} style={{ color: 'var(--label)' }}>
                      {fmtVol(sess.volume || 0, unit)}
                    </span>
                    <span aria-hidden="true" style={{ color: 'var(--sep)' }}>·</span>
                    <span title={t('Intensity')} style={{ color: sess.isCurrent ? 'var(--acc)' : 'var(--label-2)' }}>
                      {sess.intensity > 0 ? `${sess.intensity} ${unit}` : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
