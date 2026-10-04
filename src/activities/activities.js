import { registerStepModule } from '../session/engine.js';
import { createSpeechPlayer } from '../speech/speech.js';
import { get, put } from '../core/storage.js';
import { recordRecall, selectDailyReviews } from '../revision/spaced.js';

export const CHARACTERS = [
  { id: 'sparrow', name: 'Sparrow', emoji: '🐦', image: './assets/character-sparrow.svg' },
  { id: 'rabbit', name: 'Rabbit', emoji: '🐇', image: './assets/character-rabbit.svg' },
  { id: 'tortoise', name: 'Tortoise', emoji: '🐢', image: './assets/character-tortoise.svg' },
  { id: 'calf', name: 'Calf', emoji: '🐮', image: './assets/character-calf.svg' }
];

const DATA = {
  rhyme: { conceptId: 'sound-clap', kind: 'sound', en: 'Listen, then choose the sound you heard.', hi: 'सुनो, फिर सुनी हुई आवाज़ चुनो।', choices: [['clap','A clap','ताली'],['rain','Rain','बारिश'],['bird','A bird','चिड़िया']], answer: 0, hintEn: 'Think of hands meeting gently.', hintHi: 'हाथों के मिलने की आवाज़ सोचो।' },
  hello: { conceptId: 'color-match', kind: 'matching', en: 'Which two things have the same color?', hi: 'किन दो चीज़ों का रंग एक जैसा है?', choices: [['red','Red ball','लाल गेंद'],['blue','Blue kite','नीली पतंग'],['red','Red flower','लाल फूल']], answer: 0, hintEn: 'Look for two red things.', hintHi: 'दो लाल चीज़ें ढूँढ़ो।' },
  revision: { conceptId: 'color-match', kind: 'matching', en: 'Which two things have the same color?', hi: 'किन दो चीज़ों का रंग एक जैसा है?', choices: [['red','Red ball','लाल गेंद'],['blue','Blue kite','नीली पतंग'],['red','Red flower','लाल फूल']], answer: 0, hintEn: 'Look for two red things.', hintHi: 'दो लाल चीज़ें ढूँढ़ो।' },
  theme: { conceptId: 'count-mangoes', kind: 'counting', en: 'How many mangoes can you count?', hi: 'तुम कितने आम गिन सकते हो?', choices: [['2','🥭 🥭','🥭 🥭'],['3','🥭 🥭 🥭','🥭 🥭 🥭'],['4','🥭 🥭 🥭 🥭','🥭 🥭 🥭 🥭']], answer: 1, hintEn: 'Count each mango once.', hintHi: 'हर आम को एक बार गिनो।' },
  goodbye: { conceptId: 'handwash-order', kind: 'before-after', en: 'What comes after washing your hands?', hi: 'हाथ धोने के बाद क्या करते हैं?', choices: [['dry','Dry them','उन्हें सुखाओ'],['paint','Paint a picture','चित्र बनाओ'],['sleep','Go to sleep','सो जाओ']], answer: 0, hintEn: 'Think about keeping your hands dry.', hintHi: 'हाथों को सूखा रखने के बारे में सोचो।' },
  story: { conceptId: 'plant-order', kind: 'before-after', en: 'What comes before a plant grows?', hi: 'पौधे के उगने से पहले क्या होता है?', choices: [['seed','A seed','बीज'],['fruit','Fruit','फल'],['shade','Shade','छाया']], answer: 0, hintEn: 'Think of something small in the soil.', hintHi: 'मिट्टी में रखी छोटी चीज़ सोचो।' }
};

export function createActivityState(data) { return { data, misses: 0, hint: false, complete: false }; }
export function smartPackToActivity(pack) {
  const answer = pack?.options?.findIndex((option) => option.id === pack.answerId);
  if (!pack?.approved || answer < 0) return null;
  return { conceptId: pack.id, kind: 'matching', en: pack.question.en, hi: pack.question.hi, choices: pack.options.map((option) => [option.id, option.en, option.hi]), answer, hintEn: pack.hint.en, hintHi: pack.hint.hi };
}
export function answerActivity(state, choice) {
  if (state.complete) return state;
  if (choice === state.data.answer) return { ...state, complete: true };
  const misses = state.misses + 1;
  return { ...state, misses, hint: misses >= 2 };
}
export function registerLearningActivities() {
  const unregister = [];
  for (const [stepId, data] of Object.entries(DATA)) {
    unregister.push(registerStepModule(stepId, async (container, { step }) => {
      let activeData = data;
      let reviewQueue = [];
      let reviewIndex = 0;
      if (stepId === 'theme') {
        const feature = await get('settings', 'smartPacks');
        const approved = feature?.enabled ? await get('settings', 'approvedSmartPacks') ?? [] : [];
        const localPack = approved.find((pack) => pack.approved);
        if (localPack) activeData = smartPackToActivity(localPack) ?? data;
      }
      if (stepId === 'revision') {
        const stored = await get('progress', 'reviewMastery') ?? [];
        reviewQueue = selectDailyReviews(stored, Date.now(), 'matching').map((item) => ({ item, data: Object.values(DATA).find((candidate) => candidate.conceptId === item.id) })).filter((entry) => entry.data);
        if (reviewQueue[0]) activeData = reviewQueue[0].data;
      }
      let state = createActivityState(activeData);
      let recorded = false;
      const lang = document.documentElement.lang === 'hi' ? 'hi' : 'en';
      const render = () => {
        const title = state.complete ? (lang === 'hi' ? 'बहुत अच्छा! हर कोशिश प्यारी है।' : 'Lovely trying! Every try is a good one.') : activeData[lang];
        const choiceText = state.complete ? '' : activeData.choices.map(([_id, en, hi], index) => {
          const text = lang === 'hi' ? hi : en;
          return `<button type="button" data-choice="${index}" aria-label="${text}">${text}</button>`;
        }).join('');
        const hint = state.hint ? `<p class="gentle-hint">${lang === 'hi' ? activeData.hintHi : activeData.hintEn}</p>` : '';
        const character = CHARACTERS[(step.id.length + step.minutes) % CHARACTERS.length];
        container.innerHTML = `<article class="activity-card" aria-live="polite"><img class="character ${state.complete ? 'happy' : state.misses ? 'gentle' : 'idle'}" src="${character.image}" alt=""><h2>${title}</h2><p class="small">${state.complete ? '' : activeData.kind === 'sound' ? 'Tap a choice to hear it spoken.' : stepId === 'revision' && reviewQueue.length ? `A little review ${reviewIndex + 1} of ${reviewQueue.length}` : ''}</p>${hint}<div class="activity-choices">${choiceText}</div></article>`;
        container.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', async () => { const index = Number(button.dataset.choice); if (activeData.kind === 'sound' && globalThis.speechSynthesis && globalThis.SpeechSynthesisUtterance) { const voice = createSpeechPlayer(globalThis.speechSynthesis, globalThis.SpeechSynthesisUtterance); const choice = activeData.choices[index]; voice.speak(lang === 'hi' ? choice[2] : choice[1], { lang: lang === 'hi' ? 'hi-IN' : 'en-IN' }).catch((error) => console.error('[Nanhe Kadam] Activity speech failed', error)); } state = answerActivity(state, index); if (state.complete && !recorded) { recorded = true; try { const records = await get('progress', 'reviewMastery') ?? []; const prior = records.find((item) => item.id === activeData.conceptId); const updated = recordRecall(prior, state.misses === 0); const next = records.filter((item) => item.id !== activeData.conceptId); next.push({ ...updated, id: activeData.conceptId, theme: activeData.kind }); await put('progress', 'reviewMastery', next); } catch (error) { console.error('[Nanhe Kadam] Learning progress could not be saved', error); } if (stepId === 'revision' && reviewQueue[reviewIndex + 1]) { activeData = reviewQueue[++reviewIndex].data; state = createActivityState(activeData); recorded = false; } } render(); }));
      };
      render();
    }));
  }
  return () => unregister.forEach((remove) => remove());
}
