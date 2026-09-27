import { useState, useMemo } from 'react'
import { getTopExercisesVolumeProgress } from '../lib/volume-progress.js'
import TopExercisesVolumeD3Chart, { SERIES_COLORS } from './TopExercisesVolumeD3Chart.jsx'
import Icon from './Icon.jsx'
import { fmtVol, fmtNum } from '../lib/format.js'
import { t } from '../lib/i18n.js'

/**
 * TopExercisesVolumeCard
 *
 * Card on the stats screen that uses D3 to plot the volume progress
 * of the top 3 most used exercises over the last 3 months.
 */
export default function TopExercisesVolumeCard({ S }) {
  const [selectedExId, setSelectedExId] = useState(null)

  // Compute top 3 most used exercises in the last 3 months
  const { exercises, timeRange, totalWorkoutsInWindow } = useMemo(() => {
    return getTopExercisesVolumeProgress(S.workouts || [], {
      days: 90,
      limit: 3,
      now: Date.now(),
      allTimeFallback: true
    })
  }, [S.workouts])

  // Total volume summed across the top 3 exercises in this window
  const combinedVolume = useMemo(() => {
    return exercises.reduce((acc, ex) => acc + (ex.totalVolume || 0), 0)
  }, [exercises])

  if (!exercises || exercises.length === 0) {
    return null
  }

  const handleToggleExercise = id => {
    setSelectedExId(cur => (cur === id ? null : id))
  }

  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 10, alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0 }}>
            {t('Top exercises volume')}{' '}
            <span className="dim" style={{ textTransform: 'none', letterSpacing: 0, fontSize: '13px', fontWeight: 500 }}>
              · {t('last 3 months')}
            </span>
          </h2>
          <div className="small dim" style={{ marginTop: 2 }}>
            {t('Volume progress of the top 3 most used exercises')}
          </div>
        </div>

        {selectedExId && (
          <button
            className="small accent"
            onClick={() => setSelectedExId(null)}
            style={{ fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: 'var(--surface-2)' }}
          >
            {t('Show all 3')}
          </button>
        )}
      </div>

      {/* Interactive Legend / Exercise Pills */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: exercises.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px',
          marginBottom: '14px'
        }}
      >
        {exercises.map((ex, idx) => {
          const color = SERIES_COLORS[idx % SERIES_COLORS.length]
          const isSelected = selectedExId === ex.id
          const isDimmed = selectedExId && !isSelected

          return (
            <div
              key={ex.id}
              onClick={() => handleToggleExercise(ex.id)}
              role="button"
              tabIndex={0}
              title={isSelected ? t('Click to show all') : t('Click to focus line')}
              style={{
                background: isSelected
                  ? 'color-mix(in srgb, var(--surface-2) 90%, ' + color + ')'
                  : 'var(--surface-2, rgba(255,255,255,0.04))',
                border: isSelected
                  ? `1.5px solid ${color}`
                  : '1px solid var(--sep, rgba(255,255,255,0.08))',
                borderRadius: 'var(--r-md, 10px)',
                padding: '8px 10px',
                cursor: 'pointer',
                opacity: isDimmed ? 0.45 : 1,
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: color,
                    flexShrink: 0,
                    boxShadow: isSelected ? `0 0 6px ${color}` : 'none'
                  }}
                />
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textTransform: 'capitalize'
                  }}
                >
                  {t(ex.name)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '2px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--label)' }}>
                  {fmtVol(ex.totalVolume, S.unit)}
                </span>
                <span className="dim" style={{ fontSize: '11px' }}>
                  {t('{0} sessions', ex.sessions)}
                </span>
              </div>

              {ex.growthPct !== null && (
                <div style={{ fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                  <span
                    style={{
                      color: ex.growth >= 0 ? 'var(--green, #30d158)' : 'var(--red, #ff453a)',
                      fontWeight: 600
                    }}
                  >
                    {ex.growth >= 0 ? `+${ex.growthPct}%` : `${ex.growthPct}%`}
                  </span>
                  <span className="dim">trend</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* D3 Multi-Line Chart */}
      <div className="chart" style={{ marginTop: 4 }}>
        <TopExercisesVolumeD3Chart
          exercises={exercises}
          timeRange={timeRange}
          unit={S.unit}
          activeExerciseId={selectedExId}
          onSelectExercise={handleToggleExercise}
        />
      </div>

      {/* Summary insights footer */}
      <div
        className="row between small"
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: 'var(--hair) solid var(--sep)',
          color: 'var(--label-2)'
        }}
      >
        <span>
          {t('Combined volume:')}{' '}
          <b style={{ color: 'var(--label)' }}>{fmtVol(combinedVolume, S.unit)}</b>
        </span>
        <span className="dim" style={{ fontSize: '11.5px' }}>
          {t('Tap an exercise to isolate its curve')}
        </span>
      </div>
    </div>
  )
}
