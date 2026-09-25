// weight-trends.js — Computations for weekly average body weight changes and trends.
import { fmtDate, fmtNum, isoOf } from './format.js'
import { t } from './i18n.js'

/**
 * Returns the ISO Monday date string ('YYYY-MM-DD') for a given ISO date.
 */
export function getWeekMonday(dateStr) {
  const dt = new Date(dateStr + 'T12:00:00')
  const day = (dt.getDay() + 6) % 7 // Monday = 0, Sunday = 6
  dt.setDate(dt.getDate() - day)
  return isoOf(dt)
}

/**
 * Returns the ISO Sunday date string ('YYYY-MM-DD') for a given Monday date.
 */
export function getWeekSunday(mondayStr) {
  const dt = new Date(mondayStr + 'T12:00:00')
  dt.setDate(dt.getDate() + 6)
  return isoOf(dt)
}

/**
 * Formats a short week range, e.g. "15–21 Sep" or "28 Dec – 3 Jan".
 */
export function fmtWeekRange(monStr, sunStr) {
  const d1 = new Date(monStr + 'T12:00:00')
  const d2 = new Date(sunStr + 'T12:00:00')
  if (d1.getMonth() === d2.getMonth()) {
    return d1.getDate() + '–' + fmtDate(sunStr)
  }
  return fmtDate(monStr) + ' – ' + fmtDate(sunStr)
}

/**
 * Groups raw weigh-ins by calendar week (Monday–Sunday) and computes weekly averages.
 *
 * @param {Array} bodyweight - Array of { d: 'YYYY-MM-DD', w: number, t?: number }
 * @returns {Array} Array of week objects sorted chronologically
 */
export function groupWeightByWeek(bodyweight = []) {
  if (!Array.isArray(bodyweight) || !bodyweight.length) return []

  const valid = bodyweight
    .filter(b => b && b.d && typeof b.w === 'number' && !isNaN(b.w) && b.w > 0)
    .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))

  if (!valid.length) return []

  const byWeek = new Map()

  for (const item of valid) {
    const mon = getWeekMonday(item.d)
    let wk = byWeek.get(mon)
    if (!wk) {
      const sun = getWeekSunday(mon)
      const midTs = new Date(mon + 'T12:00:00').getTime() + 3 * 86400000
      wk = {
        weekStart: mon,
        weekEnd: sun,
        midTs,
        label: fmtWeekRange(mon, sun),
        entries: [],
        weights: [],
      }
      byWeek.set(mon, wk)
    }
    wk.entries.push(item)
    wk.weights.push(item.w)
  }

  const weeks = Array.from(byWeek.values())

  // Compute stats for each week
  for (let i = 0; i < weeks.length; i++) {
    const wk = weeks[i]
    const sum = wk.weights.reduce((a, b) => a + b, 0)
    wk.count = wk.weights.length
    wk.avgWeight = Math.round((sum / wk.count) * 100) / 100
    wk.minWeight = Math.min(...wk.weights)
    wk.maxWeight = Math.max(...wk.weights)

    // Consecutive week delta
    if (i > 0) {
      const prev = weeks[i - 1]
      wk.prevAvg = prev.avgWeight
      wk.deltaFromPrev = Math.round((wk.avgWeight - prev.avgWeight) * 100) / 100
      const d1 = new Date(prev.weekStart + 'T12:00:00')
      const d2 = new Date(wk.weekStart + 'T12:00:00')
      wk.weeksElapsedFromPrev = Math.max(1, Math.round((d2 - d1) / (7 * 86400000)))
      wk.weeklyRateFromPrev = Math.round((wk.deltaFromPrev / wk.weeksElapsedFromPrev) * 100) / 100
    } else {
      wk.prevAvg = null
      wk.deltaFromPrev = null
      wk.weeksElapsedFromPrev = 0
      wk.weeklyRateFromPrev = null
    }
  }

  return weeks
}

/**
 * Computes full weekly trends analysis over a chosen range window.
 *
 * @param {Array} bodyweight - S.bodyweight array
 * @param {number} rangeWeeks - 4, 8, 12, or 0 (All)
 * @param {number|null} targetWeight - S.targetW
 * @param {string} unit - 'kg' or 'lb'
 * @returns {Object} Complete analysis object
 */
export function calculateWeightTrends(bodyweight = [], rangeWeeks = 8, targetWeight = null, unit = 'kg') {
  const allWeeks = groupWeightByWeek(bodyweight)

  if (!allWeeks.length) {
    return {
      hasData: false,
      weeks: [],
      allWeeksCount: 0,
      currentAvg: null,
      avgWeeklyChange: null,
      totalChange: null,
      trend: 'none',
      goalAnalysis: null
    }
  }

  // Filter weeks by range window
  let weeks = allWeeks
  if (rangeWeeks > 0) {
    weeks = allWeeks.slice(-rangeWeeks)
  }

  const latestWeek = weeks[weeks.length - 1]
  const currentAvg = latestWeek ? latestWeek.avgWeight : null
  const totalLogs = weeks.reduce((sum, w) => sum + w.count, 0)

  let avgWeeklyChange = null
  let totalChange = null
  let totalElapsedWeeks = 0

  if (weeks.length >= 2) {
    const firstWeek = weeks[0]
    totalChange = Math.round((latestWeek.avgWeight - firstWeek.avgWeight) * 100) / 100

    const t1 = new Date(firstWeek.weekStart + 'T12:00:00').getTime()
    const t2 = new Date(latestWeek.weekStart + 'T12:00:00').getTime()
    totalElapsedWeeks = Math.max(1, Math.round((t2 - t1) / (7 * 86400000)))
    avgWeeklyChange = Math.round((totalChange / totalElapsedWeeks) * 100) / 100
  }

  // Classify general trend direction
  let trend = 'maintaining'
  if (avgWeeklyChange != null) {
    if (avgWeeklyChange <= -0.08) trend = 'losing'
    else if (avgWeeklyChange >= 0.08) trend = 'gaining'
    else trend = 'maintaining'
  }

  // Goal Analysis
  let goalAnalysis = null
  if (targetWeight != null && isFinite(targetWeight) && currentAvg != null) {
    const diff = Math.round((targetWeight - currentAvg) * 100) / 100
    const absDiff = Math.abs(diff)
    const isLossGoal = targetWeight < currentAvg
    const isGainGoal = targetWeight > currentAvg
    const isGoalReached = absDiff <= 0.3

    let onTrack = false
    let pace = 'neutral'
    let estimatedWeeks = null

    if (isGoalReached) {
      onTrack = true
      pace = 'reached'
    } else if (isLossGoal) {
      onTrack = avgWeeklyChange != null && avgWeeklyChange < -0.05
      if (avgWeeklyChange != null && avgWeeklyChange < 0) {
        const weeklyPct = (Math.abs(avgWeeklyChange) / currentAvg) * 100
        if (weeklyPct > 1.2) pace = 'fast'
        else if (weeklyPct >= 0.4) pace = 'optimal'
        else pace = 'slow'

        estimatedWeeks = Math.max(1, Math.round(absDiff / Math.abs(avgWeeklyChange)))
      }
    } else if (isGainGoal) {
      onTrack = avgWeeklyChange != null && avgWeeklyChange > 0.05
      if (avgWeeklyChange != null && avgWeeklyChange > 0) {
        const weeklyPct = (avgWeeklyChange / currentAvg) * 100
        if (weeklyPct > 0.7) pace = 'fast'
        else if (weeklyPct >= 0.2) pace = 'optimal'
        else pace = 'slow'

        estimatedWeeks = Math.max(1, Math.round(absDiff / avgWeeklyChange))
      }
    }

    goalAnalysis = {
      targetWeight,
      diff,
      absDiff,
      isLossGoal,
      isGainGoal,
      isGoalReached,
      onTrack,
      pace,
      estimatedWeeks
    }
  }

  return {
    hasData: true,
    weeks,
    allWeeksCount: allWeeks.length,
    weeksCount: weeks.length,
    totalLogs,
    currentAvg,
    latestWeek,
    avgWeeklyChange,
    totalChange,
    totalElapsedWeeks,
    trend,
    goalAnalysis,
    unit
  }
}

/**
 * Returns a CSS color variable matching progress relative to the goal or general direction.
 */
export function getWeeklyTrendColor(delta, goalAnalysis) {
  if (delta == null || Math.abs(delta) < 0.05) return 'var(--label-2)'

  if (goalAnalysis && !goalAnalysis.isGoalReached) {
    if (goalAnalysis.isLossGoal) {
      return delta < 0 ? 'var(--acc)' : 'var(--red)'
    }
    if (goalAnalysis.isGainGoal) {
      return delta > 0 ? 'var(--acc)' : 'var(--red)'
    }
  }

  // Without goal: weight drop is blue/cyan, gain is violet/purple
  return delta < 0 ? 'var(--sky, #0a84ff)' : 'var(--purple, #bf5af2)'
}
