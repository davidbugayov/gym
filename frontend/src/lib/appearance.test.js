import { describe, it, expect } from 'vitest'
import { normalizeAccent, applyAppearance } from './appearance.js'

describe('appearance preferences', () => {
  it('normalizes absent, invalid and legacy values to a visible choice', () => {
    for (const value of [null, undefined, '', 'unknown', 'toString']) expect(normalizeAccent(value)).toBe('lime')
    expect(normalizeAccent('#30d158')).toBe('lime')
    expect(normalizeAccent('#0A84FF')).toBe('sky')
    expect(normalizeAccent(' VIOLET ')).toBe('violet')
  })
  it('clears stale inline overrides and applies the requested theme and accent', () => {
    const removed = []
    const meta = {}
    const doc = { documentElement: { dataset: {}, style: { removeProperty: key => removed.push(key) } }, querySelector: () => meta }
    applyAppearance('light', 'teal', doc)
    expect(doc.documentElement.dataset).toEqual({ theme: 'light', accent: 'teal' })
    expect(removed).toContain('--acc')
    expect(meta.content).toBe('#f3f4ed')
    applyAppearance('dark', 'lime', doc)
    expect(doc.documentElement.dataset.accent).toBe('lime')
  })
})
