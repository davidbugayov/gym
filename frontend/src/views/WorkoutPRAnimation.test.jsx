import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('PR badge tada / pop animation', () => {
  it('defines @keyframes pr-tada with subtle pop and rotation in index.css', () => {
    const cssPath = path.resolve(__dirname, '../index.css')
    const cssContent = fs.readFileSync(cssPath, 'utf8')

    expect(cssContent).toContain('@keyframes pr-tada')
    expect(cssContent).toContain('@keyframes pr-glow')
    expect(cssContent).toContain('.pr.pr-tada')
    expect(cssContent).toContain('.set-pr-badge')

    // Verify subtle animation properties (scales and wiggles)
    expect(cssContent).toMatch(/scale\(/)
    expect(cssContent).toMatch(/rotate\(/)
    expect(cssContent).toMatch(/cubic-bezier\(/)

    // Verify reduced motion handling
    expect(cssContent).toContain('prefers-reduced-motion')
    expect(cssContent).toMatch(/pr-tada[\s\S]*?animation:\s*none\s*!important/)
  })

  it('verifies PR badge with pr-tada is integrated into workout sheets and views', () => {
    const workoutPath = path.resolve(__dirname, './Workout.jsx')
    const workoutContent = fs.readFileSync(workoutPath, 'utf8')

    // ExerciseBlock header renders PR badge with pr-tada on personal record
    expect(workoutContent).toContain('pr pr-tada')
    expect(workoutContent).toContain('set-pr-badge pr-tada')

    const sheetsPath = path.resolve(__dirname, '../sheets.jsx')
    const sheetsContent = fs.readFileSync(sheetsPath, 'utf8')

    // TopWeight and FinishSummary render PR badges with pr-tada
    expect(sheetsContent).toContain('pr pr-tada')
  })
})
