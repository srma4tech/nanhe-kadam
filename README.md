# Nanhe Kadam

Nanhe Kadam is a bilingual Hindi and English learning companion for young children. Phases 1–7 provide an installable offline PWA shell, local data and parent controls, on-device speech, a four-week bilingual curriculum, gentle activities, spaced review, optional parent-managed local media, and validated local backups.

## Privacy promise

The child-facing shell works offline after its first successful load. There are no accounts, analytics, tracking, third-party scripts or SDKs, remote fonts, CDN links, or external links. Do not add personal or family information, photos, credentials, API keys, or secrets to this public repository. Use neutral names throughout. Companion settings are stored only on the device.

## Folder map

- `src/core/` — IndexedDB, tamper-aware clock, and event-based app state
- `src/session/` — weekly schedule, session state machine, and daily lock
- `src/revision/` — spaced review planner and local progress summaries
- `src/parent/` — PIN setup, verification, throttling, reset, dashboard, and backup validation
- `src/family/` — parent-managed local audio recording and resized mission photos
- `src/ai/` — optional fixed-scope Gemini pack generation and safety validation
- `src/speech/` — phrase-based on-device speech and voice selection helpers
- `src/ui/` — child and parent screens and local styles
- `src/activities/` — bilingual activity modules and child-safe retry interactions
- `content/` — day-plan schema and four-week bilingual curriculum
- `assets/` — generated local PWA icons
- `scripts/` — local icon generation and content validation scripts
- `tests/` — Node built-in tests for pure session, schedule, clock, and PIN logic
- `docs/` — decisions, reconnaissance, and verification records

Parent backups are local JSON downloads. They omit PIN hashes, the encrypted vault, family recordings, and photos. Restore validates the file first and merges its records without removing records that are absent from the backup.

Smart Packs are optional, parent-triggered online requests. The parent supplies and stores their own encrypted-at-rest key; the browser must decrypt it to make a request, so browser-side storage cannot protect it from someone with access to that browser profile. Google recommends keeping production keys server-side. No backend is included in this static PWA.

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
