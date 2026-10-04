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
- [x] Secure-origin capability checks and the parent blocking screen are implemented before PIN setup and service-worker registration; environment tests cover secure and missing-feature cases.
- [x] Child home contains no settings/menu/link navigation. Source inspection confirms the child home presents the start/adventure/lock content and parent hold control only.
- [x] Node built-in tests pass: `node --test` — 23 tests passed.
- [ ] Lighthouse PWA/installability checks. No browser Lighthouse runner was available; no scores are claimed.
- [ ] Network tab inspection and attached request list. No browser Network tab was available. Source contains the requested localhost setup text and no third-party targets; CSP limits connections to `'self'`.
- [x] No identifying strings, key patterns, or obvious secrets found; CSP remains restrictive. Evidence: scans found only the documented localhost guidance and no third-party targets, selected identifying strings, API/private-key patterns, or remote asset references. CSP permits scripts, styles, fonts, and connections only from `'self'`, images only from `'self'`, and blocks objects.
- [x] `README.md` and `CHANGELOG.md` are updated for Phase 1.

Real-device checks must be performed over HTTPS or localhost so Web Crypto and service workers are available.

Additional checks: all 18 JavaScript files pass `node --check`; the manifest parses as JSON; all three generated icons have valid PNG headers and requested dimensions (192x192, 512x512, and maskable 512x512). A local static server returned HTTP 200 for the HTML, manifest, service worker, all modules/styles, and all icons.


Workspace note: current branch is `master`. Browser and Android hardware were unavailable, so device behavior remains unverified.



