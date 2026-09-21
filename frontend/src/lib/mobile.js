// Mobile build (Capacitor native shell) - stubbed for Web runtime.
import { t } from './i18n.js'

export const MOBILE = false

export async function nativeLoad() {
  return null
}

export async function nativeSave(state) {
  // localStorage handles web persistence
}

export async function syncReminder(S, interactive = false) {
  return true
}

export async function shareExport(json, filename) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

