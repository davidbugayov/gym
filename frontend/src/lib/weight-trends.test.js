import { describe, it, expect } from 'vitest'
import {
  getWeekMonday,
  getWeekSunday,
  fmtWeekRange,
  groupWeightByWeek,
  calculateWeightTrends,
  getWeeklyTrendColor
} from './weight-trends.js'

describe('Weight Trends computation', () => {
  it('identifies week Monday and Sunday correctly', () => {
    // 2026-09-24 is Thursday
    expect(getWeekMonday('2026-09-24')).toBe('2026-09-21') // Monday
    expect(getWeekSunday('2026-09-21')).toBe('2026-09-27') // Sunday

    // Sunday itself should map to Monday of the same week
    expect(getWeekMonday('2026-09-27')).toBe('2026-09-21')
    // Monday should map to itself
    expect(getWeekMonday('2026-09-21')).toBe('2026-09-21')
  })

  it('groups multiple weigh-ins in the same week and computes weekly average', () => {
    const raw = [
      { d: '2026-09-21', w: 80.0 }, // Monday
      { d: '2026-09-23', w: 79.5 }, // Wednesday
      { d: '2026-09-25', w: 80.5 }  // Friday
    ]
    const weeks = groupWeightByWeek(raw)
    expect(weeks.length).toBe(1)
    expect(weeks[0].weekStart).toBe('2026-09-21')
    expect(weeks[0].count).toBe(3)
    expect(weeks[0].avgWeight).toBe(80.0)
    expect(weeks[0].minWeight).toBe(79.5)
    expect(weeks[0].maxWeight).toBe(80.5)
    expect(weeks[0].deltaFromPrev).toBeNull()
  })

  it('computes week-over-week change for consecutive weeks', () => {
    const raw = [
      // Week 1: Sep 14 - Sep 20
      { d: '2026-09-14', w: 81.0 },
      { d: '2026-09-16', w: 81.0 },
      // Week 2: Sep 21 - Sep 27
      { d: '2026-09-21', w: 80.5 },
      { d: '2026-09-24', w: 80.3 }
    ]
    const weeks = groupWeightByWeek(raw)
    expect(weeks.length).toBe(2)
    expect(weeks[0].avgWeight).toBe(81.0)
    expect(weeks[1].avgWeight).toBe(80.4)
    expect(weeks[1].deltaFromPrev).toBe(-0.6)
  })

  it('calculates average weekly body weight change accurately across multiple weeks', () => {
    const raw = [
      // Week 1 (start 82.0)
      { d: '2026-08-31', w: 82.0 },
      // Week 2 (avg 81.5)
      { d: '2026-09-07', w: 81.5 },
      // Week 3 (avg 81.0)
      { d: '2026-09-14', w: 81.0 },
      // Week 4 (avg 80.5)
      { d: '2026-09-21', w: 80.5 }
    ]
    // 4 weeks, total change = 80.5 - 82.0 = -1.5 kg over 3 elapsed weeks = -0.5 kg/week
    const trends = calculateWeightTrends(raw, 4, 75.0, 'kg')
    expect(trends.hasData).toBe(true)
    expect(trends.weeksCount).toBe(4)
    expect(trends.currentAvg).toBe(80.5)
    expect(trends.totalChange).toBe(-1.5)
    expect(trends.avgWeeklyChange).toBe(-0.5)
    expect(trends.trend).toBe('losing')
    expect(trends.goalAnalysis.isLossGoal).toBe(true)
    expect(trends.goalAnalysis.onTrack).toBe(true)
    // Distance to goal: 80.5 - 75.0 = 5.5 kg at 0.5 kg/wk => 11 weeks
    expect(trends.goalAnalysis.estimatedWeeks).toBe(11)
  })

  it('handles empty data and single-entry data without errors', () => {
    const emptyTrends = calculateWeightTrends([], 8, null, 'kg')
    expect(emptyTrends.hasData).toBe(false)
    expect(emptyTrends.weeks.length).toBe(0)
    expect(emptyTrends.avgWeeklyChange).toBeNull()

    const singleTrends = calculateWeightTrends([{ d: '2026-09-21', w: 75.0 }], 8, 70.0, 'kg')
    expect(singleTrends.hasData).toBe(true)
    expect(singleTrends.weeksCount).toBe(1)
    expect(singleTrends.currentAvg).toBe(75.0)
    expect(singleTrends.avgWeeklyChange).toBeNull()
  })

  it('determines proper color indication based on goal progress', () => {
    // Loss goal: negative delta is green (on track), positive delta is red
    const lossGoal = { isLossGoal: true, isGoalReached: false }
    expect(getWeeklyTrendColor(-0.4, lossGoal)).toBe('var(--acc)')
    expect(getWeeklyTrendColor(+0.3, lossGoal)).toBe('var(--red)')

    // Gain goal: positive delta is green (on track), negative delta is red
    const gainGoal = { isGainGoal: true, isGoalReached: false }
    expect(getWeeklyTrendColor(+0.3, gainGoal)).toBe('var(--acc)')
    expect(getWeeklyTrendColor(-0.4, gainGoal)).toBe('var(--red)')
  })
})
