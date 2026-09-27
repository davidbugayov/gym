import { describe, expect, it } from 'vitest'
import { EXDB } from './exercises.js'
import { LANG_CODES, getLanguage, instrFor, instrIsTranslated, setLanguage, t } from './languageStore.js'

const screenshotNames = [
  'arms apart circular toe touch (male)',
  'assisted lying glutes stretch',
  'assisted lying gluteus and piriformis stretch'
]

describe('exercise localization', () => {
  it('provides Russian names and steps for every catalogue exercise', async () => {
    await setLanguage('ru', false)
    for (const ex of EXDB) {
      expect(t(ex.n), `missing Russian name for ${ex.id}`).not.toBe(ex.n)
      expect(instrIsTranslated(ex), `missing Russian steps for ${ex.id}`).toBe(true)
      expect(instrFor(ex).length, `empty Russian steps for ${ex.id}`).toBeGreaterThan(0)
    }
  })

  it('shows the screenshot exercise names and Bulgarian split squat cues in Russian', async () => {
    await setLanguage('ru', false)
    for (const name of screenshotNames) {
      expect(t(name)).not.toBe(name)
      expect(t(name)).toMatch(/[А-Яа-яЁё]/)
    }
    const squat = EXDB.find(ex => ex.n === 'dumbbell bulgarian split squat')
    expect(t(squat.n)).toBe('болгарские сплит-приседания с гантелями')
    for (const cue of squat.cues) {
      expect(t(cue)).not.toBe(cue)
      expect(t(cue)).toMatch(/[А-Яа-яЁё]/)
    }
    expect(instrFor(squat)[0]).toMatch(/[А-Яа-яЁё]/)
  })

  it('keeps the latest language when bundles finish loading out of order', async () => {
    await Promise.all([setLanguage('es', false), setLanguage('ru', false)])
    expect(getLanguage()).toBe('ru')
    expect(t('dumbbell bulgarian split squat')).toBe('болгарские сплит-приседания с гантелями')
  })

  it('uses reviewed names and cues for the screenshot case in every translated language', async () => {
    const squat = EXDB.find(ex => ex.n === 'dumbbell bulgarian split squat')
    for (const lang of LANG_CODES.filter(code => code !== 'en')) {
      await setLanguage(lang, false)
      for (const name of screenshotNames) {
        expect(t(name), `${lang}: ${name}`).not.toBe(name)
      }
      expect(t('squat jerk')).not.toBe('squat jerk')
      for (const cue of squat.cues) {
        expect(t(cue), `${lang}: ${cue}`).not.toBe(cue)
      }
    }
  })
})
