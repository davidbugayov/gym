import { fmtNum } from '../lib/format.js'
import { t } from '../lib/i18n.js'

const SOURCE_LABEL = {
  session: 'Today',
  plan: 'Plan',
  saved: 'Saved',
  history: 'Last time',
  starter: 'Starting guide'
}

export default function WeightGuide({ guide, ex, compact = false }) {
  if (!guide) return null
  const scope = guide.scope === 'each'
    ? ex.eq === 'kettlebell' ? t('per kettlebell') : t('per dumbbell')
    : ['barbell', 'ez barbell', 'olympic barbell'].includes(ex.eq) ? t('including bar') : null
  return <div className={`weight-guide${compact ? ' compact' : ''}`}>
    <div className="weight-guide-main">
      <span className="weight-guide-label">{t('Weight guide')}</span>
      <strong>{fmtNum(guide.weight)} {guide.unit}</strong>
      {scope && <span className="weight-guide-scope">{scope}</span>}
    </div>
    <div className="weight-guide-source">
      {t(SOURCE_LABEL[guide.source])}
      {guide.source === 'starter' && !compact && <> · {t('Start light and adjust for clean reps.')}</>}
    </div>
  </div>
}
