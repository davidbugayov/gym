import React, { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { fmtNum, fmtDate, todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { bwSheet, goalSheet } from '../sheets.jsx'
import Icon from './Icon.jsx'
import { Button, Segmented } from './ui.jsx'
import {
  calculateWeightTrends,
  getWeeklyTrendColor,
  groupWeightByWeek
} from '../lib/weight-trends.js'

export default function WeightTrendsCard({ S }) {
  const [rangeWeeks, setRangeWeeks] = useState(8)
  const [chartMode, setChartMode] = useState('trend') // 'trend' | 'bars'
  const [showAllWeeks, setShowAllWeeks] = useState(false)
  const [hoveredWeek, setHoveredWeek] = useState(null)

  const bodyweight = S?.bodyweight || []
  const targetW = S?.targetW || null
  const unit = S?.unit || 'kg'

  const trends = calculateWeightTrends(bodyweight, rangeWeeks, targetW, unit)

  // Empty state: no data
  if (!trends.hasData) {
    return (
      <div className="card">
        <div className="row between" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>
            {t('Weight trends')}
          </h2>
          <Button size="sm" variant="primary" icon="plus" onClick={() => bwSheet()}>
            {t('Log weight')}
          </Button>
        </div>
        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--surface-2, rgba(255,255,255,0.06))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              color: 'var(--acc)'
            }}
          >
            <Icon name="scale" size={26} />
          </div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
            {t('Visualize your weekly progress')}
          </div>
          <div className="muted small" style={{ maxWidth: 360, margin: '0 auto 16px', lineHeight: 1.45 }}>
            {t('Weekly averages smooth out daily water and glycogen fluctuations to reveal your true progress.')}
          </div>
          <Button variant="primary" icon="plus" onClick={() => bwSheet()}>
            {t('Log your first weigh-in')}
          </Button>
        </div>
      </div>
    )
  }

  const {
    weeks,
    weeksCount,
    avgWeeklyChange,
    totalChange,
    currentAvg,
    goalAnalysis,
    trend
  } = trends

  const changeColor = getWeeklyTrendColor(avgWeeklyChange, goalAnalysis)
  const totalChangeColor = getWeeklyTrendColor(totalChange, goalAnalysis)

  // Determine trend description text
  let trendLabel = ''
  if (avgWeeklyChange == null) {
    trendLabel = t('Log across 2+ weeks for rate of change')
  } else if (trend === 'losing') {
    trendLabel = t('Losing {0}/wk', Math.abs(avgWeeklyChange) + ' ' + unit)
  } else if (trend === 'gaining') {
    trendLabel = t('Gaining {0}/wk', Math.abs(avgWeeklyChange) + ' ' + unit)
  } else {
    trendLabel = t('Maintaining weight')
  }

  const displayWeeks = showAllWeeks ? [...weeks].reverse() : [...weeks].reverse().slice(0, 5)

  return (
    <div className="card">
      {/* Header */}
      <div className="row between" style={{ marginBottom: 12, alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            {t('Weight trends')}
          </h2>
          <div className="dim small" style={{ textTransform: 'none', letterSpacing: 0, marginTop: 2 }}>
            {t('weekly averages & rate of change')}
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Button
            size="sm"
            icon="target"
            style={targetW ? { color: 'var(--yellow)' } : undefined}
            onClick={goalSheet}
          >
            {targetW ? fmtNum(targetW) + ' ' + unit : t('Goal')}
          </Button>
          <Button size="sm" variant="primary" icon="plus" onClick={() => bwSheet()}>
            {t('Log weight')}
          </Button>
        </div>
      </div>

      {/* Range Filter */}
      <div style={{ marginBottom: 12 }}>
        <Segmented
          className="seg-range"
          value={rangeWeeks}
          onChange={setRangeWeeks}
          options={[
            { value: 4, label: '4W' },
            { value: 8, label: '8W' },
            { value: 12, label: '12W' },
            { value: 0, label: t('All') }
          ]}
        />
      </div>

      {/* Quick weigh-in bar */}
      {(() => {
        const todayBW = bodyweight.find(b => b.d === todayISO())
        return (
          <div
            className="row between"
            style={{
              background: 'var(--surface-2, rgba(255,255,255,0.04))',
              border: '1px solid var(--sep, rgba(255,255,255,0.08))',
              borderRadius: 'var(--r-md, 10px)',
              padding: '8px 12px',
              marginBottom: 12,
              alignItems: 'center',
              gap: 8
            }}
          >
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <Icon name="scale" size={15} className="dim" />
              <span className="small">
                {todayBW ? (
                  <>
                    <span className="dim">{t('Today:')}</span> <b>{fmtNum(todayBW.w)} {unit}</b>
                  </>
                ) : (
                  <span className="muted">{t('No weigh-in logged today')}</span>
                )}
              </span>
            </div>
            <Button
              size="sm"
              variant={todayBW ? 'ghost' : 'primary'}
              icon={todayBW ? 'edit' : 'plus'}
              onClick={() => bwSheet()}
            >
              {todayBW ? t('Edit') : t('Quick log')}
            </Button>
          </div>
        )
      })()}

      {/* Primary KPI Tiles */}
      <div className="tiles" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
        {/* Weekly rate */}
        <div className="tile" style={{ padding: '10px 12px' }}>
          <div className="l" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name={avgWeeklyChange != null && avgWeeklyChange < 0 ? 'trendDown' : 'trendUp'} size={15} />
            <span>{t('Avg weekly change')}</span>
          </div>
          <div className="v" style={{ fontSize: 20, color: changeColor, marginTop: 2 }}>
            {avgWeeklyChange != null
              ? (avgWeeklyChange > 0 ? '+' : '') + fmtNum(avgWeeklyChange) + ' ' + unit + '/wk'
              : '—'}
          </div>
          <div className="dim small" style={{ fontSize: 11, marginTop: 3 }}>
            {trendLabel}
          </div>
        </div>

        {/* Total change in period */}
        <div className="tile" style={{ padding: '10px 12px' }}>
          <div className="l" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="scale" size={15} />
            <span>{t('Total change')}</span>
          </div>
          <div className="v" style={{ fontSize: 20, color: totalChangeColor, marginTop: 2 }}>
            {totalChange != null
              ? (totalChange > 0 ? '+' : '') + fmtNum(totalChange) + ' ' + unit
              : '—'}
          </div>
          <div className="dim small" style={{ fontSize: 11, marginTop: 3 }}>
            {weeksCount > 1 ? t('over {0} weeks', weeksCount) : t('Current: {0} {1}', fmtNum(currentAvg), unit)}
          </div>
        </div>
      </div>

      {/* Goal Progress Banner */}
      {goalAnalysis && (
        <div
          style={{
            background: 'var(--surface-2, rgba(255,255,255,0.04))',
            border: '1px solid var(--sep)',
            borderRadius: 'var(--r-md)',
            padding: '9px 12px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12.5,
            gap: 8,
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="target" size={16} style={{ color: 'var(--yellow)', flexShrink: 0 }} />
            <span>
              {t('Goal')}: <b>{fmtNum(goalAnalysis.targetWeight)} {unit}</b>
              <span className="dim" style={{ marginLeft: 5 }}>
                ({goalAnalysis.diff > 0 ? '+' : ''}{fmtNum(goalAnalysis.diff)} {unit})
              </span>
            </span>
          </div>
          <div
            style={{
              fontWeight: 500,
              color: goalAnalysis.onTrack ? 'var(--acc)' : 'var(--label-2)'
            }}
          >
            {goalAnalysis.isGoalReached
              ? t('Goal reached!')
              : goalAnalysis.estimatedWeeks
                ? t('About {0} weeks to goal', goalAnalysis.estimatedWeeks)
                : goalAnalysis.isLossGoal
                  ? (avgWeeklyChange > 0 ? t('Weight trending up') : t('Maintain deficit'))
                  : (avgWeeklyChange < 0 ? t('Weight trending down') : t('Maintain surplus'))}
          </div>
        </div>
      )}

      {/* Chart Mode Switcher */}
      {weeks.length >= 2 && (
        <div className="row between" style={{ alignItems: 'center', marginBottom: 8 }}>
          <div className="small dim">
            {chartMode === 'trend' ? t('Weekly average trend') : t('Week-by-week change')}
          </div>
          <Segmented
            className="seg-range"
            value={chartMode}
            onChange={setChartMode}
            options={[
              { value: 'trend', label: t('Trend curve') },
              { value: 'bars', label: t('Weekly change') }
            ]}
          />
        </div>
      )}

      {/* Visual Chart */}
      <div style={{ position: 'relative', marginTop: 4, marginBottom: 12 }}>
        {weeks.length < 2 ? (
          <div className="muted small" style={{ textAlign: 'center', padding: '24px 0' }}>
            {t('Log at least 2 weigh-ins in different weeks to see weekly trends.')}
          </div>
        ) : chartMode === 'trend' ? (
          <WeeklyTrendLineChart
            weeks={weeks}
            targetWeight={targetW}
            unit={unit}
            goalAnalysis={goalAnalysis}
            hoveredWeek={hoveredWeek}
            setHoveredWeek={setHoveredWeek}
          />
        ) : (
          <WeeklyChangeBarChart
            weeks={weeks}
            unit={unit}
            goalAnalysis={goalAnalysis}
            hoveredWeek={hoveredWeek}
            setHoveredWeek={setHoveredWeek}
          />
        )}
      </div>

      {/* Week-by-Week Table */}
      <div style={{ borderTop: 'var(--hair) solid var(--sep)', paddingTop: 10 }}>
        <div className="row between" style={{ marginBottom: 6 }}>
          <h4 className="sec" style={{ margin: 0 }}>
            {t('Week by week')}
          </h4>
          <span className="dim small">
            {t('Avg weight')} · {t('Change')}
          </span>
        </div>

        <div className="list" style={{ gap: 4 }}>
          {displayWeeks.map((wk, idx) => {
            const isHovered = hoveredWeek === wk.weekStart
            const delta = wk.deltaFromPrev
            const deltaColor = getWeeklyTrendColor(delta, goalAnalysis)

            return (
              <div
                key={wk.weekStart}
                onMouseEnter={() => setHoveredWeek(wk.weekStart)}
                onMouseLeave={() => setHoveredWeek(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 8px',
                  borderRadius: 'var(--r-sm)',
                  background: isHovered ? 'var(--surface-2, rgba(255,255,255,0.06))' : 'transparent',
                  transition: 'background 0.15s ease'
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13.5, color: 'var(--label)' }}>
                    {wk.label}
                  </div>
                  <div className="dim small" style={{ fontSize: 11, marginTop: 1 }}>
                    {wk.count === 1 ? t('1 weigh-in') : t('{0} weigh-ins', wk.count)}
                    {wk.minWeight !== wk.maxWeight && (
                      <span> · {fmtNum(wk.minWeight)}–{fmtNum(wk.maxWeight)}</span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--label)' }}>
                    {fmtNum(wk.avgWeight)} <span className="dim" style={{ fontSize: 11, fontWeight: 400 }}>{unit}</span>
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 500, color: deltaColor, marginTop: 1 }}>
                    {delta != null
                      ? (delta > 0 ? '+' : '') + fmtNum(delta) + ' ' + unit
                      : <span className="dim">—</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {weeks.length > 5 && (
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <Button
              size="sm"
              variant="plain"
              onClick={() => setShowAllWeeks(v => !v)}
              style={{ fontSize: 12, padding: '4px 10px' }}
            >
              {showAllWeeks ? t('Show less') : t('Show more weeks') + ` (${weeks.length})`}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * WeeklyTrendLineChart — Smooth SVG curve of weekly average body weights with target line.
 */
function WeeklyTrendLineChart({ weeks, targetWeight, unit, goalAnalysis, hoveredWeek, setHoveredWeek }) {
  if (!weeks || weeks.length < 2) return null

  const W = 340
  const H = 150
  const P = { l: 34, r: 14, t: 14, b: 22 }

  const ys = weeks.map(w => w.avgWeight)
  if (targetWeight != null && isFinite(targetWeight)) ys.push(targetWeight)

  let ymin = Math.min(...ys)
  let ymax = Math.max(...ys)
  if (ymin === ymax) {
    ymin -= 1
    ymax += 1
  }
  const pad = (ymax - ymin) * 0.15
  ymin -= pad
  ymax += pad

  const n = weeks.length
  const X = i => P.l + (i / (n - 1)) * (W - P.l - P.r)
  const Y = y => P.t + (1 - (y - ymin) / (ymax - ymin)) * (H - P.t - P.b)

  // Points path
  const pts = weeks.map((w, i) => ({ x: X(i), y: Y(w.avgWeight), week: w }))
  const poly = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  // Gradient area
  const areaPath = `M ${pts[0].x.toFixed(1)},${(H - P.b).toFixed(1)} L ${poly} L ${pts[pts.length - 1].x.toFixed(1)},${(H - P.b).toFixed(1)} Z`

  // Gridlines
  const gridSteps = 3
  const yStep = (ymax - ymin) / gridSteps
  const gridY = []
  for (let i = 0; i <= gridSteps; i++) {
    const v = ymin + i * yStep
    gridY.push(v)
  }

  // Active hover info
  const activePt = pts.find(p => p.week.weekStart === hoveredWeek)

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: H, display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="wtGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--acc)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--acc)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {gridY.map((v, idx) => {
          const y = Y(v)
          return (
            <g key={idx}>
              <line
                x1={P.l}
                y1={y}
                x2={W - P.r}
                y2={y}
                stroke="var(--sep-op, rgba(255,255,255,0.08))"
                strokeWidth="1"
                strokeDasharray="2 3"
              />
              <text
                x={P.l - 5}
                y={y + 3.5}
                textAnchor="end"
                fontSize="9"
                fill="var(--label-3)"
              >
                {fmtNum(v)}
              </text>
            </g>
          )
        })}

        {/* Target Weight Reference Line */}
        {targetWeight != null && isFinite(targetWeight) && (
          <g>
            <line
              x1={P.l}
              y1={Y(targetWeight)}
              x2={W - P.r}
              y2={Y(targetWeight)}
              stroke="var(--yellow)"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />
            <text
              x={W - P.r}
              y={Y(targetWeight) - 4}
              textAnchor="end"
              fontSize="8.5"
              fill="var(--yellow)"
              fontWeight="600"
            >
              {t('Goal')}: {fmtNum(targetWeight)}
            </text>
          </g>
        )}

        {/* Area fill */}
        <path d={areaPath} fill="url(#wtGrad)" />

        {/* Main trend line */}
        <polyline
          fill="none"
          stroke="var(--acc)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={poly}
        />

        {/* Week dots and x-axis labels */}
        {pts.map((p, i) => {
          const isSelected = hoveredWeek === p.week.weekStart
          return (
            <g
              key={p.week.weekStart}
              onClick={() => setHoveredWeek(isSelected ? null : p.week.weekStart)}
              style={{ cursor: 'pointer' }}
            >
              {/* Vertical guideline on hover */}
              {isSelected && (
                <line
                  x1={p.x}
                  y1={P.t}
                  x2={p.x}
                  y2={H - P.b}
                  stroke="var(--acc)"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.6"
                />
              )}

              {/* Point dot */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isSelected ? 5.5 : 3.5}
                fill="var(--surface)"
                stroke="var(--acc)"
                strokeWidth={isSelected ? 2.5 : 1.8}
              />

              {/* X label */}
              {(i === 0 || i === pts.length - 1 || i % Math.max(1, Math.floor(pts.length / 4)) === 0) && (
                <text
                  x={p.x}
                  y={H - 7}
                  textAnchor={i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}
                  fontSize="9"
                  fill="var(--label-2)"
                >
                  {p.week.label.split('–')[0]}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Floating tooltip */}
      {activePt && (
        <div
          style={{
            position: 'absolute',
            top: Math.max(0, activePt.y - 48),
            left: Math.max(10, Math.min(W - 140, activePt.x - 65)),
            background: 'var(--surface-3, #2c2c2e)',
            border: '1px solid var(--sep)',
            borderRadius: 'var(--r-sm)',
            padding: '4px 8px',
            fontSize: 11,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 10,
            whiteSpace: 'nowrap'
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--label)' }}>
            {activePt.week.label}: {fmtNum(activePt.week.avgWeight)} {unit}
          </div>
          <div className="dim" style={{ fontSize: 10 }}>
            {activePt.week.deltaFromPrev != null
              ? (activePt.week.deltaFromPrev > 0 ? '+' : '') + fmtNum(activePt.week.deltaFromPrev) + ' ' + unit + ' vs prev week'
              : t('First week')}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * WeeklyChangeBarChart — Zero-centered bar chart showing week-over-week deltas (+/-).
 */
function WeeklyChangeBarChart({ weeks, unit, goalAnalysis, hoveredWeek, setHoveredWeek }) {
  const deltaWeeks = weeks.filter(w => w.deltaFromPrev != null)
  if (!deltaWeeks.length) return null

  const W = 340
  const H = 140
  const P = { l: 28, r: 12, t: 14, b: 24 }

  const deltas = deltaWeeks.map(w => w.deltaFromPrev)
  const maxAbs = Math.max(0.5, ...deltas.map(d => Math.abs(d)))
  const zeroY = P.t + (H - P.t - P.b) / 2

  const n = deltaWeeks.length
  const slotW = (W - P.l - P.r) / n
  const barW = Math.max(6, Math.min(22, slotW * 0.55))

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: H, display: 'block', overflow: 'visible' }}
      >
        {/* Zero baseline */}
        <line
          x1={P.l}
          y1={zeroY}
          x2={W - P.r}
          y2={zeroY}
          stroke="var(--sep)"
          strokeWidth="1.2"
        />

        {/* Labels for +max and -max */}
        <text x={P.l - 4} y={P.t + 8} textAnchor="end" fontSize="8.5" fill="var(--label-3)">
          +{fmtNum(maxAbs)}
        </text>
        <text x={P.l - 4} y={zeroY + 3} textAnchor="end" fontSize="8.5" fill="var(--label-3)">
          0
        </text>
        <text x={P.l - 4} y={H - P.b - 2} textAnchor="end" fontSize="8.5" fill="var(--label-3)">
          -{fmtNum(maxAbs)}
        </text>

        {/* Bars */}
        {deltaWeeks.map((wk, i) => {
          const delta = wk.deltaFromPrev
          const color = getWeeklyTrendColor(delta, goalAnalysis)
          const isSelected = hoveredWeek === wk.weekStart

          const barH = (Math.abs(delta) / maxAbs) * ((H - P.t - P.b) / 2)
          const x = P.l + i * slotW + (slotW - barW) / 2
          const y = delta >= 0 ? zeroY - barH : zeroY

          return (
            <g
              key={wk.weekStart}
              onClick={() => setHoveredWeek(isSelected ? null : wk.weekStart)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(2, barH)}
                rx={2.5}
                fill={color}
                opacity={isSelected ? 1 : 0.85}
              />

              {/* Value label above or below bar */}
              <text
                x={x + barW / 2}
                y={delta >= 0 ? y - 4 : y + barH + 9}
                textAnchor="middle"
                fontSize="8.5"
                fontWeight="500"
                fill={color}
              >
                {delta > 0 ? '+' : ''}{fmtNum(delta)}
              </text>

              {/* X week label */}
              <text
                x={x + barW / 2}
                y={H - 6}
                textAnchor="middle"
                fontSize="8"
                fill="var(--label-3)"
              >
                {wk.label.split('–')[0]}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
