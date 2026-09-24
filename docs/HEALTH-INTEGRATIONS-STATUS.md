# Health integrations and Google OAuth status

Last updated: 24 September 2026

## Implemented and published

- Google Sign-In / Google Fit integration and Android Health Connect integration are in the application code.
- The Google Fitness API is enabled in Cloud project `gymly-9bfda`.
- Firebase Google authentication is enabled. Firebase Authorized Domains include `gym.emdrbilateral.online` and `gym.emdrbilateral.ru`.
- Google OAuth Branding has the app name `Gym Online`, the public homepage `https://gym.emdrbilateral.online/about.html`, and the policy links `https://gym.emdrbilateral.online/privacy` and `https://gym.emdrbilateral.online/terms`.
- OAuth Authorized Domains include `emdrbilateral.online` and `emdrbilateral.ru`.
- Public app information, privacy, and terms pages are available on both sites:
  - `https://gym.emdrbilateral.online/about.html`, `/privacy`, `/terms`
  - `https://gym.emdrbilateral.ru/about.html`, `/privacy`, `/terms`
- The `.online` GitHub Actions deployment and `.ru` manual VPS deployment completed. The URLs returned HTTP 200 when checked.

## Still required

1. Search Console ownership for both Domain properties, `emdrbilateral.online` and `emdrbilateral.ru`, is verified via DNS TXT records. Do not remove those records; Google requires them to maintain verification. Never commit verification tokens or registrar credentials.
2. Branding reverification was submitted in Google Auth Platform on 24 September 2026 after the public homepage and policy URLs were saved and both root domains were verified. Google currently reports “Verification in progress”; check the Branding verification status for the outcome.
3. Submit Google Fitness data-access verification. Google requires an accurate demonstration video showing the sensitive Fitness scopes in use. No demo-video URL has been submitted.
4. For release Android builds, register the production signing certificate SHA-1 with Google OAuth. The Android OAuth client currently has the debug SHA-1. Confirm Apple Developer HealthKit capability and provisioning for the iOS release separately.

## Relevant commits

- `7727ad2` — Google Fit and Health Connect integration.
- `3e02d2f` — privacy and terms pages.
- `dd614c1` — short `/privacy` and `/terms` routes.
- `f4b83b7` — retry the `.online` HTTP readiness check after service restart.
- `1b166ae` — public OAuth homepage.
