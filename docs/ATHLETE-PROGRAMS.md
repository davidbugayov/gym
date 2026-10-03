# Athlete.ru cycle integration — 3 October 2026

Source reviewed: [Циклы (Excel), first post](http://forum.athlete.ru/t7249/). HTTPS refused connections; the original HTTP site was accessible. Public XLS attachments were downloaded into a temporary research directory and opened with xlrd. Spreadsheet macros were not executed.

## Executable catalogue

| Programme | Workbook / worksheet | Sessions | Calculation |
| --- | --- | ---: | --- |
| Russian cycle | 2.xls / Русский цикл | 27, over 9 weeks | Source formula percentages, nearest 2.5 kg |
| Butenko, four weeks | 4.xls / 4 недели | 10 | Source percentage columns, round down to 2.5 kg |
| Butenko, sixteen weeks | 4.xls / 16 недель | 34 | Includes the source's additional 17th-week exit; round down to 2.5 kg |
| Butenko peak | 5.xls / Лист1 | 10, over 4 weeks | Repetitions × sets notation, nearest 2.5 kg |

Source download URLs, SHA-256 hashes and reviewed date are recorded in `frontend/src/catalog/athlete-cycles.json`. `scripts/extract-athlete-cycles.py` reproduces the catalogue from these downloaded workbooks (requires xlrd and olefile). Russian-cycle formula coefficients were read from BIFF formula records; calculated sample weights were checked against workbook cached results. The two Butenko formats use different set/repetition ordering; both are preserved.

The previous static Russian/Muravyov/Butenko presets were not faithful weekly cycles and were removed from the catalogue. Existing user routines are retained. The twelve-week Muravyov sheets contain deficit-deadlift and maximum-repetition prescriptions; these have not been turned into an executable preset. Other attachments are research material, not falsely labelled supported programmes.

## Behaviour

- External programme links and plan-file import are available in Settings; Plan retains built-in programmes, creation and export.
- A cycle is one routine with sequential sessions, not dozens of routine cards. Its detail page shows the current session and full cycle.
- Working weights use explicitly supplied current 1RM values. No personal maximum is inferred. Pound-mode loadability uses 5 lb increments as an application adaptation.
- Source percentages and mixed set loads override historical PR defaults. Session effort ratings do not modify a fixed percentage cycle.
- All prescribed repetitions must be logged before advancing. Missing, skipped, shortened or removed prescribed sets hold the current step. Optional app warm-up/cooldown do not determine advancement.
- Cycle scheduling is optional. If selected, the user chooses a Monday; dates and variable weekdays come from the workbook. Weekly assignments are replaced, while routines, historical workouts and unrelated dated overrides remain.
- Completed cycles stop. Shared plan files recreate the verified full cycle from its maximums at session one; they do not export workout history.
- Unsupported links return an error rather than claiming an arbitrary webpage was read. Inline JSON preserves explicit weight/mode and is validated.

## Verification

Pure-function tests cover source example weights, rounding, separate bench blocks, history-independent seeding, partial/duplicate completion, cycle end, real Monday dates, schedule preservation, JSON validation and full-cycle plan sharing.

Local demo browser: entered squat 165 / bench 105 / deadlift 180 kg 1RM; preview produced 132.5 kg squat and 85 kg bench. Imported without altering the existing weekly schedule. Logged all 12 working sets; the routine advanced once to session two, deadlift 6×2 at 145 kg. No personal account or real Health export was used.

Appearance browser checks: all eight accents in both light and dark themes changed the computed root colour and visible selected state; gold survived reload. Lime is explicitly labelled Default. Invalid or legacy stored values normalize to a visible choice, and stale inline tokens are removed. Native packages have not been rebuilt or installed on a physical device during this change.

Final local validation: 414 frontend tests passed; production build passed. Settings choices and catalogue inputs were checked at 320 px width with no viewport overflow.
