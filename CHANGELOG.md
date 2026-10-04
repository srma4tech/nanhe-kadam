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
