import { useMemo } from 'react'
import { useStore } from '../store/useStore.js'
import { getExerciseEffortHistory } from '../lib/effort.js'
import { fmtNum, fmtDate } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { openExerciseEffortModal } from './ExerciseEffortModal.jsx'

/**
 * ExerciseEffortSparkline — A compact sparkline / chart showing recent RPE/RIR intensity trends
 * for a specific exercise across its recent workout sessions.
 * Clicking the badge opens a detailed effort history modal.
 */
export default function ExerciseEffortSparkline({
  exercise,
  exerciseId: rawExerciseId,
  workouts = null,
  maxSessions = 5,
  width = 34,
  height = 16,
  className = '',
  style = {}
}) {
  const S = useStore(s => s.S)
  const allWorkouts = workouts || S.workouts || []
  const exerciseId = exercise?.id || rawExerciseId

  const points = useMemo(() => {
    return getExerciseEffortHistory({ ...S, workouts: allWorkouts }, exerciseId, maxSessions)
  }, [allWorkouts, S.effort, exerciseId, maxSessions])

  if (!points || points.length === 0) {
    return null
  }

  const lastPoint = points[points.length - 1]
  const firstPoint = points[0]
  const scale = (lastPoint.scale || 'rpe').toUpperCase()

  // Intensity is normalized where higher = closer to failure (harder)
  const intensities = points.map(p => p.scale === 'rpe' ? p.val : (10 - p.rir))
  const firstIntensity = intensities[0]
  const lastIntensity = intensities[intensities.length - 1]
  const delta = Math.round((lastIntensity - firstIntensity) * 10) / 10

  const trend = delta > 0.2 ? 'up' : delta < -0.2 ? 'down' : 'flat'
  const trendArrow = trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'
  const trendColor =
    trend === 'up'
      ? 'var(--orange, #ff9f0a)'
      : trend === 'down'
      ? 'var(--teal, #40c8e0)'
      : 'var(--label-3, rgba(235, 235, 245, 0.4))'

  // Coordinate calculations
  const padX = 2.5
  const padY = 2.5
  const usableW = Math.max(6, width - padX * 2)
  const usableH = Math.max(6, height - padY * 2)

  const minI = Math.min(...intensities)
  const maxI = Math.max(...intensities)
  const rangeI = maxI - minI

  const coords = points.map((p, i) => {
    const x = points.length === 1
      ? width / 2
      : padX + (i / (points.length - 1)) * usableW

    const y = rangeI === 0
      ? height / 2
      : padY + (1 - (intensities[i] - minI) / rangeI) * usableH

    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }
  })

  let pathD = ''
  let areaD = ''

  if (coords.length === 2) {
    pathD = `M ${coords[0].x} ${coords[0].y} L ${coords[1].x} ${coords[1].y}`
    areaD = `M ${coords[0].x} ${coords[0].y} L ${coords[1].x} ${coords[1].y} L ${coords[1].x} ${height} L ${coords[0].x} ${height} Z`
  } else if (coords.length > 2) {
    pathD = `M ${coords[0].x} ${coords[0].y}`
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i]
      const p1 = coords[i + 1]
      const mx = (p0.x + p1.x) / 2
      pathD += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`
    }
    const lastX = coords[coords.length - 1].x
    const firstX = coords[0].x
    areaD = `${pathD} L ${lastX} ${height} L ${firstX} ${height} Z`
  }

  const lastCoord = coords[coords.length - 1]
  const strokeColor = 'var(--purple, #bf5af2)'
  const gradId = `effort-grad-${exerciseId}-${points.length}`

  const sessionListSummary = points.map(p => `${fmtDate(p.date)}: ${fmtNum(p.val)} ${scale}`).join(' · ')
  const tooltipText = points.length === 1
    ? `${scale} ${fmtNum(lastPoint.val)} (${fmtDate(lastPoint.date)}) — ${t('Click for effort details')}`
    : `${t('{0} trend ({1} sessions)', scale, points.length)}: ${sessionListSummary} — ${t('Click for effort details')}`

  const handleClick = (e) => {
    e.stopPropagation()
    openExerciseEffortModal(exercise || { id: exerciseId }, allWorkouts)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      openExerciseEffortModal(exercise || { id: exerciseId }, allWorkouts)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`effort-sparkline-badge ${className}`}
      title={tooltipText}
      aria-label={tooltipText}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={style}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="effort-sparkline-svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.32" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {areaD && (
          <path d={areaD} fill={`url(#${gradId})`} pointerEvents="none" />
        )}

        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Current session indicator */}
        <circle
          cx={lastCoord.x}
          cy={lastCoord.y}
          r={coords.length === 1 ? 2.5 : 2}
          fill={strokeColor}
        />
      </svg>

      <div className="effort-spark-label">
        <div className="effort-spark-top">
          <span className="effort-spark-tag">{scale}</span>
          <span className="effort-spark-val">{fmtNum(lastPoint.val)}</span>
          {points.length > 1 && (
            <span
              className="effort-spark-trend"
              style={{ color: trendColor }}
              title={trend === 'up' ? t('Intensity increasing') : trend === 'down' ? t('Intensity decreasing') : t('Intensity steady')}
            >
              {trendArrow}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
