# Phase 8 reconnaissance — optional Smart Packs

The app currently has no network data flow and its CSP permits only same-origin connections. The locked decision permits optional, parent-side Gemini generation only; child sessions must never make API calls or send photos, recordings, or journal text. The key must stay encrypted in the local vault and excluded from backups.

Research needed before implementation: current official Gemini REST request shape, supported model configuration, and browser CORS behavior. The UI will remain disabled unless the parent enables it, supplies a key, and reviews/approves validated generated content. Use a fixed Google API origin allow-list in CSP and validate returned pack structure locally. Offline use must continue to work without a key or network.

No live API key is available in this workspace; generation and real-key verification will remain explicitly unverified. Unit tests will mock fetch and crypto and must prove the child activity path does not invoke the network.

## Official API research

- Google documents REST generation at `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` using a `x-goog-api-key` header and JSON `contents` payload: https://ai.google.dev/api and https://ai.google.dev/gemini-api/docs/generate-content/text-generation
- The current official model list includes stable `gemini-3.8-flash`; keep model selection configurable because availability changes: https://ai.google.dev/gemini-api/docs/models
- Google explicitly advises against exposing keys in client-side production apps and recommends a backend proxy. This project has no backend and uses a parent-supplied key; encryption at rest reduces disk exposure but cannot hide a decrypted key from a browser runtime or its owner. Users should restrict the key to Gemini API and set billing limits: https://ai.google.dev/gemini-api/docs/api-key
- These official docs do not provide a browser CORS guarantee for this static-origin request. A real browser request/preflight must still be tested before claiming the online feature works.
