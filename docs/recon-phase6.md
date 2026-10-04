# Phase 6 reconnaissance — local family media

The IndexedDB schema already reserves recordings and journal stores, but no media code or controls exist. The PWA is same-origin only and has no remote endpoints. Browser microphone/camera support, codec availability, and device storage behavior cannot be probed here.

Capture must begin only from an explicit parent action while the PIN session is unlocked. Prefer Opus when supported and allow the browser's default recording format otherwise; stop all media tracks when the parent stops. Keep clips and optional mission photos in IndexedDB, shrink photos before saving, show storage usage, and provide individual deletion. Do not include these blobs or identifying tags in backups. Errors shown on screen should be friendly; device exceptions belong in console details.

Unit tests can exercise MIME choice, limits, and failure-safe track cleanup with mocks. Human microphone, playback, camera, quota, and deletion checks require an HTTPS/localhost browser on real devices.

