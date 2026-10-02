export function skipWorkoutPhase(active, phase) {
  const entries = active.entries.filter(entry => entry.phase === phase)
  if (!entries.length) return -1
  for (const entry of entries) for (const set of entry.sets) if (!set.done) set.skipped = true
  const next = phase === 'warmup' ? active.entries.findIndex(entry => entry.phase !== 'warmup') : active.entries.length
  if (next >= 0 && next < active.entries.length) active.cur = next
  return next
}
