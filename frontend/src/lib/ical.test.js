import { describe, it, expect } from 'vitest'
import {
  escapeIcsText,
  foldIcsLine,
  formatIcsDateTime,
  formatIcsDate,
  buildWorkoutDescription,
  getUpcomingScheduledWorkouts,
  generateIcsCalendar,
  generateSingleIcsEvent,
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  buildWebcalUrl
} from './ical.js'

describe('iCalendar generator (RFC 5545)', () => {
  it('escapes special characters correctly according to RFC 5545', () => {
    expect(escapeIcsText('Hello, World; test\\path\nNext line')).toBe('Hello\\, World\\; test\\\\path\\nNext line')
    expect(escapeIcsText(null)).toBe('')
    expect(escapeIcsText(undefined)).toBe('')
  })

  it('folds lines exceeding 75 octets with CRLF and space', () => {
    const shortLine = 'SUMMARY:Leg Day'
    expect(foldIcsLine(shortLine, 75)).toBe(shortLine)

    const longLine = 'DESCRIPTION:' + 'A'.repeat(120)
    const folded = foldIcsLine(longLine, 75)
    expect(folded).toContain('\r\n ')
    const parts = folded.split('\r\n ')
    expect(parts[0].length).toBeLessThanOrEqual(75)
    expect(parts[1].length).toBeLessThanOrEqual(74)
  })

  it('formats dates and datetimes in RFC 5545 format', () => {
    const d = new Date(2026, 8, 26, 9, 30, 0) // Sep 26, 2026 09:30:00
    expect(formatIcsDate(d)).toBe('20260926')
    expect(formatIcsDateTime(d, false)).toBe('20260926T093000')

    const utcStr = formatIcsDateTime(d, true)
    expect(utcStr.endsWith('Z')).toBe(true)
  })

  it('builds workout descriptions with exercise sets and targets', () => {
    const routine = {
      name: 'Push Routine',
      ex: [
        { id: '0025', sets: 4, target: { reps: '8-10' } },
        { id: '0043', sets: 3, target: { min: '15' } }
      ]
    }
    const S = { exNotes: { '0025': 'Elbows at 45 deg' } }
    const desc = buildWorkoutDescription(routine, true, S)
    expect(desc).toContain('Gymly Workout: Push Routine')
    expect(desc).toContain('Planned exercises (2):')
    expect(desc).toContain('4 sets × 8-10 reps')
    expect(desc).toContain('[Note: Elbows at 45 deg]')
    expect(desc).toContain('Scheduled with Gymly')
  })

  it('finds upcoming scheduled workouts honoring week schedule and date overrides', () => {
    const S = {
      routines: [
        { id: 'r1', name: 'Upper Body', emoji: 'arm', ex: [{ id: '0025' }] },
        { id: 'r2', name: 'Leg Day', emoji: 'legs', ex: [{ id: '0043' }] }
      ],
      week: {
        1: 'r1', // Monday
        3: 'r2', // Wednesday
        5: 'r1'  // Friday
      },
      dayPlan: {
        '2026-09-28': 'rest', // Monday overridden to rest
        '2026-09-29': 'r2'    // Tuesday overridden to Leg Day
      }
    }

    // 2026-09-28 is a Monday
    const upcoming = getUpcomingScheduledWorkouts(S, { days: 7, startDate: '2026-09-28' })
    // Monday (2026-09-28) is rest -> should not be included
    expect(upcoming.find(u => u.iso === '2026-09-28')).toBeUndefined()
    // Tuesday (2026-09-29) was overridden to r2 -> should be included
    const tue = upcoming.find(u => u.iso === '2026-09-29')
    expect(tue).toBeDefined()
    expect(tue.routine.name).toBe('Leg Day')
    expect(tue.isOverride).toBe(true)

    // Wednesday (2026-09-30) is regular r2
    const wed = upcoming.find(u => u.iso === '2026-09-30')
    expect(wed).toBeDefined()
    expect(wed.routine.name).toBe('Leg Day')
  })

  it('generates a full RFC 5545 iCalendar string with alarms', () => {
    const S = {
      routines: [
        { id: 'r1', name: 'Full Body', emoji: 'dumbbell', ex: [{ id: '0025', sets: 3 }] }
      ],
      week: {
        1: 'r1'
      },
      dayPlan: {}
    }

    const ics = generateIcsCalendar({
      S,
      options: {
        startDate: '2026-09-28',
        weeks: 2,
        time: '18:00',
        duration: 75,
        reminder: 30,
        location: 'Downtown Gym'
      }
    })

    expect(ics).toContain('BEGIN:VCALENDAR\r\n')
    expect(ics).toContain('VERSION:2.0\r\n')
    expect(ics).toContain('PRODID:-//Gymly//Workout Planner//EN\r\n')
    expect(ics).toContain('BEGIN:VEVENT\r\n')
    expect(ics).toContain('SUMMARY:🏋️ Full Body (Gymly)\r\n')
    expect(ics).toContain('LOCATION:Downtown Gym\r\n')
    expect(ics).toContain('STATUS:CONFIRMED\r\n')
    expect(ics).toContain('BEGIN:VALARM\r\n')
    expect(ics).toContain('TRIGGER:-PT30M\r\n')
    expect(ics).toContain('END:VALARM\r\n')
    expect(ics).toContain('END:VEVENT\r\n')
    expect(ics).toContain('END:VCALENDAR\r\n')
  })

  it('generates single workout event with correct times and uid', () => {
    const routine = { id: 'r10', name: 'Core Blitz', ex: [] }
    const ics = generateSingleIcsEvent({
      routine,
      isoDate: '2026-10-01',
      time: '08:00',
      duration: 45,
      reminder: 15,
      location: 'Home Gym'
    })

    expect(ics).toContain('DTSTART:20261001T080000')
    expect(ics).toContain('DTEND:20261001T084500')
    expect(ics).toContain('SUMMARY:🏋️ Core Blitz (Gymly)')
    expect(ics).toContain('TRIGGER:-PT15M')
  })

  it('builds Google Calendar URL with encoded parameters', () => {
    const routine = { name: 'Hypertrophy Upper', ex: [] }
    const url = buildGoogleCalendarUrl({
      routine,
      isoDate: '2026-10-05',
      time: '10:00',
      duration: 60,
      location: 'Gold’s Gym'
    })

    expect(url).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE')
    expect(url).toContain('Hypertrophy+Upper')
    expect(url).toContain('20261005T100000%2F20261005T110000')
  })

  it('builds Outlook Calendar deep link URL', () => {
    const routine = { name: 'Cardio Intervals', ex: [] }
    const url = buildOutlookCalendarUrl({
      routine,
      isoDate: '2026-10-05',
      time: '07:30',
      duration: 45
    })

    expect(url).toContain('outlook.live.com/calendar/0/deeplink/compose')
    expect(url).toContain('Cardio+Intervals')
  })

  it('transforms http/https URLs to webcal protocol', () => {
    expect(buildWebcalUrl('https://example.com/api/calendar.ics')).toBe('webcal://example.com/api/calendar.ics')
    expect(buildWebcalUrl('http://localhost:3000/api/calendar.ics')).toBe('webcal://localhost:3000/api/calendar.ics')
  })
})
