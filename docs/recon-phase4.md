# Phase 4 reconnaissance — activities and characters

## Current state

The session engine exposes a small step-module registry, but no learning module is registered, so the app falls back to an icon and generic placeholder. The companion chooser currently offers four emoji and a local name. There are no character assets or activity result states.

## Plan and limits

Register local interactive modules through the existing registry, retain the current session schedule/timing, and offer matching, counting, sound/listening, and before/after choices. Prompts should invite another try without a penalty; after two misses, reveal a simple hint and continue to welcome every attempt. Activity state should remain ephemeral unless it represents actual learning progress. Create original local SVG characters with calm idle, speaking, happy, and gentle-retry states. Keep interaction buttons at least 64px and provide non-drag alternatives.

Automated DOM/browser tests are unavailable in this workspace. Module logic and registration can be unit-tested; visual animation, touch target sizing, screen reader order, and child comprehension need manual device checks.

