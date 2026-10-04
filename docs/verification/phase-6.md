# Phase 6 verification

- [x] Unit tests cover Opus-first MIME selection, fallback, speaker-tagged recording, microphone-track stop, unavailable microphone, and photo resize bounds.
- [x] Media controls are reachable through the parent PIN area; saved audio and photos are local IndexedDB blobs with individual deletion controls.
- [x] App visibility change stops and saves an active recording; recording duration is capped at one minute.
- [ ] Verify microphone/camera prompts, offline playback, storage pressure, deletion, and photo quality on Android phone/tablet over HTTPS or localhost.
- [ ] Verify IndexedDB eviction and quota messaging on devices; Node tests cannot reproduce hardware browser storage policies.

