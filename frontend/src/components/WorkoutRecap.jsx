import { fmtNum, fmtDur, fmtVol, fmtDate } from '../lib/format.js'
import { fmtSec } from '../lib/history.js'
import { recapMetrics, previousComparableWorkout } from '../lib/workout-recap.js'
import { t } from '../lib/i18n.js'

export default function WorkoutRecap({ workout, history, unit, plannedSets }) {
  const metrics = recapMetrics(workout)
  const previous = previousComparableWorkout(workout, history)
  const baseline = previous && recapMetrics(previous)
  const partial = plannedSets != null && metrics.sets < plannedSets
  const values = [
    [t('Duration'), fmtDur(Math.max(0, workout.end - workout.start))],
    [t('Sets logged'), plannedSets != null ? `${metrics.sets} / ${plannedSets}` : fmtNum(metrics.sets)],
    ...(metrics.volume > 0 ? [[t('Volume'), fmtVol(metrics.volume, unit)]] : []),
    ...(metrics.reps > 0 ? [[t('Reps'), fmtNum(metrics.reps)]] : []),
    ...(metrics.seconds > 0 ? [[t('Timed work'), fmtSec(metrics.seconds)]] : []),
    ...(metrics.cardioMinutes > 0 ? [[t('Cardio'), t('{0} min', fmtNum(metrics.cardioMinutes))]] : [])
  ]
  const difference = baseline ? metrics.volume - baseline.volume : 0
  return <section className="workout-recap">
    <div className="recap-eyebrow">{t('Workout saved')}</div>
    <h3>{workout.name || t('Workout')}</h3>
    <p className="recap-status">{t(partial ? 'Session ended early. Your logged sets are saved.' : metrics.sets ? 'Your logged work is saved.' : 'Session saved without logged sets.')}</p>
    <dl className="recap-metrics">
      {values.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    {metrics.sets > 0 && <div className="recap-comparison">
      <h4>{t('Compared with last time')}</h4>
      {baseline ? <>
        <p>{t('Same exercises · {0}', fmtDate(previous.d))}</p>
        <div>{t('Sets')}: {baseline.sets} → {metrics.sets}</div>
        {(metrics.volume > 0 || baseline.volume > 0) && <div>{t('Volume')}: {difference > 0 ? '+' : ''}{fmtVol(difference, unit)}</div>}
        {(metrics.reps > 0 || baseline.reps > 0) && <div>{t('Reps')}: {fmtNum(baseline.reps)} → {fmtNum(metrics.reps)}</div>}
        {(metrics.seconds > 0 || baseline.seconds > 0) && <div>{t('Timed work')}: {fmtSec(baseline.seconds)} → {fmtSec(metrics.seconds)}</div>}
        {(metrics.cardioMinutes > 0 || baseline.cardioMinutes > 0) && <div>{t('Cardio')}: {fmtNum(baseline.cardioMinutes)} → {fmtNum(metrics.cardioMinutes)} {t('min')}</div>}
        <p>{t('These are logged totals; changes in sets or load affect the comparison.')}</p>
      </> : <p>{t('No previous session with the same exercises yet. This is your starting point.')}</p>}
    </div>}
  </section>
}
