const PAUSE_MS = 500;
const MAX_PHRASE = 120;

export function splitPhrases(text, maxLength = MAX_PHRASE) {
  const sentences = String(text).replace(/\s+/g, ' ').trim().match(/[^.!?।]+[.!?।]?/gu) ?? [];
  const result = [];
  for (const sentence of sentences.map((part) => part.trim()).filter(Boolean)) {
    if (sentence.length <= maxLength) { result.push(sentence); continue; }
    const words = sentence.split(' '); let current = '';
    for (const word of words) {
      if (current && `${current} ${word}`.length > maxLength) { result.push(current); current = word; }
      else current = current ? `${current} ${word}` : word;
    }
    if (current) result.push(current);
  }
  return result;
}

export function pickVoice(voices, lang) {
  const base = lang.toLowerCase().split('-')[0];
  return voices.find((voice) => voice.lang?.toLowerCase() === lang.toLowerCase() && voice.localService)
    ?? voices.find((voice) => voice.lang?.toLowerCase().startsWith(`${base}-`) && voice.localService)
    ?? voices.find((voice) => voice.lang?.toLowerCase().startsWith(`${base}-`))
    ?? null;
}

export function createSpeechPlayer(synthesis, Utterance, { pause = PAUSE_MS, onPhrase = () => {}, onBoundary = () => {}, delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  let generation = 0;
  async function speak(text, { lang = 'hi-IN', rate = 0.68, pitch = 1.04, voice = null } = {}) {
    const current = ++generation;
    synthesis.cancel();
    for (const phrase of splitPhrases(text)) {
      if (current !== generation) return;
      const utterance = new Utterance(phrase);
      utterance.lang = lang; utterance.rate = rate; utterance.pitch = pitch;
      if (voice) utterance.voice = voice;
      onPhrase(phrase);
      await new Promise((resolve, reject) => {
        utterance.onend = resolve;
        utterance.onboundary = (event) => onBoundary(event, phrase);
        utterance.onerror = (event) => event.error === 'canceled' || event.error === 'interrupted' ? resolve() : reject(new Error('Speech playback failed'));
        synthesis.speak(utterance);
      });
      if (current !== generation) return;
      if (phrase !== splitPhrases(text).at(-1)) await delay(pause);
    }
  }
  function cancel() { generation++; synthesis.cancel(); }
  return { speak, cancel };
}

export async function waitForVoices(synthesis, timeout = 1200) {
  const current = synthesis.getVoices();
  if (current.length) return current;
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; clearTimeout(timer); synthesis.removeEventListener?.('voiceschanged', finish); resolve(synthesis.getVoices()); };
    const timer = setTimeout(finish, timeout);
    synthesis.addEventListener?.('voiceschanged', finish, { once: true });
    synthesis.onvoiceschanged = synthesis.onvoiceschanged ?? finish;
  });
}

export function createBrowserSpeech() {
  if (!globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance) return null;
  return createSpeechPlayer(globalThis.speechSynthesis, globalThis.SpeechSynthesisUtterance);
}
