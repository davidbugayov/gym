import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import WorkoutProgressionComparison from './WorkoutProgressionComparison.jsx'

describe('WorkoutProgressionComparison component', () => {
  it('renders safely when no previous sessions exist (first session baseline)', () => {
    const currentWorkout = {
      id: 'w1',
      name: 'Push Day',
      d: '2026-09-26',
      start: 1700000000000,
      vol: 2500,
      entries: [
        {
          id: '0025',
          sets: [{ w: 80, r: 10, done: true }]
        }
      ]
    }

    const html = renderToString(
      <WorkoutProgressionComparison
        workout={currentWorkout}
        allWorkouts={[currentWorkout]}
        unit="kg"
      />
    )

    expect(html).toContain('Progression feedback')
    expect(html).toContain('First session baseline')
    expect(html).toContain('Intensity')
    expect(html).toContain('Volume')
    expect(html).toContain('80 kg')
    expect(html).toContain('2,500 kg')
  })

  it('renders comparison against previous 3 sessions', () => {
    const previous = [
      {
        id: 'p1',
        name: 'Push Day',
        d: '2026-09-18',
        start: 1699000000000,
        vol: 2000,
        entries: [{ id: '0025', sets: [{ w: 70, r: 10, done: true }] }]
      },
      {
        id: 'p2',
        name: 'Push Day',
        d: '2026-09-21',
        start: 1699300000000,
        vol: 2200,
        entries: [{ id: '0025', sets: [{ w: 75, r: 10, done: true }] }]
      },
      {
        id: 'p3',
        name: 'Push Day',
        d: '2026-09-24',
        start: 1699600000000,
        vol: 2400,
        entries: [{ id: '0025', sets: [{ w: 80, r: 10, done: true }] }]
      }
    ]

    const currentWorkout = {
      id: 'w_cur',
      name: 'Push Day',
      d: '2026-09-27',
      start: 1700000000000,
      vol: 2700,
      entries: [{ id: '0025', sets: [{ w: 90, r: 10, done: true }] }]
    }

    const html = renderToString(
      <WorkoutProgressionComparison
        workout={currentWorkout}
        allWorkouts={[...previous, currentWorkout]}
        unit="kg"
      />
    )

    expect(html).toContain('Progression feedback')
    expect(html).toContain('vs previous 3 sessions')
    expect(html).toContain('Intensity')
    expect(html).toContain('Volume')
    expect(html).toContain('90 kg')
  })
})
