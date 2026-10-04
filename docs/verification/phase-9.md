# Phase 9 verification

- [x] Service-worker app-shell test walks the static module import graph and confirms all modules are precached.
- [x] Service-worker version is bumped; install does not skip waiting and updates still require the parent apply message.
- [x] Runtime cache-write rejections are handled; all app unhandled promise rejections are logged to console and receive generic UI handling.
- [x] Keyboard skip link, focus-visible indicators, screen-change heading focus, keyboard parent hold, reduced-motion handling, and 64px controls are included.
- [x] Dynamic companion names/emoji, frame titles, and activity/Smart Pack text are escaped before HTML insertion.
- [x] Parent activity-language and selected voice/rate/pitch settings are applied to child activity speech.
- [ ] Real screen-reader, keyboard, touch target, motion, offline install/update, and device storage checks remain pending in docs/device-test-checklist.md.
- [ ] Two-week family pilot, human bilingual review, Android microphone/camera, and live Gemini CORS checks remain pending.
