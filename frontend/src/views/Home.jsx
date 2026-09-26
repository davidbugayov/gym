import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutine, effectiveRoutineId, streakWeeks, lastBW, setsDoneActive } from '../lib/history.js'
import { fmtNum, fmtDate, todayISO, isoOf, weekKey, DAYS } from '../lib/format.js'
import { t, dateLocale, useLang } from '../lib/i18n.js'
import { bwSheet, goalSheet, dayOverrideSheet, calendarSheet, startFlow, readyProgramsSheet, programWizardSheet, bwDeltaColor, singleWorkoutCalendarSheet } from '../sheets.jsx'
import LineChart from '../components/LineChart.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { glyphOf } from '../lib/glyphs.js'
import { coachAvailable, hasConsent } from '../lib/coach.js'
import { useCoachStatus } from '../lib/coach-api.js'
import { DEMO } from '../lib/demo.js'
import { MOBILE } from '../lib/mobile.js'

function ActiveElapsed({ start }) {
  const [timeStr, setTimeStr] = useState('00:00')
  useEffect(() => {
    if (!start) return
    const tick = () => {
      const totalSec = Math.max(0, Math.floor((Date.now() - start) / 1000))
      const hrs = Math.floor(totalSec / 3600)
      const mins = Math.floor((totalSec % 3600) / 60)
      const secs = totalSec % 60
      const pad = n => String(n).padStart(2, '0')
      setTimeStr(hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${mins}:${pad(secs)}`)
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [start])
  return <span style={{ fontVariantNumeric: 'tabular-nums', fontFamily: "'JetBrains Mono', monospace" }}>{timeStr}</span>
}

function CoachCard({ nav }) {
  const S = useStore(s => s.S)
  const { job, pending } = useCoachStatus(hasConsent(S))
  if (!hasConsent(S) || (!job && !pending)) return null
  const ready = !!pending
  return (
    <div className="card" style={ready ? { borderColor: 'var(--acc)' } : null}>
      <div className="today-row" onClick={() => nav(ready ? '/coach/proposal' : '/coach')}>
        <div className="row" style={{ gap: 10, minWidth: 0 }}>
          <span className="lrow-i" style={{ background: ready ? 'var(--acc)' : 'var(--orange)' }}>
            <Icon name="sparkles" />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="lbl2">{t('Coach')}</div>
            <div className="ttl">
              {ready
                ? (pending.kind === 'create'
                  ? t('Your plan is ready')
                  : t(pending.changes?.length === 1 ? '{0} suggestion for you' : '{0} suggestions for you', pending.changes?.length || 0))
                : t('Reading your training…')}
            </div>
          </div>
        </div>
        {ready ? <span className="tag acc">{t('Review')}</span> : <Icon name="chevronRight" className="chev" />}
      </div>
    </div>
  )
}

export default function Home() {
  useLang()
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const config = useStore(s => s.config)
  const [weekOffset, setWeekOffset] = useState(0)
  const coachOn = coachAvailable(config, user, { demo: DEMO, mobile: MOBILE })

  const today = new Date()
  const routine = effectiveRoutine(S, todayISO())
  const todayOvr = S.dayPlan[todayISO()] !== undefined
  const bw = lastBW(S)
  const prevBW = S.bodyweight.length > 1 ? S.bodyweight[S.bodyweight.length - 2] : null
  const delta = bw && prevBW ? bw.w - prevBW.w : null

  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7)
  const doneDays = new Set(S.workouts.map(w => w.d))
  const strip = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const iso = isoOf(d)
    const eff = effectiveRoutineId(S, iso)
    const ovr = S.dayPlan[iso] !== undefined
    const done = doneDays.has(iso)
    const isToday = iso === todayISO()
    const dot = done ? ' done' : ovr && eff ? ' ovr' : eff ? ' plan' : ''
    strip.push(
      <div
        key={i}
        className={'wday' + (isToday ? ' today' : '')}
        onClick={() => dayOverrideSheet(iso)}
        title={t(DAYS[d.getDay()]) + ' ' + d.getDate()}
      >
        <div className="lbl">{t(DAYS[d.getDay()])}</div>
        <div className="num">{d.getDate()}</div>
        <div className={'dot' + dot} />
      </div>
    )
  }
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const wkLabel = weekOffset === 0
    ? t('This week')
    : `${monday.getDate()} ${monday.toLocaleDateString(dateLocale(), { month: 'short' })} – ${sunday.getDate()} ${sunday.toLocaleDateString(dateLocale(), { month: 'short' })}`

  const wThisWeek = S.workouts.filter(w => weekKey(w.d) === weekKey(todayISO())).length
  const plannedPerWeek = Object.keys(S.week).filter(k => S.week[k]).length || 3
  const bwPoints = S.bodyweight.slice(-30).map(b => ({ t: b.t || new Date(b.d).getTime(), y: b.w, d: b.d }))
  const streak = streakWeeks(S)

  // Active workout stats
  let totalActiveSets = 0
  let doneActiveSets = 0
  if (S.active && S.active.entries) {
    doneActiveSets = setsDoneActive(S)
    for (const e of S.active.entries) {
      if (e.sets) totalActiveSets += e.sets.length
    }
  }

  return (
    <div className="narrow">
      {/* Top Header with athletic styling and streak indicator */}
      <div className="hdr" style={{ alignItems: 'center' }}>
        <div>
          <h1>{user ? t('Hi {0}', user.name) : 'Gymly'}</h1>
          <div className="sub">
            {today.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          {streak > 0 && (
            <div className="streak-pill" onClick={() => calendarSheet()} style={{ cursor: 'pointer' }} title={t('{0} week streak', streak)}>
              <Icon name="flame" />
              <span>{streak}w</span>
            </div>
          )}
          <button className="iconbtn" onClick={() => nav('/settings')} aria-label={t('Settings')}>
            <Icon name="gear" />
          </button>
        </div>
      </div>

      {/* Hero Workout Card (Active, Scheduled, or Rest) */}
      {S.active ? (
        <div className="hero-workout-card is-active">
          <div className="hero-badge active">
            <Icon name="timer" />
            <span>{t('Workout in progress')}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <ActiveElapsed start={S.active.start} />
          </div>
          <div className="hero-title">{S.active.name}</div>
          <div className="hero-meta">
            <span>{t('{0} exercises', S.active.entries?.length || 0)}</span>
            <span>·</span>
            <span>{t('{0} of {1} sets complete', doneActiveSets, totalActiveSets)}</span>
          </div>
          {totalActiveSets > 0 && (
            <div className="hero-progress-wrap">
              <div className="hero-progress-bar">
                <div
                  className="hero-progress-fill"
                  style={{ width: `${Math.round((doneActiveSets / totalActiveSets) * 100)}%` }}
                />
              </div>
            </div>
          )}
          <Button variant="primary" icon="play" onClick={() => nav('/workout')}>
            {t('Resume workout')}
          </Button>
        </div>
      ) : routine ? (
        <div className="hero-workout-card">
          <div className="hero-badge">
            <Icon name={glyphOf(routine.emoji)} />
            <span>{t("Today's mission")}{todayOvr ? ' · ' + t('rescheduled') : ''}</span>
          </div>
          <div className="hero-title">{routine.name}</div>
          <div className="hero-meta">
            <span>{t('{0} exercises', routine.ex?.length || 0)}</span>
            <span>·</span>
            <span>~45 {t('min')}</span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Button variant="primary" icon="play" onClick={() => startFlow(routine.id)}>
              {t('Start workout')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => dayOverrideSheet(todayISO())}>
              {t('Reschedule')}
            </Button>
            <Button size="sm" variant="ghost" icon="calendar" onClick={() => singleWorkoutCalendarSheet(routine, todayISO())} title={t('Add to Calendar')}>
              {t('Calendar')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="hero-workout-card is-rest">
          <div className="hero-badge rest">
            <Icon name="moon" />
            <span>{t('Rest & Recovery day')}</span>
          </div>
          <div className="hero-title">{t('Recovery Day')}</div>
          <div className="hero-meta">
            <span>{t('Rest and rebuild — sleep, hydrate and stretch')}</span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Button variant="tinted" icon="shuffle" onClick={() => startFlow(null)}>
              {t('Start freestyle workout')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => dayOverrideSheet(todayISO())}>
              {t('Assign routine')}
            </Button>
          </div>
        </div>
      )}

      {/* Quick Launch Action Bar */}
      <div className="quick-actions-grid">
        <button type="button" className="quick-action-btn" onClick={() => startFlow(null)}>
          <div className="qa-icon"><Icon name="dumbbell" /></div>
          <span className="qa-label">{t('Freestyle')}</span>
        </button>
        <button type="button" className="quick-action-btn" onClick={() => bwSheet()}>
          <div className="qa-icon"><Icon name="scale" /></div>
          <span className="qa-label">{t('Log weight')}</span>
        </button>
        <button type="button" className="quick-action-btn" onClick={programWizardSheet}>
          <div className="qa-icon"><Icon name="sparkles" /></div>
          <span className="qa-label">{t('Programs')}</span>
        </button>
        <button type="button" className="quick-action-btn" onClick={() => calendarSheet()}>
          <div className="qa-icon"><Icon name="calendar" /></div>
          <span className="qa-label">{t('Calendar')}</span>
        </button>
      </div>

      {/* Weekly Training Consistency Strip */}
      <div className="card">
        <div className="row between" style={{ marginBottom: 10, alignItems: 'center' }}>
          <button
            className="iconbtn"
            style={{ width: 32, height: 32, fontSize: 14 }}
            onClick={() => setWeekOffset(w => w - 1)}
            aria-label="Previous week"
          >
            <Icon name="chevronLeft" />
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{wkLabel}</div>
            <div className="dim small" style={{ fontSize: 12 }}>
              {wThisWeek} / {plannedPerWeek} {t('workouts completed')}
            </div>
          </div>
          <button
            className="iconbtn"
            style={{ width: 32, height: 32, fontSize: 14 }}
            onClick={() => setWeekOffset(w => w + 1)}
            aria-label="Next week"
          >
            <Icon name="chevronRight" />
          </button>
        </div>

        <div className="week">{strip}</div>

        <div className="weekly-progress-bar-wrap">
          <div className="weekly-progress-bar">
            <div
              className="weekly-progress-fill"
              style={{ width: `${Math.min(100, Math.round((wThisWeek / (plannedPerWeek || 1)) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {coachOn && <CoachCard nav={nav} />}

      {!S.routines.length && !S.active && (
        <div className="card">
          <div className="row" style={{ gap: 10, marginBottom: 8, alignItems: 'center' }}>
            <span className="lrow-i"><Icon name="sparkles" /></span>
            <div className="big" style={{ fontSize: 20 }}>{t('Welcome to Gymly!')}</div>
          </div>
          <div className="muted small" style={{ marginBottom: 14 }}>
            {t('Set up your weekly routine to get going — or find a ready-made program.')}
          </div>
          {coachOn && (
            <>
              <Button variant="primary" icon="sparkles" onClick={() => nav(hasConsent(S) ? '/coach/intake' : '/coach')}>
                {t('Let the Coach build it')}
              </Button>
              <div style={{ height: 8 }} />
            </>
          )}
          <Button variant={coachOn ? 'plain' : 'primary'} icon="sparkles" onClick={programWizardSheet}>
            {t('Ready-made programs')}
          </Button>
          <div style={{ height: 8 }} />
          <Button onClick={() => nav('/plan')}>{t('Build my own plan')}</Button>
        </div>
      )}

      {/* Body Weight Tracker Card */}
      <div className="card">
        <div className="row between" style={{ marginBottom: 8, alignItems: 'center' }}>
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <Icon name="scale" style={{ color: 'var(--acc)' }} />
            <h2 style={{ margin: 0 }}>{t('Body weight')}</h2>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Button size="sm" icon="target" style={S.targetW ? { color: 'var(--yellow)' } : undefined} onClick={goalSheet}>
              {S.targetW ? fmtNum(S.targetW) : t('Goal')}
            </Button>
            <Button size="sm" variant="primary" icon="plus" onClick={() => bwSheet()}>
              {t('Log')}
            </Button>
          </div>
        </div>
        {bw ? (
          <>
            <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
              <div className="big">
                {fmtNum(bw.w)} <span className="muted" style={{ fontSize: '1.05rem', fontWeight: 500 }}>{S.unit}</span>
              </div>
              {!!delta && (
                <span className="small row" style={{ gap: 2, fontWeight: 700, color: bwDeltaColor(delta, bw.w) }}>
                  <Icon name={delta > 0 ? 'arrowUp' : 'arrowDown'} style={{ fontSize: 13 }} />
                  {fmtNum(Math.abs(delta))}
                </span>
              )}
              <span className="dim small" style={{ marginLeft: 'auto' }}>
                {fmtDate(bw.d, true)}
              </span>
            </div>
            {S.targetW && (
              <div className="small row" style={{ color: 'var(--yellow)', marginTop: 4, gap: 5 }}>
                <Icon name="target" style={{ fontSize: 13 }} />
                <span>
                  {t('Goal')} {fmtNum(S.targetW)} {S.unit} ·{' '}
                  {Math.abs(S.targetW - bw.w) < 0.05
                    ? t('reached!')
                    : t(S.targetW > bw.w ? '{0} to gain' : '{0} to lose', fmtNum(Math.abs(S.targetW - bw.w)) + ' ' + S.unit)}
                </span>
              </div>
            )}
            <div className="chart" style={{ marginTop: 10 }}>
              <LineChart points={bwPoints} h={130} unit={S.unit} goal={S.targetW} />
            </div>
          </>
        ) : (
          <div className="muted small">
            {t("No entries yet — log your weight to start the curve. It's also asked before every workout.")}
          </div>
        )}
      </div>

      {/* Streak and Consistency Bento Tile */}
      <div className="card tappable" style={{ cursor: 'pointer' }} onClick={() => calendarSheet()}>
        <div className="row between" style={{ alignItems: 'center' }}>
          <div>
            <div className="row" style={{ gap: 8, fontSize: 20, fontWeight: 800, letterSpacing: '-.025em' }}>
              <Icon name="flame" style={{ color: 'var(--orange)' }} />
              {t('{0} week streak', streak)}
            </div>
            <div className="muted small" style={{ marginTop: 4 }}>
              {wThisWeek}
              {plannedPerWeek ? ' / ' + plannedPerWeek : ''} {t('this week')} ·{' '}
              {t(S.workouts.length === 1 ? '{0} workout total' : '{0} workouts total', S.workouts.length)}
            </div>
          </div>
          <div className="iconbtn" style={{ background: 'var(--surface-2)', border: 'none' }}>
            <Icon name="calendar" style={{ fontSize: 18 }} />
          </div>
        </div>
      </div>
    </div>
  )
}
