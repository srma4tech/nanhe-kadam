# Locked decisions

1. Voice: use the default device text-to-speech (Web Speech API) through a "Kid Speech Layer" (slow, phrase by phrase, event-synced). No pre-generated TTS audio. Phonics sounds and rhymes use short recordings in family voices, with TTS as fallback.
2. Optional AI, parent-side only: Gemini through a user-supplied API key for Smart Packs generation and a safety review pass. The child never triggers an API call. No live chat, no photos or recordings or journal text ever sent to the API.
3. API key: stored once, encrypted at rest on the device, masked in the UI, reveal only with the master PIN (or device authentication where supported), replaceable by overwrite, excluded from backups.
4. Storage budget: under about 300 MB after 4 weeks of use, with a storage meter and cleanup in the parent area.
5. Characters: original village-friendly characters (working names Bholu and Chintu) plus 3-4 selectable options. No copyrighted characters, names, looks or voices.
6. Privacy: no accounts, analytics, tracking, third-party SDKs or external links.
7. Session: 20 minutes (Hello 1, Rhyme 3, Revision 5, Theme 7, Family-voice story 2, Mission and goodbye 2), then lock until the next planned slot. Fri and Sat are lighter (about 10 minutes). Sunday has no learning games, only an adventure card.
