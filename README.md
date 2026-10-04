# Nanhe Kadam

Nanhe Kadam is a bilingual Hindi and English learning companion for young children. Phases 1–4 provide an installable offline PWA shell, local storage, parent PIN controls, schedule planning, on-device speech, a four-week bilingual curriculum, and gentle interactive session activities.

## Privacy promise

The child-facing shell works offline after its first successful load. There are no accounts, analytics, tracking, third-party scripts or SDKs, remote fonts, CDN links, or external links. Do not add personal or family information, photos, credentials, API keys, or secrets to this public repository. Use neutral names throughout. Companion settings are stored only on the device.

## Folder map

- `src/core/` — IndexedDB, tamper-aware clock, and event-based app state
- `src/session/` — weekly schedule, session state machine, and daily lock
- `src/parent/` — PIN setup, verification, throttling, reset, and parent controls
- `src/speech/` — phrase-based on-device speech and voice selection helpers
- `src/ui/` — child and parent screens and local styles
- `src/activities/` — bilingual activity modules and child-safe retry interactions
- `content/` — day-plan schema and four-week bilingual curriculum
- `assets/` — generated local PWA icons
- `scripts/` — local icon generation and content validation scripts
- `tests/` — Node built-in tests for pure session, schedule, clock, and PIN logic
- `docs/` — decisions, reconnaissance, and verification records

Validate curriculum structure and language coverage with `node scripts/validate-content.mjs`.

## Run locally

Serve this folder from a local static HTTP server. Service workers and Web Crypto require a secure context; localhost is treated as secure. No build step or installed package is required. For a basic static server already available on your machine, run it from this directory and open its local address.

## Testing

Run the dependency-free unit tests from the repository root:

```sh
node --test
```

Use a secure origin when checking the PWA shell, PIN, or offline behavior:

- On the computer running the static server, open `http://localhost` and include the port printed by the server if needed.
- For an Android device connected over USB, run `adb reverse tcp:3000 tcp:3000` on the computer, then open `http://localhost:3000` on the phone. Replace `3000` if the development server uses another port.
- For a deployed copy, open its HTTPS GitHub Pages address.

Real-device checks should use HTTPS or localhost so Web Crypto and service workers are available.

## Regenerate icons

```sh
node scripts/generate-icons.mjs
```

The script uses only Node built-ins and writes the three original PNG icons in `assets/`.

## Deploying

GitHub Pages cannot be configured from this workspace. To configure it manually:

1. Push this repository to GitHub and ensure the intended default branch is `main`.
2. Open the repository's **Settings** tab.
3. In **Pages**, choose **Deploy from a branch** as the source.
4. Choose `main` and the repository root (`/`) as the folder, then save.
5. Confirm the Pages deployment completes in the repository's Actions/Pages status.

Keep the repository public without personal or family information, as required by the project privacy rule.
