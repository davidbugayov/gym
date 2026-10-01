import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import TotalVolume30dCard from './TotalVolume30dCard.jsx'

describe('TotalVolume30dCard component', () => {
  it('renders safely with empty workouts without crashing', () => {
    const html = renderToString(<TotalVolume30dCard S={{ workouts: [], unit: 'kg' }} />)
    expect(html).toBe('') // null return when no workouts
  })

  it('renders 30-day volume progression with workout data and D3 chart elements', () => {
    const mockWorkouts = [
      {
        id: 'w1',
        d: '2026-09-20',
        vol: 8500,
        entries: [{ sets: [{ w: 100, r: 10, done: true }] }]
      },
      {
        id: 'w2',
        d: '2026-09-25',
        vol: 12000,
        entries: [{ sets: [{ w: 120, r: 10, done: true }] }]
      }
    ]

    const html = renderToString(
      <TotalVolume30dCard S={{ workouts: mockWorkouts, unit: 'kg' }} />
    )

    expect(html).toContain('Total volume progression')
    expect(html).toContain('last 30 days')
    expect(html).toContain('30d Volume')
    expect(html).toContain('Workouts')
    expect(html).toContain('Avg / Session')
    expect(html).toContain('d3-vol-bar-group')
    expect(html).toContain('viewBox')
  })
})
