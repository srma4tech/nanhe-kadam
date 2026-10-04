# Phase 9 reconnaissance — accessibility and reliability

The app already uses semantic forms, labels, large primary controls, live status regions, reduced-motion CSS, a restrictive CSP, parent-approved service-worker updates, typed quota handling, and uncaught-error logging. Review found the offline shell list is missing the revision module, runtime cache writes can reject unobserved, and quiet/voice/audio controls fall below the 64px target baseline.

Harden these gaps, add visible keyboard focus, ensure all background rejections are handled with generic messages, and preserve current service-worker waiting/parent-apply behavior. Add a comprehensive manual device checklist for installation, session, speech, recording, camera, clock skew, backup, quota/storage, Smart Packs key lifecycle, and a two-week pilot. Device/browser checks are unavailable here and must stay marked pending.

