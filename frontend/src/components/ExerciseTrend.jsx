import Icon from './Icon.jsx'
import { useUI } from '../store/useUI.js'

/**
 * ExerciseTrendBadge — Rich trend indicator with icon and delta metrics
 * Used in WorkoutDetail and list item expansion.
 */
export function ExerciseTrendBadge({
  trend,
  exName = '',
  showText = true,
  interactive = true,
  className = '',
  style,
  onClick
}) {
  if (!trend || trend.trend === 'none') return null

  const isUp = trend.trend === 'up'
  const isDown = trend.trend === 'down'
  const isSame = trend.trend === 'same'
  const isFirst = trend.trend === 'first'

  const handleClick = e => {
    if (interactive) {
      e.stopPropagation()
      const rect = e.currentTarget.getBoundingClientRect()
      useUI.getState().toggleTrendTooltip(trend, rect, exName || trend.exerciseId)
    }
    if (onClick) onClick(e)
  }

  const handleKeyDown = e => {
    if (interactive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      handleClick(e)
    }
  }

  return (
    <span
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={`trend-badge ${trend.trend} ${interactive ? 'interactive' : ''} ${className}`}
      title={trend.tooltip || ''}
      aria-label={trend.tooltip || ''}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {isUp && (
        <span className="trend-icon">
          <Icon name="arrowUp" size={12} />
        </span>
      )}
      {isDown && (
        <span className="trend-icon">
          <Icon name="arrowDown" size={12} />
        </span>
      )}
      {isSame && (
        <span className="trend-icon-neutral">—</span>
      )}
      {isFirst && (
        <span className="trend-first-label">1st</span>
      )}
      {showText && trend.text && trend.text !== '=' && (
        <span className="trend-text">{trend.text}</span>
      )}
    </span>
  )
}

/**
 * ExerciseTrendMini — Compact arrow indicator for exercise chips and list items.
 */
export function ExerciseTrendMini({
  trend,
  exName = '',
  interactive = true,
  className = '',
  style,
  onClick
}) {
  if (!trend || trend.trend === 'none') return null

  const isUp = trend.trend === 'up'
  const isDown = trend.trend === 'down'
  const isSame = trend.trend === 'same'
  const isFirst = trend.trend === 'first'

  const handleClick = e => {
    if (interactive) {
      e.stopPropagation()
      const rect = e.currentTarget.getBoundingClientRect()
      useUI.getState().toggleTrendTooltip(trend, rect, exName || trend.exerciseId)
    }
    if (onClick) onClick(e)
  }

  const handleKeyDown = e => {
    if (interactive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      handleClick(e)
    }
  }

  return (
    <span
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={`trend-mini ${trend.trend} ${interactive ? 'interactive' : ''} ${className}`}
      title={trend.tooltip || ''}
      aria-label={trend.tooltip || ''}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {isUp && <Icon name="arrowUp" size={10} />}
      {isDown && <Icon name="arrowDown" size={10} />}
      {isSame && <span>=</span>}
      {isFirst && <span>•</span>}
    </span>
  )
}

export default ExerciseTrendBadge
