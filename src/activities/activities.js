import { registerStepModule } from '../session/engine.js';
import { createSpeechPlayer } from '../speech/speech.js';

export const CHARACTERS = [
  { id: 'sparrow', name: 'Sparrow', emoji: '🐦', image: './assets/character-sparrow.svg' },
  { id: 'rabbit', name: 'Rabbit', emoji: '🐇', image: './assets/character-rabbit.svg' },
  { id: 'tortoise', name: 'Tortoise', emoji: '🐢', image: './assets/character-tortoise.svg' },
  { id: 'calf', name: 'Calf', emoji: '🐮', image: './assets/character-calf.svg' }
];

const DATA = {
  rhyme: { kind: 'sound', en: 'Listen, then choose the sound you heard.', hi: 'सुनो, फिर सुनी हुई आवाज़ चुनो।', choices: [['clap','A clap','ताली'],['rain','Rain','बारिश'],['bird','A bird','चिड़िया']], answer: 0, hintEn: 'Think of hands meeting gently.', hintHi: 'हाथों के मिलने की आवाज़ सोचो।' },
  hello: { kind: 'matching', en: 'Which two things have the same color?', hi: 'किन दो चीज़ों का रंग एक जैसा है?', choices: [['red','Red ball','लाल गेंद'],['blue','Blue kite','नीली पतंग'],['red','Red flower','लाल फूल']], answer: 0, hintEn: 'Look for two red things.', hintHi: 'दो लाल चीज़ें ढूँढ़ो।' },
  revision: { kind: 'matching', en: 'Which two things have the same color?', hi: 'किन दो चीज़ों का रंग एक जैसा है?', choices: [['red','Red ball','लाल गेंद'],['blue','Blue kite','नीली पतंग'],['red','Red flower','लाल फूल']], answer: 0, hintEn: 'Look for two red things.', hintHi: 'दो लाल चीज़ें ढूँढ़ो।' },
  theme: { kind: 'counting', en: 'How many mangoes can you count?', hi: 'तुम कितने आम गिन सकते हो?', choices: [['2','🥭 🥭','🥭 🥭'],['3','🥭 🥭 🥭','🥭 🥭 🥭'],['4','🥭 🥭 🥭 🥭','🥭 🥭 🥭 🥭']], answer: 1, hintEn: 'Count each mango once.', hintHi: 'हर आम को एक बार गिनो।' },
  goodbye: { kind: 'before-after', en: 'What comes after washing your hands?', hi: 'हाथ धोने के बाद क्या करते हैं?', choices: [['dry','Dry them','उन्हें सुखाओ'],['paint','Paint a picture','चित्र बनाओ'],['sleep','Go to sleep','सो जाओ']], answer: 0, hintEn: 'Think about keeping your hands dry.', hintHi: 'हाथों को सूखा रखने के बारे में सोचो।' }
  ,story: { kind: 'before-after', en: 'What comes before a plant grows?', hi: 'पौधे के उगने से पहले क्या होता है?', choices: [['seed','A seed','बीज'],['fruit','Fruit','फल'],['shade','Shade','छाया']], answer: 0, hintEn: 'Think of something small in the soil.', hintHi: 'मिट्टी में रखी छोटी चीज़ सोचो।' }
};

export function createActivityState(data) { return { data, misses: 0, hint: false, complete: false }; }
export function answerActivity(state, choice) {
  if (state.complete) return state;
  if (choice === state.data.answer) return { ...state, complete: true };
  const misses = state.misses + 1;
  return { ...state, misses, hint: misses >= 2 };
}
export function registerLearningActivities() {
  const unregister = [];
  for (const [stepId, data] of Object.entries(DATA)) {
    unregister.push(registerStepModule(stepId, (container, { step }) => {
      let state = createActivityState(data);
      const lang = document.documentElement.lang === 'hi' ? 'hi' : 'en';
      const render = () => {
        const title = state.complete ? (lang === 'hi' ? 'बहुत अच्छा! हर कोशिश प्यारी है।' : 'Lovely trying! Every try is a good one.') : data[lang];
        const choiceText = state.complete ? '' : data.choices.map(([_id, en, hi], index) => {
          const text = lang === 'hi' ? hi : en;
          return `<button type="button" data-choice="${index}" aria-label="${text}">${data.kind === 'counting' ? text : text}</button>`;
        }).join('');
        const hint = state.hint ? `<p class="gentle-hint">${lang === 'hi' ? data.hintHi : data.hintEn}</p>` : '';
        const character = CHARACTERS[(step.id.length + step.minutes) % CHARACTERS.length];
        container.innerHTML = `<article class="activity-card" aria-live="polite"><img class="character ${state.complete ? 'happy' : state.misses ? 'gentle' : 'idle'}" src="${character.image}" alt=""><h2>${title}</h2><p class="small">${state.complete ? '' : data.kind === 'sound' ? 'Tap a choice to hear it spoken.' : ''}</p>${hint}<div class="activity-choices">${choiceText}</div></article>`;
        container.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => { const index = Number(button.dataset.choice); if (data.kind === 'sound' && globalThis.speechSynthesis && globalThis.SpeechSynthesisUtterance) { const voice = createSpeechPlayer(globalThis.speechSynthesis, globalThis.SpeechSynthesisUtterance); const choice = data.choices[index]; voice.speak(lang === 'hi' ? choice[2] : choice[1], { lang: lang === 'hi' ? 'hi-IN' : 'en-IN' }).catch((error) => console.error('[Nanhe Kadam] Activity speech failed', error)); } state = answerActivity(state, index); render(); }));
      };
      render();
    }));
  }
  return () => unregister.forEach((remove) => remove());
}
