import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import WorkoutRecap from './WorkoutRecap.jsx'

const workout = { id: 'new', name: 'Session', start: 1000, end: 61000, entries: [{ id: 'a', target: { mode: 'time' }, sets: [{ done: true, sec: 45 }] }] }

describe('WorkoutRecap', () => {
  it('labels an early finish accurately and renders time without a zero volume tile', () => {
    const html = renderToString(<WorkoutRecap workout={workout} history={[]} unit="kg" plannedSets={4} />)
    expect(html).toContain('Session ended early.')
    expect(html).toContain('1 / 4')
    expect(html).toContain('0:45')
    expect(html).not.toContain('<dt>Volume</dt>')
    expect(html).toContain('No previous session with the same exercises yet.')
  })

  it('shows an empty session without claiming a starting point for completed work', () => {
    const html = renderToString(<WorkoutRecap workout={{ ...workout, entries: [] }} history={[]} unit="kg" plannedSets={0} />)
    expect(html).toContain('Session saved without logged sets.')
    expect(html).not.toContain('Compared with last time')
  })
})
