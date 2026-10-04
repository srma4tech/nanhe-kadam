# Phase 1 reconnaissance

## Environment

Node.js: `v24.18.0`. The built-in runner works: `node --test` exited 0 (0 tests discovered before Phase 1).

## Storage and cryptography

The app shell will use IndexedDB with one database and stores for settings, schedule, progress, history, journal, recordings, and vault. The wrapper will expose promise-based CRUD/list operations, report `navigator.storage.estimate()` when available, request persistent storage only after parent authentication, and translate quota errors to a typed error. Browser storage remains origin-scoped and quota/eviction policies vary; `storage.persist()` is a request, not a guarantee. Android Chrome can evict best-effort site data under storage pressure, so persistent-storage grant and actual device behavior need on-device verification.

PIN derivation uses Web Crypto `crypto.subtle` PBKDF2 with SHA-256, random 16-byte salt, and at least 210,000 iterations. This requires a secure context (HTTPS; localhost is treated as secure). PIN material is never persisted. Comparisons are constant-time over equal-length derived hashes.

## Files planned before implementation

**Create:** `scripts/generate-icons.mjs`; `assets/icon-192.png`, `assets/icon-512.png`, `assets/icon-maskable-512.png`; `src/core/storage.js`, `src/core/clock.js`, `src/core/state.js`; `src/parent/pin.js`; `src/session/engine.js`, `src/session/lock.js`, `src/session/schedule.js`; `src/ui/app.js`, `src/ui/styles.css`; `tests/clock.test.js`, `tests/lock.test.js`, `tests/schedule.test.js`, `tests/pin.test.js`, `tests/session.test.js`; `docs/recon-phase1.md`; `docs/verification/phase-1.md`.

**Change:** `index.html`, `manifest.webmanifest`, `sw.js`, `CREDITS.md`, `README.md`, `CHANGELOG.md`, and the existing README placeholders in `src/core/`, `src/session/`, `src/parent/`, and `src/ui/`.

No content, speech, activities, recordings, journal, revision, dashboard analytics, or Gemini feature is in scope.
