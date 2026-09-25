<div align="center">

# Gymly

**A self-hosted gym and body-weight tracker you control.**

Plan your week, run guided workouts, track every set and your body weight over time —
on your phone and across your devices, with passkey sign-in and data stored on your server.

<br>

[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-a3e635?style=flat-square)](LICENSE)
![Self-hosted](https://img.shields.io/badge/self--hosted-%F0%9F%8F%A0-60a5fa?style=flat-square)
![PWA](https://img.shields.io/badge/PWA-installable-a78bfa?style=flat-square)
![React](https://img.shields.io/badge/React-19-38bdf8?style=flat-square&logo=react&logoColor=white)
![No tracking](https://img.shields.io/badge/telemetry-none-f472b6?style=flat-square)
<br>
![GitHub last commit](https://img.shields.io/github/last-commit/davidbugayov/gym?style=flat-square)
[![Production deploy](https://github.com/davidbugayov/gym/actions/workflows/deploy-gym-online.yml/badge.svg?branch=main)](https://github.com/davidbugayov/gym/actions/workflows/deploy-gym-online.yml)
[![GitHub stars](https://img.shields.io/github/stars/davidbugayov/gym?style=flat-square)](https://github.com/davidbugayov/gym/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/davidbugayov/gym?style=flat-square)](https://github.com/davidbugayov/gym/issues)

</div>

<br>

> ### 🤖 A customized openGym fork
>
> Based on [DuarteSantos8/openGym](https://github.com/DuarteSantos8/openGym), this repository is
> maintained separately. It includes an optional AI Coach, workout-specific warm-ups and
> cooldowns, and additional workout and tracking improvements.
>
> **[AI Coach guide](docs/AI_COACH.md)** · [Claude setup](Claude-setup-instructions.md) ·
> [ChatGPT / Codex setup](ChatGPT-setup-instructions.md)

<div align="center">

### [🌐 Open Gymly](https://gym.emdrbilateral.online)

</div>

## Why

Gymly stores workout plans and history on the server you control. It supports passkey sign-in,
offline use, and sync between your devices.

## Features

- ⚖️ **Body-weight tracking** — interactive chart with a goal line you set, gains/losses colored by whether they move toward it
- 🏋️ **Weekly plan** — a routine per weekday, over a library of **1,334 exercises** (searchable, with animated demos)
- 🗓️ **Reschedule any day** — sick, missed a session, or fewer gym days this week? Move a workout to another day without touching your weekly plan
- ▶️ **Guided workouts** — it knows what day it is and starts today's session without a weigh-in prompt; uses your latest saved body weight when available, pre-fills your weights from last time, and includes a rest timer, PR detection and per-exercise weight tracking
- ☀️ **The screen stays awake while you train** — no unlocking the phone and finding your place again between every set. On for as long as a workout is running, released the moment you finish it, and switchable off in Settings
- 🔗 **Supersets** — build them, and log them back-to-back with a rest only after the pair
- ⏱️ **Timed exercises** — planks, hangs, wall sits and loaded carries are logged by time, not reps, with a work timer that counts the set itself (separate from the rest timer) and logs the time you actually held. The workout summary reports total timed seconds; timed exercises can carry weight too
- 🔥 **Workout-specific warm-up and cooldown** — the default movements adapt to the muscles in the selected routine. Choose a preset or custom list, adjust each duration, or skip either phase
- 📈 **Progression that follows a rule** — pick one per routine, override it per exercise: linear, **Greyskull LP** (AMRAP top set, double jumps, 10 % resets), double progression through a rep range, or adding time. Your weights are already right when the session opens, and every target says *why* it's that number. Missed reps never advance the load, stalls trigger a deload, and bodyweight exercises progress in reps instead
- 💪 **Estimated 1RM** — per exercise, from your best eligible set (it names which one), with its own progress curve and a calculator for sets you haven't done. Won't guess above 12 reps
- 🎯 **Effort per set, in your scale** — an optional third column rating how hard a set was, as **RIR** (reps left in the tank) or **RPE** (the same judgement on a 10-point scale). Off by default; each set keeps the scale it was logged with, and nothing else reads the value — your progression and 1RM are unaffected
- 🏃 **Cardio** — log time + speed, not just weight × reps
- 📤 **Share a plan** — send someone your routines and week schedule as a small file (no workouts, no weigh-ins), or print it as a clean PDF. Importing merges, so their plan is never overwritten
- 🔧 **Filter by equipment** — narrow the library to what you actually own; the options adapt to what you've picked, so every combination on screen has results behind it
- ✨ **Your own exercises** — a name and a body part is enough; they behave like built-in ones everywhere, with an optional description instead of an animation
- 🟩 **Activity heatmap** — a GitHub-style year view, shaded by time spent training
- 💪 **Muscle map** — a front-and-back body diagram shaded by how much work each muscle got, over a week, a month or all time. It names the muscles you *haven't* trained in that period, previews what a routine hits while you build it, and shows what you just trained when you finish. Male or female figure, your pick
- 🔔 **Push notifications** — rest-timer alerts even with the app closed, plus an optional reminder on days you have a workout planned but haven't logged one. Opt in per profile; keys are generated on first run, nothing to configure
- 🤖 **AI Coach** (optional) — an AI that *designs* your plan and adjusts it from what you actually log. A short intake produces a complete weekly plan you can refine in plain language; on demand or on a schedule it reads your stalls, effort ratings, adherence and body-weight trend and proposes **discrete, explained changes** you accept one by one. Choose the official Claude Agent SDK or the bundled OpenAI Codex CLI with ChatGPT device-code sign-in; it is off until the instance owner enables it, needs each profile's separate consent, and never changes anything without your approval — every change-set is snapshotted and revertible. The progression engine still owns your session-to-session weights. **[Full guide →](docs/AI_COACH.md)**
- 🔑 **Passkeys, not passwords** — Face ID / Touch ID / fingerprint login; each profile keeps its own data, synced across devices
- 🛠️ **Admin dashboard** (optional) — for whoever runs the instance: who's training right now, per-user history, disable accounts, and invite-only signup. Off by default, so a fresh instance stays open with no admin
- 🎨 **Designed, not assembled** — light/dark themes and 8 accent colors saved to your profile, over a hand-drawn icon set instead of emoji, so it looks the same on every phone
- 🌍 **12 interface languages** — exercise instructions are localized in 10 of them and loaded on demand
- 📥 **Bring your history with you** — import from **FitNotes** (Android and iOS), **Strong** and **Hevy**, or body weight straight out of an **Apple Health** export. Exercise names are matched against the library and anything unrecognised becomes one of your own exercises, so nothing in the file is dropped
- 📦 **Yours to keep** — one-tap JSON export/import, guest mode, **no telemetry**
- 📱 **Standalone mobile app** — build the Android app from this repository; it works without an account or server and keeps data on the phone. See **[docs/MOBILE.md](docs/MOBILE.md)**

## Run locally

You need Node.js 22 or newer.

```bash
git clone https://github.com/davidbugayov/gym.git
cd gym
npm install
PORT=3000 RP_ID=localhost ORIGIN=http://localhost:3000 npm run dev
```

Open **http://localhost:3000**. For a production build, run `npm run build` and then start with
`NODE_ENV=production npm start`. The server creates `./data` on first start. For phone access
with passkeys, put it behind HTTPS and set `RP_ID` to the hostname and `ORIGIN` to the full URL.

## Mobile app (no server at all)

The same codebase also builds a **standalone mobile app** (Capacitor): no account, no sync,
no backend — everything stays on the phone, with native workout-day reminders and share-sheet
backups. Self-hosting gets you multi-device sync and profiles for friends & family; the
mobile app is the install-and-done flavor.

- **Android:** build and sideload the APK using **[docs/MOBILE.md](docs/MOBILE.md)**.
- **iPhone:** Apple doesn't allow installing apps outside the App Store, so there is no iOS
  download. Self-host and add the PWA to your home screen from Safari, or build the native app
  onto your own device from Xcode — see **[docs/MOBILE.md](docs/MOBILE.md)**.

## How it works

The Node.js server serves the React app, handles the API, and proxies exercise media. User
profiles and workout state are stored as JSON files; no separate database service is needed.

## Your data

Lives in `./data` on your host: `db.json` (profiles + public passkeys), `state-<user>.json`
(each user's plan, workouts, body weight, settings), and `secret` (the session-cookie key).
**Back up `./data` and you've backed up everything.** Passkey private keys never touch the
server — they stay in your phone's secure hardware / your password manager.

## Configuration

Set these as environment variables for the Node.js process:

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | HTTP port | `3000` |
| `DATA_DIR` | Directory for profiles, workouts, and secrets | `./data` |
| `RP_ID` | Hostname used for passkeys | `localhost` |
| `ORIGIN` | Exact URL used to open the app | `http://localhost:8080` |
| `RP_NAME` | Name shown in the passkey prompt | `Gymly` |
| `ADMIN_UIDS` | Comma-separated user IDs with admin access | *(none)* |
| `INVITE_ONLY` | Require invite codes for new profiles | `off` |
| `COACH_DISABLED` | Force the AI Coach off | `off` |

Push notification keys are generated on first run and saved to `./data/vapid.json` — nothing to set.

The **AI Coach** uses provider tools installed with the Node.js dependencies. An admin can add
a Claude setup token or complete Codex's ChatGPT device-code sign-in in the dashboard. See the
[AI Coach guide](docs/AI_COACH.md), [Claude setup](Claude-setup-instructions.md), and
[ChatGPT/Codex setup](ChatGPT-setup-instructions.md).

## Tech

React 19 + Vite · Node.js + Express · WebAuthn · JSON-file storage · exercise data from
[hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset).

Training logic is kept in reusable modules under `frontend/src/lib/`. Run frontend tests with
`npm test --workspace=frontend` and API tests with `npm test --workspace=api`.

## Contributing

Issues and PRs for this repository are welcome — see **[CONTRIBUTING.md](CONTRIBUTING.md)** or
[open a GitHub issue](https://github.com/davidbugayov/gym/issues).

## License

[GNU AGPL v3.0](LICENSE). Exercise images and GIFs are provided by the upstream dataset and have
separate terms; see [NOTICE.md](NOTICE.md).

## Production

[gym.emdrbilateral.online](https://gym.emdrbilateral.online) deploys on pushes to `main` ([workflow status](https://github.com/davidbugayov/gym/actions/workflows/deploy-gym-online.yml)).
The `.ru` hostname redirects to `.online`.
