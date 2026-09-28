import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import RoutineMuscleEngagementCard from './RoutineMuscleEngagementCard.jsx'

describe('RoutineMuscleEngagementCard component', () => {
  it('renders safely with an empty or null routine without crashing', () => {
    const html = renderToString(<RoutineMuscleEngagementCard routine={null} />)
    expect(html).toContain('Muscle Engagement &amp; Gaps')
    expect(html).toContain('No routine selected')
  })

  it('renders a routine with exercises and displays engagement metrics', () => {
    const testRoutine = {
      id: 'test_r1',
      name: 'Push & Quads',
      emoji: 'dumbbell',
      ex: [
        { id: '0025', sets: 4 }, // barbell bench press (chest, delts, triceps)
        { id: '0043', sets: 4 }  // barbell full squat (quads, glutes, hamstrings, calves)
      ]
    }

    const html = renderToString(
      <RoutineMuscleEngagementCard routine={testRoutine} />
    )

    expect(html).toContain('Push &amp; Quads')
    expect(html).toContain('Targeted')
    expect(html).toContain('Effective sets')
    expect(html).toContain('Volume by movement pattern')
    expect(html).toContain('Gaps &amp; Balance')
  })

  it('renders with editable prop and custom title', () => {
    const testRoutine = {
      id: 'test_r2',
      name: 'Leg Day',
      ex: [
        { id: '0043', sets: 5 },
        { id: '2287', sets: 4 }
      ]
    }

    const html = renderToString(
      <RoutineMuscleEngagementCard
        routine={testRoutine}
        editable={true}
        title="Training Gaps &amp; Balance"
      />
    )

    expect(html).toContain('Training Gaps &amp; Balance')
    expect(html).toContain('Leg Day')
    expect(html).toContain('Priority Gap')
  })
})
