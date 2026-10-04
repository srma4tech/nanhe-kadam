# Phase 7 reconnaissance — parent dashboard and data tools

The parent area already exposes schedule, PIN changes, reset, persistence permission, updates, a basic storage estimate, speech settings, local media, and aggregate learning counts. The storage wrapper can list values but not their keys, so backup/restore needs key/value enumeration. The vault and PIN record are private and must never enter backups; audio and photo blobs are also excluded.

Add a parent-only dashboard with category counts and storage usage, validated JSON backup export/import, and privacy/credits information. Restore should merge only validated allow-listed local stores and must not overwrite/remove data omitted from the backup. Tests should prove secret/media exclusion and reject malformed, unexpected, or unsafe backup entries.

Real file picker, download, restore persistence, storage quota, and permission behavior need browser/device verification; automated tests can cover JSON policy and mocked restore calls.

