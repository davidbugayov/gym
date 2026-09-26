// RFC 5545 iCalendar generator and system calendar sync integration for Gymly
import { todayISO, localTZ } from './format.js'
import { effectiveRoutine } from './history.js'
import { exOr } from './exercises.js'
import { glyphOf } from './glyphs.js'
import { t } from './i18n.js'
import { MOBILE, shareExport } from './mobile.js'

/**
 * Escapes special characters for iCalendar text values (RFC 5545 Section 3.3.11).
 * Backslashes, semicolons, commas, and newlines must be escaped.
 */
export function escapeIcsText(str) {
  if (str == null) return ''
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Folds lines longer than maxLen octets using RFC 5545 line folding convention (CRLF + space).
 */
export function foldIcsLine(line, maxLen = 75) {
  if (!line || line.length <= maxLen) return line
  const parts = []
  let remaining = line
  let isFirst = true
  while (remaining.length > 0) {
    const limit = isFirst ? maxLen : maxLen - 1
    if (remaining.length <= limit) {
      parts.push(remaining)
      break
    }
    parts.push(remaining.slice(0, limit))
    remaining = remaining.slice(limit)
    isFirst = false
  }
  return parts.join('\r\n ')
}

/**
 * Formats a Date object or timestamp as YYYYMMDDTHHMMSS (local) or YYYYMMDDTHHMMSSZ (UTC).
 */
export function formatIcsDateTime(dateObj, isUtc = false) {
  const d = new Date(dateObj)
  if (isUtc) {
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    const h = String(d.getUTCHours()).padStart(2, '0')
    const min = String(d.getUTCMinutes()).padStart(2, '0')
    const s = String(d.getUTCSeconds()).padStart(2, '0')
    return `${y}${m}${day}T${h}${min}${s}Z`
  }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}${m}${day}T${h}${min}${s}`
}

/**
 * Formats a Date object as YYYYMMDD.
 */
export function formatIcsDate(dateObj) {
  const d = new Date(dateObj)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

/**
 * Formats the detailed description of a routine and its planned exercises.
 */
export function buildWorkoutDescription(routine, includeDetails = true, S = null) {
  if (!routine) return ''
  const lines = []
  lines.push(`Gymly Workout: ${routine.name}`)

  if (includeDetails && routine.ex && routine.ex.length > 0) {
    lines.push(`\nPlanned exercises (${routine.ex.length}):`)
    routine.ex.forEach((e, idx) => {
      const ex = exOr(e.id)
      const sets = e.sets || 3
      const targetStr = e.target
        ? (e.target.reps ? `${e.target.reps} reps` : e.target.min ? `${e.target.min} min` : '')
        : ''
      const cue = S?.exNotes?.[e.id] ? ` [Note: ${S.exNotes[e.id]}]` : ''
      lines.push(`${idx + 1}. ${ex.n} — ${sets} sets${targetStr ? ` × ${targetStr}` : ''}${cue}`)
    })
  }

  lines.push('\nScheduled with Gymly')
  return lines.join('\n')
}

/**
 * Returns a list of upcoming scheduled workouts starting from startDate for N days.
 */
export function getUpcomingScheduledWorkouts(S, { days = 28, startDate = todayISO() } = {}) {
  if (!S) return []
  const list = []
  const start = new Date(startDate + 'T12:00:00')

  for (let i = 0; i < days; i++) {
    const cur = new Date(start)
    cur.setDate(start.getDate() + i)
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const d = String(cur.getDate()).padStart(2, '0')
    const iso = `${y}-${m}-${d}`

    const r = effectiveRoutine(S, iso)
    if (r) {
      list.push({
        iso,
        dateObj: cur,
        dayOfWeek: cur.getDay(),
        routine: r,
        isToday: iso === todayISO(),
        isOverride: S.dayPlan?.[iso] !== undefined,
        exerciseCount: r.ex ? r.ex.length : 0
      })
    }
  }

  return list
}

/**
 * Generates an RFC 5545 iCalendar string for scheduled workouts.
 */
export function generateIcsCalendar({ S, options = {} }) {
  const {
    startDate = todayISO(),
    weeks = 4,
    days = weeks * 7,
    time = S?.calSync?.time || '09:00',
    duration = S?.calSync?.duration || 60,
    reminder = S?.calSync?.reminder !== undefined ? S.calSync.reminder : 15,
    location = S?.calSync?.location || 'Gym',
    includeDetails = S?.calSync?.includeDetails !== false,
    calendarName = t('Gymly Workouts')
  } = options

  const scheduled = getUpcomingScheduledWorkouts(S, { days, startDate })
  const dtstamp = formatIcsDateTime(new Date(), true)
  const tz = localTZ()

  const rawLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gymly//Workout Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    `X-WR-TIMEZONE:${tz}`
  ]

  const [hh, mm] = (time || '09:00').split(':').map(Number)

  scheduled.forEach(item => {
    const { iso, routine } = item
    const startDt = new Date(iso + `T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`)
    const endDt = new Date(startDt.getTime() + (duration || 60) * 60 * 1000)

    const dtstart = formatIcsDateTime(startDt)
    const dtend = formatIcsDateTime(endDt)
    const uid = `gymly-${routine.id}-${iso.replace(/-/g, '')}@gymly.app`
    const summary = `🏋️ ${routine.name} (Gymly)`
    const description = buildWorkoutDescription(routine, includeDetails, S)

    rawLines.push('BEGIN:VEVENT')
    rawLines.push(`UID:${uid}`)
    rawLines.push(`DTSTAMP:${dtstamp}`)
    rawLines.push(`DTSTART:${dtstart}`)
    rawLines.push(`DTEND:${dtend}`)
    rawLines.push(`SUMMARY:${escapeIcsText(summary)}`)
    rawLines.push(`DESCRIPTION:${escapeIcsText(description)}`)
    if (location) rawLines.push(`LOCATION:${escapeIcsText(location)}`)
    rawLines.push('STATUS:CONFIRMED')
    rawLines.push('CATEGORIES:Fitness,Workout,Health')

    // Add reminder alarm if requested
    if (reminder != null && reminder >= 0) {
      rawLines.push('BEGIN:VALARM')
      rawLines.push('ACTION:DISPLAY')
      rawLines.push(`DESCRIPTION:${escapeIcsText(summary)}`)
      if (reminder === 0) {
        rawLines.push('TRIGGER:-PT0M')
      } else if (reminder === 1440) {
        rawLines.push('TRIGGER:-P1D')
      } else {
        rawLines.push(`TRIGGER:-PT${reminder}M`)
      }
      rawLines.push('END:VALARM')
    }

    rawLines.push('END:VEVENT')
  })

  rawLines.push('END:VCALENDAR')

  // Apply RFC 5545 line folding and CRLF endings
  return rawLines.map(line => foldIcsLine(line)).join('\r\n') + '\r\n'
}

/**
 * Generates an iCalendar string containing a single scheduled workout event.
 */
export function generateSingleIcsEvent({
  routine,
  isoDate,
  time = '09:00',
  duration = 60,
  reminder = 15,
  location = 'Gym',
  includeDetails = true,
  calendarName = t('Gymly Workout'),
  S = null
}) {
  const dtstamp = formatIcsDateTime(new Date(), true)
  const tz = localTZ()
  const [hh, mm] = (time || '09:00').split(':').map(Number)
  const startDt = new Date(isoDate + `T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`)
  const endDt = new Date(startDt.getTime() + (duration || 60) * 60 * 1000)

  const dtstart = formatIcsDateTime(startDt)
  const dtend = formatIcsDateTime(endDt)
  const uid = `gymly-single-${routine.id}-${isoDate.replace(/-/g, '')}@gymly.app`
  const summary = `🏋️ ${routine.name} (Gymly)`
  const description = buildWorkoutDescription(routine, includeDetails, S)

  const rawLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gymly//Workout Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    `X-WR-TIMEZONE:${tz}`,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`
  ]

  if (location) rawLines.push(`LOCATION:${escapeIcsText(location)}`)
  rawLines.push('STATUS:CONFIRMED')
  rawLines.push('CATEGORIES:Fitness,Workout,Health')

  if (reminder != null && reminder >= 0) {
    rawLines.push('BEGIN:VALARM')
    rawLines.push('ACTION:DISPLAY')
    rawLines.push(`DESCRIPTION:${escapeIcsText(summary)}`)
    if (reminder === 0) {
      rawLines.push('TRIGGER:-PT0M')
    } else if (reminder === 1440) {
      rawLines.push('TRIGGER:-P1D')
    } else {
      rawLines.push(`TRIGGER:-PT${reminder}M`)
    }
    rawLines.push('END:VALARM')
  }

  rawLines.push('END:VEVENT')
  rawLines.push('END:VCALENDAR')

  return rawLines.map(line => foldIcsLine(line)).join('\r\n') + '\r\n'
}

/**
 * Initiates browser download of an iCalendar .ics file.
 */
export function downloadIcsFile(icsString, filename = 'gymly-workouts.ics') {
  const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Shares or downloads the iCalendar .ics file.
 * Uses Web Share API with File when supported (invoking native iOS/Android Calendar importer).
 */
export async function shareIcsFile(icsString, filename = 'gymly-workouts.ics', title = 'Gymly Workouts') {
  if (MOBILE) {
    try {
      await shareExport(icsString, filename)
      return true
    } catch (e) {
      // User cancelled
      return false
    }
  }

  if (typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([icsString], filename, { type: 'text/calendar;charset=utf-8' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text: t('Scheduled workouts from Gymly')
        })
        return true
      }
    } catch (e) {
      if (e.name === 'AbortError') return false
    }
  }

  // Standard download fallback
  downloadIcsFile(icsString, filename)
  return true
}

/**
 * Generates an "Add to Google Calendar" web link for a workout session.
 */
export function buildGoogleCalendarUrl({
  routine,
  isoDate,
  time = '09:00',
  duration = 60,
  location = 'Gym',
  includeDetails = true,
  S = null
}) {
  const [hh, mm] = (time || '09:00').split(':').map(Number)
  const startDt = new Date(isoDate + `T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`)
  const endDt = new Date(startDt.getTime() + (duration || 60) * 60 * 1000)

  const formatGCal = d => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    const s = String(d.getSeconds()).padStart(2, '0')
    return `${y}${m}${day}T${h}${min}${s}`
  }

  const title = `🏋️ ${routine.name} (Gymly)`
  const details = buildWorkoutDescription(routine, includeDetails, S)
  const dates = `${formatGCal(startDt)}/${formatGCal(endDt)}`

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates,
    details,
    location: location || 'Gym'
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Generates an "Add to Microsoft Outlook" web link for a workout session.
 */
export function buildOutlookCalendarUrl({
  routine,
  isoDate,
  time = '09:00',
  duration = 60,
  location = 'Gym',
  includeDetails = true,
  S = null
}) {
  const [hh, mm] = (time || '09:00').split(':').map(Number)
  const startDt = new Date(isoDate + `T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`)
  const endDt = new Date(startDt.getTime() + (duration || 60) * 60 * 1000)

  const title = `🏋️ ${routine.name} (Gymly)`
  const details = buildWorkoutDescription(routine, includeDetails, S)

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: title,
    startdt: startDt.toISOString(),
    enddt: endDt.toISOString(),
    body: details,
    location: location || 'Gym'
  })

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

/**
 * Converts a standard http(s) feed URL to webcal:// protocol for 1-click subscription.
 */
export function buildWebcalUrl(httpOrHttpsUrl) {
  if (!httpOrHttpsUrl) return ''
  return httpOrHttpsUrl.replace(/^https?:\/\//i, 'webcal://')
}
