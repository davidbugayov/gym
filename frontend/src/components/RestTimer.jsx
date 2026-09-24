import { useEffect, useState, useRef } from 'react'
import { useUI } from '../store/useUI.js'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { Button } from './ui.jsx'
import Icon from './Icon.jsx'
import { hapticClick } from '../lib/sound.js'

const clock = sec => Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0')

// Common intervals prominently featured in the quick-select menu
const COMMON_INTERVALS = [
  { sec: 60, label: '60s', desc: '1 min' },
  { sec: 90, label: '90s', desc: '1.5 min' },
  { sec: 120, label: '120s', desc: '2 min' }
]

// Secondary common workout intervals
const MORE_INTERVALS = [
  { sec: 30, desc: '30s · 0.5m' },
  { sec: 45, desc: '45s' },
  { sec: 150, desc: '150s · 2.5m' },
  { sec: 180, desc: '180s · 3m' },
  { sec: 240, desc: '240s · 4m' },
  { sec: 300, desc: '300s · 5m' }
]

export default function RestTimer() {
  const timer = useUI(s => s.timer)
  const work = useUI(s => s.work)
  const { addRest, stopRest, finishWorkEarly, stopWork, startRest, toast } = useUI()
  const soundOn = useStore(s => s.S.sound)
  const hapticsOn = useStore(s => s.S.haptics !== false)
  const restSec = useStore(s => s.S.restSec || 90)
  const restPresets = useStore(s => (s.S.restPresets && s.S.restPresets.length > 0) ? s.S.restPresets : [60, 90, 120])
  const update = useStore(s => s.update)

  const [menuOpen, setMenuOpen] = useState(false)
  const [saveAsDefault, setSaveAsDefault] = useState(false)
  const [customVal, setCustomVal] = useState(() => timer?.total || restSec || 90)
  const menuRef = useRef(null)

  const on = work || timer

  // Update body class for bottom scrolling padding
  useEffect(() => {
    document.body.classList.toggle('resting', !!on)
    return () => document.body.classList.remove('resting')
  }, [!!on])

  // Sync custom input value with current timer total or default
  useEffect(() => {
    if (timer?.total) {
      setCustomVal(timer.total)
    }
  }, [timer?.total])

  // Close menu on Escape key
  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = e => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  // Auto-close menu if rest ends
  useEffect(() => {
    if (!timer) setMenuOpen(false)
  }, [timer])

  if (!on) return null
  const pct = (on.left / on.total) * 100

  // Handle selecting an interval from the quick-select menu or quick bar
  const handleSelectInterval = (sec) => {
    const s = Math.max(5, Math.min(1200, Math.round(Number(sec)) || 90))
    hapticClick()
    startRest(s)
    if (saveAsDefault) {
      update(st => { st.restSec = s })
      toast(t('Rest timer set to {0}s (saved as default)', s))
    } else {
      toast(t('Rest timer set to {0}s', s))
    }
    setMenuOpen(false)
  }

  // Work timer (timed hold set)
  if (work) return (
    <div id="timer" className="working">
      <div className="t">{clock(work.left)}</div>
      <div className="grow">
        {work.label && <div className="lbl">{work.label}</div>}
        <div className="bar"><i style={{ width: pct + '%' }} /></div>
      </div>
      <button
        type="button"
        className="chip"
        style={{
          padding: '4px 7px',
          fontSize: 12,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          opacity: soundOn ? 1 : 0.6,
          background: soundOn ? 'var(--surface-3)' : 'transparent',
          border: 'none',
          cursor: 'pointer'
        }}
        onClick={() => update(s => { s.sound = !s.sound })}
        title={soundOn ? t('Sound alert on') : t('Sound alert muted')}
        aria-label={soundOn ? t('Sound alert on') : t('Sound alert muted')}
      >
        <Icon name={soundOn ? 'bell' : 'bellSlash'} size={14} />
      </button>
      <button
        type="button"
        className="chip"
        style={{
          padding: '4px 7px',
          fontSize: 12,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          opacity: hapticsOn ? 1 : 0.6,
          background: hapticsOn ? 'var(--surface-3)' : 'transparent',
          border: 'none',
          cursor: 'pointer'
        }}
        onClick={() => update(s => { s.haptics = s.haptics === false })}
        title={hapticsOn ? t('Haptic feedback on') : t('Haptic feedback muted')}
        aria-label={hapticsOn ? t('Haptic feedback on') : t('Haptic feedback muted')}
      >
        <Icon name="vibrate" size={14} />
      </button>
      <Button size="sm" onClick={stopWork}>{t('Cancel')}</Button>
      <Button size="sm" variant="primary" icon="check" onClick={finishWorkEarly}>{t('Done')}</Button>
    </div>
  )

  // Rest countdown between sets
  return (
    <div id="rest-timer-wrapper">
      {/* 'Set Rest Time' Quick-Select Menu Popover */}
      {menuOpen && (
        <>
          <div
            className="rest-menu-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={menuRef}
            className="rest-menu-card"
            role="dialog"
            aria-modal="true"
            aria-label={t('Set Rest Time')}
          >
            {/* Header */}
            <div className="rest-menu-hdr">
              <div className="rest-menu-title-wrap">
                <div className="rest-menu-title">
                  <Icon name="timer" size={18} style={{ color: 'var(--acc)' }} />
                  <span>{t('Set Rest Time')}</span>
                </div>
                <div className="rest-menu-sub">
                  {t('Current countdown: {0} (target: {1}s)', clock(timer.left), timer.total)}
                </div>
              </div>
              <button
                type="button"
                className="iconbtn"
                onClick={() => setMenuOpen(false)}
                aria-label={t('Close')}
                style={{ width: 28, height: 28 }}
              >
                <Icon name="xmark" size={14} />
              </button>
            </div>

            {/* Common Intervals (Highlighted) */}
            <div className="rest-menu-sec">
              <div className="rest-menu-sec-label">
                <Icon name="bolt" size={13} style={{ color: 'var(--acc)' }} />
                <span>{t('Common Intervals')}</span>
              </div>
              <div className="rest-common-grid">
                {COMMON_INTERVALS.map(({ sec, label, desc }) => {
                  const isCurrent = timer.total === sec
                  const isDefault = restSec === sec
                  return (
                    <button
                      key={sec}
                      type="button"
                      className={`rest-common-btn ${isCurrent ? 'active' : ''}`}
                      onClick={() => handleSelectInterval(sec)}
                      title={t('Set rest timer to {0}s', sec)}
                    >
                      <div className="rest-common-val">{label}</div>
                      <div className="rest-common-desc">{t(desc)}</div>
                      {isCurrent && (
                        <span className="rest-active-badge">
                          <Icon name="check" size={10} /> {t('Active')}
                        </span>
                      )}
                      {!isCurrent && isDefault && (
                        <span className="rest-default-badge">
                          {t('Default')}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* More Intervals */}
            <div className="rest-menu-sec">
              <div className="rest-menu-sec-label">
                <span>{t('More Intervals')}</span>
              </div>
              <div className="rest-more-grid">
                {MORE_INTERVALS.map(({ sec, desc }) => {
                  const isCurrent = timer.total === sec
                  return (
                    <button
                      key={sec}
                      type="button"
                      className={`chip rest-interval-chip ${isCurrent ? 'acc' : ''}`}
                      onClick={() => handleSelectInterval(sec)}
                      title={t('Set rest timer to {0}s', sec)}
                    >
                      {isCurrent && <Icon name="check" size={11} style={{ marginRight: 3 }} />}
                      <span>{desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom Time */}
            <div className="rest-menu-sec">
              <div className="rest-menu-sec-label">
                <span>{t('Custom time')}</span>
              </div>
              <div className="rest-custom-row">
                <Button
                  size="sm"
                  icon="minus"
                  onClick={() => setCustomVal(v => Math.max(10, (v || timer.total || 90) - 15))}
                  title={t('Decrease 15s')}
                >
                  15s
                </Button>
                <div className="rest-custom-input-wrap">
                  <input
                    type="number"
                    min="5"
                    max="1200"
                    step="5"
                    className="rest-custom-input"
                    value={customVal}
                    onChange={e => setCustomVal(Number(e.target.value))}
                    placeholder={String(timer.total || 90)}
                    aria-label={t('Custom time in seconds')}
                  />
                  <span className="rest-custom-unit">s</span>
                </div>
                <Button
                  size="sm"
                  icon="plus"
                  onClick={() => setCustomVal(v => Math.min(1200, (v || timer.total || 90) + 15))}
                  title={t('Add 15s')}
                >
                  15s
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleSelectInterval(customVal || 90)}
                >
                  {t('Apply')}
                </Button>
              </div>
            </div>

            {/* Save as default preference */}
            <div className="rest-default-row">
              <label className="rest-default-label">
                <input
                  type="checkbox"
                  checked={saveAsDefault}
                  onChange={e => setSaveAsDefault(e.target.checked)}
                  className="rest-default-chk"
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {t('Set as default rest time for future sets')}
                  </div>
                  <div className="muted small">
                    {t('Current default: {0}s', restSec)}
                  </div>
                </div>
              </label>
            </div>
          </div>
        </>
      )}

      {/* Main Rest Timer Floating Bar */}
      <div id="timer" className="rest">
        {/* Row 1: Clock, Progress Bar, Sound & Haptic Toggles */}
        <div className="head">
          <div className="t">{clock(timer.left)}</div>
          <div className="bar"><i style={{ width: pct + '%' }} /></div>
          <button
            type="button"
            className="chip"
            style={{
              padding: '4px 7px',
              fontSize: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              opacity: soundOn ? 1 : 0.6,
              background: soundOn ? 'var(--surface-3)' : 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
            onClick={() => update(s => { s.sound = !s.sound })}
            title={soundOn ? t('Sound alert on') : t('Sound alert muted')}
            aria-label={soundOn ? t('Sound alert on') : t('Sound alert muted')}
          >
            <Icon name={soundOn ? 'bell' : 'bellSlash'} size={14} />
          </button>
          <button
            type="button"
            className="chip"
            style={{
              padding: '4px 7px',
              fontSize: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              opacity: hapticsOn ? 1 : 0.6,
              background: hapticsOn ? 'var(--surface-3)' : 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
            onClick={() => update(s => { s.haptics = s.haptics === false })}
            title={hapticsOn ? t('Haptic feedback on') : t('Haptic feedback muted')}
            aria-label={hapticsOn ? t('Haptic feedback on') : t('Haptic feedback muted')}
          >
            <Icon name="vibrate" size={14} />
          </button>
        </div>

        {/* Row 2: Controls (-15s, +15s, Set Rest Time Menu Button, Skip) */}
        <div className="acts">
          <Button size="sm" icon="minus" onClick={() => addRest(-15)} title={t('Decrease 15s')}>15s</Button>
          <Button size="sm" icon="plus" onClick={() => addRest(15)} title={t('Add 15s')}>15s</Button>
          <Button
            size="sm"
            variant={menuOpen ? 'primary' : 'tinted'}
            icon="timer"
            onClick={() => setMenuOpen(o => !o)}
            aria-expanded={menuOpen}
            title={t('Set Rest Time')}
            className="btn-set-rest-toggle"
          >
            <span>{t('Set Rest Time')}</span>
            <Icon name={menuOpen ? 'chevronDown' : 'chevronUp'} size={12} style={{ marginLeft: 3 }} />
          </Button>
          <Button size="sm" variant="primary" className="skip" onClick={stopRest}>{t('Skip')}</Button>
        </div>

        {/* Row 3: Quick Select Common Intervals (60s, 90s, 120s) & Presets */}
        <div className="rest-quick-row">
          <span className="rest-quick-label">{t('Quick:')}</span>
          {[60, 90, 120].map(sec => {
            const isMatch = timer.total === sec
            return (
              <button
                key={sec}
                type="button"
                className={'chip' + (isMatch ? ' acc' : '')}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: isMatch ? 700 : 500,
                  background: isMatch ? 'var(--acc)' : 'var(--surface-3)',
                  color: isMatch ? 'var(--acc-fg, #000)' : 'var(--fg)',
                  border: isMatch ? '1px solid var(--acc)' : '1px solid var(--sep)',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => handleSelectInterval(sec)}
                title={t('Set rest timer to {0}s', sec)}
              >
                {sec}s
              </button>
            )
          })}
          {restPresets.filter(p => ![60, 90, 120].includes(p)).map(sec => {
            const isMatch = timer.total === sec
            return (
              <button
                key={sec}
                type="button"
                className={'chip' + (isMatch ? ' acc' : '')}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: isMatch ? 700 : 500,
                  background: isMatch ? 'var(--acc)' : 'var(--surface-3)',
                  color: isMatch ? 'var(--acc-fg, #000)' : 'var(--fg)',
                  border: isMatch ? '1px solid var(--acc)' : '1px solid var(--sep)',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => handleSelectInterval(sec)}
                title={t('Set rest timer to {0}s', sec)}
              >
                {sec}s
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
