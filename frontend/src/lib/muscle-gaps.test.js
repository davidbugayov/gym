import { describe, it, expect } from 'vitest'
import {
  analyzeRoutineMuscleEngagement,
  getRecommendedExercisesForMuscle,
  MUSCLE_CATEGORIES,
  MUSCLE_TO_CATEGORY
} from './muscle-gaps.js'

describe('muscle-gaps utility', () => {
  it('handles empty routine safely', () => {
    const analysis = analyzeRoutineMuscleEngagement(null)
    expect(analysis.totalEffectiveSets).toBe(0)
    expect(analysis.totalExercises).toBe(0)
    expect(analysis.gaps).toEqual([])
    expect(analysis.coverageScore).toBe(0)
    expect(analysis.muscleBreakdown).toHaveLength(18)
  })

  it('detects quad-dominant routine with hamstring gap', () => {
    // 0043 is barbell full squat (quads primary)
    // 2287 is lever alternate leg press (quads primary)
    const legRoutine = {
      id: 'r_legs',
      name: 'Quad Blast',
      ex: [
        { id: '0043', sets: 4 },
        { id: '2287', sets: 4 }
      ]
    }

    const analysis = analyzeRoutineMuscleEngagement(legRoutine)
    expect(analysis.totalEffectiveSets).toBeGreaterThan(0)
    expect(analysis.categoryVolumes.legs.sets).toBeGreaterThan(0)

    const hamstringGap = analysis.gaps.find(g => g.muscle === 'hamstring')
    expect(hamstringGap).toBeDefined()
    expect(hamstringGap.severity).toBe('high')
    expect(hamstringGap.recommendedExercises.length).toBeGreaterThan(0)
  })

  it('detects push-heavy routine with upper-back gap', () => {
    // 0025: barbell bench press (chest primary)
    // 0289: dumbbell bench press (chest primary)
    // 0334: lateral raise (delts)
    const pushRoutine = {
      id: 'r_push',
      name: 'Push Day',
      ex: [
        { id: '0025', sets: 4 },
        { id: '0289', sets: 3 },
        { id: '0334', sets: 3 }
      ]
    }

    const analysis = analyzeRoutineMuscleEngagement(pushRoutine)
    expect(analysis.pushPullBalance.status).toBe('push_heavy')
    expect(analysis.categoryVolumes.push.sets).toBeGreaterThan(6)

    const backGap = analysis.gaps.find(g => g.muscle === 'upper-back')
    expect(backGap).toBeDefined()
  })

  it('detects missing direct arm isolation in a high-volume chest session', () => {
    const chestRoutine = {
      id: 'r_chest',
      name: 'Chest Heavy',
      ex: [
        { id: '0025', sets: 5 } // bench press gives indirect triceps (0.4 * 5 = 2 sets)
      ]
    }

    const analysis = analyzeRoutineMuscleEngagement(chestRoutine)
    expect(analysis.totalEffectiveSets).toBeGreaterThan(0)
  })

  it('returns appropriate recommended exercises for various muscle groups', () => {
    const hamstringRecs = getRecommendedExercisesForMuscle('hamstring', 3)
    expect(hamstringRecs.length).toBeGreaterThan(0)
    expect(hamstringRecs[0].n).toBeDefined()

    const backRecs = getRecommendedExercisesForMuscle('upper-back', 3)
    expect(backRecs.length).toBeGreaterThan(0)

    const bicepRecs = getRecommendedExercisesForMuscle('biceps', 3)
    expect(bicepRecs.length).toBeGreaterThan(0)
  })

  it('excludes already chosen exercises from recommendations', () => {
    const recs = getRecommendedExercisesForMuscle('hamstring', 3, ['0085'])
    expect(recs.some(e => e.id === '0085')).toBe(false)
  })
})
