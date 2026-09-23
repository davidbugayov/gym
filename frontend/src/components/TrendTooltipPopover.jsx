import { useEffect, useRef, useState } from 'react'
import { useUI } from '../store/useUI.js'
import { fmtDate, fmtNum } from '../lib/format.js'
import { fmtPct } from '../lib/trends.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

export default function TrendTooltipPopover() {
  const { trendTooltip, closeTrendTooltip } = useUI()
  const popoverRef = useRef(null)
  const [pos, setPos] = useState(null)

  useEffect(() => {
    if (!trendTooltip || !trendTooltip.targetRect) {
      setPos(null)
      return
    }

    const updatePosition = () => {
      const rect = trendTooltip.targetRect
      const popoverWidth = Math.min(280, window.innerWidth - 24)
      const centerX = rect.left + rect.width / 2

      // Clamp horizontally within screen
      const left = Math.max(12, Math.min(window.innerWidth - popoverWidth - 12, centerX - popoverWidth / 2))
      const arrowLeft = Math.max(16, Math.min(popoverWidth - 16, centerX - left))

      // Check vertical space (preferred above, fallback below)
      const spaceAbove = rect.top
      const placeAbove = spaceAbove > 230

      const top = placeAbove
        ? Math.max(12, rect.top - 10)
        : Math.min(window.innerHeight - 200, rect.bottom + 10)

      setPos({
        left,
        top,
        width: popoverWidth,
        arrowLeft,
        placeAbove
      })
    }

    updatePosition()

    const onPointerDown = e => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        closeTrendTooltip()
      }
    }

    const onKeyDown = e => {
      if (e.key === 'Escape') closeTrendTooltip()
    }

    const onScrollOrResize = () => {
      closeTrendTooltip()
    }

    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [trendTooltip, closeTrendTooltip])

  if (!trendTooltip || !pos) return null

  const { trend, title } = trendTooltip
  if (!trend) return null

  const isUp = trend.trend === 'up'
  const isDown = trend.trend === 'down'
  const isSame = trend.trend === 'same'
  const isFirst = trend.trend === 'first'

  return (
    <div className="trend-popover-portal">
      <div
        ref={popoverRef}
        className={`trend-popover ${pos.placeAbove ? 'above' : 'below'}`}
        style={{
          position: 'fixed',
          left: `${pos.left}px`,
          top: `${pos.top}px`,
          width: `${pos.width}px`,
          transform: pos.placeAbove ? 'translateY(-100%)' : 'none',
          zIndex: 10005
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('Exercise progression')}
      >
        {/* Pointer arrow */}
        <div
          className={`trend-popover-arrow ${pos.placeAbove ? 'bottom' : 'top'}`}
          style={{ left: `${pos.arrowLeft}px` }}
        />

        {/* Header */}
        <div className="trend-popover-hdr">
          <div className="trend-popover-title-row">
            <span className="trend-popover-title">{title || t('Exercise progression')}</span>
            <button
              type="button"
              className="trend-popover-close"
              onClick={closeTrendTooltip}
              aria-label={t('Close')}
            >
              <Icon name="xmark" size={12} />
            </button>
          </div>
          <div className="trend-popover-sub">
            {trend.prevDate
              ? t('vs previous session ({0})', fmtDate(trend.prevDate, true))
              : t('First logged session')}
          </div>
        </div>

        {/* Content body */}
        <div className="trend-popover-body">
          {isFirst ? (
            <div className="trend-popover-first-note">
              <div className="trend-popover-baseline-title">
                <span className="trend-first-label">1st</span>
                <strong>{t('Baseline recorded')}</strong>
              </div>
              <div className="trend-popover-first-stats">
                {trend.hasWeight && (
                  <div>{t('Top weight')}: <strong>{trend.currentMaxW} {trend.unit}</strong></div>
                )}
                {trend.currentVol > 0 && (
                  <div>{t('Volume')}: <strong>{fmtNum(trend.currentVol)} {trend.unit}</strong></div>
                )}
                <div>{t('Completed')}: <strong>{trend.currentSetsCount} {t('sets')} ({trend.currentReps} {t('reps')})</strong></div>
              </div>
              <div className="trend-popover-hint">
                {t('Log this exercise again in your next workout to see percentage progress.')}
              </div>
            </div>
          ) : (
            <div className="trend-popover-stats">
              {/* Weight Metric */}
              {trend.hasWeight && (
                <div className="trend-stat-row">
                  <div className="trend-stat-meta">
                    <span className="trend-stat-label">{t('Top weight')}</span>
                    <span className="trend-stat-vals">
                      {trend.prevMaxW} → {trend.currentMaxW} {trend.unit}
                    </span>
                  </div>
                  <div className={`trend-stat-badge ${trend.diffW > 0 ? 'up' : trend.diffW < 0 ? 'down' : 'same'}`}>
                    {trend.diffW > 0 && <Icon name="arrowUp" size={10} />}
                    {trend.diffW < 0 && <Icon name="arrowDown" size={10} />}
                    <span className="trend-pct">{fmtPct(trend.pctW)}</span>
                    {trend.diffW !== 0 && (
                      <span className="trend-diff">({trend.diffW > 0 ? `+${trend.diffW}` : trend.diffW} {trend.unit})</span>
                    )}
                  </div>
                </div>
              )}

              {/* Volume Metric */}
              {(trend.hasWeight || trend.currentVol > 0 || trend.prevVol > 0) && (
                <div className="trend-stat-row">
                  <div className="trend-stat-meta">
                    <span className="trend-stat-label">{t('Total volume')}</span>
                    <span className="trend-stat-vals">
                      {fmtNum(trend.prevVol)} → {fmtNum(trend.currentVol)} {trend.unit}
                    </span>
                  </div>
                  <div className={`trend-stat-badge ${trend.diffVol > 0 ? 'up' : trend.diffVol < 0 ? 'down' : 'same'}`}>
                    {trend.diffVol > 0 && <Icon name="arrowUp" size={10} />}
                    {trend.diffVol < 0 && <Icon name="arrowDown" size={10} />}
                    <span className="trend-pct">{fmtPct(trend.pctVol)}</span>
                    {trend.diffVol !== 0 && (
                      <span className="trend-diff">({trend.diffVol > 0 ? `+${fmtNum(trend.diffVol)}` : fmtNum(trend.diffVol)} {trend.unit})</span>
                    )}
                  </div>
                </div>
              )}

              {/* Reps Metric (for bodyweight or when reps changed) */}
              {(trend.hasReps && (!trend.hasWeight || trend.diffReps !== 0)) && (
                <div className="trend-stat-row">
                  <div className="trend-stat-meta">
                    <span className="trend-stat-label">{t('Total reps')}</span>
                    <span className="trend-stat-vals">
                      {trend.prevReps} → {trend.currentReps} {t('reps')}
                    </span>
                  </div>
                  <div className={`trend-stat-badge ${trend.diffReps > 0 ? 'up' : trend.diffReps < 0 ? 'down' : 'same'}`}>
                    {trend.diffReps > 0 && <Icon name="arrowUp" size={10} />}
                    {trend.diffReps < 0 && <Icon name="arrowDown" size={10} />}
                    <span className="trend-pct">{fmtPct(trend.pctReps)}</span>
                    {trend.diffReps !== 0 && (
                      <span className="trend-diff">({trend.diffReps > 0 ? `+${trend.diffReps}` : trend.diffReps})</span>
                    )}
                  </div>
                </div>
              )}

              {/* Timed Hold Metric */}
              {trend.hasTime && (
                <div className="trend-stat-row">
                  <div className="trend-stat-meta">
                    <span className="trend-stat-label">{t('Duration')}</span>
                    <span className="trend-stat-vals">
                      {trend.prevSec}s → {trend.currentSec}s
                    </span>
                  </div>
                  <div className={`trend-stat-badge ${trend.diffSec > 0 ? 'up' : trend.diffSec < 0 ? 'down' : 'same'}`}>
                    {trend.diffSec > 0 && <Icon name="arrowUp" size={10} />}
                    {trend.diffSec < 0 && <Icon name="arrowDown" size={10} />}
                    <span className="trend-pct">{fmtPct(trend.pctSec)}</span>
                    {trend.diffSec !== 0 && (
                      <span className="trend-diff">({trend.diffSec > 0 ? `+${trend.diffSec}` : trend.diffSec}s)</span>
                    )}
                  </div>
                </div>
              )}

              {/* Equal Performance Note */}
              {isSame && (
                <div className="trend-popover-same-note">
                  <span className="trend-icon-neutral">—</span>
                  <span>{t('0.0% change — matched previous session performance')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
