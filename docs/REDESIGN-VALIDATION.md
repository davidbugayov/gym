# Training interface rollout — 2 October 2026

The training cockpit palette and controls now apply globally: warm neutral surfaces, lime action accent, flat cards, readable secondary labels and rectangular controls. Eight accent choices and both themes are preserved. Settings, the routine editor, Coach and administration inherit the shared system. Plan creation is the primary Plan action; History opens as a timeline with optional trends; Stats puts exercise progression ahead of optional body measurements. Exercise search and schedule rows have accessible controls.

## Observed validation

- Local demo only: start Leg Day, skip warm-up, enter 97.5 kg × 8, log the set, skip rest, finish early, open History. Result: one set, eight reps, 780 kg; skipped warm-up was not credited.
- Second local session: start a 45-second timed exercise, finish it early at 34 seconds, skip remaining warm-up and finish. Journal and recap show 34 seconds and one completed set; completed work survives skipping the phase.
- Dark theme at 390 px: Home, Plan, Stats, History, Library, Settings, Coach and intake render without an error boundary or page-width overflow. Proposal redirects to Coach because no proposal is available.
- Light theme at 320 px: Home, Plan, Stats, History, Library, Settings and Coach render without page-width overflow. At 1440 px the same checks passed for Plan, Stats, History, Library, Settings and intake. Routine editor was opened through Plan; exercise search was exercised with “squat”. Admin and authenticated Login were not exercised in the guest demo.
- Computed token contrast: primary button text 6.22–15.58:1 across all eight accents and two themes. Secondary labels on the darkest control surface: 5.42:1 dark, 5.59:1 light. These are token checks, not a certification of every chart or inline colour.
- Frontend tests and production build passed. The build still reports a large main bundle; route splitting is a separate performance improvement.

## Removed and corrected

Unused Apple XML/sync helpers, unused Firebase Analytics initialization, duplicate Health entry points, old recap/trophy/pace styles, redundant scoped palettes and unused imports were removed. Skipping a phase no longer marks its sets completed. History's undefined exercise-name reference was fixed and covered by a render regression test. Rest progression no longer starts a 45-second timed set for cardio.

Health sync limitations and test evidence are tracked in [HEALTH-INTEGRATIONS-STATUS.md](HEALTH-INTEGRATIONS-STATUS.md). Receipts prevent ordinary retries from resending successful records within a profile; uncertain network delivery, backup restores and independent-device requests still require server-side reconciliation for an exactly-once guarantee.

## Evaluation after deployment

Compare a baseline and the redesign on start-to-first-set time, completed/planned work sets, early finishes, accidental set corrections and next-session return. Segment timed, strength and cardio sessions; do not treat skipped preparation as completed work. Track Health write failures, retries and imported duplicates separately from workout completion. No usage improvement is claimed from local verification; no new analytics collection was introduced.
