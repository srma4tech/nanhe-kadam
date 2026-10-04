# Changelog

## Phase 0 — Recon and repository setup

- Added the initial static PWA placeholder, manifest, and service worker placeholder.
- Added the source and content folder scaffold, validator stub, and project documentation.
- Recorded Phase 0 decisions, reconnaissance, and verification records.

## Phase 1 — Offline PWA shell and session foundation

- Added original local install icons, a cache-first service worker shell, and install metadata.
- Added IndexedDB storage, storage estimates, a tamper-aware clock, and event-based state.
- Added a PBKDF2 parent PIN with persistent throttling, parent session timeout, PIN reset, and local companion setup.
- Added configurable weekly scheduling, placeholder full/light sessions, resumable state, and daily locks.
- Added dependency-free logic tests and Phase 1 verification notes.
## Phase 1 follow-up — Secure-origin guidance

- Added an environment capability check before service-worker registration and first-launch PIN setup.
- Added a parent-facing secure-origin blocking screen with localhost, Android USB reverse, and HTTPS hosting guidance.
- Replaced raw caught exception text in the UI with friendly messages and console-only details; missing Web Crypto now raises `EnvironmentError`.
- Added environment and typed PIN environment-error tests; updated localhost/device testing instructions.

## Phase 2 — On-device speech

- Added phrase splitting, local voice preference, cancel-before-play sequencing, and speech completion handling.
- Added parent-only device voice inventory and preview controls with local language, speed, and pitch settings.
- Added mocked speech tests and a human device voice checklist; actual Android/tablet inventories remain unverified.

## Phase 3 — Bilingual curriculum

- Added the day-plan schema and 28 local Hindi/English plans with original story summaries, missions, and paper prompts.
- Replaced the content-validator placeholder with schema, bilingual-field, unique-ID, license, and local-asset checks plus invalid fixtures.
- Added a bilingual human safety/read-through and adult recording checklist; human review remains pending.

## Phase 4 — Activities and characters

- Registered bilingual matching, counting, sound/listening, and before/after activities in the session module system.
- Added gentle hints after two misses and positive completion language without scores or failure states.
- Added four original local SVG companion illustrations and reduced-motion-aware character motion.
- Added unit coverage for retry hints and completed activity state.

## Phase 5 — Spaced review and family rhythm

- Added four mastery levels with 1/3/7/21-day spacing, weak-topic priority, theme preference, and a familiar easy review.
- Limited the planner to six short prompts and a five-minute cap, persisted completed activity mastery locally, and added a parent weekly aggregate.
- Kept Saturday as a light weekly recap and added a monthly Gaon Mela adventure card that does not enable Sunday games.
- Added deterministic interval, cap, summary, and calendar tests; family pacing still needs a pilot.

## Phase 6 — Family media

- Added parent-only local voice recording with Opus-first MIME selection, anonymized speaker tags, one-minute cutoff, and stopped-track cleanup.
- Added optional mission photos resized to a 1280px maximum edge before local storage.
- Added on-device playback, photo preview, individual deletion, and local storage usage information; no media is sent remotely.
- Added mocked recorder, MIME, microphone availability, and image downscale tests; real device checks remain pending.

## Phase 7 — Parent dashboard and data tools

- Added storage category counts, local usage estimate, privacy/credits details, and a media cleanup entry point.
- Added JSON backup export/restore validation; backups omit parent PIN/hash records, encrypted vault, recordings, and photos.
- Restore validates the full file before applying a non-destructive merge that leaves records absent from the backup untouched.
- Added tests for secret/media exclusion, malformed backup rejection, and no-write-on-invalid restore.
