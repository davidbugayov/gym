import { useRef, useState, useLayoutEffect, useMemo } from 'react'
import * as d3 from 'd3'
import { fmtNum, fmtDate, fmtVol } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

// Distinct, high-contrast, theme-agnostic palette for the 3 lines
export const SERIES_COLORS = [
  '#30d158', // Vivid Emerald / Lime
  '#0a84ff', // Electric Azure / Blue
  '#ff9f0a'  // Warm Amber / Gold
]

const W = 540
const H = 240
const MARGIN = { top: 24, right: 20, bottom: 34, left: 48 }

/**
 * TopExercisesVolumeD3Chart
 *
 * Uses D3 to render a multi-line chart plotting the volume progress
 * of the top 3 most used exercises over the last 3 months.
 */
export default function TopExercisesVolumeD3Chart({
  exercises = [],
  timeRange = null,
  unit = 'kg',
  height = H,
  activeExerciseId = null,
  onSelectExercise = null
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

    // Convert SVG viewBox coordinate to pixel container coordinate
    const cx = (hoverData.x / W) * cw
    const cy = (hoverData.y / height) * ch

    // Constrain horizontally inside container
    const left = Math.max(M, Math.min(cw - tw - M, cx - tw / 2))
    tip.style.left = `${left}px`

    // Place above point if room, otherwise below
    if (cy < th + 18) {
      tip.style.top = `${Math.min(ch - th - M, cy + 16)}px`
    } else {
      tip.style.top = `${Math.max(M, cy - th - 12)}px`
    }
  }, [hoverData, height])

  // Prepare data & D3 calculations
  const {
    allPoints,
    xScale,
    yScale,
    xTicks,
    yTicks,
    seriesData,
    maxVol
  } = useMemo(() => {
    if (!exercises || exercises.length === 0) {
      return { allPoints: [], seriesData: [] }
    }

    // Collect all points across the exercises
    const allPts = []
    exercises.forEach((ex, idx) => {
      const color = SERIES_COLORS[idx % SERIES_COLORS.length]
      (ex.points || []).forEach(pt => {
        allPts.push({
          ...pt,
          exerciseId: ex.id,
          exerciseName: ex.name,
          color,
          seriesIndex: idx
        })
      })
    })

    if (allPts.length === 0) {
      return { allPoints: [], seriesData: [] }
    }

    // Determine time domain: 3 months ago to now (or range of points)
    const now = Date.now()
    const defaultStart = now - 90 * 86400000
    const startT = timeRange?.start || defaultStart
    const endT = Math.max(timeRange?.end || now, startT + 86400000)

    const maxVolumeFound = Math.max(
      ...exercises.flatMap(e => (e.points || []).map(p => p.volume || 0)),
      100
    )

    // D3 Scales
    const x = d3.scaleTime()
      .domain([new Date(startT), new Date(endT)])
      .range([MARGIN.left, W - MARGIN.right])

    const y = d3.scaleLinear()
      .domain([0, maxVolumeFound * 1.15])
      .range([height - MARGIN.bottom, MARGIN.top])
      .nice()

    // D3 Line & Area generators
    const lineGen = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.volume))
      .curve(d3.curveMonotoneX)

    const areaGen = d3.area()
      .x(d => x(d.date))
      .y0(y(0))
      .y1(d => y(d.volume))
      .curve(d3.curveMonotoneX)

    // Build series paths using D3
    const series = exercises.map((ex, idx) => {
      const color = SERIES_COLORS[idx % SERIES_COLORS.length]
      const pts = [...(ex.points || [])].sort((a, b) => a.t - b.t)
      const pathD = pts.length > 1 ? lineGen(pts) : null
      const areaD = pts.length > 1 ? areaGen(pts) : null

      return {
        ...ex,
        color,
        seriesIndex: idx,
        pts,
        pathD,
        areaD
      }
    })

    const yTickValues = y.ticks(4)
    const xTickValues = x.ticks(d3.timeMonth.every(1) || 3)

    return {
      allPoints: allPts,
      xScale: x,
      yScale: y,
      xTicks: xTickValues,
      yTicks: yTickValues,
      seriesData: series,
      maxVol: maxVolumeFound
    }
  }, [exercises, timeRange, height])

  if (!exercises || exercises.length === 0 || allPoints.length === 0) {
    return (
      <div className="empty small" style={{ padding: '32px 16px', textAlign: 'center' }}>
        <Icon name="dumbbell" size={24} className="dim" style={{ margin: '0 auto 8px', display: 'block' }} />
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('No volume data recorded in the last 3 months')}</div>
        <div className="dim">{t('Complete workouts with weight and reps to see your exercise volume progression here.')}</div>
      </div>
    )
  }

  // Pointer / touch scrub handler with D3
  const handlePointerMove = e => {
    if (!wrapRef.current || !svgRef.current || !xScale) return
    const rect = svgRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    if (clientX === undefined) return

    // Normalized X in SVG coordinates
    const svgX = ((clientX - rect.left) / rect.width) * W
    const boundedX = Math.max(MARGIN.left, Math.min(W - MARGIN.right, svgX))
    const hoverDate = xScale.invert(boundedX)
    const hoverTime = hoverDate.getTime()

    // Find the nearest points across the active series
    const activeSeries = activeExerciseId
      ? seriesData.filter(s => s.id === activeExerciseId)
      : seriesData

    const itemsAtTime = []
    let closestPtOverall = null
    let minDistance = Infinity

    activeSeries.forEach(s => {
      if (!s.pts || s.pts.length === 0) return
      // Use D3 bisector to quickly find closest workout point in this series
      const bisect = d3.bisector(d => d.t).center
      const idx = Math.min(Math.max(0, bisect(s.pts, hoverTime)), s.pts.length - 1)
      const pt = s.pts[idx]
      if (pt) {
        const dist = Math.abs(pt.t - hoverTime)
        if (dist < minDistance) {
          minDistance = dist
          closestPtOverall = pt
        }
        itemsAtTime.push({
          exerciseId: s.id,
          exerciseName: s.name,
          color: s.color,
          volume: pt.volume,
          setsCount: pt.setsCount,
          repsCount: pt.repsCount,
          maxWeight: pt.maxWeight,
          d: pt.d,
          t: pt.t,
          x: xScale(pt.date),
          y: yScale(pt.volume)
        })
      }
    })

    if (!closestPtOverall) {
      setHoverData(null)
      return
    }

    const snapX = xScale(closestPtOverall.date)
    const snapY = yScale(closestPtOverall.volume)

    setHoverData({
      x: snapX,
      y: snapY,
      svgX: boundedX,
      dateISO: closestPtOverall.d,
      date: closestPtOverall.date,
      items: itemsAtTime
    })
  }

  const handlePointerLeave = () => {
    setHoverData(null)
  }

  return (
    <div
      className="chart-i"
      ref={wrapRef}
      onMouseMove={handlePointerMove}
      onTouchStart={handlePointerMove}
      onTouchMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      onTouchEnd={handlePointerLeave}
      style={{ touchAction: 'pan-y', userSelect: 'none', position: 'relative' }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      >
        <defs>
          {seriesData.map(s => (
            <linearGradient key={`grad_${s.id}`} id={`volGrad_${s.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.0" />
            </linearGradient>
          ))}
          <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="currentColor" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Horizontal grid lines and Y-axis values via D3 ticks */}
        {yTicks.map(val => {
          const y = yScale(val)
          const formatted = val >= 1000 ? `${fmtNum(val / 1000)}k` : fmtNum(val)
          return (
            <g key={`yTick_${val}`}>
              <line
                x1={MARGIN.left}
                y1={y}
                x2={W - MARGIN.right}
                y2={y}
                stroke="var(--sep-op, rgba(255,255,255,0.08))"
                strokeWidth="1"
                strokeDasharray="2 4"
              />
              <text
                x={MARGIN.left - 6}
                y={y + 3.5}
                textAnchor="end"
                fontSize="9.5"
                fill="var(--label-3, rgba(255,255,255,0.4))"
                fontWeight="500"
              >
                {formatted}
              </text>
            </g>
          )
        })}

        {/* X-axis date grid lines and labels via D3 */}
        {xTicks.map((dt, i) => {
          const x = xScale(dt)
          if (x < MARGIN.left || x > W - MARGIN.right) return null
          const label = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          return (
            <g key={`xTick_${i}`}>
              <line
                x1={x}
                y1={MARGIN.top}
                x2={x}
                y2={height - MARGIN.bottom}
                stroke="var(--sep-op, rgba(255,255,255,0.06))"
                strokeWidth="1"
                strokeDasharray="2 4"
              />
              <text
                x={x}
                y={height - MARGIN.bottom + 16}
                textAnchor="middle"
                fontSize="10"
                fill="var(--label-2, rgba(255,255,255,0.6))"
                fontWeight="500"
              >
                {label}
              </text>
            </g>
          )
        })}

        {/* Render area gradient fills under curves */}
        {seriesData.map(s => {
          if (!s.areaD) return null
          const isFaded = activeExerciseId && activeExerciseId !== s.id
          return (
            <path
              key={`area_${s.id}`}
              d={s.areaD}
              fill={`url(#volGrad_${s.id})`}
              opacity={isFaded ? 0.05 : 1}
              style={{ transition: 'opacity 0.2s ease' }}
            />
          )
        })}

        {/* Render D3 line paths */}
        {seriesData.map(s => {
          const isFocused = !activeExerciseId || activeExerciseId === s.id
          const isFaded = activeExerciseId && activeExerciseId !== s.id
          const strokeWidth = isFocused ? (activeExerciseId === s.id ? 3.2 : 2.5) : 1.2
          const opacity = isFaded ? 0.22 : 1

          return (
            <g key={`line_${s.id}`} style={{ transition: 'opacity 0.2s ease' }}>
              {s.pathD && (
                <path
                  d={s.pathD}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={opacity}
                />
              )}

              {/* Data points along the curve */}
              {s.pts.map((p, pIdx) => {
                const cx = xScale(p.date)
                const cy = yScale(p.volume)
                const isHovered = hoverData?.items?.some(it => it.exerciseId === s.id && it.d === p.d)

                return (
                  <g key={`dot_${s.id}_${pIdx}`}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 5.5 : s.pts.length === 1 ? 5 : 3.5}
                      fill={s.color}
                      stroke="var(--bg, #000)"
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      opacity={opacity}
                    />
                    {isHovered && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="9"
                        fill="none"
                        stroke={s.color}
                        strokeWidth="1.5"
                        opacity="0.6"
                      />
                    )}
                  </g>
                )
              })}
            </g>
          )
        })}

        {/* Vertical crosshair guide on hover */}
        {hoverData && (
          <g pointerEvents="none">
            <line
              x1={hoverData.x}
              y1={MARGIN.top}
              x2={hoverData.x}
              y2={height - MARGIN.bottom}
              stroke="var(--label-3, rgba(255,255,255,0.4))"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          </g>
        )}
      </svg>

      {/* Interactive Tooltip Card */}
      {hoverData && (
        <div
          className="ctip"
          ref={tipRef}
          style={{
            position: 'absolute',
            background: 'var(--surface-2, #1c1c1e)',
            border: '1px solid var(--sep, rgba(255,255,255,0.12))',
            borderRadius: '10px',
            padding: '8px 12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 10,
            pointerEvents: 'none',
            minWidth: '160px',
            maxWidth: '280px'
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--label-2, rgba(255,255,255,0.6))',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            {fmtDate(hoverData.dateISO, true)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {hoverData.items.map(it => (
              <div
                key={it.exerciseId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: it.color,
                      flexShrink: 0
                    }}
                  />
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: 500
                    }}
                  >
                    {t(it.exerciseName)}
                  </span>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700 }}>
                  {fmtVol(it.volume, unit)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
