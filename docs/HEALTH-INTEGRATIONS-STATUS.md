# Health integrations and Google OAuth status

Last updated: 24 September 2026

## Canonical deployment

- `https://gym.emdrbilateral.online` is the only application host and is deployed by GitHub Actions.
- `https://gym.emdrbilateral.ru` permanently redirects to `.online`; its old app service and database are retired.
- OAuth privacy policy and terms use `.online` URLs only. Google OAuth Branding still lists `.ru`; Google blocks its removal because it claims the web client references that domain, though the visible client origins and callback contain no `.ru` URI.
- Firebase Auth settings currently show that this Google account needs project-owner permission to manage domains, so `.ru` remains there pending an owner-level change.

## Implemented

- Web Google Health API writes completed exercise sessions and user-entered body-weight records. It requests write-only scopes and does not read Google Health history.
- Google Health API is enabled in Cloud project `gymly-9bfda`.
- OAuth Data Access now lists `googlehealth.activity_and_fitness.writeonly` and `googlehealth.health_metrics_and_measurements.writeonly`; the legacy Google Fit scopes were removed.
- Google Sign-In remains available. Android Health Connect and Apple Health are separate device integrations.
- Public app information, privacy, and terms pages are published at `https://gym.emdrbilateral.online/about.html`, `/privacy`, and `/terms`.

## Remaining Google approval

- The Google Health write scopes are restricted and currently unverified. Add developer/test accounts in Audience while the app is in Testing; public production access requires Google verification.
- Submit the updated data-access verification with a demo video showing the scopes being requested and used. Google warns against exposing unverified restricted scopes to production users.
- Remove `emdrbilateral.ru` from Firebase Authentication's authorized domains using a project-owner account. Remove it from Google OAuth Branding after resolving Google's client-reference warning; keep `.online` plus Firebase's own domain. The `.ru` hostname itself must remain in DNS/TLS to serve its redirect.
- Search Console DNS TXT verification records are independent of the app redirect. Keep them unless domain ownership verification is intentionally retired.

## Relevant history

- `7727ad2` — initial Google Fit and Health Connect integration.
- `3e02d2f` — privacy and terms pages.
- `1b166ae` — public OAuth homepage.
- `c19b314` — Google Health API migration.
