import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid
} from 'recharts'
import { fmtNum, fmtDate, todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { bwSheet, goalSheet } from '../sheets.jsx'
import Icon from './Icon.jsx'
import { Button, Segmented } from './ui.jsx'

/**
 * Custom Tooltip for the Recharts Weight Progression Chart
 */
function WeightChartTooltip({ active, payload, unit, targetW }) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0]?.payload
  if (!d) return null

  const hasGoal = targetW != null && Number.isFinite(targetW)
  const diffGoal = hasGoal ? d.weight - targetW : null

  return (
    <div
      style={{
        background: 'var(--surface-2, #1c1c1e)',
        border: '1px solid var(--sep, rgba(255,255,255,0.12))',
        borderRadius: 10,
        padding: '9px 12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        fontSize: 12,
        color: 'var(--fg, #ffffff)',
        minWidth: 145,
        pointerEvents: 'none'
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 5, color: 'var(--label-2, #8e8e93)' }}>
        {fmtDate(d.date, false)}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--acc, #30d158)' }}>
          {fmtNum(d.weight)} {unit}
        </span>
        {d.diffFromPrev != null && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: d.diffFromPrev > 0
                ? 'var(--yellow, #f59e0b)'
                : d.diffFromPrev < 0
                ? 'var(--green, #10b981)'
                : 'var(--label-3, #636366)'
            }}
          >
            {d.diffFromPrev > 0 ? '+' : ''}{fmtNum(d.diffFromPrev)}
          </span>
        )}
      </div>

      {d.trend != null && (
        <div style={{ fontSize: 11, color: 'var(--blue, #38bdf8)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 2, background: 'var(--blue, #38bdf8)', display: 'inline-block', borderRadius: 1 }} />
          <span>{t('7-day trend')}: <b>{fmtNum(d.trend)}</b> {unit}</span>
        </div>
      )}

      {hasGoal && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--yellow, #eab308)',
            marginTop: 5,
            borderTop: '1px solid var(--sep, rgba(255,255,255,0.08))',
            paddingTop: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <span style={{ width: 8, height: 2, background: 'var(--yellow, #eab308)', display: 'inline-block', borderRadius: 1 }} />
          {Math.abs(diffGoal) < 0.05 ? (
            <span>✓ <b>{t('Goal reached!')}</b></span>
          ) : (
            <span>
              {diffGoal > 0 ? '+' : ''}{fmtNum(diffGoal)} {unit} {t('vs goal')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * BodyWeightProgressionCard
 *
 * Detailed weight progression chart with a goal line using Recharts.
 * Provides timeframe filters (1M, 3M, 6M, 1Y, All), 7-day moving average trendline,
 * goal objective tracking (progress bar, distance remaining), and key performance metrics.
 */
export default function BodyWeightProgressionCard({ S }) {
  // Default range is 90 days (last 3 months)
  const [range, setRange] = useState(90)
  const [showTrend, setShowTrend] = useState(true)

  const unit = S?.unit || 'kg'
  const targetW = S?.targetW != null && Number.isFinite(Number(S.targetW)) ? Number(S.targetW) : null
  const now = Date.now()

  // Clean, validate and sort all weigh-ins chronologically (oldest to newest)
  const sortedWeights = useMemo(() => {
    const raw = Array.isArray(S?.bodyweight) ? S.bodyweight : []
    return raw
      .filter(b => b && typeof b === 'object' && typeof b.d === 'string' && Number.isFinite(Number(b.w)) && Number(b.w) > 0)
      .map(b => ({
        d: b.d,
        t: Number(b.t) || new Date(b.d).getTime() || 0,
        w: Number(b.w)
      }))
      .sort((a, b) => a.t - b.t)
  }, [S?.bodyweight])

  // Filter weigh-ins inside selected window
  const windowWeights = useMemo(() => {
    if (range === 0) return sortedWeights
    const cutoff = now - range * 86400000
    return sortedWeights.filter(b => b.t >= cutoff)
  }, [sortedWeights, range, now])

  // Today's weigh-in
  const todayBW = useMemo(() => {
    const today = todayISO()
    return sortedWeights.find(b => b.d === today) || null
  }, [sortedWeights])

  // Compute chart points with 7-day moving average and delta indicators
  const { chartData, yDomain, kpi } = useMemo(() => {
    if (!windowWeights.length) {
      return { chartData: [], yDomain: ['auto', 'auto'], kpi: null }
    }

    const data = []
    let minW = Infinity
    let maxW = -Infinity

    windowWeights.forEach((item, idx) => {
      const w = item.w
      if (w < minW) minW = w
      if (w > maxW) maxW = w

      // Calculate 7-day moving average for trend smoothing (all weights within [item.t - 6d, item.t])
      const sevenDaysAgo = item.t - 6 * 86400000
      const recentWindow = sortedWeights.filter(b => b.t >= sevenDaysAgo && b.t <= item.t)
      const avg = recentWindow.length > 0
        ? recentWindow.reduce((acc, curr) => acc + curr.w, 0) / recentWindow.length
        : w

      const prev = idx > 0 ? windowWeights[idx - 1] : null
      const diffFromPrev = prev ? Math.round((w - prev.w) * 10) / 10 : null

      data.push({
        date: item.d,
        name: fmtDate(item.d, true),
        weight: Math.round(w * 10) / 10,
        trend: Math.round(avg * 10) / 10,
        diffFromPrev,
        timestamp: item.t
      })
    })

    // Calculate Y domain with padding ensuring goal line and points fit comfortably
    const domainValues = data.map(d => d.weight).concat(data.map(d => d.trend))
    if (targetW != null) {
      domainValues.push(targetW)
    }
    const lowest = Math.min(...domainValues)
    const highest = Math.max(...domainValues)
    const span = highest - lowest
    const pad = Math.max(span * 0.14, 1.2)
    const yDomain = [
      Math.floor((lowest - pad) * 10) / 10,
      Math.ceil((highest + pad) * 10) / 10
    ]

    // Key Performance Indicators (KPIs)
    const starting = data[0]
    const latest = data[data.length - 1]
    const delta = latest.weight - starting.weight
    const pct = starting.weight > 0 ? (delta / starting.weight) * 100 : 0

    // Goal analysis
    let goalProgress = null
    if (targetW != null) {
      const distance = Math.round(Math.abs(latest.weight - targetW) * 10) / 10
      const isLossGoal = starting.weight > targetW
      const isGainGoal = starting.weight < targetW
      const totalNeeded = Math.abs(starting.weight - targetW)
      const achieved = isLossGoal
        ? starting.weight - latest.weight
        : isGainGoal
        ? latest.weight - starting.weight
        : 0

      const isAchieved = isLossGoal ? latest.weight <= targetW : isGainGoal ? latest.weight >= targetW : distance < 0.1
      const progressPct = totalNeeded > 0
        ? Math.max(0, Math.min(100, Math.round((achieved / totalNeeded) * 100)))
        : isAchieved ? 100 : 0

      goalProgress = {
        distance,
        isLossGoal,
        isGainGoal,
        isAchieved,
        progressPct
      }
    }

    const kpi = {
      startingVal: starting.weight,
      latestVal: latest.weight,
      latestDate: latest.date,
      delta: Math.round(delta * 10) / 10,
      pct: Math.round(pct * 10) / 10,
      minVal: minW,
      maxVal: maxW,
      totalEntries: data.length,
      goalProgress
    }

    return { chartData: data, yDomain, kpi }
  }, [windowWeights, sortedWeights, targetW])

  const rangeOptions = [
    { value: 30, label: '1M' },
    { value: 90, label: '3M' },
    { value: 180, label: '6M' },
    { value: 365, label: '1Y' },
    { value: 0, label: t('All') }
  ]

  // Empty state if no weights logged
  if (!sortedWeights.length) {
    return (
      <div className="card">
        <div className="row between" style={{ marginBottom: 12, alignItems: 'center' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="scale" style={{ color: 'var(--acc)' }} />
            <span>{t('Body weight progression')}</span>
          </h2>
          <Button size="sm" variant="primary" icon="plus" onClick={() => bwSheet()}>
            {t('Log weight')}
          </Button>
        </div>

        <div style={{ textAlign: 'center', padding: '26px 16px' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              color: 'var(--acc)'
            }}
          >
            <Icon name="scale" size={26} />
          </div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
            {t('Track your weight journey')}
          </div>
          <div className="muted small" style={{ maxWidth: 340, margin: '0 auto 14px', lineHeight: 1.45 }}>
            {t('Log daily or weekly weigh-ins with a goal line to monitor your fitness objectives over time.')}
          </div>
          <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
            <Button variant="primary" icon="plus" onClick={() => bwSheet()}>
              {t('Log your first weigh-in')}
            </Button>
            <Button variant="tinted" icon="target" onClick={goalSheet}>
              {t('Set target goal')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Determine badge color based on goal orientation
  const isLoss = kpi?.goalProgress?.isLossGoal
  const isGain = kpi?.goalProgress?.isGainGoal
  const deltaPositiveForGoal = isLoss ? kpi?.delta < 0 : isGain ? kpi?.delta > 0 : true
  const badgeClass = kpi?.delta === 0
    ? 'neutral'
    : deltaPositiveForGoal
    ? ''
    : 'negative'

  return (
    <div className="card">
      {/* Header & Subtitle */}
      <div className="row between" style={{ marginBottom: 10, alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="scale" style={{ color: 'var(--acc)' }} />
            <span>{t('Body weight progression')}</span>
            <span
              className="dim"
              style={{
                textTransform: 'none',
                letterSpacing: 0,
                fontSize: 12,
                fontWeight: 500
              }}
            >
              · {range === 30 ? t('last month') : range === 90 ? t('last 3 months') : range === 180 ? t('last 6 months') : range === 365 ? t('last 12 months') : t('all time')}
            </span>
          </h2>
          <div className="small dim" style={{ marginTop: 2 }}>
            {targetW != null
              ? t('Monitor weight trajectory against your {0} {1} objective.', fmtNum(targetW), unit)
              : t('Daily weigh-ins and smoothed 7-day trend over time.')}
          </div>
        </div>

        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <Button
            size="sm"
            icon="target"
            style={targetW ? { color: 'var(--yellow)', borderColor: 'var(--yellow)' } : undefined}
            onClick={goalSheet}
            title={targetW ? t('Edit goal: {0} {1}', fmtNum(targetW), unit) : t('Set goal weight')}
          >
            {targetW ? `${fmtNum(targetW)} ${unit}` : t('Goal')}
          </Button>
          <Button size="sm" variant="primary" icon="plus" onClick={() => bwSheet()}>
            {t('Log weight')}
          </Button>
        </div>
      </div>

      {/* Today's weigh-in quick banner */}
      <div
        className="row between"
        style={{
          background: 'var(--surface-2, rgba(255,255,255,0.04))',
          border: '1px solid var(--sep, rgba(255,255,255,0.08))',
          borderRadius: 'var(--r-md, 10px)',
          padding: '8px 12px',
          marginBottom: 10,
          alignItems: 'center',
          gap: 8
        }}
      >
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <Icon name="scale" size={15} className="dim" />
          <span className="small">
            {todayBW ? (
              <><b>{t('Today:')}</b> {fmtNum(todayBW.w)} {unit}</>
            ) : (
              <span className="muted">{t('No weigh-in logged today')}</span>
            )}
          </span>
        </div>
        <Button size="sm" variant={todayBW ? 'ghost' : 'tinted'} icon={todayBW ? 'edit' : 'plus'} onClick={() => bwSheet()}>
          {todayBW ? t('Edit') : t('Quick log')}
        </Button>
      </div>

      {/* Goal Objective Banner if target weight is set */}
      {targetW != null && kpi?.goalProgress && (
        <div
          style={{
            background: 'color-mix(in srgb, var(--yellow, #f59e0b) 8%, var(--surface-2))',
            border: '1px solid color-mix(in srgb, var(--yellow, #f59e0b) 30%, transparent)',
            borderRadius: 'var(--r-md, 10px)',
            padding: '10px 12px',
            marginBottom: 12
          }}
        >
          <div className="row between" style={{ alignItems: 'center', marginBottom: 6 }}>
            <div className="row" style={{ gap: 6, alignItems: 'center' }}>
              <Icon name="target" style={{ color: 'var(--yellow)', fontSize: 14 }} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                {t('Goal')}: <b>{fmtNum(targetW)} {unit}</b>
              </span>
            </div>
            {kpi.goalProgress.isAchieved ? (
              <span className="tag acc small" style={{ fontWeight: 700, padding: '2px 8px' }}>
                🎉 {t('Goal reached!')}
              </span>
            ) : (
              <span className="small" style={{ fontWeight: 600, color: 'var(--yellow)' }}>
                {fmtNum(kpi.goalProgress.distance)} {unit} {t('to goal')}
              </span>
            )}
          </div>

          {/* Goal completion progress bar */}
          <div
            style={{
              height: 6,
              background: 'var(--surface-3, rgba(255,255,255,0.08))',
              borderRadius: 99,
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, Math.max(4, kpi.goalProgress.progressPct))}%`,
                background: kpi.goalProgress.isAchieved
                  ? 'var(--acc, #30d158)'
                  : 'linear-gradient(90deg, var(--acc), var(--yellow))',
                borderRadius: 99,
                transition: 'width 0.4s ease'
              }}
            />
          </div>
          <div className="row between" style={{ marginTop: 4, fontSize: 11, color: 'var(--label-3)' }}>
            <span>{t('{0}% of objective journey', kpi.goalProgress.progressPct)}</span>
            <span>
              {kpi.goalProgress.isLossGoal
                ? t('Target: Lose weight')
                : kpi.goalProgress.isGainGoal
                ? t('Target: Gain weight')
                : t('Target: Maintain')}
            </span>
          </div>
        </div>
      )}

      {/* Timeframe Range Selector */}
      <Segmented
        className="seg-range"
        value={range}
        onChange={setRange}
        options={rangeOptions}
      />

      {/* KPI Stats Grid */}
      {kpi && (
        <div className="perf-grid">
          <div className="perf-stat">
            <div className="l">{t('Latest')}</div>
            <div className="v accent" style={{ fontSize: 17 }}>
              {fmtNum(kpi.latestVal)} {unit}
            </div>
            <div className="small dim" style={{ fontSize: 10, marginTop: 1 }}>
              {fmtDate(kpi.latestDate, true)}
            </div>
          </div>

          <div className="perf-stat">
            <div className="l">{t('Starting')}</div>
            <div className="v">
              {fmtNum(kpi.startingVal)} {unit}
            </div>
          </div>

          <div className="perf-stat">
            <div className="l">{t('Period change')}</div>
            <div className={`trend-badge ${badgeClass}`} style={{ marginTop: 2 }}>
              <Icon
                name={
                  kpi.delta > 0
                    ? 'arrowUp'
                    : kpi.delta < 0
                    ? 'arrowDown'
                    : 'dot'
                }
              />
              <span>
                {kpi.delta > 0 ? '+' : ''}{fmtNum(kpi.delta)} {unit} ({kpi.pct > 0 ? '+' : ''}{kpi.pct}%)
              </span>
            </div>
          </div>

          <div className="perf-stat">
            <div className="l">{t('Period Range')}</div>
            <div className="v" style={{ fontSize: 14 }}>
              {fmtNum(kpi.minVal)} – {fmtNum(kpi.maxVal)} {unit}
            </div>
          </div>
        </div>
      )}

      {/* Main Recharts Line Chart with Goal Line */}
      <div className="chart" style={{ height: 210, marginTop: 10, position: 'relative' }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 12, right: 12, left: -22, bottom: 4 }}
            >
              <defs>
                <linearGradient id="bwLineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--acc)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--acc)" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="var(--sep-op, rgba(255,255,255,0.06))"
                strokeDasharray="2 4"
                vertical={false}
              />

              <XAxis
                dataKey="name"
                stroke="var(--label-3, #636366)"
                fontSize={10.5}
                tickLine={false}
                tickMargin={6}
                interval="preserveStartEnd"
              />

              <YAxis
                domain={yDomain}
                stroke="var(--label-3, #636366)"
                fontSize={10.5}
                tickLine={false}
                tickMargin={4}
                tickFormatter={v => fmtNum(v)}
              />

              <Tooltip
                content={<WeightChartTooltip unit={unit} targetW={targetW} />}
                cursor={{ stroke: 'var(--sep, rgba(255,255,255,0.2))', strokeWidth: 1, strokeDasharray: '2 2' }}
              />

              {/* Goal Objective Reference Line */}
              {targetW != null && (
                <ReferenceLine
                  y={targetW}
                  stroke="var(--yellow, #f59e0b)"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `${t('Goal')}: ${fmtNum(targetW)} ${unit}`,
                    position: 'insideTopRight',
                    fill: 'var(--yellow, #f59e0b)',
                    fontSize: 10.5,
                    fontWeight: 700,
                    offset: 6
                  }}
                />
              )}

              {/* Smoothed 7-day Moving Average Trendline */}
              {showTrend && chartData.length >= 2 && (
                <Line
                  type="monotone"
                  dataKey="trend"
                  stroke="var(--blue, #38bdf8)"
                  strokeWidth={1.8}
                  strokeDasharray="3 3"
                  dot={false}
                  activeDot={false}
                  name={t('7-day trend')}
                  isAnimationActive={false}
                />
              )}

              {/* Daily Logged Weigh-Ins */}
              <Line
                type="monotone"
                dataKey="weight"
                stroke="var(--acc)"
                strokeWidth={2.4}
                dot={{
                  r: chartData.length > 30 ? 2 : 3.5,
                  fill: 'var(--acc)',
                  stroke: 'var(--surface-1, #121212)',
                  strokeWidth: 1.5
                }}
                activeDot={{
                  r: 6,
                  fill: 'var(--acc)',
                  stroke: '#ffffff',
                  strokeWidth: 2
                }}
                name={t('Logged Weight')}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              background: 'var(--surface-2)',
              borderRadius: 'var(--r-md)',
              margin: '8px 0'
            }}
          >
            <div className="muted small" style={{ marginBottom: 8 }}>
              {t('No weigh-ins in this timeframe.')}
            </div>
            {sortedWeights.length > 0 && range !== 0 && (
              <Button size="sm" variant="tinted" onClick={() => setRange(0)}>
                {t('View all time')} ({sortedWeights.length} {t('weigh-ins')})
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Chart Legend & Toggles */}
      <div
        className="row between"
        style={{
          marginTop: 8,
          paddingTop: 8,
          borderTop: '1px solid var(--sep, rgba(255,255,255,0.08))',
          alignItems: 'center'
        }}
      >
        <div className="row" style={{ gap: 12, alignItems: 'center' }}>
          {/* Actual Weight Legend */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--label-2)' }}>
            <span style={{ width: 12, height: 3, background: 'var(--acc)', borderRadius: 2 }} />
            <span>{t('Weight')}</span>
          </div>

          {/* Trend Legend */}
          {showTrend && chartData.length >= 2 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--label-2)' }}>
              <span style={{ width: 12, height: 2, background: 'var(--blue, #38bdf8)', borderBottom: '1px dashed var(--blue, #38bdf8)' }} />
              <span>{t('7d Trend')}</span>
            </div>
          )}

          {/* Goal Line Legend */}
          {targetW != null && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--label-2)' }}>
              <span style={{ width: 12, height: 2, background: 'var(--yellow, #f59e0b)', borderBottom: '1px dashed var(--yellow, #f59e0b)' }} />
              <span>{t('Goal line')}</span>
            </div>
          )}
        </div>

        {/* Toggle 7-day trendline */}
        {chartData.length >= 2 && (
          <button
            type="button"
            className={`tag small ${showTrend ? 'acc' : ''}`}
            style={{ cursor: 'pointer', padding: '2px 8px', fontSize: 11 }}
            onClick={() => setShowTrend(st => !st)}
            title={showTrend ? t('Hide smoothed trendline') : t('Show smoothed trendline')}
          >
            <Icon name="sparkles" size={10} style={{ marginRight: 3 }} />
            {showTrend ? t('Trend on') : t('Trend off')}
          </button>
        )}
      </div>
    </div>
  )
}
