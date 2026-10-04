# Phase 1 verification

Date: 2026-10-04

- [ ] Installs to the home screen on an Android phone and tablet. Device and Chrome versions could not be recorded; no Android device/browser was available.
- [ ] After one online load, the app opens and completes a placeholder session in airplane mode. The local HTTP server served all shell files successfully (HTTP 200), but browser/offline execution was unavailable.
- [ ] Dev time skip completes all six full-session steps; Friday/Saturday use the short flow; Sunday shows only the adventure card. Pure schedule/session logic is covered by unit tests; UI flow was not browser-tested.
- [ ] Lock persistence through force-close/restart and device-clock rollback. Clock rollback logic is unit-tested; IndexedDB restart behavior was not exercised in a browser.
- [ ] Five wrong PIN attempts trigger increasing delays and persist after restart. Throttle/backoff policy is unit-tested; PIN/IndexedDB integration was not exercised in a browser.
- [ ] PIN is not stored in plaintext; IndexedDB contains only salt, iterations, and hash for the PIN record. Source inspection confirms PBKDF2 storage shape and no PIN persistence; direct IndexedDB inspection was unavailable.
- [ ] Forced quota error shows a parent-only message without crashing. Typed quota errors and a parent-only UI notice are implemented; forced quota simulation was unavailable.
- [ ] Updated service worker waits, does not interrupt an active session, and can be applied by the parent. Source inspection confirms no install-time `skipWaiting()` and a parent message path; service-worker lifecycle was not browser-tested.
- [x] Child home contains no settings/menu/link navigation. Source inspection confirms the child home presents the start/adventure/lock content and parent hold control only.
- [x] Node built-in tests pass: `node --test tests/*.test.js` — 17 tests passed. `node --test tests/` was attempted and fails on this Windows Node v24.18.0 installation because the directory argument is resolved as a module path. `node --test` also discovers and passes all tests.
- [ ] Lighthouse PWA/installability checks. No browser Lighthouse runner was available; no scores are claimed.
- [ ] Network tab inspection and attached request list. No browser Network tab was available. Static scan found no absolute web links or remote imports; CSP limits connections to `'self'`.
- [x] No identifying strings, key patterns, or obvious secrets found; CSP remains restrictive. Evidence: recursive scan returned no matches for absolute web links, selected identifying strings, API/private-key patterns, or remote asset references. CSP permits scripts, styles, fonts, and connections only from `'self'`, images only from `'self'`, and blocks objects.
- [x] `README.md` and `CHANGELOG.md` are updated for Phase 1.

Additional checks: all 16 JavaScript files pass `node --check`; the manifest parses as JSON; all three generated icons have valid PNG headers and requested dimensions (192x192, 512x512, and maskable 512x512). A local static server returned HTTP 200 for the HTML, manifest, service worker, all modules/styles, and all icons.


Workspace note: this folder is not initialized as a Git checkout, so Phase 1 changes could not be committed and branch-specific deployment settings could not be inspected.
