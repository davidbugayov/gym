import { useMemo } from 'react'
import { useStore } from '../store/useStore.js'
import { fmtNum, fmtDate } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { modeOf } from '../lib/history.js'

/**
 * Extracts the weight (or progression metric) for an exercise across its past sessions.
 * Returns chronological array of session data points.
 */
export function getExerciseSparklineData(allWorkouts = [], exerciseId, maxSessions = 5, upToWorkout = null) {
  if (!exerciseId || !Array.isArray(allWorkouts) || !allWorkouts.length) return []

  const targetTs = upToWorkout
    ? (upToWorkout.start || (upToWorkout.d ? new Date(upToWorkout.d).getTime() : Infinity))
    : Infinity

  // Workouts that include this exercise and have completed sets
  const matching = []
  for (const w of allWorkouts) {
    if (!w) continue
    const wTs = w.start || (w.d ? new Date(w.d).getTime() : 0)
    if (upToWorkout) {
      if (wTs > targetTs) continue
      if (wTs === targetTs && w.id > upToWorkout.id) continue
    }
    const entry = (w.entries || []).find(e => e && e.id === exerciseId)
    if (!entry) continue
    const doneSets = (entry.sets || []).filter(s => s && s.done)
    if (!doneSets.length) continue

    const mode = modeOf({ ...(entry.target || {}), id: exerciseId })

    let val = 0
    let metricType = 'weight'

    if (mode === 'cardio') {
      val = Math.max(0, ...doneSets.map(s => Number(s.speed) || 0))
      metricType = 'speed'
    } else if (mode === 'time') {
      val = Math.max(0, ...doneSets.map(s => Number(s.sec) || 0))
      metricType = 'time'
    } else {
      // Weight training
      const weights = doneSets.filter(s => s.w != null).map(s => Number(s.w) || 0)
      const topW = Math.max(0, ...weights)
      if (topW > 0) {
        val = topW
        metricType = 'weight'
      } else {
        // Bodyweight reps if no added weight
        const reps = doneSets.filter(s => s.r != null).map(s => Number(s.r) || 0)
        val = Math.max(0, ...reps)
        metricType = 'reps'
      }
    }

    matching.push({
      workoutId: w.id,
      date: w.d,
      ts: wTs,
      val,
      metricType,
      setsCount: doneSets.length
    })
  }

  // Sort chronologically
  matching.sort((a, b) => a.ts - b.ts)

  // Take last N sessions
  return matching.slice(-maxSessions)
}

/**
 * ExerciseSparkline — Compact SVG sparkline chart visualizing weight progression
 * over the last few workout sessions.
 */
export default function ExerciseSparkline({
  exerciseId,
  workouts = null,
  upToWorkout = null,
  maxSessions = 5,
  unit = '',
  width = 44,
  height = 18,
  showBadge = false,
  className = '',
  style = {}
}) {
  const S = useStore(s => s.S)
  const allWorkouts = workouts || S.workouts || []
  const effectiveUnit = unit || S.unit || 'kg'

  const points = useMemo(() => {
    return getExerciseSparklineData(allWorkouts, exerciseId, maxSessions, upToWorkout)
  }, [allWorkouts, exerciseId, maxSessions, upToWorkout])

  if (!points || points.length === 0) {
    return null
  }

  const vals = points.map(p => p.val)
  const firstVal = vals[0]
  const lastVal = vals[vals.length - 1]
  const delta = lastVal - firstVal
  const pct = firstVal > 0 ? (delta / firstVal) * 100 : 0
  const metricType = points[points.length - 1].metricType
  const metricUnit = metricType === 'weight' ? effectiveUnit : metricType === 'speed' ? 'km/h' : metricType === 'time' ? 's' : t('reps')

  // Trend status
  const trend = delta > 0.1 ? 'up' : delta < -0.1 ? 'down' : 'same'
  const strokeColor =
    trend === 'up'
      ? 'var(--acc, #30d158)'
      : trend === 'down'
      ? 'var(--red, #ef4444)'
      : 'var(--label-2, #8e8e93)'

  // Generate SVG coordinates
  const padX = 3
  const padY = 3
  const usableW = Math.max(10, width - padX * 2)
  const usableH = Math.max(8, height - padY * 2)

  const minVal = Math.min(...vals)
  const maxVal = Math.max(...vals)
  const valRange = maxVal - minVal

  const coords = points.map((p, i) => {
    const x = points.length === 1
      ? width / 2
      : padX + (i / (points.length - 1)) * usableW

    const y = valRange === 0
      ? height / 2
      : padY + (1 - (p.val - minVal) / valRange) * usableH

    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, ...p }
  })

  // Build SVG path
  let pathD = ''
  let areaD = ''

  if (coords.length === 1) {
    // Single point dot
    pathD = ''
  } else if (coords.length === 2) {
    pathD = `M ${coords[0].x} ${coords[0].y} L ${coords[1].x} ${coords[1].y}`
    areaD = `M ${coords[0].x} ${coords[0].y} L ${coords[1].x} ${coords[1].y} L ${coords[1].x} ${height} L ${coords[0].x} ${height} Z`
  } else {
    // Smooth bezier curve through points
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

  // Accessible tooltip text
  const tooltipText = points.length === 1
    ? `${fmtNum(lastVal)} ${metricUnit} (${fmtDate(points[0].date, true)})`
    : `${t('Progression ({0} sessions)', points.length)}: ${vals.map(v => fmtNum(v)).join(' → ')} ${metricUnit} (${delta > 0 ? '+' : ''}${fmtNum(delta)} ${metricUnit}, ${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`

  const gradId = `spark-grad-${exerciseId}-${Math.round(lastVal * 10)}`

  return (
    <span
      className={`exercise-sparkline-wrap ${className}`}
      title={tooltipText}
      aria-label={tooltipText}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="exercise-sparkline-svg"
        style={{ overflow: 'visible', flexShrink: 0 }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
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
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* End-point indicator */}
        <circle
          cx={lastCoord.x}
          cy={lastCoord.y}
          r={coords.length === 1 ? 2.8 : 2.2}
          fill={strokeColor}
        />
      </svg>

      {showBadge && (
        <span
          className={`sparkline-delta-badge ${trend}`}
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '1px 4px',
            borderRadius: 4,
            background:
              trend === 'up'
                ? 'rgba(48, 209, 88, 0.15)'
                : trend === 'down'
                ? 'rgba(239, 68, 68, 0.15)'
                : 'var(--surface-3)',
            color: strokeColor,
            lineHeight: 1.2
          }}
        >
          {delta > 0 ? '+' : ''}
          {fmtNum(delta)} {metricUnit}
        </span>
      )}
    </span>
  )
}
