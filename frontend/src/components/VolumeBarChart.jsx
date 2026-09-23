import { useRef, useState, useLayoutEffect } from 'react'
import { fmtNum, fmtVol } from '../lib/format.js'
import { t } from '../lib/i18n.js'

export default function VolumeBarChart({ data = [], h = 165, unit = 'kg', onSelect, selectedKey }) {
  const svgRef = useRef(null)
  const wrapRef = useRef(null)
  const tipRef = useRef(null)
  const [hover, setHover] = useState(null)

  // Auto-scroll to latest period on initial mount
  useLayoutEffect(() => {
    if (wrapRef.current) {
      wrapRef.current.scrollLeft = wrapRef.current.scrollWidth
    }
  }, [data.length])

  // Tooltip positioning constrained inside viewport
  useLayoutEffect(() => {
    const tip = tipRef.current, wrap = wrapRef.current
    if (!hover || !tip || !wrap) return
    const cw = wrap.clientWidth, ch = wrap.clientHeight
    const tw = tip.offsetWidth, th = tip.offsetHeight
    const M = 4
    const cx = (hover.x / W) * cw, cy = (hover.y / H) * ch
    tip.style.left = Math.max(M, Math.min(cw - tw - M, cx - tw / 2)) + 'px'
    tip.style.top = (cy < th + 16 ? Math.min(ch - th - M, cy + 16) : Math.max(M, cy - th - 8)) + 'px'
  })

  if (!data || data.length === 0) {
    return <div className="empty small">{t('No volume data recorded')}</div>
  }

  const H = h
  const P = { l: 38, r: 10, t: 20, b: 24 }
  const barSlotWidth = 24
  const W = Math.max(340, P.l + P.r + data.length * barSlotWidth)

  const volumes = data.map(d => d.vol || 0)
  const maxVol = Math.max(...volumes, 1)
  const nonZeroVols = volumes.filter(v => v > 0).sort((a, b) => a - b)
  const q = p => (nonZeroVols.length ? nonZeroVols[Math.min(nonZeroVols.length - 1, Math.floor(p * nonZeroVols.length))] : 0)
  const t1 = q(0.25), t2 = q(0.5), t3 = q(0.75)

  const colW = (W - P.l - P.r) / data.length
  const barW = Math.max(8, Math.min(18, colW * 0.7))

  // Gridlines for Y-axis (volume)
  const gridlines = []
  const steps = 3
  for (let i = 1; i <= steps; i++) {
    const v = Math.round((maxVol * i) / steps)
    const y = H - P.b - (v / maxVol) * (H - P.t - P.b)
    gridlines.push(
      <g key={'gy_' + i}>
        <line x1={P.l} y1={y} x2={W - P.r} y2={y} stroke="var(--sep-op)" strokeWidth="1" strokeDasharray="2 4" />
        <text x={P.l - 5} y={y + 3.5} textAnchor="end" fontSize="9.5" fill="var(--label-3)">
          {v >= 1000 ? Math.round(v / 1000) + 'k' : v}
        </text>
      </g>
    )
  }

  const hoverList = data.map((d, i) => {
    const cx = P.l + i * colW + colW / 2
    const v = d.vol || 0
    const bH = v > 0 ? Math.max(4, (v / maxVol) * (H - P.t - P.b)) : d.count > 0 ? 6 : 2
    const y = H - P.b - bH
    return {
      x: cx,
      y,
      data: d
    }
  })

  const onMove = e => {
    const c = e.touches ? e.touches[0] : e
    if (!c || c.clientX === undefined || !svgRef.current) return
    const r = svgRef.current.getBoundingClientRect()
    const w = r.width || W
    const vx = ((c.clientX - r.left) / w) * W
    let best = hoverList[0]
    hoverList.forEach(item => {
      if (Math.abs(item.x - vx) < Math.abs(best.x - vx)) best = item
    })
    setHover(best)
  }

  // Determine heatmap level for volume
  const getLevel = (vol, count) => {
    if (count === 0 && vol === 0) return 0
    if (vol === 0 && count > 0) return 1
    if (vol >= t3) return 4
    if (vol >= t2) return 3
    if (vol >= t1) return 2
    return 1
  }

  const getBarColor = (level) => {
    switch (level) {
      case 4: return 'var(--acc)'
      case 3: return 'color-mix(in srgb, var(--acc) 78%, var(--surface-2))'
      case 2: return 'color-mix(in srgb, var(--acc) 55%, var(--surface-2))'
      case 1: return 'color-mix(in srgb, var(--acc) 30%, var(--surface-2))'
      default: return 'var(--surface-2)'
    }
  }

  // Label skip frequency for crowded charts
  const labelInterval = Math.max(1, Math.ceil(data.length / 10))

  return (
    <div className="vbar-chart" ref={wrapRef}>
      <div
        className="chart-i"
        onMouseMove={onMove}
        onMouseDown={onMove}
        onMouseLeave={() => setHover(null)}
        onTouchStart={onMove}
        onTouchMove={onMove}
        style={{ minWidth: W }}
      >
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H, display: 'block' }}>
          {/* Baseline */}
          <line x1={P.l} y1={H - P.b} x2={W - P.r} y2={H - P.b} stroke="var(--sep)" strokeWidth="1" />
          {gridlines}

          {data.map((d, i) => {
            const cx = P.l + i * colW + colW / 2
            const v = d.vol || 0
            const bH = v > 0 ? Math.max(4, (v / maxVol) * (H - P.t - P.b)) : d.count > 0 ? 6 : 2
            const y = H - P.b - bH
            const x = cx - barW / 2
            const lvl = getLevel(v, d.count)
            const color = getBarColor(lvl)
            const isSel = selectedKey && selectedKey === d.key
            const isHov = hover && hover.data.key === d.key

            return (
              <g
                key={d.key || i}
                onClick={() => onSelect && onSelect(d)}
                style={{ cursor: onSelect ? 'pointer' : 'default' }}
              >
                {/* Click target column */}
                <rect
                  x={cx - colW / 2}
                  y={P.t}
                  width={colW}
                  height={H - P.t - P.b}
                  fill="transparent"
                />

                {/* Main volume bar */}
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={bH}
                  rx="3.5"
                  ry="3.5"
                  fill={color}
                  stroke={isSel ? 'var(--label)' : isHov ? 'var(--label-2)' : 'none'}
                  strokeWidth={isSel ? 1.8 : isHov ? 1 : 0}
                  opacity={isHov ? 1 : isSel ? 1 : 0.88}
                  style={{
                    transformOrigin: `${cx}px ${H - P.b}px`,
                    transition: 'transform var(--fast) var(--ease), opacity var(--fast)'
                  }}
                />

                {/* Workout Frequency Badge above bar */}
                {d.count > 0 && (
                  <text
                    x={cx}
                    y={Math.max(12, y - 4)}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="600"
                    fill={isSel || isHov ? 'var(--acc)' : 'var(--label-2)'}
                  >
                    {d.count}×
                  </text>
                )}

                {/* X-axis label */}
                {(i % labelInterval === 0 || i === data.length - 1) && (
                  <text
                    x={cx}
                    y={H - 7}
                    textAnchor="middle"
                    fontSize="9.5"
                    fill={d.isCurrent ? 'var(--acc)' : 'var(--label-3)'}
                    fontWeight={d.isCurrent ? '700' : '500'}
                  >
                    {d.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Hover highlight line & marker */}
          {hover && (
            <g pointerEvents="none">
              <line
                x1={hover.x}
                y1={P.t}
                x2={hover.x}
                y2={H - P.b}
                stroke="var(--label-3)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip */}
        {hover && (
          <div className="ctip" ref={tipRef}>
            <div style={{ fontWeight: 600, color: 'var(--label)', marginBottom: 2 }}>
              {hover.data.subLabel || hover.data.label}
            </div>
            <div style={{ color: 'var(--acc)', fontWeight: 600 }}>
              {fmtVol(hover.data.vol || 0, unit)}
            </div>
            <div style={{ color: 'var(--label-2)', fontSize: 11, marginTop: 2 }}>
              {hover.data.count === 1 ? t('1 workout') : t('{0} workouts', hover.data.count)}
              {hover.data.sets ? ` · ${t('{0} sets', hover.data.sets)}` : ''}
              {hover.data.count > 1 && hover.data.vol > 0
                ? ` · ${t('{0} avg', fmtVol(Math.round(hover.data.vol / hover.data.count), unit))}`
                : ''}
            </div>
          </div>
        )}
      </div>

      {/* Heatmap-style Legend */}
      <div className="hm-legend" style={{ marginTop: 8 }}>
        <span>{t('Less volume')}</span>
        <div className="hm-c l0" style={{ width: 10, height: 10 }} />
        <div className="hm-c l1" style={{ width: 10, height: 10 }} />
        <div className="hm-c l2" style={{ width: 10, height: 10 }} />
        <div className="hm-c l3" style={{ width: 10, height: 10 }} />
        <div className="hm-c l4" style={{ width: 10, height: 10 }} />
        <span>{t('More volume')}</span>
        <span style={{ marginLeft: 12, color: 'var(--label-3)' }}>· {t('3× = workout frequency')}</span>
      </div>
    </div>
  )
}
