import { useState, useMemo } from 'react'
import { EXIDX, exOr } from '../lib/exercises.js'
import { fmtNum, fmtDate } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { setLabel, modeOf } from '../lib/history.js'
import { bestSetOf, e1rmSeries } from '../lib/onerm.js'
import ProgressionLineChart from './ProgressionLineChart.jsx'
import Icon from './Icon.jsx'
import { Button, Segmented, SelectRow } from './ui.jsx'

/**
 * ExerciseWeightProgressionCard
 * Displays the weight progression of an exercise over the last six months (180 days by default),
 * utilizing the ProgressionLineChart component with linear regression trendlines, PR highlights,
 * and key performance metrics.
 */
export default function ExerciseWeightProgressionCard({ S }) {
  // Default range is 180 days (last six months)
  const [range, setRange] = useState(180)
  const [selectedExId, setSelectedExId] = useState(null)
  const [metric, setMetric] = useState('top')

  const workouts = useMemo(() => {
    return (S.workouts || []).slice().sort((a, b) => {
      const ta = a.start || new Date(a.d).getTime()
      const tb = b.start || new Date(b.d).getTime()
      return ta - tb
    })
  }, [S.workouts])

  // All exercises with history in user workouts
  const exHist = useMemo(() => {
    const counts = {}
    workouts.forEach(w => {
      (w.entries || []).forEach(e => {
        if (EXIDX[e.id]) {
          counts[e.id] = (counts[e.id] || 0) + 1
        }
      })
    })
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a] || (EXIDX[a].n.localeCompare(EXIDX[b].n)))
  }, [workouts])

  // Default to the most trained exercise in the last 6 months or first in history
  const curEx = useMemo(() => {
    if (selectedExId && exHist.includes(selectedExId)) return selectedExId
    if (!exHist.length) return null

    // Look for most trained exercise in last 180 days
    const cutoff6M = Date.now() - 180 * 86400000
    const recentCounts = {}
    workouts.forEach(w => {
      const t = w.start || new Date(w.d).getTime()
      if (t >= cutoff6M) {
        (w.entries || []).forEach(e => {
          if (EXIDX[e.id]) {
            recentCounts[e.id] = (recentCounts[e.id] || 0) + 1
          }
        })
      }
    })
    const bestRecent = Object.keys(recentCounts).sort((a, b) => recentCounts[b] - recentCounts[a])[0]
    return bestRecent || exHist[0] || null
  }, [selectedExId, exHist, workouts])

  const exInfo = curEx ? exOr(curEx) : null

  // Determine mode (reps, time, cardio)
  const curMode = useMemo(() => {
    if (!curEx) return 'reps'
    for (let i = workouts.length - 1; i >= 0; i--) {
      const en = workouts[i].entries.find(e => e.id === curEx)
      if (en) return modeOf({ ...(en.target || {}), id: curEx })
    }
    return modeOf({ id: curEx })
  }, [curEx, workouts])

  const isCardio = curMode === 'cardio'
  const isTimed = curMode === 'time'
  const exUnit = isCardio ? 'km/h' : isTimed ? 's' : (S.unit || 'kg')

  // Check if estimated 1RM is available for this exercise
  const e1rmAvailable = useMemo(() => {
    if (!curEx || isCardio || isTimed) return false
    return e1rmSeries(S, curEx).length > 0
  }, [S, curEx, isCardio, isTimed])

  const activeMetric = metric === 'e1rm' && e1rmAvailable ? 'e1rm' : 'top'

  // Compute progression points and filter to the selected timeframe (6M default)
  const { allPoints, windowPoints, trendStats } = useMemo(() => {
    if (!curEx) return { allPoints: [], windowPoints: [], trendStats: null }

    const pts = []
    let runningBest = 0

    workouts.forEach(w => {
      const en = (w.entries || []).find(e => e.id === curEx)
      if (!en) return
      const doneSets = (en.sets || []).filter(s => s.done)
      if (!doneSets.length) return

      let val = 0
      let wVal = null
      let rVal = null

      if (activeMetric === 'e1rm') {
        const best = bestSetOf(en)
        if (best) {
          val = best.est
          wVal = best.w
          rVal = best.r
        }
      } else {
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
        const prevBest = runningBest
        const prDiff = isPR && prevBest > 0 ? Math.round((val - prevBest) * 10) / 10 : 0
        const isFirstPR = isPR && prevBest === 0
        if (isPR) runningBest = val

        pts.push({
          t: w.start || new Date(w.d).getTime(),
          y: val,
          d: w.d,
          w: wVal,
          r: rVal,
          isPR,
          isFirstPR,
          prDiff,
          sets: doneSets,
          target: en.target
        })
      }
    })

    const now = Date.now()
    const cutoff = range === 0 ? 0 : now - range * 86400000
    const inWindow = pts.filter(p => p.t >= cutoff)

    let stats = null
    if (inWindow.length >= 1) {
      const firstVal = inWindow[0].y
      const latestVal = inWindow[inWindow.length - 1].y
      const peakVal = Math.max(...inWindow.map(p => p.y))
      const delta = latestVal - firstVal
      const pct = firstVal > 0 ? (delta / firstVal) * 100 : 0
      const totalSets = inWindow.reduce((acc, p) => acc + (p.sets?.length || 0), 0)

      stats = {
        firstVal,
        latestVal,
        peakVal,
        delta,
        pct,
        totalSessions: inWindow.length,
        totalSets
      }
    }

    return { allPoints: pts, windowPoints: inWindow, trendStats: stats }
  }, [curEx, workouts, activeMetric, isCardio, isTimed, range])

  const rangeOptions = [
    { value: 180, label: t('6 Months') },
    { value: 90, label: '3M' },
    { value: 365, label: '1Y' },
    { value: 0, label: t('All') }
  ]

  const metricOptions = [
    { value: 'top', label: isCardio ? t('Top speed') : isTimed ? t('Longest hold') : t('Top set weight') }
  ]
  if (e1rmAvailable) {
    metricOptions.push({ value: 'e1rm', label: t('Estimated 1RM') })
  }

  if (!exHist.length) {
    return (
      <div className="card">
        <h2>{t('Exercise weight progression')}</h2>
        <div className="muted small">
          {t('Finish your first workout to see progress curves here.')}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      {/* Header & Subtitle */}
      <div className="row between" style={{ marginBottom: 8, alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0 }}>
            {t('Exercise weight progression')}{' '}
            <span
              className="dim"
              style={{
                textTransform: 'none',
                letterSpacing: 0,
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              · {range === 180 ? t('last 6 months') : range === 90 ? t('last 3 months') : range === 365 ? t('last 12 months') : t('all time')}
            </span>
          </h2>
          <div className="small dim" style={{ marginTop: 2 }}>
            {activeMetric === 'e1rm'
              ? t('Estimated 1RM trendline shows submaximal strength progression with personal record milestones.')
              : t('Heaviest working set weight progression over time.')}
          </div>
        </div>

        {trendStats && trendStats.totalSessions >= 2 && (
          <div
            className={`trend-badge ${
              trendStats.delta > 0
                ? ''
                : trendStats.delta < 0
                ? 'negative'
                : 'neutral'
            }`}
          >
            <Icon
              name={
                trendStats.delta > 0
                  ? 'arrowUp'
                  : trendStats.delta < 0
                  ? 'arrowDown'
                  : 'dot'
              }
            />
            <span>
              {trendStats.delta > 0 ? '+' : ''}
              {fmtNum(trendStats.delta)} {exUnit} ({trendStats.pct > 0 ? '+' : ''}
              {trendStats.pct.toFixed(1)}%)
            </span>
          </div>
        )}
      </div>

      {/* Exercise Picker */}
      <div className="sect-b" style={{ marginBottom: 10 }}>
        <SelectRow
          title={t('Exercise')}
          sheetTitle={t('Exercise progress')}
          value={curEx}
          onChange={setSelectedExId}
          options={exHist.map(id => ({
            value: id,
            label: exOr(id).n
          }))}
        />
      </div>

      {/* Timeframe Range Selector (Defaults to 6 Months / 180d) */}
      <Segmented
        className="seg-range"
        value={range}
        onChange={setRange}
        options={rangeOptions}
      />

      {/* Metric Selector if 1RM available */}
      {metricOptions.length > 1 && (
        <Segmented
          className="seg-range"
          value={activeMetric}
          onChange={setMetric}
          options={metricOptions}
        />
      )}

      {/* KPI Stats Grid */}
      {trendStats && (
        <div className="perf-grid">
          <div className="perf-stat">
            <div className="l">{t('Period Best')}</div>
            <div className="v accent">
              {fmtNum(trendStats.peakVal)} {exUnit}
            </div>
          </div>
          <div className="perf-stat">
            <div className="l">{t('Starting')}</div>
            <div className="v">
              {fmtNum(trendStats.firstVal)} {exUnit}
            </div>
          </div>
          <div className="perf-stat">
            <div className="l">{t('Latest')}</div>
            <div className="v">
              {fmtNum(trendStats.latestVal)} {exUnit}
            </div>
          </div>
          <div className="perf-stat">
            <div className="l">{t('Sessions')}</div>
            <div className="v">{trendStats.totalSessions}</div>
          </div>
        </div>
      )}

      {/* Main Progression Line Chart with Trendline & PR Highlights */}
      <div className="chart" style={{ marginTop: 8 }}>
        {windowPoints.length > 0 ? (
          <ProgressionLineChart
            points={windowPoints}
            h={175}
            unit={exUnit}
            color={activeMetric === 'e1rm' ? 'var(--acc)' : 'var(--blue, #0ea5e9)'}
            showTrend={true}
          />
        ) : (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              background: 'var(--surface-2)',
              borderRadius: 'var(--r-md)',
              margin: '8px 0'
            }}
          >
            <div className="muted small" style={{ marginBottom: 8 }}>
              {range === 180
                ? t('No workouts for this exercise in the last 6 months.')
                : t('No workouts for this exercise in this timeframe.')}
            </div>
            {allPoints.length > 0 && range !== 0 && (
              <Button size="sm" variant="tinted" onClick={() => setRange(0)}>
                {t('View all time')} ({allPoints.length} {t('sessions')})
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Recent Sessions Breakdown */}
      {windowPoints.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="small dim" style={{ marginBottom: 6, fontWeight: 600 }}>
            {t('Recent Sessions for {0}', exInfo?.n || '')}
          </div>
          {windowPoints
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
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: p.isFirstPR ? 'var(--yellow)' : 'var(--green)',
                        color: '#000'
                      }}
                    >
                      ★ PR {p.prDiff > 0 ? `+${fmtNum(p.prDiff)}` : ''}
                    </span>
                  )}
                </div>
                <span>
                  {p.sets && p.sets.length > 0
                    ? p.sets.map(s => setLabel(curEx, s, p.target)).join('  ')
                    : `${fmtNum(p.y)} ${exUnit}`}
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Explanatory Footer Footnote */}
      <div className="small dim" style={{ marginTop: 10 }}>
        {activeMetric === 'e1rm'
          ? t('Estimated 1RM calculated via Epley formula. Trendline shows linear regression strength trajectory.')
          : t('Heaviest set lifted per session. Dashed line illustrates overall strength trend across the period.')}
      </div>
    </div>
  )
}
