import { useRef, useState, useLayoutEffect, useMemo } from 'react'
import * as d3 from 'd3'
import { fmtVol, fmtDate } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

const W = 580
const H = 220
const MARGIN = { top: 22, right: 16, bottom: 32, left: 44 }

/**
 * TotalVolume30dD3Chart
 *
 * Uses D3 integration to render a bar chart displaying total daily volume
 * (weight x reps) progression over the last 30 days.
 */
export default function TotalVolume30dD3Chart({
  days = [],
  avgActiveDayVolume = 0,
  unit = 'kg',
  height = H,
  peakDayDate = null
}) {
  const svgRef = useRef(null)
  const wrapRef = useRef(null)
  const tipRef = useRef(null)
  const [hoverData, setHoverData] = useState(null)

  // Position tooltip relative to hovered coordinate
  useLayoutEffect(() => {
    const tip = tipRef.current
    const wrap = wrapRef.current
    if (!hoverData || !tip || !wrap) return
    const cw = wrap.clientWidth
    const ch = wrap.clientHeight
    const tw = tip.offsetWidth
    const th = tip.offsetHeight
    const M = 6

    const cx = (hoverData.x / W) * cw
    const cy = (hoverData.y / height) * ch

    const left = Math.max(M, Math.min(cw - tw - M, cx - tw / 2))
    tip.style.left = `${left}px`

    if (cy < th + 24) {
      tip.style.top = `${Math.min(ch - th - M, cy + 18)}px`
    } else {
      tip.style.top = `${Math.max(M, cy - th - 12)}px`
    }
  }, [hoverData, height])

  // D3 calculations: scaleBand, scaleLinear, axes, ticks
  const {
    xScale,
    yScale,
    yTicks,
    maxVol,
    barWidth
  } = useMemo(() => {
    if (!days || days.length === 0) {
      return { yTicks: [], maxVol: 0, barWidth: 0 }
    }

    const maxVolumeFound = Math.max(...days.map(d => d.volume || 0), 100)

    // D3 scaleBand for days
    const x = d3.scaleBand()
      .domain(days.map(d => d.date))
      .range([MARGIN.left, W - MARGIN.right])
      .paddingInner(0.24)
      .paddingOuter(0.08)

    // D3 scaleLinear for volume
    const y = d3.scaleLinear()
      .domain([0, maxVolumeFound * 1.15])
      .range([height - MARGIN.bottom, MARGIN.top])
      .nice()

    const yTickValues = y.ticks(4)

    return {
      xScale: x,
      yScale: y,
      yTicks: yTickValues,
      maxVol: maxVolumeFound,
      barWidth: x.bandwidth()
    }
  }, [days, height])

  if (!days || days.length === 0) {
    return (
      <div className="empty small" style={{ padding: '32px 16px', textAlign: 'center' }}>
        <Icon name="chart" size={24} className="dim" style={{ margin: '0 auto 8px', display: 'block' }} />
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('No volume data recorded in the last 30 days')}</div>
        <div className="dim">{t('Complete workouts with weight and reps to see your 30-day progression here.')}</div>
      </div>
    )
  }

  // Pointer / touch handlers for interactive tooltips
  const handlePointerMove = e => {
    if (!wrapRef.current || !svgRef.current || !xScale) return
    const rect = svgRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    if (clientX === undefined) return

    const svgX = ((clientX - rect.left) / rect.width) * W
    const svgY = ((clientY - rect.top) / rect.height) * height

    // Find the closest bar by X coordinate
    let closestDay = null
    let minDistance = Infinity

    days.forEach(d => {
      const barX = xScale(d.date)
      if (barX === undefined) return
      const barCenter = barX + barWidth / 2
      const dist = Math.abs(svgX - barCenter)
      if (dist < minDistance) {
        minDistance = dist
        closestDay = d
      }
    })

    if (closestDay && minDistance < barWidth * 2.5) {
      const bx = xScale(closestDay.date) + barWidth / 2
      const by = closestDay.volume > 0 ? yScale(closestDay.volume) : height - MARGIN.bottom
      setHoverData({
        day: closestDay,
        x: bx,
        y: by
      })
    } else {
      setHoverData(null)
    }
  }

  const handlePointerLeave = () => {
    setHoverData(null)
  }

  const avgY = avgActiveDayVolume > 0 && yScale ? yScale(avgActiveDayVolume) : null

  return (
    <div
      ref={wrapRef}
      className="d3-chart-wrap"
      style={{
        position: 'relative',
        width: '100%',
        userSelect: 'none',
        touchAction: 'pan-y'
      }}
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      onTouchEnd={handlePointerLeave}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${height}`}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          overflow: 'visible'
        }}
      >
        <defs>
          {/* Subtle gradient for active volume bars */}
          <linearGradient id="volBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--acc)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--acc)" stopOpacity="0.75" />
          </linearGradient>

          {/* Peak volume bar gradient */}
          <linearGradient id="volBarPeakGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--yellow, #ff9f0a)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--acc)" stopOpacity="0.85" />
          </linearGradient>

          {/* Glow filter for hovered / peak bars */}
          <filter id="barGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="var(--acc)" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Horizontal D3 Gridlines and Y-axis labels */}
        {yTicks.map(val => {
          const y = yScale(val)
          return (
            <g key={`y-grid-${val}`}>
              <line
                x1={MARGIN.left}
                y1={y}
                x2={W - MARGIN.right}
                y2={y}
                stroke="var(--sep, rgba(255,255,255,0.12))"
                strokeWidth="1"
                strokeDasharray="2 4"
                opacity="0.65"
              />
              <text
                x={MARGIN.left - 6}
                y={y + 3.5}
                textAnchor="end"
                fontSize="9.5"
                fontFamily="JetBrains Mono, monospace"
                fill="var(--label-3)"
              >
                {val >= 1000 ? `${Math.round(val / 1000)}k` : val}
              </text>
            </g>
          )
        })}

        {/* X-axis baseline */}
        <line
          x1={MARGIN.left}
          y1={height - MARGIN.bottom}
          x2={W - MARGIN.right}
          y2={height - MARGIN.bottom}
          stroke="var(--sep, rgba(255,255,255,0.15))"
          strokeWidth="1"
        />

        {/* Reference line for 30-day average volume */}
        {avgY !== null && avgY >= MARGIN.top && avgY <= height - MARGIN.bottom && (
          <g>
            <line
              x1={MARGIN.left}
              y1={avgY}
              x2={W - MARGIN.right}
              y2={avgY}
              stroke="var(--acc)"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              opacity="0.5"
            />
            <text
              x={W - MARGIN.right}
              y={avgY - 4}
              textAnchor="end"
              fontSize="9"
              fontFamily="JetBrains Mono, monospace"
              fill="var(--acc)"
              opacity="0.85"
            >
              {t('avg: {0}', `${fmtVol(avgActiveDayVolume, unit)}`)}
            </text>
          </g>
        )}

        {/* D3 Daily Volume Bars */}
        {days.map((d, idx) => {
          const x = xScale(d.date)
          if (x === undefined) return null

          const isHovered = hoverData?.day?.date === d.date
          const isPeak = peakDayDate && d.date === peakDayDate && d.volume > 0
          const hasVol = d.volume > 0
          const barH = hasVol
            ? Math.max(3, (height - MARGIN.bottom) - yScale(d.volume))
            : 2
          const y = hasVol ? yScale(d.volume) : height - MARGIN.bottom - 2

          return (
            <g key={d.date} className="d3-vol-bar-group">
              {/* Invisible wider hit area for easy hover / touch */}
              <rect
                x={x - barWidth * 0.25}
                y={MARGIN.top}
                width={barWidth * 1.5}
                height={height - MARGIN.top - MARGIN.bottom + 10}
                fill="transparent"
                style={{ cursor: 'pointer' }}
              />

              {/* Visible Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={hasVol ? Math.min(3, barWidth / 2) : 1}
                fill={
                  hasVol
                    ? isPeak
                      ? 'url(#volBarPeakGrad)'
                      : 'url(#volBarGrad)'
                    : 'color-mix(in srgb, var(--label-3) 22%, transparent)'
                }
                filter={isHovered && hasVol ? 'url(#barGlow)' : 'none'}
                opacity={isHovered ? 1 : hasVol ? 0.9 : 0.4}
                style={{
                  transition: 'opacity 0.15s ease, filter 0.15s ease'
                }}
              />

              {/* Peak indicator dot on top of the peak bar */}
              {isPeak && !isHovered && (
                <circle
                  cx={x + barWidth / 2}
                  cy={y - 4}
                  r="2"
                  fill="var(--yellow, #ff9f0a)"
                />
              )}
            </g>
          )
        })}

        {/* X-axis date labels (spread out across 30 days: approx every 5 days + last day) */}
        {days.map((d, idx) => {
          // Show label if index is 0, 6, 12, 18, 24, or last day (29)
          const isTick = idx % 6 === 0 || idx === days.length - 1
          if (!isTick) return null

          const x = xScale(d.date)
          if (x === undefined) return null

          const isToday = idx === days.length - 1
          const label = isToday ? t('Today') : `${d.month}/${d.dayOfMonth}`

          return (
            <text
              key={`x-lbl-${d.date}`}
              x={x + barWidth / 2}
              y={height - MARGIN.bottom + 14}
              textAnchor="middle"
              fontSize="9.5"
              fontFamily="JetBrains Mono, monospace"
              fontWeight={isToday ? '700' : '400'}
              fill={isToday ? 'var(--acc)' : 'var(--label-3)'}
            >
              {label}
            </text>
          )
        })}

        {/* Hovered bar vertical guideline and marker */}
        {hoverData && (
          <g pointerEvents="none">
            <line
              x1={hoverData.x}
              y1={MARGIN.top}
              x2={hoverData.x}
              y2={height - MARGIN.bottom}
              stroke="var(--acc)"
              strokeWidth="1"
              strokeDasharray="2 3"
              opacity="0.8"
            />
            {hoverData.day.volume > 0 && (
              <circle
                cx={hoverData.x}
                cy={hoverData.y}
                r="4.5"
                fill="var(--acc)"
                stroke="var(--surface)"
                strokeWidth="2"
              />
            )}
          </g>
        )}
      </svg>

      {/* Floating HTML Tooltip */}
      {hoverData && (
        <div
          ref={tipRef}
          className="d3-chart-tooltip"
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 10,
            background: 'color-mix(in srgb, var(--surface) 96%, transparent)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--sep)',
            borderRadius: 'var(--r-md, 8px)',
            padding: '8px 12px',
            boxShadow: '0 8px 24px -4px rgba(0,0,0,0.5)',
            fontSize: '12px',
            lineHeight: 1.35,
            whiteSpace: 'nowrap',
            transition: 'top 0.08s ease, left 0.08s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, color: 'var(--label)' }}>
              {fmtDate(hoverData.day.date)}
            </span>
            <span style={{ fontSize: '10.5px', color: 'var(--label-3)', fontFamily: 'monospace' }}>
              {hoverData.day.dayOfWeek}
            </span>
          </div>

          {hoverData.day.volume > 0 ? (
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--acc)', marginBottom: 3 }}>
                {fmtVol(hoverData.day.volume, unit)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--label-2)' }}>
                {hoverData.day.workouts.map(w => w.name).join(', ') || t('Workout')}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--label-3)', marginTop: 2 }}>
                {t('{0} sets · {1} reps', hoverData.day.setsCount, hoverData.day.repsCount)}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--label-3)', fontSize: '11.5px', fontStyle: 'italic' }}>
              {t('Rest day · 0 volume')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
