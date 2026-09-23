import { useLayoutEffect, useRef, useState } from 'react'
import { fmtNum, fmtDate, MONTHS, isoOf } from '../lib/format.js'
import { t } from '../lib/i18n.js'

const W = 340

export default function ProgressionLineChart({
  points = [],
  h = 160,
  unit = '',
  color = 'var(--acc)',
  showTrend = true,
  goal = null
}) {
  const svgRef = useRef(null)
  const wrapRef = useRef(null)
  const tipRef = useRef(null)
  const [hover, setHover] = useState(null)

  useLayoutEffect(() => {
    const tip = tipRef.current, wrap = wrapRef.current
    if (!hover || !tip || !wrap) return
    const cw = wrap.clientWidth, ch = wrap.clientHeight
    const tw = tip.offsetWidth, th = tip.offsetHeight
    const M = 4
    const cx = (hover.x / W) * cw, cy = (hover.y / h) * ch
    tip.style.left = Math.max(M, Math.min(cw - tw - M, cx - tw / 2)) + 'px'
    tip.style.top = (cy < th + 14 ? Math.min(ch - th - M, cy + 14) : Math.max(M, cy - th - 8)) + 'px'
  })

  if (!points || points.length === 0) {
    return <div className="empty small">{t('No exercise data recorded yet')}</div>
  }

  const H = h
  const P = { l: 34, r: 12, t: 14, b: 22 }
  const single = points.length === 1
  const pts = single ? [points[0], points[0]] : points
  const ys = pts.map(p => p.y)
  let ymin = Math.min(...ys), ymax = Math.max(...ys)
  if (goal != null && isFinite(goal)) {
    ymin = Math.min(ymin, goal)
    ymax = Math.max(ymax, goal)
  }
  if (ymin === ymax) {
    ymin -= 1
    ymax += 1
  }
  const pad = (ymax - ymin) * 0.14
  ymin -= pad
  ymax += pad

  const t0 = pts[0].t, t1 = pts[pts.length - 1].t || t0 + 1
  const X = t => (t1 === t0 ? (P.l + W - P.r) / 2 : P.l + ((t - t0) / (t1 - t0)) * (W - P.l - P.r))
  const Y = y => {
    const f = (y - ymin) / (ymax - ymin)
    return P.t + (1 - f) * (H - P.t - P.b)
  }

  // Linear regression line for Performance Trend
  let trendLine = null
  if (showTrend && pts.length >= 2) {
    const n = pts.length
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
    pts.forEach((p, idx) => {
      sumX += idx
      sumY += p.y
      sumXY += idx * p.y
      sumXX += idx * idx
    })
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1)
    const intercept = (sumY - slope * sumX) / n
    const startY = Y(intercept)
    const endY = Y(intercept + slope * (n - 1))
    const startX = X(pts[0].t)
    const endX = X(pts[pts.length - 1].t)
    trendLine = { startX, startY, endX, endY, slope }
  }

  // Gridlines
  const gridlines = []
  const range = ymax - ymin, raw = range / 3
  const pow = Math.pow(10, Math.floor(Math.log10(raw || 1)))
  let step = 10 * pow
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (raw <= m * pow) {
      step = m * pow
      break
    }
  }
  for (let v = Math.ceil(ymin / step) * step; v <= ymax + 1e-9; v += step) {
    const y = Y(v)
    gridlines.push(
      <g key={'y' + v}>
        <line x1={P.l} y1={y} x2={W - P.r} y2={y} stroke="var(--sep-op)" strokeWidth="1" strokeDasharray="2 4" />
        <text x={P.l - 5} y={y + 3.5} textAnchor="end" fontSize="9.5" fill="var(--label-3)">
          {fmtNum(v)}
        </text>
      </g>
    )
  }

  const d0 = new Date(t0), d1 = new Date(t1)
  const ticks = []
  let m = new Date(d0.getFullYear(), d0.getMonth() + 1, 1)
  while (m <= d1) {
    ticks.push({ t: +m, txt: t(MONTHS[m.getMonth()]) })
    m = new Date(m.getFullYear(), m.getMonth() + 1, 1)
  }
  if (ticks.length === 0 && !single) {
    for (let i = 0; i <= 2; i++) {
      const tv = t0 + ((t1 - t0) * i) / 2, dd = new Date(tv)
      ticks.push({
        t: tv,
        txt: dd.getDate() + ' ' + t(MONTHS[dd.getMonth()]),
        anchor: i === 0 ? 'start' : i === 2 ? 'end' : 'middle'
      })
    }
  }
  const every = Math.max(1, Math.ceil(ticks.length / 7))
  ticks.forEach((tk, i) => {
    if (i % every) return
    const x = X(tk.t)
    gridlines.push(
      <g key={'x' + i}>
        <line x1={x} y1={P.t} x2={x} y2={H - P.b} stroke="var(--sep-op)" strokeWidth="1" strokeDasharray="2 4" />
        <text x={x} y={H - 7} textAnchor={tk.anchor || 'middle'} fontSize="9.5" fill="var(--label-3)">
          {tk.txt}
        </text>
      </g>
    )
  })

  const poly = pts.map(p => X(p.t).toFixed(1) + ',' + Y(p.y).toFixed(1)).join(' ')
  const last = pts[pts.length - 1]
  const gid = 'prog_' + Math.round(t0 % 1e7) + '_' + H

  const hoverPts = (single ? [points[0]] : points).map(p => ({
    x: X(p.t),
    y: Y(p.y),
    iso: p.d || isoOf(new Date(p.t)),
    v: p.y,
    isPR: p.isPR,
    w: p.w,
    r: p.r,
    note: p.note,
    sets: p.sets
  }))

  const onMove = e => {
    const c = e.touches ? e.touches[0] : e
    if (!c || c.clientX === undefined || !svgRef.current) return
    const r = svgRef.current.getBoundingClientRect()
    const w = r.width || W
    const vx = ((c.clientX - r.left) / w) * W
    let best = hoverPts[0]
    hoverPts.forEach(p => {
      if (Math.abs(p.x - vx) < Math.abs(best.x - vx)) best = p
    })
    setHover(best)
  }

  return (
    <div
      className="chart-i"
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseDown={onMove}
      onMouseLeave={() => setHover(null)}
      onTouchStart={onMove}
      onTouchMove={onMove}
    >
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ aspectRatio: `${W}/${H}` }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".25" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridlines}

        {/* Goal line */}
        {goal != null && isFinite(goal) && (
          <>
            <line
              x1={P.l}
              y1={Y(goal)}
              x2={W - P.r}
              y2={Y(goal)}
              stroke="var(--yellow)"
              strokeWidth="1.6"
              strokeDasharray="7 4"
            />
            <text x={W - P.r - 2} y={Y(goal) - 5} textAnchor="end" fontSize="9.5" fontWeight="700" fill="var(--yellow)">
              {fmtNum(goal)}
            </text>
          </>
        )}

        {/* Shaded Area */}
        <polygon points={`${P.l},${H - P.b} ${poly} ${X(last.t).toFixed(1)},${H - P.b}`} fill={`url(#${gid})`} />

        {/* Performance Trend Line */}
        {trendLine && (
          <line
            x1={trendLine.startX}
            y1={trendLine.startY}
            x2={trendLine.endX}
            y2={trendLine.endY}
            stroke="var(--label-2)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.6"
          />
        )}

        {/* Main Progression Line */}
        <polyline
          points={poly}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points & PR highlights */}
        {pts.map((p, i) => {
          const cx = X(p.t)
          const cy = Y(p.y)
          if (p.isPR) {
            return (
              <g key={'pr_' + i}>
                <circle cx={cx} cy={cy} r="6.5" fill="var(--yellow)" opacity="0.25" />
                <circle cx={cx} cy={cy} r="4.2" fill="var(--yellow)" stroke="var(--bg)" strokeWidth="1.5" />
              </g>
            )
          }
          return <circle key={'pt_' + i} cx={cx} cy={cy} r="2.8" fill={color} />
        })}

        {/* Last session dot */}
        <circle cx={X(last.t)} cy={Y(last.y)} r="4" fill={color} stroke="var(--bg)" strokeWidth="1.5" />

        {/* Crosshairs on hover */}
        {hover && (
          <g>
            <line
              className="cvl"
              x1={hover.x}
              y1={P.t}
              x2={hover.x}
              y2={H - P.b}
              stroke="var(--label-3)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <line
              className="chl"
              x1={P.l}
              y1={hover.y}
              x2={W - P.r}
              y2={hover.y}
              stroke="var(--label-3)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx={hover.x}
              cy={hover.y}
              r="5.5"
              fill={hover.isPR ? 'var(--yellow)' : color}
              stroke="var(--bg)"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Floating Tooltip */}
      {hover && (
        <div className="ctip" ref={tipRef}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontWeight: 600, color: 'var(--label)' }}>{fmtDate(hover.iso, true)}</span>
            {hover.isPR && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 4,
                  background: 'var(--yellow)',
                  color: '#000'
                }}
              >
                ★ PR
              </span>
            )}
          </div>
          <div style={{ color: color, fontWeight: 700, fontSize: 13 }}>
            {fmtNum(hover.v)} {unit}
          </div>
          {hover.w != null && hover.r != null && (
            <div style={{ color: 'var(--label-2)', fontSize: 11, marginTop: 2 }}>
              {fmtNum(hover.w)} {unit} × {hover.r} reps
            </div>
          )}
          {hover.note && (
            <div style={{ color: 'var(--label-3)', fontSize: 10.5, marginTop: 2 }}>
              {hover.note}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
