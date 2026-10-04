# Phase 2 reconnaissance — device speech

## Existing structure

The app is a static vanilla ES-module PWA. `src/speech/` is reserved but has no runtime code. Session steps currently render a generic placeholder unless a step module is registered. The parent area is gated by the local PIN, and the shell is cached by `sw.js`.

## Browser capabilities and constraints

The target API is the browser Web Speech API (`speechSynthesis`, `SpeechSynthesisUtterance`, `voiceschanged`, and utterance `end`/`boundary` events). No browser or Android device is available in this workspace, so actual voice inventories and event behavior cannot be truthfully reported here. The parent-only probe will enumerate `name`, `lang`, and `localService`, play a sample, and expose boundary/end observations. Human phone/tablet results remain to be filled in below.

The speech layer must not depend on boundary events for progress because browser and voice implementations vary. It will split text into short sentences/phrases, sequence using `end`, cancel a prior utterance before starting, and add a brief pause between pieces. It will wait briefly for delayed voice inventories, prefer local voices matching the requested language, then fall back to browser defaults. No remote voice service or font is introduced.

## Human device observations (pending)

| Device / browser | Hindi voices (`name`, `lang`, local) | English voices | `voiceschanged` | `boundary` | `end` / sequencing |
|---|---|---|---|---|---|
| Android phone | Pending hands-on check | Pending hands-on check | Pending | Pending | Pending |
| Android tablet | Pending hands-on check | Pending hands-on check | Pending | Pending | Pending |

