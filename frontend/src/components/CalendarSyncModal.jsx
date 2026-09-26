import { useState, useMemo } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { fmtDate, DAYN, todayISO } from '../lib/format.js'
import { glyphOf } from '../lib/glyphs.js'
import { MOBILE } from '../lib/mobile.js'
import Icon from './Icon.jsx'
import { Button, Switch, Segmented, Row } from './ui.jsx'
import {
  generateIcsCalendar,
  generateSingleIcsEvent,
  downloadIcsFile,
  shareIcsFile,
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  buildWebcalUrl,
  getUpcomingScheduledWorkouts
} from '../lib/ical.js'

export default function CalendarSyncModal({ close }) {
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)

  // Calendar sync preferences
  const initialCfg = S.calSync || {}
  const [time, setTime] = useState(initialCfg.time || '09:00')
  const [duration, setDuration] = useState(initialCfg.duration || 60)
  const [reminder, setReminder] = useState(initialCfg.reminder !== undefined ? initialCfg.reminder : 15)
  const [weeks, setWeeks] = useState(initialCfg.weeks || 4)
  const [location, setLocation] = useState(initialCfg.location || 'Gym')
  const [includeDetails, setIncludeDetails] = useState(initialCfg.includeDetails !== false)
  const [copied, setCopied] = useState(false)

  // Save changes to store
  const savePrefs = (updates) => {
    update(s => {
      s.calSync = {
        ...(s.calSync || {}),
        time,
        duration,
        reminder,
        weeks,
        location,
        includeDetails,
        ...updates
      }
    })
  }

  // Previews of upcoming scheduled sessions
  const scheduled = useMemo(() => {
    return getUpcomingScheduledWorkouts(S, { days: weeks * 7, startDate: todayISO() })
  }, [S, weeks])

  // Generate full iCal string
  const getIcsContent = () => {
    return generateIcsCalendar({
      S,
      options: {
        weeks,
        time,
        duration,
        reminder,
        location,
        includeDetails,
        calendarName: user?.name ? t('{0}’s Gymly Workouts', user.name) : t('Gymly Workouts')
      }
    })
  }

  const handleDownloadIcs = () => {
    if (!scheduled.length) {
      toast(t('No workouts scheduled in your plan yet'))
      return
    }
    savePrefs()
    const ics = getIcsContent()
    const filename = `gymly-workouts-${weeks}w.ics`
    downloadIcsFile(ics, filename)
    toast(t('iCal file downloaded — open to import into your calendar'))
    close?.()
  }

  const handleShareIcs = async () => {
    if (!scheduled.length) {
      toast(t('No workouts scheduled in your plan yet'))
      return
    }
    savePrefs()
    const ics = getIcsContent()
    const filename = `gymly-workouts-${weeks}w.ics`
    const ok = await shareIcsFile(ics, filename, t('Gymly Scheduled Workouts'))
    if (ok) {
      toast(t('Exported to Calendar'))
      close?.()
    }
  }

  // WebCal live subscription feed URL
  const feedUrl = useMemo(() => {
    if (!user?.id) return ''
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const key = S.calSync?.calKey ? `&key=${S.calSync.calKey}` : ''
    return `${origin}/api/calendar.ics?user=${encodeURIComponent(user.id)}${key}`
  }, [user, S.calSync?.calKey])

  const webcalUrl = useMemo(() => buildWebcalUrl(feedUrl), [feedUrl])

  const copyFeedLink = async () => {
    if (!feedUrl) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(feedUrl)
      } else {
        const input = document.createElement('input')
        input.value = feedUrl
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }
      setCopied(true)
      toast(t('Subscription link copied to clipboard'))
      setTimeout(() => setCopied(false), 2500)
    } catch (e) {
      toast(t('Could not copy link'))
    }
  }

  const firstUpcoming = scheduled[0]

  return (
    <div className="cal-sync-modal" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h3 style={{ margin: '0 0 4px' }}>{t('Sync with System Calendar')}</h3>
        <div className="muted small">
          {t('Export your workouts to Apple Calendar, Google Calendar, Outlook, or any iCal-compatible app.')}
        </div>
      </div>

      {/* Sync Preferences Section */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Workout Time & Duration */}
        <div className="row between" style={{ alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{t('Workout time')}</div>
            <div className="small muted">{t('Default scheduled start time')}</div>
          </div>
          <input
            type="time"
            value={time}
            onChange={e => { setTime(e.target.value); savePrefs({ time: e.target.value }) }}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid var(--sep)',
              background: 'var(--surface-2)',
              color: 'var(--label)',
              fontSize: 14,
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Duration */}
        <div className="row between" style={{ alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{t('Duration')}</div>
            <div className="small muted">{t('Estimated workout length')}</div>
          </div>
          <Segmented
            value={duration}
            onChange={v => { setDuration(v); savePrefs({ duration: v }) }}
            options={[
              { value: 45, label: '45m' },
              { value: 60, label: '60m' },
              { value: 75, label: '75m' },
              { value: 90, label: '90m' }
            ]}
          />
        </div>

        {/* Reminder Alarm */}
        <div className="row between" style={{ alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{t('Calendar reminder')}</div>
            <div className="small muted">{t('Alert before scheduled start')}</div>
          </div>
          <select
            value={reminder}
            onChange={e => { const v = Number(e.target.value); setReminder(v); savePrefs({ reminder: v }) }}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid var(--sep)',
              background: 'var(--surface-2)',
              color: 'var(--label)',
              fontSize: 13,
              fontFamily: 'inherit'
            }}
          >
            <option value="-1">{t('None')}</option>
            <option value="0">{t('At start')}</option>
            <option value="15">{t('15 min before')}</option>
            <option value="30">{t('30 min before')}</option>
            <option value="60">{t('1 hour before')}</option>
            <option value="1440">{t('1 day before')}</option>
          </select>
        </div>

        {/* Sync Range */}
        <div className="row between" style={{ alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{t('Export range')}</div>
            <div className="small muted">{t('Number of upcoming weeks')}</div>
          </div>
          <Segmented
            value={weeks}
            onChange={v => { setWeeks(v); savePrefs({ weeks: v }) }}
            options={[
              { value: 2, label: `2 ${t('wk')}` },
              { value: 4, label: `4 ${t('wk')}` },
              { value: 8, label: `8 ${t('wk')}` },
              { value: 12, label: `12 ${t('wk')}` }
            ]}
          />
        </div>

        {/* Include details switch */}
        <div className="row between" style={{ alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{t('Include exercise list')}</div>
            <div className="small muted">{t('Adds exercise names and target sets into event notes')}</div>
          </div>
          <Switch
            checked={includeDetails}
            onChange={v => { setIncludeDetails(v); savePrefs({ includeDetails: v }) }}
          />
        </div>
      </div>

      {/* Upcoming Workouts Preview */}
      <div>
        <div className="row between" style={{ alignItems: 'center', marginBottom: 8 }}>
          <div className="sec" style={{ margin: 0 }}>
            {t('Upcoming workouts ({0})', scheduled.length)}
          </div>
          {scheduled.length > 0 && (
            <span className="small muted">{t('Next {0} weeks', weeks)}</span>
          )}
        </div>

        {scheduled.length > 0 ? (
          <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
            {scheduled.slice(0, 8).map((item, idx) => (
              <div
                key={idx}
                className="row between"
                style={{
                  padding: '6px 10px',
                  background: 'var(--surface-2)',
                  borderRadius: 8,
                  fontSize: 13,
                  alignItems: 'center'
                }}
              >
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <span className="lrow-i" style={{ width: 24, height: 24, borderRadius: 6, fontSize: 14 }}>
                    <Icon name={glyphOf(item.routine.emoji)} />
                  </span>
                  <div>
                    <span style={{ fontWeight: 600 }}>{item.routine.name}</span>
                    {item.isOverride && (
                      <span className="tag acc" style={{ marginLeft: 6, fontSize: 10 }}>{t('Rescheduled')}</span>
                    )}
                  </div>
                </div>
                <div className="small muted">
                  {fmtDate(item.iso, true)} · {time}
                </div>
              </div>
            ))}
            {scheduled.length > 8 && (
              <div className="small dim" style={{ textAlign: 'center', padding: '4px 0' }}>
                {t('+ {0} more scheduled workouts', scheduled.length - 8)}
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '16px', background: 'var(--surface-2)', borderRadius: 10, textAlign: 'center' }}>
            <Icon name="calendar" style={{ fontSize: 28, color: 'var(--label-3)', marginBottom: 6 }} />
            <div style={{ fontWeight: 600 }}>{t('No workouts scheduled yet')}</div>
            <div className="small muted" style={{ marginTop: 2 }}>
              {t('Assign routines to days of the week in your Plan to sync them with your system calendar.')}
            </div>
          </div>
        )}
      </div>

      {/* Primary Actions: Download iCal / Share to Calendar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        <Button
          variant="primary"
          icon="download"
          onClick={handleDownloadIcs}
          disabled={!scheduled.length}
        >
          {t('Download iCal file (.ics)')}
        </Button>

        <div className="row" style={{ gap: 8 }}>
          <Button
            variant="tinted"
            icon="share"
            style={{ flex: 1 }}
            onClick={handleShareIcs}
            disabled={!scheduled.length}
          >
            {t('Share / Open in Calendar')}
          </Button>

          {firstUpcoming && (
            <Button
              variant="tinted"
              icon="globe"
              style={{ flex: 1 }}
              onClick={() => {
                const url = buildGoogleCalendarUrl({
                  routine: firstUpcoming.routine,
                  isoDate: firstUpcoming.iso,
                  time,
                  duration,
                  location,
                  includeDetails,
                  S
                })
                window.open(url, '_blank', 'noopener,noreferrer')
              }}
            >
              {t('Google Calendar')}
            </Button>
          )}
        </div>
      </div>

      {/* Live WebCal Subscription Feed */}
      <div style={{ borderTop: '1px solid var(--sep)', paddingTop: 12, marginTop: 4 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="link" style={{ fontSize: 16 }} />
          <span>{t('Calendar subscription feed (WebCal)')}</span>
        </div>
        <div className="small muted" style={{ marginBottom: 8, lineHeight: 1.4 }}>
          {user ? (
            t('Subscribe in Apple Calendar or Google Calendar by URL for live, automatic updates whenever you change your routines.')
          ) : (
            t('Sign in to your account to enable a live subscribable WebCal feed that stays synced across all your devices.')
          )}
        </div>

        {user && feedUrl ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="row" style={{ gap: 6 }}>
              <input
                type="text"
                readOnly
                value={feedUrl}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--sep)',
                  background: 'var(--surface-2)',
                  color: 'var(--label-2)',
                  fontSize: 12,
                  fontFamily: 'monospace'
                }}
              />
              <Button
                size="sm"
                variant={copied ? 'primary' : 'tinted'}
                icon={copied ? 'check' : 'copy'}
                onClick={copyFeedLink}
              >
                {copied ? t('Copied!') : t('Copy')}
              </Button>
            </div>

            <div className="row" style={{ gap: 8, marginTop: 2 }}>
              <a
                href={webcalUrl}
                className="btn btn-sm btn-ghost"
                style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
              >
                <Icon name="calendar" style={{ marginRight: 4 }} />
                {t('Subscribe in Apple Calendar')}
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Quick single-workout calendar sheet for adding one session to calendar.
 */
export function SingleWorkoutCalendarModal({ routine, isoDate, close }) {
  const S = useStore(s => s.S)
  const toast = useUI(s => s.toast)
  const defaultTime = S?.calSync?.time || '09:00'
  const defaultDuration = S?.calSync?.duration || 60
  const defaultReminder = S?.calSync?.reminder !== undefined ? S.calSync.reminder : 15
  const location = S?.calSync?.location || 'Gym'

  const [time, setTime] = useState(defaultTime)
  const [duration, setDuration] = useState(defaultDuration)
  const [reminder, setReminder] = useState(defaultReminder)

  const handleDownload = () => {
    const ics = generateSingleIcsEvent({
      routine,
      isoDate,
      time,
      duration,
      reminder,
      location,
      includeDetails: true,
      S
    })
    const filename = `gymly-${routine.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${isoDate}.ics`
    downloadIcsFile(ics, filename)
    toast(t('Workout added to .ics file'))
    close?.()
  }

  const handleGoogle = () => {
    const url = buildGoogleCalendarUrl({
      routine,
      isoDate,
      time,
      duration,
      location,
      includeDetails: true,
      S
    })
    window.open(url, '_blank', 'noopener,noreferrer')
    close?.()
  }

  const handleOutlook = () => {
    const url = buildOutlookCalendarUrl({
      routine,
      isoDate,
      time,
      duration,
      location,
      includeDetails: true,
      S
    })
    window.open(url, '_blank', 'noopener,noreferrer')
    close?.()
  }

  const handleShare = async () => {
    const ics = generateSingleIcsEvent({
      routine,
      isoDate,
      time,
      duration,
      reminder,
      location,
      includeDetails: true,
      S
    })
    const filename = `gymly-${routine.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${isoDate}.ics`
    const ok = await shareIcsFile(ics, filename, `${routine.name} (${fmtDate(isoDate, true)})`)
    if (ok) {
      toast(t('Exported to Calendar'))
      close?.()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="row" style={{ gap: 10, alignItems: 'center' }}>
        <span className="lrow-i" style={{ width: 40, height: 40, borderRadius: 10, fontSize: 22 }}>
          <Icon name={glyphOf(routine.emoji)} />
        </span>
        <div>
          <h3 style={{ margin: 0 }}>{routine.name}</h3>
          <div className="small muted">
            {fmtDate(isoDate, true)} · {routine.ex ? `${routine.ex.length} ${t('exercises')}` : ''}
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="row between" style={{ alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{t('Start time')}</span>
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            style={{
              padding: '5px 8px',
              borderRadius: 8,
              border: '1px solid var(--sep)',
              background: 'var(--surface-2)',
              color: 'var(--label)',
              fontSize: 14,
              fontFamily: 'inherit'
            }}
          />
        </div>

        <div className="row between" style={{ alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{t('Duration')}</span>
          <Segmented
            value={duration}
            onChange={setDuration}
            options={[
              { value: 45, label: '45m' },
              { value: 60, label: '60m' },
              { value: 90, label: '90m' }
            ]}
          />
        </div>

        <div className="row between" style={{ alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{t('Reminder')}</span>
          <select
            value={reminder}
            onChange={e => setReminder(Number(e.target.value))}
            style={{
              padding: '5px 8px',
              borderRadius: 8,
              border: '1px solid var(--sep)',
              background: 'var(--surface-2)',
              color: 'var(--label)',
              fontSize: 13,
              fontFamily: 'inherit'
            }}
          >
            <option value="-1">{t('None')}</option>
            <option value="0">{t('At start')}</option>
            <option value="15">{t('15m before')}</option>
            <option value="30">{t('30m before')}</option>
            <option value="60">{t('1h before')}</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button variant="primary" icon="calendar" onClick={handleDownload}>
          {t('Add to System Calendar (.ics)')}
        </Button>
        <div className="row" style={{ gap: 8 }}>
          <Button variant="tinted" icon="share" style={{ flex: 1 }} onClick={handleShare}>
            {t('Share / Open')}
          </Button>
          <Button variant="tinted" icon="globe" style={{ flex: 1 }} onClick={handleGoogle}>
            {t('Google Calendar')}
          </Button>
        </div>
        <Button variant="ghost" className="dim" onClick={handleOutlook}>
          {t('Add to Microsoft Outlook')}
        </Button>
      </div>
    </div>
  )
}
