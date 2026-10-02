# Health integrations and Google OAuth status

Last updated: 2 October 2026

## Canonical deployment

- `https://gym.emdrbilateral.online` is the only application host and is deployed by GitHub Actions.
- `https://gym.emdrbilateral.ru` permanently redirects to `.online`; its old app service and database are retired.
- OAuth privacy policy and terms use `.online` URLs only. Google OAuth Branding still lists `.ru`; Google blocks its removal because it claims the web client references that domain, though the visible client origins and callback contain no `.ru` URI.
- Firebase Auth settings currently show that this Google account needs project-owner permission to manage domains, so `.ru` remains there pending an owner-level change.

## Implemented and verified in source/tests (2 October)

- Web writes completed exercise sessions and body weight to the Google Health v4 API; optional import reads exercise summaries. OAuth includes activity read/write and health-metrics write scopes. A basic Google login does not mark Health connected or replace an existing app profile during Health consent.
- Automatic and manual sync share a serialized queue. Connection, automatic sync and per-data-type switches are respected. Successful records retain receipts; partial failures retain their retry candidates. Previously imported sessions are not exported again, and returned resource names exclude our own exports from imports.
- Native Health Connect writes active calories, distance and body weight through the installed Capgo plugin. It does **not** write native exercise-session records. Permissions are checked for each operation, weight in pounds is converted to kilograms, and successful calorie/distance parts are retained separately for retries.
- A disconnected integration cannot start manual sync. Errors remain visible. Expired OAuth stops subsequent writes. An unfinished remote operation is retained and reported as unfinished rather than resubmitted or presented as success; automatic resolution is not implemented.
- Workout intervals require real start/end times. Unmeasured active duration is omitted. Calorie estimates are not given a fabricated one-hour duration or minimum 40 kcal.
- Automated tests cover consent, partial failures, concurrent sync, checkpoint migration, pounds, pagination and failed operations. These tests use mocked services; they are not evidence of a live Google write.
- No live Google Health account or Android device was connected in the local browser validation. Live delivery and Google project approval remain unverified for this change.

The Google Cloud/Firebase status below was recorded on 24 September and was not rechecked in this implementation task.

## Remaining Google approval

- The Google Health write scopes are restricted and currently unverified. Google Auth Platform currently shows publishing status `In production` and 1 of 100 unverified-scope users used; continue testing only with an allowlisted developer account until verification is complete.
- Run a live integration test with an allowlisted test account, then record the OAuth prompt and successful sample write for the verification demo. Do not use fabricated/mock success as evidence.
- Submit the updated data-access verification with the demo video. Google warns against exposing unverified restricted scopes to production users.
- Remove `emdrbilateral.ru` from Firebase Authentication's authorized domains using a project-owner account. Remove it from Google OAuth Branding after resolving Google's client-reference warning; keep `.online` plus Firebase's own domain. The `.ru` hostname itself must remain in DNS/TLS to serve its redirect.
- Search Console DNS TXT verification records are independent of the app redirect. Keep them unless domain ownership verification is intentionally retired.

## Relevant history

- `7727ad2` — initial Google Fit and Health Connect integration.
- `3e02d2f` — privacy and terms pages.
- `1b166ae` — public OAuth homepage.
- `c19b314` — Google Health API migration.

## Contract references inspected on 2 October

- [Google Health workout payloads](https://developers.google.com/health/data-types/workouts): exercise intervals, optional active duration and summary fields.
- [Create data point](https://developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints/create) and [operation status](https://developers.google.com/health/reference/rest/Shared.Types/Operation): creates return operations; HTTP success alone does not prove the operation succeeded.
- [Capgo Health plugin](https://capgo.app/docs/plugins/health/) and the installed `definitions.d.ts`: native availability, per-type authorization, samples and kilogram weight units.
