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

1. Verify ownership of the Search Console Domain properties `emdrbilateral.online` and `emdrbilateral.ru` from a Google account that is an Owner or Editor of the Cloud project. Root TXT verification records for both domains were added to REG.RU on 24 September 2026, and REG.RU confirms the zone changes were applied. As of the last check, the authoritative and public DNS resolvers did not return either TXT record, so Search Console could not yet verify `.online`; allow DNS propagation and retry both domains. Never commit verification tokens or registrar credentials.
2. After both domains are verified, request branding reverification in Google Auth Platform. The saved homepage and policy links now point to the public `about.html`, `/privacy`, and `/terms` pages, but the previous branding report still shows findings from the old homepage URL and must be rerun after domain ownership is confirmed.
3. Submit Google Fitness data-access verification. Google requires an accurate demonstration video showing the sensitive Fitness scopes in use. No demo-video URL has been submitted.
4. For release Android builds, register the production signing certificate SHA-1 with Google OAuth. The Android OAuth client currently has the debug SHA-1. Confirm Apple Developer HealthKit capability and provisioning for the iOS release separately.

## Relevant commits

- `7727ad2` — Google Fit and Health Connect integration.
- `3e02d2f` — privacy and terms pages.
- `dd614c1` — short `/privacy` and `/terms` routes.
- `f4b83b7` — retry the `.online` HTTP readiness check after service restart.
- `1b166ae` — public OAuth homepage.
