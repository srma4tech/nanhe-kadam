import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpeechPlayer, pickVoice, splitPhrases } from '../src/speech/speech.js';

test('splits sentences and long text into short phrases', () => {
  const phrases = splitPhrases('नमस्ते। This is a long sentence with several words.', 18);
  assert.ok(phrases.length > 2); assert.ok(phrases.every((phrase) => phrase.length <= 18));
});
test('prefers a local voice matching the requested language', () => {
  const voices = [{ lang: 'hi-IN', localService: false }, { lang: 'hi-IN', localService: true }, { lang: 'en-IN', localService: true }];
  assert.equal(pickVoice(voices, 'hi-IN'), voices[1]); assert.equal(pickVoice(voices, 'en-US'), voices[2]);
});
test('waits for each utterance end and cancels the prior run', async () => {
  const played = []; const cancellations = [];
  class Utterance { constructor(text) { this.text = text; } }
  const synthesis = { cancel() { cancellations.push(true); }, speak(u) { played.push(u); queueMicrotask(() => u.onend()); } };
  const player = createSpeechPlayer(synthesis, Utterance, { pause: 0 });
  await player.speak('Hello. Namaste.', { lang: 'en-IN' });
  assert.deepEqual(played.map((u) => u.text), ['Hello.', 'Namaste.']);
  assert.equal(played[0].lang, 'en-IN'); assert.equal(cancellations.length, 1);
});
test('cancels speech and rejects no raw browser error text', async () => {
  class Utterance { constructor(text) { this.text = text; } }
  const synthesis = { cancel() {}, speak(u) { u.onerror({ error: 'synthesis-failed' }); } };
  await assert.rejects(createSpeechPlayer(synthesis, Utterance).speak('Hello'), /Speech playback failed/);
});
