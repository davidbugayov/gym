import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ unit: 'kg', workouts: [{ id: 'one', name: 'Leg Day', d: '2026-10-02', start: 1790935200000, end: 1790935260000, vol: 780, entries: [{ id: '0043', target: { reps: 8 }, sets: [{ w: 97.5, r: 8, done: true }] }] }], exWeights: {}, bodyweight: [] }))
vi.mock('../store/useStore.js', () => ({ useStore: selector => selector({ S: state, update: () => {} }) }))
vi.mock('../store/useUI.js', () => ({ useUI: selector => selector({ toast: () => {} }) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }))
vi.mock('../sheets.jsx', () => ({ WorkoutRow: ({ w }) => <div>{w.name}</div>, workoutDetailSheet: () => {} }))
vi.mock('../components/VolumeBarChart.jsx', () => ({ default: () => null }))
vi.mock('../components/ProgressionLineChart.jsx', () => ({ default: () => null }))
import History from './History.jsx'
describe('history after a logged training session', () => {
  it('renders the timeline and exercise comparison without crashing', () => {
    const html = renderToStaticMarkup(<History />)
    expect(html).toContain('Workout Log')
    expect(html).toContain('Leg Day')
    expect(html).toContain('Training trends')
  })
})
