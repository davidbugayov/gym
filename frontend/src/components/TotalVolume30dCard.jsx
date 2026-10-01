import { useMemo } from 'react'
import { getVolumeProgression30Days } from '../lib/volume-30d.js'
import TotalVolume30dD3Chart from './TotalVolume30dD3Chart.jsx'
import Icon from './Icon.jsx'
import { fmtVol, fmtDate } from '../lib/format.js'
import { t } from '../lib/i18n.js'

/**
 * TotalVolume30dCard
 *
 * Card on the Stats screen that displays the 30-day volume progression
 * bar chart using D3.js integration.
 */
export default function TotalVolume30dCard({ S }) {
  const unit = S?.unit || 'kg'
  const workouts = S?.workouts || []

  // Compute 30-day volume data
  const data = useMemo(() => {
    return getVolumeProgression30Days(workouts, {
      days: 30,
      now: Date.now()
    })
  }, [workouts])

  const {
    days,
    totalVolume,
    workoutsCount,
    activeDaysCount,
    avgWorkoutVolume,
    avgActiveDayVolume,
    peakDay,
    trendPct,
    hasData
  } = data

  if (!hasData && workouts.length === 0) {
    return null
  }

  const isUp = trendPct !== null && trendPct > 2.0
  const isDown = trendPct !== null && trendPct < -2.0

  return (
    <div className="card total-volume-30d-card">
      {/* Header */}
      <div className="row between" style={{ marginBottom: 10, alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
            <span style={{ color: 'var(--acc)', display: 'inline-flex' }}>
              <Icon name="chart" size={18} />
            </span>
            <h2 style={{ margin: 0 }}>
              {t('Total volume progression')}{' '}
              <span className="dim" style={{ textTransform: 'none', letterSpacing: 0, fontSize: '13px', fontWeight: 500 }}>
                · {t('last 30 days')}
              </span>
            </h2>
          </div>
          <div className="small dim">
            {t('Weight × reps lifted across all completed sessions')}
          </div>
        </div>

        {trendPct !== null && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'monospace',
              padding: '3px 8px',
              borderRadius: '6px',
              background: isUp
                ? 'color-mix(in srgb, var(--acc) 14%, transparent)'
                : isDown
                ? 'color-mix(in srgb, var(--orange) 14%, transparent)'
                : 'var(--surface-2)',
              color: isUp ? 'var(--acc)' : isDown ? 'var(--orange)' : 'var(--label-3)'
            }}
            title={t('Comparison of volume in the last 15 days vs the first 15 days of this period')}
          >
            <Icon name={isUp ? 'trendUp' : isDown ? 'trendDown' : 'target'} size={14} />
            <span>{trendPct > 0 ? `+${trendPct}%` : `${trendPct}%`}</span>
            <span style={{ fontSize: '10px', fontWeight: 500, fontFamily: 'inherit', opacity: 0.85 }}>
              (15d)
            </span>
          </div>
        )}
      </div>

      {/* Summary KPI Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: '8px',
          marginBottom: '14px'
        }}
      >
        <div
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--sep)',
            borderRadius: 'var(--r-md, 10px)',
            padding: '8px 10px'
          }}
        >
          <div style={{ fontSize: '10.5px', color: 'var(--label-3)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            {t('30d Volume')}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--label)', marginTop: 2 }}>
            {fmtVol(totalVolume, unit)}
          </div>
        </div>

        <div
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--sep)',
            borderRadius: 'var(--r-md, 10px)',
            padding: '8px 10px'
          }}
        >
          <div style={{ fontSize: '10.5px', color: 'var(--label-3)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            {t('Workouts')}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--label)', marginTop: 2 }}>
            {workoutsCount}
            <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--label-3)', marginLeft: 4 }}>
              ({activeDaysCount} {t('days')})
            </span>
          </div>
        </div>

        <div
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--sep)',
            borderRadius: 'var(--r-md, 10px)',
            padding: '8px 10px'
          }}
        >
          <div style={{ fontSize: '10.5px', color: 'var(--label-3)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            {t('Avg / Session')}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--label)', marginTop: 2 }}>
            {fmtVol(avgWorkoutVolume, unit)}
          </div>
        </div>

        {peakDay && peakDay.volume > 0 && (
          <div
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--sep)',
              borderRadius: 'var(--r-md, 10px)',
              padding: '8px 10px'
            }}
          >
            <div style={{ fontSize: '10.5px', color: 'var(--label-3)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              {t('Peak Day')}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--yellow, #ff9f0a)', marginTop: 2 }}>
              {fmtVol(peakDay.volume, unit)}
            </div>
          </div>
        )}
      </div>

      {/* D3 Bar Chart */}
      <TotalVolume30dD3Chart
        days={days}
        avgActiveDayVolume={avgActiveDayVolume}
        unit={unit}
        peakDayDate={peakDay?.date}
      />

      {/* Subtle footnote / guide */}
      <div
        className="small dim"
        style={{
          marginTop: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px'
        }}
      >
        <span>
          {t('Hover or tap any bar for daily volume breakdown')}
        </span>
        {avgActiveDayVolume > 0 && (
          <span style={{ fontFamily: 'monospace', color: 'var(--label-3)' }}>
            {t('Active day avg:')} {fmtVol(avgActiveDayVolume, unit)}
          </span>
        )}
      </div>
    </div>
  )
}
