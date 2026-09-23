import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { EXIDX, exOr } from '../lib/exercises.js'
import { bestSetOf, e1rmSeries, best1RM } from '../lib/onerm.js'
import {
  modeOf,
  workoutVolume,
  setsDone,
  setLabel,
  streakWeeks
} from '../lib/history.js'
import {
  fmtNum,
  fmtDate,
  fmtVol,
  todayISO,
  isoOf,
  weekKey,
  MONTHS,
  MONTHS_LONG
} from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { WorkoutRow, workoutDetailSheet } from '../sheets.jsx'
import VolumeBarChart from '../components/VolumeBarChart.jsx'
import ProgressionLineChart from '../components/ProgressionLineChart.jsx'
import Icon from '../components/Icon.jsx'
import { Button, Segmented, SelectRow, SearchField } from '../components/ui.jsx'
import { getExerciseTrend } from '../lib/trends.js'
import { ExerciseTrendBadge } from '../components/ExerciseTrend.jsx'

export default function History() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const workouts = S.workouts || []

  // Volume & Frequency state
  const [volRange, setVolRange] = useState(12) // 8, 12, 26, 52, 0 (weeks)
  const [volGranularity, setVolGranularity] = useState('auto') // 'auto' | 'week' | 'month'
  const [selectedPeriod, setSelectedPeriod] = useState(null)

  // Exercise progression state
  const [exId, setExId] = useState(null)
  const [exMetric, setExMetric] = useState('e1rm') // 'e1rm' | 'top' | 'vol'

  // Workout log filter
  const [search, setSearch] = useState('')

  // 1. Overall Performance Totals
  const totalWorkouts = workouts.length
  const allTimeVol = useMemo(
    () => workouts.reduce((sum, w) => sum + (w.vol || workoutVolume(w) || 0), 0),
    [workouts]
  )
  const streak = streakWeeks(S)

  // Average weekly frequency
  const avgWeeklyFreq = useMemo(() => {
    if (workouts.length < 2) return workouts.length
    const first = new Date(workouts[0].d || workouts[0].start)
    const now = new Date()
    const weeks = Math.max(1, (now.getTime() - first.getTime()) / (7 * 86400000))
    return (workouts.length / weeks).toFixed(1)
  }, [workouts])

  // 2. Volume & Frequency over Time Buckets
  const periodData = useMemo(() => {
    if (!workouts.length) return []

    const effectiveGranularity =
      volGranularity === 'auto'
        ? volRange === 52 || volRange === 0
          ? 'month'
          : 'week'
        : volGranularity

    if (effectiveGranularity === 'month') {
      // Monthly buckets
      const monthsBack = volRange === 0 ? 36 : volRange === 52 ? 12 : Math.max(3, Math.round(volRange / 4.3))
      const buckets = []
      const curDate = new Date()
      curDate.setDate(1) // 1st of current month

      for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(curDate.getFullYear(), curDate.getMonth() - i, 1)
        const yr = d.getFullYear()
        const mo = d.getMonth()
        const key = `${yr}-${String(mo + 1).padStart(2, '0')}`
        const label = t(MONTHS[mo])
        const subLabel = `${t(MONTHS_LONG[mo])} ${yr}`

        const ws = workouts.filter(w => {
          const wd = new Date(w.d || w.start)
          return wd.getFullYear() === yr && wd.getMonth() === mo
        })

        const vol = ws.reduce((sum, w) => sum + (w.vol || workoutVolume(w) || 0), 0)
        const count = ws.length
        const sets = ws.reduce((sum, w) => sum + setsDone(w), 0)
        const isCurrent = yr === curDate.getFullYear() && mo === curDate.getMonth()

        buckets.push({
          key,
          label,
          subLabel,
          vol,
          count,
          sets,
          workouts: ws,
          isCurrent
        })
      }
      return buckets
    } else {
      // Weekly buckets
      const numWeeks = volRange === 0 ? 52 : volRange
      const buckets = []
      const today = new Date()
      today.setHours(12, 0, 0, 0)
      // Find current week's Monday
      const dayOfWeek = (today.getDay() + 6) % 7 // Monday = 0
      const currentMonday = new Date(today)
      currentMonday.setDate(today.getDate() - dayOfWeek)

      for (let i = numWeeks - 1; i >= 0; i--) {
        const mon = new Date(currentMonday)
        mon.setDate(currentMonday.getDate() - i * 7)
        const sun = new Date(mon)
        sun.setDate(mon.getDate() + 6)

        const wkKey = weekKey(isoOf(mon))
        const label = `${mon.getDate()} ${t(MONTHS[mon.getMonth()])}`
        const subLabel = `${fmtDate(isoOf(mon))} – ${fmtDate(isoOf(sun))}`

        const ws = workouts.filter(w => {
          const wd = isoOf(new Date(w.d || w.start))
          return wd >= isoOf(mon) && wd <= isoOf(sun)
        })

        const vol = ws.reduce((sum, w) => sum + (w.vol || workoutVolume(w) || 0), 0)
        const count = ws.length
        const sets = ws.reduce((sum, w) => sum + setsDone(w), 0)
        const isCurrent = i === 0

        buckets.push({
          key: wkKey,
          label,
          subLabel,
          vol,
          count,
          sets,
          workouts: ws,
          isCurrent
        })
      }
      return buckets
    }
  }, [workouts, volRange, volGranularity])

  // Window statistics for the active volume range
  const windowStats = useMemo(() => {
    if (!periodData.length) return { totalVol: 0, totalWorkouts: 0, avgWeeklyVol: 0, peakVol: 0 }
    const totalVol = periodData.reduce((s, b) => s + b.vol, 0)
    const totalCount = periodData.reduce((s, b) => s + b.count, 0)
    const peakVol = Math.max(...periodData.map(b => b.vol), 0)
    const avgWeeklyVol = Math.round(totalVol / periodData.length)
    return {
      totalVol,
      totalWorkouts: totalCount,
      avgWeeklyVol,
      peakVol
    }
  }, [periodData])

  // 3. Exercise Progression Data
  const exHist = useMemo(() => {
    const ids = [...new Set(workouts.flatMap(w => w.entries.map(e => e.id)))].filter(id => EXIDX[id])
    return ids.sort((a, b) => EXIDX[a].n.localeCompare(EXIDX[b].n))
  }, [workouts])

  const curEx = exId && exHist.includes(exId) ? exId : exHist[0] || null

  const curExMode = useMemo(() => {
    if (!curEx) return 'reps'
    for (let i = workouts.length - 1; i >= 0; i--) {
      const en = workouts[i].entries.find(e => e.id === curEx)
      if (en) return modeOf({ ...(en.target || {}), id: curEx })
    }
    return modeOf({ id: curEx })
  }, [curEx, workouts])

  const isCardio = curExMode === 'cardio'
  const isTimed = curExMode === 'time'
  const exUnit = isCardio ? 'km/h' : isTimed ? 's' : S.unit

  // Estimated 1RM series
  const e1Pts = useMemo(() => (curEx ? e1rmSeries(S, curEx) : []), [S, curEx])
  const e1Best = useMemo(() => (curEx ? best1RM(S, curEx) : null), [S, curEx])
  const canE1RM = e1Pts.length > 0 && !isCardio && !isTimed

  // Exercise Progression Points
  const progressionPoints = useMemo(() => {
    if (!curEx) return []
    const pts = []
    let runningBest = 0

    workouts.forEach(w => {
      const en = w.entries.find(e => e.id === curEx)
      if (!en) return
      const doneSets = en.sets.filter(s => s.done)
      if (!doneSets.length) return

      let val = 0
      let wVal = null
      let rVal = null

      if (exMetric === 'e1rm' && canE1RM) {
        const best = bestSetOf(en)
        if (best) {
          val = best.est
          wVal = best.w
          rVal = best.r
        }
      } else if (exMetric === 'vol') {
        val = doneSets.reduce((sum, s) => sum + (s.w || 0) * (s.r || 0), 0)
      } else {
        // 'top' set / speed / hold
        if (isCardio) {
          val = Math.max(0, ...doneSets.map(s => s.speed || 0))
        } else if (isTimed) {
          val = Math.max(0, ...doneSets.map(s => s.sec || 0))
        } else {
          val = Math.max(0, ...doneSets.map(s => s.w || 0), en.topW || 0)
          const topSet = doneSets.find(s => s.w === val)
          if (topSet) {
            wVal = topSet.w
            rVal = topSet.r
          }
        }
      }

      if (val > 0) {
        const isPR = val > runningBest
        if (isPR) runningBest = val
        pts.push({
          t: w.start || new Date(w.d).getTime(),
          y: val,
          d: w.d,
          w: wVal,
          r: rVal,
          isPR,
          sets: doneSets,
          target: en.target,
          workout: w,
          entry: en
        })
      }
    })

    return pts
  }, [curEx, exMetric, canE1RM, workouts, isCardio, isTimed])

  // Progression Trend Metric Calculations
  const progressionTrend = useMemo(() => {
    if (!progressionPoints.length) return null
    const firstVal = progressionPoints[0].y
    const latestVal = progressionPoints[progressionPoints.length - 1].y
    const peakVal = Math.max(...progressionPoints.map(p => p.y))
    const delta = latestVal - firstVal
    const pct = firstVal > 0 ? (delta / firstVal) * 100 : 0
    const totalSets = progressionPoints.reduce((acc, p) => acc + (p.sets?.length || 0), 0)

    return {
      firstVal,
      latestVal,
      peakVal,
      delta,
      pct,
      totalSets
    }
  }, [progressionPoints])

  // Available progression metric options
  const exMetricOptions = useMemo(() => {
    const opts = []
    if (canE1RM) opts.push({ value: 'e1rm', label: t('Est. 1RM') })
    opts.push({ value: 'top', label: isCardio ? t('Top Speed') : isTimed ? t('Longest Hold') : t('Top Set') })
    if (!isCardio && !isTimed) opts.push({ value: 'vol', label: t('Volume') })
    return opts
  }, [canE1RM, isCardio, isTimed])

  // 4. Workout Sessions List filtering
  const filteredWorkouts = useMemo(() => {
    let list = workouts

    // Period filter from BarChart selection
    if (selectedPeriod && selectedPeriod.workouts) {
      const selectedIds = new Set(selectedPeriod.workouts.map(w => w.id))
      list = list.filter(w => selectedIds.has(w.id))
    }

    // Text search query
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(w => {
        if (w.name && w.name.toLowerCase().includes(q)) return true
        if (w.d && w.d.includes(q)) return true
        return w.entries.some(e => {
          const ex = EXIDX[e.id]
          return ex && ex.n.toLowerCase().includes(q)
        })
      })
    }

    return list
  }, [workouts, selectedPeriod, search])

  return (
    <>
      {/* View Header */}
      <div className="hdr">
        <button className="iconbtn" onClick={() => nav('/stats')} aria-label={t('Stats')}>
          <Icon name="chevronLeft" />
        </button>
        <div style={{ flex: 1, marginLeft: 12 }}>
          <h1>{t('History')}</h1>
          <div className="sub">
            {t('{0} workouts', totalWorkouts)} · {fmtVol(allTimeVol, S.unit)} {t('lifted')}
          </div>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="tiles">
        <div className="tile">
          <div className="l">
            <Icon name="dumbbell" />
            {t('Workouts')}
          </div>
          <div className="v">{totalWorkouts}</div>
        </div>
        <div className="tile">
          <div className="l">
            <Icon name="chart" />
            {t('Total Volume')}
          </div>
          <div className="v">{allTimeVol >= 1000 ? Math.round(allTimeVol / 1000) + 'k' : fmtNum(allTimeVol)} <span className="small">{S.unit}</span></div>
        </div>
        <div className="tile">
          <div className="l">
            <Icon name="calendar" />
            {t('Avg Frequency')}
          </div>
          <div className="v">{avgWeeklyFreq} <span className="small">/ wk</span></div>
        </div>
        <div className="tile">
          <div className="l">
            <Icon name="flame" />
            {t('Week streak')}
          </div>
          <div className="v">{streak}</div>
        </div>
      </div>

      {totalWorkouts === 0 ? (
        <div className="empty">
          <div className="ico"><Icon name="history" /></div>
          <h3>{t('No workouts yet')}</h3>
          <p className="muted" style={{ maxWidth: 280, margin: '8px auto 16px' }}>
            {t('Complete your first workout to start tracking frequency, volume, and exercise progression.')}
          </p>
          <Button variant="primary" icon="play" onClick={() => nav('/workout')}>
            {t('Start a Workout')}
          </Button>
        </div>
      ) : (
        <>
          {/* Card 1: Workout Frequency & Volume Over Time */}
          <div className="card">
            <div className="row between" style={{ marginBottom: 6 }}>
              <div>
                <h2 style={{ margin: 0 }}>
                  {t('Volume & Frequency')}
                </h2>
                <div className="small dim">
                  {t('Workload and session frequency over time')}
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <Segmented
                  className="seg-range"
                  value={volGranularity}
                  onChange={setVolGranularity}
                  options={[
                    { value: 'auto', label: t('Auto') },
                    { value: 'week', label: t('Wk') },
                    { value: 'month', label: t('Mo') }
                  ]}
                />
              </div>
            </div>

            {/* Time Window Selector */}
            <Segmented
              className="seg-range"
              value={volRange}
              onChange={v => {
                setVolRange(v)
                setSelectedPeriod(null)
              }}
              options={[
                { value: 8, label: '8W' },
                { value: 12, label: '12W' },
                { value: 26, label: '6M' },
                { value: 52, label: '1Y' },
                { value: 0, label: t('All') }
              ]}
            />

            {/* Range Performance Highlights */}
            <div className="perf-grid">
              <div className="perf-stat">
                <div className="l">{t('Range Volume')}</div>
                <div className="v">{fmtVol(windowStats.totalVol, S.unit)}</div>
              </div>
              <div className="perf-stat">
                <div className="l">{t('Sessions')}</div>
                <div className="v">{t('{0} workouts', windowStats.totalWorkouts)}</div>
              </div>
              <div className="perf-stat">
                <div className="l">{t('Avg / Period')}</div>
                <div className="v">{fmtVol(windowStats.avgWeeklyVol, S.unit)}</div>
              </div>
              <div className="perf-stat">
                <div className="l">{t('Peak Period')}</div>
                <div className="v">{fmtVol(windowStats.peakVol, S.unit)}</div>
              </div>
            </div>

            {/* Selected Period Filter Banner */}
            {selectedPeriod && (
              <div
                className="row between"
                style={{
                  padding: '8px 12px',
                  background: 'color-mix(in srgb, var(--acc) 14%, var(--surface-2))',
                  borderRadius: 8,
                  marginBottom: 10
                }}
              >
                <div className="small">
                  <b>{selectedPeriod.subLabel || selectedPeriod.label}:</b>{' '}
                  <span className="accent">{fmtVol(selectedPeriod.vol, S.unit)}</span> ·{' '}
                  {t('{0} workouts', selectedPeriod.count)}
                </div>
                <Button size="sm" variant="ghost" icon="xmark" onClick={() => setSelectedPeriod(null)}>
                  {t('Clear')}
                </Button>
              </div>
            )}

            {/* Volume Bar Chart */}
            <div className="chart" style={{ marginTop: 6 }}>
              <VolumeBarChart
                data={periodData}
                h={175}
                unit={S.unit}
                onSelect={p => setSelectedPeriod(selectedPeriod?.key === p.key ? null : p)}
                selectedKey={selectedPeriod?.key}
              />
            </div>
          </div>

          {/* Card 2: Exercise Progression & Performance Trends */}
          <div className="card">
            <div className="row between" style={{ marginBottom: 6 }}>
              <div>
                <h2 style={{ margin: 0 }}>{t('Exercise Progression')}</h2>
                <div className="small dim">
                  {t('Strength progression and performance trends')}
                </div>
              </div>
              {progressionTrend && (
                <div
                  className={`trend-badge ${
                    progressionTrend.delta > 0
                      ? ''
                      : progressionTrend.delta < 0
                      ? 'negative'
                      : 'neutral'
                  }`}
                >
                  <Icon
                    name={
                      progressionTrend.delta > 0
                        ? 'arrowUp'
                        : progressionTrend.delta < 0
                        ? 'arrowDown'
                        : 'dot'
                    }
                  />
                  <span>
                    {progressionTrend.delta > 0 ? '+' : ''}
                    {fmtNum(progressionTrend.delta)} {exUnit} ({progressionTrend.pct > 0 ? '+' : ''}
                    {progressionTrend.pct.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>

            {exHist.length > 0 ? (
              <>
                {/* Exercise Picker */}
                <div className="sect-b" style={{ marginBottom: 10 }}>
                  <SelectRow
                    title={t('Exercise')}
                    sheetTitle={t('Select Exercise')}
                    value={curEx}
                    onChange={setExId}
                    options={exHist.map(id => ({
                      value: id,
                      label: exOr(id).n
                    }))}
                  />
                </div>

                {/* Metric Selector (Est 1RM, Top Set, Volume) */}
                {exMetricOptions.length > 1 && (
                  <Segmented
                    className="seg-range"
                    value={exMetric}
                    onChange={setExMetric}
                    options={exMetricOptions}
                  />
                )}

                {/* Progression Statistics Grid */}
                {progressionTrend && (
                  <div className="perf-grid">
                    <div className="perf-stat">
                      <div className="l">{t('All-Time Best')}</div>
                      <div className="v accent">
                        {fmtNum(progressionTrend.peakVal)} {exUnit}
                      </div>
                    </div>
                    <div className="perf-stat">
                      <div className="l">{t('Latest')}</div>
                      <div className="v">
                        {fmtNum(progressionTrend.latestVal)} {exUnit}
                      </div>
                    </div>
                    <div className="perf-stat">
                      <div className="l">{t('Starting')}</div>
                      <div className="v">
                        {fmtNum(progressionTrend.firstVal)} {exUnit}
                      </div>
                    </div>
                    <div className="perf-stat">
                      <div className="l">{t('Total Sets')}</div>
                      <div className="v">{progressionTrend.totalSets}</div>
                    </div>
                  </div>
                )}

                {/* Progression Line Chart with Trendline & PR Highlights */}
                <div className="chart" style={{ marginTop: 8 }}>
                  <ProgressionLineChart
                    points={progressionPoints}
                    h={165}
                    unit={exMetric === 'vol' ? S.unit : exUnit}
                    color={exMetric === 'e1rm' ? 'var(--acc)' : exMetric === 'top' ? 'var(--sky, #0a84ff)' : 'var(--orange, #ff9f0a)'}
                    showTrend={true}
                  />
                </div>

                {/* Recent Exercise Sessions */}
                <div style={{ marginTop: 12 }}>
                  <div className="small dim" style={{ marginBottom: 6, fontWeight: 600 }}>
                    {t('Recent Sessions for {0}', exOr(curEx).n)}
                  </div>
                  {progressionPoints
                    .slice(-5)
                    .reverse()
                    .map((p, idx) => (
                      <div
                        key={idx}
                        className="row between small"
                        style={{
                          padding: '7px 0',
                          borderBottom: 'var(--hair) solid var(--sep)'
                        }}
                      >
                        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                          <span className="muted">{fmtDate(p.d, true)}</span>
                          {p.isPR && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: 4,
                                background: 'var(--yellow)',
                                color: '#000'
                              }}
                            >
                              ★ PR
                            </span>
                          )}
                          <ExerciseTrendBadge
                            trend={getExerciseTrend(p.workout, p.entry, workouts, S.unit)}
                            exName={curExercise?.n || curEx}
                          />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 600 }}>
                            {p.sets.map(s => setLabel(curEx, s, p.target)).join('  ')}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="small dim" style={{ marginTop: 10 }}>
                  {exMetric === 'e1rm'
                    ? t('Estimated 1RM trendline shows submaximal strength progression with personal record milestones.')
                    : exMetric === 'top'
                    ? t('Heaviest working set weight progression over time.')
                    : t('Total training volume for this exercise per session.')}
                </div>
              </>
            ) : (
              <div className="muted small">
                {t('No exercise logs recorded yet.')}
              </div>
            )}
          </div>

          {/* Card 3: Workout Log & Session Details */}
          <div className="row between" style={{ marginTop: 24, marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>
              {t('Workout Log')} <span className="dim">({filteredWorkouts.length})</span>
            </h3>
            {selectedPeriod && (
              <Button size="sm" variant="ghost" onClick={() => setSelectedPeriod(null)}>
                {t('Show All')}
              </Button>
            )}
          </div>

          {/* Search Field */}
          <div style={{ marginBottom: 12 }}>
            <SearchField
              placeholder={t('Search by routine or exercise...')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </div>

          {/* Workouts List */}
          {filteredWorkouts.length > 0 ? (
            <div className="list">
              {[...filteredWorkouts]
                .reverse()
                .map(w => (
                  <WorkoutRow
                    key={w.id}
                    w={w}
                    onClick={() => workoutDetailSheet(w)}
                  />
                ))}
            </div>
          ) : (
            <div className="empty small" style={{ padding: '24px 0' }}>
              <Icon name="magnifier" />
              <div style={{ marginTop: 8 }}>{t('No workouts match your search.')}</div>
              {search && (
                <Button
                  size="sm"
                  variant="ghost"
                  style={{ marginTop: 8 }}
                  onClick={() => setSearch('')}
                >
                  {t('Clear search')}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}
