import { useSyncStatus } from '../lib/syncStatus.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

/**
 * HeaderSync — Subtle floating indicator in the top header bar.
 * Provides non-intrusive feedback when auto-saving or syncing in the background.
 */
export default function HeaderSync({ className = '', style }) {
  const status = useSyncStatus(s => s.status)
  const label = useSyncStatus(s => s.label)

  const isIdle = status === 'idle'
  const isSpinning = status === 'saving' || status === 'syncing'
  const isSuccess = status === 'saved' || status === 'synced'
  const isError = status === 'error'

  const displayIcon = isSuccess ? 'check' : isError ? 'xmark' : 'sync'

  return (
    <div
      id="header-sync-indicator"
      className={`header-sync-pill ${status} ${className}`}
      role="status"
      aria-live="polite"
      aria-hidden={isIdle}
      style={style}
    >
      <span className={`sync-icon ${isSpinning ? 'sync-spin' : ''} ${isSuccess ? 'sync-success' : ''}`}>
        <Icon name={displayIcon} size={12} />
      </span>
      <span className="sync-lbl">
        {label ? t(label) : (isSpinning ? t('Syncing…') : t('Synced'))}
      </span>
    </div>
  )
}

/**
 * HeaderSyncInline — Inline variant to fit right into custom header rows (e.g. workout header).
 */
export function HeaderSyncInline({ className = '', style }) {
  const status = useSyncStatus(s => s.status)
  const label = useSyncStatus(s => s.label)

  if (status === 'idle') return null

  const isSpinning = status === 'saving' || status === 'syncing'
  const isSuccess = status === 'saved' || status === 'synced'
  const isError = status === 'error'
  const displayIcon = isSuccess ? 'check' : isError ? 'xmark' : 'sync'

  return (
    <span
      className={`sync-inline-badge ${status} ${className}`}
      title={label ? t(label) : ''}
      aria-label={label ? t(label) : ''}
      style={style}
    >
      <span className={`sync-icon ${isSpinning ? 'sync-spin' : ''} ${isSuccess ? 'sync-success' : ''}`}>
        <Icon name={displayIcon} size={11} />
      </span>
      <span className="sync-lbl-mini">
        {label ? t(label) : (isSpinning ? t('Auto-saving…') : t('Auto-saved'))}
      </span>
    </span>
  )
}
