# Nanhe Kadam

Nanhe Kadam is a bilingual Hindi and English learning companion for young children. Phase 1 provides an installable offline PWA shell, local storage, a parent PIN area, schedule planning, and placeholder session screens. Real learning activities and content are not included yet.

## Privacy promise

The child-facing shell works offline after its first successful load. There are no accounts, analytics, tracking, third-party scripts or SDKs, remote fonts, CDN links, or external links. Do not add personal or family information, photos, credentials, API keys, or secrets to this public repository. Use neutral names throughout. Companion settings are stored only on the device.

## Folder map

- `src/core/` — IndexedDB, tamper-aware clock, and event-based app state
- `src/session/` — weekly schedule, session state machine, and daily lock
- `src/parent/` — PIN setup, verification, throttling, and reset
- `src/ui/` — child and parent placeholder screens and local styles
- `content/` — reserved schemas and bilingual learning content directories
- `assets/` — generated local PWA icons
- `scripts/` — local icon generation and content validation scripts
- `tests/` — Node built-in tests for pure session, schedule, clock, and PIN logic
- `docs/` — decisions, reconnaissance, and verification records

## Run locally

Serve this folder from a local static HTTP server. Service workers and Web Crypto require a secure context; localhost is treated as secure. No build step or installed package is required. For a basic static server already available on your machine, run it from this directory and open its local address.

## Tests

Run the dependency-free unit tests from the repository root:

```sh
node --test tests/*.test.js
```

The equivalent `node --test` also discovers the tests. On the Windows Node v24.18.0 environment used for Phase 1, `node --test tests/` fails because Node resolves the directory argument as a module path; use the wildcard command above.

## Regenerate icons

```sh
node scripts/generate-icons.mjs
```

The script uses only Node built-ins and writes the three original PNG icons in `assets/`.

## Deploying

GitHub Pages cannot be configured from this workspace. To configure it manually:

1. Push this repository to GitHub and ensure the intended default branch is `main`.
2. Open the repository's **Settings** tab.
3. In **Pages**, choose **Deploy from a branch** as the source.
4. Choose `main` and the repository root (`/`) as the folder, then save.
5. Confirm the Pages deployment completes in the repository's Actions/Pages status.

Keep the repository public without personal or family information, as required by the project privacy rule.
