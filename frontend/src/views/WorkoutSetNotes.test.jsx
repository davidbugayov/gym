import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Workout set notes and cues', () => {
  it('defines set note and cue styles in index.css', () => {
    const cssPath = path.resolve(__dirname, '../index.css')
    const cssContent = fs.readFileSync(cssPath, 'utf8')

    expect(cssContent).toContain('.sethead .note-sp')
    expect(cssContent).toContain('.setrow-main')
    expect(cssContent).toContain('.set-note-icon-btn')
    expect(cssContent).toContain('.set-note-dot')
    expect(cssContent).toContain('.set-note-display')
    expect(cssContent).toContain('.set-note-tag')
    expect(cssContent).toContain('.set-note-text')
    expect(cssContent).toContain('.set-note-cue-prompt')
    expect(cssContent).toContain('.set-note-editor')
    expect(cssContent).toContain('.set-note-input-wrap')
    expect(cssContent).toContain('.set-note-input')
    expect(cssContent).toContain('.set-note-actions')
    expect(cssContent).toContain('.set-note-action-btn')
  })

  it('verifies set notes support in Workout.jsx', () => {
    const workoutPath = path.resolve(__dirname, './Workout.jsx')
    const workoutContent = fs.readFileSync(workoutPath, 'utf8')

    // ExerciseBlock state & handlers
    expect(workoutContent).toContain('editingNoteIdx')
    expect(workoutContent).toContain('handleStartEditNote')
    expect(workoutContent).toContain('handleSaveNote')
    expect(workoutContent).toContain('handleDeleteNote')

    // Header note column
    expect(workoutContent).toContain('<span className="note-sp" />')

    // Setrow main wrapper and note button
    expect(workoutContent).toContain('setrow-main')
    expect(workoutContent).toContain('set-note-icon-btn')

    // Inline set cue editor and display in setrow
    expect(workoutContent).toContain('set-note-editor')
    expect(workoutContent).toContain('set-note-display')
    expect(workoutContent).toContain('set-note-cue-prompt')

    // ChangeSetSheet set note field
    expect(workoutContent).toContain("t('Set Cue / Note')")

    // WorkingSetsSheet displays notes
    expect(workoutContent).toContain('s.note')
  })

  it('verifies set notes display in WorkoutDetail in sheets.jsx', () => {
    const sheetsPath = path.resolve(__dirname, '../sheets.jsx')
    const sheetsContent = fs.readFileSync(sheetsPath, 'utf8')

    expect(sheetsContent).toContain('e.sets.some(s => s.note)')
  })
})
