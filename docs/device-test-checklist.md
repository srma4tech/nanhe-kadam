# Device and pilot verification checklist

Run checks over HTTPS or localhost on each supported Android device. Record device model, Android version, browser version, date, and result in a private pilot log; do not commit children's names, recordings, photographs, or other identifying details here.

## Install and offline shell

- [ ] Install to the home screen on an Android phone and tablet.
- [ ] Open once online, then enable airplane mode and relaunch the PWA.
- [ ] Verify every screen/activity/module loads offline, including revision and locally approved Smart Pack activities.
- [ ] Start a session, install a new version while it is active, confirm it waits, then apply it from the parent area after the session.
- [ ] Confirm child sessions make no external requests; the only expected external traffic is an explicit parent-triggered Smart Pack request when enabled.

## Parent PIN and local data

- [ ] Set up, verify, change, and reset the PIN; inspect that plaintext PIN is never stored.
- [ ] Make five wrong attempts, force-close/reopen, and confirm throttling persists.
- [ ] Lock the parent area by timeout, app background, and device clock rollback.
- [ ] Confirm IndexedDB holds settings/progress locally and storage estimates/category counts are plausible.
- [ ] Exercise storage pressure/quota behavior, parent cleanup, and persistent-storage permission.

## Schedule, learning, and speech

- [ ] Check full-session and Friday/Saturday light-session lengths, daily caps, pause/skip, and Sunday adventure-only behavior.
- [ ] Check the monthly Gaon Mela card remains an adventure prompt with no Sunday games.
- [ ] Try matching/counting/sound/listening/before-after activities; miss twice and confirm gentle hint, then complete without failure language.
- [ ] Enable keyboard-only navigation; verify skip link, focus order, visible focus, and parent-area hold with Enter/Space.
- [ ] Check screen-reader labels and announcement order in English and Hindi; check 64px touch targets and large text.
- [ ] Enable reduced motion and confirm character movement stops.
- [ ] In the parent voice screen, inspect local Hindi and English voices, preview/select each, and confirm rate/pitch settings affect child prompts.
- [ ] Observe voiceschanged, boundary, and end events on each browser; note that end events, not boundaries, govern phrase progression.

## Microphone, camera, and family media

- [ ] Grant and deny microphone permission; verify friendly messages and no recording without a parent action.
- [ ] Record/play/stop a short clip, background the app during capture, and confirm microphone tracks stop.
- [ ] Grant and deny camera/photo permission; save a resized optional mission image.
- [ ] Reopen media offline, delete clips/photos individually, and confirm deleted items are no longer playable.
- [ ] Confirm backups contain no audio or image blobs.

## Backup, restore, storage, and clock

- [ ] Export a backup and inspect that PIN hash/attempt data and the encrypted vault are absent.
- [ ] Restore a valid backup and confirm listed values restore while omitted local values remain.
- [ ] Try malformed/oversized backup files and confirm no records change.
- [ ] Check storage meter/categories, low-space handling, and media cleanup.
- [ ] Change device clock forward/backward and verify tamper-aware time/session lock behavior.

## Optional Gemini Smart Packs

- [ ] Confirm feature is off by default and child activities make no Gemini request.
- [ ] Save, replace, and delete the parent API key; confirm only encrypted key data is persisted and reset clears it.
- [ ] Use a Gemini-restricted key and a small billing limit; test the browser CORS preflight/request on the deployed HTTPS origin.
- [ ] Confirm only a fixed topic prompt is sent, never child profile text, journal notes, photos, or recordings.
- [ ] Generate a pack, inspect both languages and safety review, discard one draft, and approve another.
- [ ] Confirm only approved packs appear in local activities and continue to work offline.
- [ ] Check request failures, quota/errors, model changes, and key rotation without exposing raw API error text or the key.

## Two-week family pilot

- [ ] Track whether the 20-minute / 10-minute rhythm fits the family's routine without pressure.
- [ ] Check the six-item/five-minute review cap, weak-topic timing, easy wins, Saturday recap, and monthly Gaon Mela.
- [ ] Ask parents whether summaries and cleanup controls are understandable and whether any activity needs simpler language.
- [ ] Review child comfort, Hindi/English quality, and character/activity comprehension with a bilingual adult.
- [ ] Record only de-identified findings in public project notes.
