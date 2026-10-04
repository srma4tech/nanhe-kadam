import { get, put, del, entries, estimateStorage } from '../core/storage.js';
import { now, setDevOffset, clearDevOffset } from '../core/clock.js';
import { checkEnvironment } from '../core/environment.js';
import { getState, setState } from '../core/state.js';
import { hasPin, setPin, verifyPin, changePin, resetPin, isParentUnlocked, touchParent, lockParent, requestPersistentStorageForParent, PARENT_IDLE_MS } from '../parent/pin.js';
import { defaultSchedule, WEEKDAYS, isSessionAvailable, dayPlan, isLightDay } from '../session/schedule.js';
import { startSession, resumeSession, advanceSession, markSessionActive, getStepModule } from '../session/engine.js';
import { getLockState, overrideLock } from '../session/lock.js';
import { createSpeechPlayer, pickVoice, waitForVoices } from '../speech/speech.js';
import { registerLearningActivities, CHARACTERS } from '../activities/activities.js';
import { buildLearningSummary, isMonthlyMela, selectDailyReviews } from '../revision/spaced.js';
import { beginFamilyRecording, deleteFamilyMedia, listFamilyMedia, saveMissionPhoto } from '../family/media.js';
import { BACKUP_STORES, createBackup, restoreBackup, validateBackup } from '../parent/data.js';
import { DEFAULT_GEMINI_MODEL, generateReviewedPack } from '../ai/gemini.js';
import { deleteGeminiKey, hasGeminiKey, readGeminiKey, saveGeminiKey } from '../parent/vault.js';

const root = document.querySelector('#app');
const ESCAPE = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let timer; let parentTouchTimer; let registration; let quotaNotice = false; let companion = { name: 'Little friend', emoji: '🌱' };
let session = null; let selectedEmoji = '🌱'; let selectedCharacter = 'sparrow'; let updateReady = false; let activeRecording = null; let mediaURLs = []; let mediaTimer;
function frame(title, body, cls = '') { setState({ screen: title === 'Parent area' || title === 'Change parent PIN' || title === 'Reset parent PIN' ? 'parent' : title === 'Parent setup' ? 'pin' : title === 'Choose a companion' ? 'setup' : title ? 'child' : getState().screen }); root.innerHTML = `<section class="screen ${cls}"><div class="brand"><img src="./assets/icon-192.png" alt=""><span>Nanhe Kadam</span></div>${title ? `<h1 class="title">${title}</h1>` : ''}${body}</section>`; }
function errorBox(message) { return `<p class="error" role="alert">${ESCAPE(message)}</p>`; }
function logError(context, error) { console.error(`[Nanhe Kadam] ${context}`, error); }
function attachParentHold() {
  const target = document.createElement('button'); target.className = 'parent-corner'; target.setAttribute('aria-label', 'Parent area'); target.title = 'Hold for parent area'; root.append(target);
  const begin = (event) => { event.preventDefault(); clearTimeout(parentTouchTimer); parentTouchTimer = setTimeout(() => { lockParent(); renderPin(); }, 3000); };
  const cancel = () => clearTimeout(parentTouchTimer);
  target.addEventListener('pointerdown', begin); ['pointerup', 'pointercancel', 'pointerleave'].forEach((name) => target.addEventListener(name, cancel));
}
function childFrame(title, content) { frame(title, content, 'center'); attachParentHold(); }
function releaseMediaUrls() { mediaURLs.forEach((url) => URL.revokeObjectURL(url)); mediaURLs = []; }
function installVisibilityLock() { window.addEventListener('unhandledrejection', (event) => { if (event.reason?.name === 'StorageQuotaError') { event.preventDefault(); console.error('[Nanhe Kadam] Storage quota error', event.reason); quotaNotice = true; if (getState().screen === 'parent' && isParentUnlocked()) renderParent('Device storage is full. Please free space and try again.'); } }); root.addEventListener('pointerdown', (event) => { if (getState().screen === 'parent') { if (isParentUnlocked()) touchParent(); else { event.stopImmediatePropagation(); renderHome(); } } }, true); root.addEventListener('keydown', () => { if (getState().screen === 'parent' && isParentUnlocked()) touchParent(); }, true); document.addEventListener('visibilitychange', async () => { if (document.hidden) { if (activeRecording) { try { await activeRecording.stop(); } catch (error) { logError('Interrupted recording could not be saved', error); } activeRecording = null; } lockParent(); if (getState().screen === 'parent') renderHome(); } }); setInterval(() => { if (getState().screen === 'parent' && !isParentUnlocked()) renderHome(); }, 5000); }
async function init() {
  const environment = checkEnvironment(window);
  if (!environment.ok) return renderEnvironmentGate();
  try {
    registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.register('./sw.js') : null;
    if (registration) {
      registration.addEventListener('updatefound', () => { const worker = registration.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) updateReady = true; }); });
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
    }
    installVisibilityLock();
      if (!await hasPin()) return renderPin(true);
    const saved = await get('settings', 'companion'); if (!saved) return renderCompanion(); companion = { ...saved, character: saved.character ?? 'sparrow' };
    session = await resumeSession(); if (session) return renderSession();
    await ensureSchedule(); renderHome();
  } catch (error) { showFatal(error); }
}
function renderEnvironmentGate() {
  frame('Parent setup needs a secure connection', `<p class="sub">Nanhe Kadam needs HTTPS or localhost to protect the parent PIN and work offline. Choose one of these options:</p><ol class="setup-options"><li>On the same computer running the app, open <code>http://localhost</code>. Add the server port if one is shown.</li><li>Open the HTTPS GitHub Pages address for this app.</li><li>On Android, connect the phone to the computer and run <code>adb reverse tcp:3000 tcp:3000</code>. Then open <code>http://localhost:3000</code> on the phone. Use your server's port if it differs.</li></ol><p class="small">PIN-protected learning is paused here. Reopen the app from one of these secure addresses.</p>`, 'environment-gate');
  setState({ screen: 'environment' });
}
async function ensureSchedule() { if (!await get('schedule', 'week')) await put('schedule', 'week', defaultSchedule()); }
function showFatal(error) { logError('App could not open local information', error); frame('A little pause', `<p class="sub">The app could not open its local information. Please ask a parent to reopen it.</p>${error?.name === 'StorageQuotaError' ? errorBox('Device storage is full. A parent can free space and try again.') : errorBox('Something went wrong. Please try again or ask a parent for help.')}`, 'center'); }
async function renderPin(setup = false, message = '') {
  const fields = setup ? `<label>Choose a parent PIN<input name="pin" inputmode="numeric" pattern="[0-9]{4,6}" minlength="4" maxlength="6" autocomplete="new-password" required></label><label>Enter it again<input name="confirm" inputmode="numeric" pattern="[0-9]{4,6}" minlength="4" maxlength="6" autocomplete="new-password" required></label>` : `<label>Parent PIN<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{4,6}" minlength="4" maxlength="6" autocomplete="current-password" required></label>`;
  frame(setup ? 'Parent setup' : 'Parent area', `<p class="sub">${setup ? 'Choose a 4 to 6 digit PIN to protect parent settings.' : 'Enter your PIN to continue.'}</p>${message ? errorBox(message) : ''}<form id="pin-form" class="stack">${fields}<button type="submit">${setup ? 'Set parent PIN' : 'Continue'}</button></form>${!setup ? '<button type="button" id="forgot-pin" class="quiet">Forgot PIN? Reset</button>' : ''}`, 'center');
  setState({ screen: 'pin' });
  root.querySelector('#forgot-pin')?.addEventListener('click', () => renderReset('', true));
  root.querySelector('#pin-form').addEventListener('submit', async (event) => {
    event.preventDefault(); const values = new FormData(event.currentTarget); const pin = values.get('pin');
    try {
      if (setup) { await setPin(pin, values.get('confirm')); return renderCompanion(); }
      const result = await verifyPin(pin); if (!result.ok) return renderPin(false, result.lockedFor ? `Please wait ${Math.ceil(result.lockedFor / 1000)} seconds, then try again.` : result.error ?? 'That PIN did not match.');
      const saved = await get('settings', 'companion'); if (!saved) return renderCompanion(true); companion = saved; renderParent();
    } catch (error) { logError('PIN setup or verification failed', error); renderPin(setup, setup ? 'We could not set up the PIN. Please try again.' : 'We could not verify the PIN. Please try again.'); }
  });
}
function renderCompanion(fromParent = false) {
  selectedCharacter = companion.character ?? 'sparrow';
  const options = CHARACTERS.map((character) => `<button class="character-choice ${character.id === selectedCharacter ? 'selected' : ''}" type="button" data-character="${character.id}" aria-label="Choose ${character.name}"><img src="${character.image}" alt=""><span>${character.name}</span></button>`).join('');
  frame('Choose a companion', `<p class="sub">Give your learning companion a name. Please do not use a child's name.</p><form id="companion-form" class="stack"><label>Companion name<input name="name" maxlength="24" value="${ESCAPE(companion.name)}" required></label><div class="character-options" aria-label="Choose a companion">${options}</div><button type="submit">Save and continue</button></form>`, 'center');
  if (fromParent) setState({ screen: 'parent' });
  root.querySelectorAll('[data-character]').forEach((button) => button.addEventListener('click', () => { selectedCharacter = button.dataset.character; root.querySelectorAll('[data-character]').forEach((choice) => choice.classList.toggle('selected', choice === button)); }));
  root.querySelector('#companion-form').addEventListener('submit', async (event) => { event.preventDefault(); const name = new FormData(event.currentTarget).get('name').trim(); if (!name) return; const character = CHARACTERS.find((item) => item.id === selectedCharacter) ?? CHARACTERS[0]; companion = { name, character: character.id, emoji: character.emoji }; await put('settings', 'companion', companion); await ensureSchedule(); if (fromParent) renderParent(); else renderHome(); });
}
async function homeStatus() {
  const current = await now(); const date = new Date(current); const day = date.getDay(); const schedule = await get('schedule', 'week') ?? defaultSchedule(); const dayConfig = schedule[day] ?? defaultSchedule()[day];
  if (day === 0) return { kind: 'adventure', mela: isMonthlyMela(date) };
  const lock = await getLockState(current); if (lock.locked) return { kind: 'locked' };
  const history = await get('history', 'dailyCount'); const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; const count = history?.dayKey === dayKey ? history.count : 0;
  return { kind: isSessionAvailable(day, dayConfig, date, count) ? 'ready' : 'unavailable', day, schedule };
}
async function renderHome() {
  releaseMediaUrls();
  try {
    const status = await homeStatus();
    if (status.kind === 'adventure') { childFrame(status.mela ? 'Gaon Mela adventure' : 'Today is for an adventure', `<div class="hero-icon" aria-hidden="true">🧭</div><p class="sub">${status.mela ? 'Choose a favorite thing to notice or share together.' : 'Look for something lovely to explore together.'}</p>`); return; }
    if (status.kind === 'locked') { childFrame('See you next time', `<div class="hero-icon" aria-hidden="true">${companion.emoji}</div><p class="sub">Your learning time is resting now. We will be here next time.</p><svg width="112" height="76" viewBox="0 0 112 76" aria-hidden="true"><path d="M10 59c18-25 27-9 44-34 14 21 29 12 48 34" fill="none" stroke="#91b786" stroke-width="8" stroke-linecap="round"/><circle cx="56" cy="25" r="8" fill="#f1d794"/></svg>`); return; }
    if (status.kind === 'unavailable') { childFrame('A little pause', `<div class="hero-icon" aria-hidden="true">🌼</div><p class="sub">We will see you at the next learning time.</p>`); return; }
    const continuing = session && session.kind === 'session';
    childFrame(continuing ? `Welcome back, ${ESCAPE(companion.name)}!` : `Ready, ${ESCAPE(companion.name)}?`, `<div class="hero-icon" aria-hidden="true">${companion.emoji}</div><p class="sub">One little step at a time.</p><button id="start" class="primary">${continuing ? 'Continue' : 'Start'}</button>`);
    root.querySelector('#start').addEventListener('click', async () => { if (!continuing) session = await startSession({ at: await now() }); if (session.kind === 'session') await renderSession(); else renderHome(); });
  } catch (error) { showFatal(error); }
}
async function renderSession() {
  if (!session) return renderHome();
  clearInterval(timer); const step = session.steps[session.stepIndex]; if (!step) return renderHome();
  const isReady = Boolean(session.stepCompleted) || await now() - session.stepStartedAt >= step.minutes * 60000;
  const stepModule = getStepModule(step.id);
  const icon = { hello: '👋', rhyme: '🎵', revision: '🌿', theme: '🌈', story: '📖', goodbye: '🌻' }[step.id] ?? '🌱';
  const devTools = await devToolsVisible();
  childFrame(step.label, `${stepModule ? '<div id="step-content"></div>' : `<div class="hero-icon" aria-hidden="true">${icon}</div><p class="sub">${ESCAPE(companion.name)}, enjoy this little moment together.</p>`}<div class="progress-track" role="progressbar" aria-label="Step progress" aria-valuemin="0" aria-valuemax="100"><div id="progress" class="progress-fill"></div></div><p class="small">Stay here as long as you like. When you feel ready, tap below.</p><div class="stack">${isReady ? `<button id="next" class="primary">${session.stepIndex === session.steps.length - 1 ? 'Finish' : 'Next'}</button>` : '<button id="finish-step" class="primary">I am ready</button>'}${devTools ? '<button id="skip-time" class="secondary">Developer: skip this step time</button>' : ''}</div>`);
  if (stepModule) await stepModule(root.querySelector('#step-content'), { step, session, complete: () => advance(true) });
  root.querySelector('#next')?.addEventListener('click', () => advance(true));
  root.querySelector('#finish-step')?.addEventListener('click', async () => { session = { ...session, stepCompleted: true }; await markSessionActive(session); await renderSession(); });
  root.querySelector('#skip-time')?.addEventListener('click', () => advance(false, step.minutes));
  timer = setInterval(updateProgress, 1000); updateProgress();
}
async function devToolsVisible() { return Boolean((await get('settings', 'developerMode'))?.enabled); }
async function updateProgress() {
  if (!session || getState().screen === 'parent') return; const step = session.steps[session.stepIndex]; const current = await now(); const pct = Math.min(100, (current - session.stepStartedAt) / (step.minutes * 60000) * 100); const bar = root.querySelector('#progress');
  if (bar) { bar.style.width = `${pct}%`; bar.parentElement.setAttribute('aria-valuenow', `${Math.round(pct)}`); }
  if (pct >= 100 && !root.querySelector('#next')) { clearInterval(timer); await renderSession(); }
}
async function advance(completed, skipMinutes = 0) {
  if (!session) return;
  if (skipMinutes) { const currentOffset = (await get('settings', 'devClockOffset'))?.minutes ?? 0; await setDevOffset(currentOffset + skipMinutes, { parentUnlocked: false }); }
  const current = await now();
  const result = await advanceSession(session, { completed, at: current });
  if (result.done) { session = null; await incrementHistoryToday(); return renderHome(); }
  session = result.session; await markSessionActive(session, current); renderSession();
}
async function incrementHistoryToday() { const d = new Date(await now()); const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; const entry = await get('history', 'dailyCount'); if (!entry || entry.dayKey !== dayKey) await put('history', 'dailyCount', { dayKey, count: 1 }); }
function parentHeader() { return `<div class="screen-head"><h1>Parent area</h1><button id="home" class="quiet">Done</button></div>`; }
async function renderParent(message = '') {
  releaseMediaUrls();
  if (!message && quotaNotice) message = 'Device storage is full. Please ask a parent to free space.';
  if (!isParentUnlocked()) return renderHome(); touchParent(); clearInterval(timer); const schedule = await get('schedule', 'week') ?? defaultSchedule(); const dev = (await get('settings', 'developerMode'))?.enabled ?? false;
  setState({ screen: 'parent' });
  const cards = WEEKDAYS.map((name, day) => { const cfg = schedule[day]; return `<div class="day-card"><div class="day-title">${name}${dayPlan(day, cfg).kind === 'adventure' ? ' · Adventure card' : ''}</div><label class="inline"><input type="checkbox" data-day="${day}" data-field="enabled" ${cfg.enabled ? 'checked' : ''} ${day === 0 ? 'disabled' : ''}> Session available</label><label>Start time (optional)<input type="time" data-day="${day}" data-field="startTime" value="${cfg.startTime ?? ''}" ${day === 0 ? 'disabled' : ''}></label><label>Maximum sessions per day<select data-day="${day}" data-field="maxSessions" ${day === 0 ? 'disabled' : ''}>${[1,2,3].map(n => `<option value="${n}" ${cfg.maxSessions===n?'selected':''}>${n}</option>`).join('')}</select></label><label class="inline"><input type="checkbox" data-day="${day}" data-field="paused" ${cfg.paused ? 'checked' : ''} ${day === 0 ? 'disabled' : ''}> Pause this day</label><label class="inline"><input type="checkbox" data-day="${day}" data-field="skipped" ${cfg.skipped ? 'checked' : ''} ${day === 0 ? 'disabled' : ''}> Skip this day</label></div>`; }).join('');
  const meter = await estimateStorage();
  const reviewRecords = await get('progress', 'reviewMastery') ?? [];
  const summary = buildLearningSummary(reviewRecords);
  const dueToday = selectDailyReviews(reviewRecords).length;
  frame('', `${parentHeader()}${message ? errorBox(message) : ''}<p class="small">Changes stay on this device. Storage used: ${meter.usage == null ? 'not available' : `${(meter.usage / 1048576).toFixed(1)} MB`}.</p><div class="list"><h2>Learning summary</h2><p class="small">Practiced this week: ${summary.practicedThisWeek}. Familiar topics: ${summary.strong}. Reviews ready: ${dueToday}, capped at six quick prompts.</p><button id="data-tools" class="secondary">Storage, backup, and privacy</button><h2>Optional Smart Packs</h2><button id="smart-packs" class="secondary">Gemini pack settings</button><h2>Weekly schedule</h2>${cards}<button id="save-schedule">Save schedule</button><h2>Speech</h2><button id="voice-test" class="secondary">Voice check and settings</button><h2>Family recordings and moments</h2><button id="media-open" class="secondary">Manage local family media</button><button id="change-pin" class="secondary">Change parent PIN</button><button id="reset-pin" class="quiet">Forgot PIN? Reset</button><button id="override-lock" class="quiet">Resume learning today</button><button id="storage-permission" class="quiet">Request persistent storage</button><h2>App update</h2><p class="small">${updateReady ? 'An update is ready.' : 'No update is waiting.'}</p><button id="apply-update" class="secondary" ${!updateReady || session ? 'disabled' : ''}>Apply update${session ? ' after session' : ''}</button><h2>Developer tools</h2><label class="inline"><input id="dev-mode" type="checkbox" ${dev ? 'checked' : ''}> Enable developer mode</label>${dev ? '<div class="split"><button id="skip-time" class="secondary">Add 5 minutes</button><button id="simulate-end" class="secondary">Simulate session end</button></div><button id="clear-time" class="quiet">Clear time skip</button>' : ''}</div>`);
  root.querySelector('#home').addEventListener('click', () => { touchParent(); renderHome(); });
  root.querySelector('#save-schedule').addEventListener('click', saveSchedule);
  root.querySelector('#voice-test').addEventListener('click', renderVoiceTest);
  root.querySelector('#media-open').addEventListener('click', renderFamilyMedia);
  root.querySelector('#data-tools').addEventListener('click', renderDataTools);
  root.querySelector('#smart-packs').addEventListener('click', renderSmartPacks);
  root.querySelector('#change-pin').addEventListener('click', renderPinChange);
  root.querySelector('#reset-pin').addEventListener('click', renderReset);
  root.querySelector('#override-lock').addEventListener('click', async () => { await overrideLock({ parentUnlocked: isParentUnlocked() }); session = await resumeSession(); renderParent('Today’s lock was lifted.'); });
  root.querySelector('#storage-permission').addEventListener('click', async () => { const granted = await requestPersistentStorageForParent(); renderParent(granted ? 'Persistent storage was granted.' : 'Persistent storage is unavailable or was not granted.'); });
  root.querySelector('#apply-update').addEventListener('click', () => { if (!session && registration?.waiting) registration.waiting.postMessage({ type: 'APPLY_UPDATE' }); });
  root.querySelector('#dev-mode').addEventListener('change', async (event) => { await put('settings', 'developerMode', { enabled: event.target.checked }); if (!event.target.checked) { await clearDevOffset({ parentUnlocked: isParentUnlocked() }); session = await get('progress', 'activeSession'); } renderParent(); });
  root.querySelector('#skip-time')?.addEventListener('click', async () => { const current = (await get('settings', 'devClockOffset'))?.minutes ?? 0; await setDevOffset(current + 5, { parentUnlocked: isParentUnlocked() }); renderParent('Developer time advanced by 5 minutes.'); });
  root.querySelector('#clear-time')?.addEventListener('click', async () => { await clearDevOffset({ parentUnlocked: isParentUnlocked() }); session = await get('progress', 'activeSession'); renderParent('Developer time skip cleared.'); });
  root.querySelector('#simulate-end')?.addEventListener('click', async () => { const { endSession } = await import('../session/lock.js'); await endSession(schedule); session = null; renderHome(); });
}
async function renderVoiceTest() {
  const speech = globalThis.speechSynthesis;
  if (!speech || !globalThis.SpeechSynthesisUtterance) { frame('Speech voice check', `${parentHeader()}<p class="sub">This browser does not provide built-in speech voices. Learning can still continue.</p><button id="voice-back">Back</button>`); root.querySelector('#home').addEventListener('click', renderParent); root.querySelector('#voice-back').addEventListener('click', renderParent); return; }
  const voices = await waitForVoices(speech); const stored = await get('settings', 'speech') ?? { lang: 'hi-IN', rate: 0.68, pitch: 1.04 };
  const rows = voices.map((voice, i) => `<li>${ESCAPE(voice.name)} — ${ESCAPE(voice.lang)} — ${voice.localService ? 'on device' : 'system voice'} <button type="button" data-voice="${i}" class="quiet">Preview</button></li>`).join('');
  frame('Speech voice check', `${parentHeader()}<p class="sub">These voices are provided by this device. Boundary events are informational only; playback follows phrase end events.</p><label>Preferred language<select id="speech-lang"><option value="hi-IN" ${stored.lang==='hi-IN'?'selected':''}>Hindi</option><option value="en-IN" ${stored.lang==='en-IN'?'selected':''}>English</option></select></label><label>Speaking speed<input id="speech-rate" type="range" min="0.55" max="0.85" step="0.05" value="${stored.rate}"></label><label>Pitch<input id="speech-pitch" type="range" min="0.9" max="1.2" step="0.05" value="${stored.pitch}"></label><p id="speech-status" class="small">${voices.some(v=>v.lang?.toLowerCase().startsWith('hi-')) ? `${voices.length} device voices available.` : 'No Hindi voice was found. Please install a Hindi voice in device settings.'}</p><p id="speech-boundary" class="small">Boundary events: waiting for preview</p><ol class="voice-list">${rows || '<li>No voices are currently available.</li>'}</ol><button id="voice-back">Done</button>`);
  setState({ screen: 'parent' });
  root.querySelector('#home').addEventListener('click', renderParent); root.querySelector('#voice-back').addEventListener('click', renderParent);
  const player = createSpeechPlayer(speech, SpeechSynthesisUtterance, { onPhrase: (phrase) => { const status = root.querySelector('#speech-status'); if (status) status.textContent = `Speaking: ${phrase}`; }, onBoundary: (_event, phrase) => { const status = root.querySelector('#speech-boundary'); if (status) status.textContent = `Boundary event received during: ${phrase}`; } });
  root.querySelectorAll('[data-voice]').forEach((button) => button.addEventListener('click', async () => { const voice = voices[Number(button.dataset.voice)]; const lang = voice.lang || root.querySelector('#speech-lang').value; try { await player.speak('नमस्ते। Hello, let us learn together.', { lang, voice, rate: Number(root.querySelector('#speech-rate').value), pitch: Number(root.querySelector('#speech-pitch').value) }); } catch (error) { logError('Voice preview failed', error); const status = root.querySelector('#speech-status'); if (status) status.textContent = 'Voice preview could not play on this device.'; } }));
  root.querySelector('#speech-lang').addEventListener('change', async (event) => { const next = { ...stored, lang: event.target.value }; await put('settings', 'speech', next); });
  for (const key of ['rate', 'pitch']) root.querySelector(`#speech-${key}`).addEventListener('change', async (event) => { stored[key] = Number(event.target.value); await put('settings', 'speech', stored); });
}
async function renderFamilyMedia(message = '') {
  if (!isParentUnlocked()) return renderHome();
  releaseMediaUrls();
  const items = await listFamilyMedia(); const meter = await estimateStorage();
  const cards = items.map((item) => `<article class="media-card"><strong>${item.type === 'audio' ? 'Voice clip · ' + ESCAPE(item.speaker || 'Family member') : ESCAPE(item.label || 'Mission moment')}</strong><p class="small">${new Date(item.createdAt).toLocaleDateString()}</p>${item.type === 'audio' ? `<audio controls data-play="${ESCAPE(item.id)}"></audio>` : `<img class="media-photo" data-photo="${ESCAPE(item.id)}" alt="Locally saved mission moment">`}<button type="button" class="quiet" data-delete-media="${ESCAPE(item.id)}">Delete from this device</button></article>`).join('');
  frame('Family media', `${parentHeader()}${message ? errorBox(message) : ''}<p class="small">Recordings and optional photos stay on this device and are not included in backups. Storage used: ${meter.usage == null ? 'not available' : (meter.usage / 1048576).toFixed(1) + ' MB'}.</p><div class="stack"><h2>Family voice</h2><p class="small">A parent may record a short story or sound. Recording stops after one minute, or tap Stop and save.</p><label>Speaker tag<select id="media-speaker"><option>Family member</option><option>Adult voice 1</option><option>Adult voice 2</option></select></label><button id="record-toggle" class="secondary">${activeRecording ? 'Stop and save recording' : 'Start recording'}</button><p id="record-status" class="small" aria-live="polite">${activeRecording ? 'Recording is active.' : ''}</p><h2>Optional mission photo</h2><form id="photo-form" class="stack"><label>Choose a photo from this device<input name="photo" type="file" accept="image/*" capture="environment"></label><button type="submit">Resize and save photo on this device</button></form><h2>Saved family media</h2><div class="media-list">${cards || '<p class="small">No saved recordings or photos yet.</p>'}</div></div>`);
  setState({ screen: 'parent' });
  root.querySelector('#home').addEventListener('click', () => { if (activeRecording) { activeRecording.cancel(); activeRecording = null; } renderParent(); });
  root.querySelectorAll('[data-play]').forEach((audio) => { const item = items.find((entry) => entry.id === audio.dataset.play); if (item?.blob) { const url = URL.createObjectURL(item.blob); mediaURLs.push(url); audio.src = url; } });
  root.querySelectorAll('[data-photo]').forEach((img) => { const item = items.find((entry) => entry.id === img.dataset.photo); if (item?.blob) { const url = URL.createObjectURL(item.blob); mediaURLs.push(url); img.src = url; } });
  root.querySelectorAll('[data-delete-media]').forEach((button) => button.addEventListener('click', async () => { if (!window.confirm('Delete this item from this device?')) return; try { await deleteFamilyMedia(items.find((item) => item.id === button.dataset.deleteMedia)); renderFamilyMedia('Item deleted from this device.'); } catch (error) { logError('Media deletion failed', error); renderFamilyMedia('This item could not be deleted. Please try again.'); } }));
  root.querySelector('#record-toggle').addEventListener('click', async () => {
    const status = root.querySelector('#record-status');
    try {
      if (activeRecording) { await activeRecording.stop(); activeRecording = null; clearTimeout(mediaTimer); renderFamilyMedia('Recording saved on this device.'); }
      else { activeRecording = await beginFamilyRecording({ speaker: root.querySelector('#media-speaker').value }); status.textContent = 'Recording is active. Tap Stop and save when finished.'; root.querySelector('#record-toggle').textContent = 'Stop and save recording'; mediaTimer = setTimeout(async () => { try { await activeRecording?.stop(); activeRecording = null; renderFamilyMedia('One-minute recording saved on this device.'); } catch (error) { logError('Recording could not be saved', error); activeRecording = null; renderFamilyMedia('Recording could not be saved. Please try again.'); } }, 60_000); }
    } catch (error) { logError('Family recording failed', error); activeRecording = null; renderFamilyMedia('Recording is unavailable. Check microphone permission and try again.'); }
  });
  root.querySelector('#photo-form').addEventListener('submit', async (event) => {
    event.preventDefault(); const file = new FormData(event.currentTarget).get('photo');
    if (!file?.size) return renderFamilyMedia('Choose a photo first.');
    if (file.size > 25 * 1024 * 1024) return renderFamilyMedia('Choose a photo smaller than 25 MB.');
    try { await saveMissionPhoto(file); renderFamilyMedia('Photo resized and saved on this device.'); }
    catch (error) { logError('Mission photo could not be saved', error); renderFamilyMedia('Photo could not be saved. Please try another image.'); }
  });
}
async function renderDataTools(message = '') {
  if (!isParentUnlocked()) return renderHome();
  const counts = {};
  for (const store of [...BACKUP_STORES, 'recordings', 'vault']) counts[store] = (await entries(store)).length;
  const meter = await estimateStorage();
  const rows = Object.entries({ settings: 'Settings', schedule: 'Schedule', progress: 'Learning progress', history: 'Session history', journal: 'Mission notes', recordings: 'Family recordings', vault: 'Encrypted vault' }).map(([store, label]) => `<li>${label}: ${counts[store]} records</li>`).join('');
  frame('Storage and privacy', `${parentHeader()}${message ? errorBox(message) : ''}<p class="small">Estimated device storage: ${meter.usage == null ? 'not available' : (meter.usage / 1048576).toFixed(1) + ' MB'} of ${meter.quota == null ? 'unknown' : (meter.quota / 1048576).toFixed(0) + ' MB'}.</p><ul class="storage-categories">${rows}</ul><p class="small">Use media controls to review and delete individual recordings or photos. Backups omit the parent PIN/hash, encrypted vault, recordings, and photos.</p><button id="media-cleanup" class="secondary">Review and clean up local media</button><button id="backup-export">Download local backup</button><form id="backup-import" class="stack"><label>Choose a Nanhe Kadam backup<input name="backup" type="file" accept="application/json,.json"></label><button type="submit">Validate and restore backup</button></form><h2>Privacy on this device</h2><p class="small">There are no accounts, analytics, advertisements, or tracking. PIN, progress, settings, recordings, and mission photos are stored locally. This app does not send family media or journal notes to a service.</p><h2>Credits</h2><p class="small">App icons and four companion illustrations are original local project artwork. No remote fonts, stock media, or third-party scripts are used.</p>`);
  setState({ screen: 'parent' });
  root.querySelector('#home').addEventListener('click', renderParent);
  root.querySelector('#media-cleanup').addEventListener('click', renderFamilyMedia);
  root.querySelector('#backup-export').addEventListener('click', async () => {
    try {
      const datasets = {};
      for (const store of BACKUP_STORES) datasets[store] = await entries(store);
      const backup = createBackup(datasets);
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })); mediaURLs.push(url);
      const link = document.createElement('a'); link.href = url; link.download = 'nanhe-kadam-backup.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { logError('Backup export failed', error); renderDataTools('The backup could not be created. Please try again.'); }
  });
  root.querySelector('#backup-import').addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get('backup');
    if (!file?.size) return renderDataTools('Choose a backup file first.');
    if (file.size > 10 * 1024 * 1024) return renderDataTools('Choose a backup smaller than 10 MB.');
    try {
      const backup = JSON.parse(await file.text()); const errors = validateBackup(backup);
      if (errors.length) { console.warn('[Nanhe Kadam] Backup validation details', errors); return renderDataTools('This file is not a valid Nanhe Kadam backup. No data was changed.'); }
      if (!window.confirm('Restore validated records from this backup? Matching records will be replaced; records not in the file stay on this device.')) return;
      const result = await restoreBackup(backup, put);
      renderDataTools(`Backup restored. ${result.restoredRecords} records were applied.`);
    } catch (error) { logError('Backup restore failed', error); renderDataTools('The backup could not be restored. No raw file or device error is shown.'); }
  });
}
async function renderSmartPacks(message = '', draft = null) {
  if (!isParentUnlocked()) return renderHome();
  const config = await get('settings', 'smartPacks') ?? { enabled: false, model: DEFAULT_GEMINI_MODEL };
  const keySaved = await hasGeminiKey({ parentUnlocked: isParentUnlocked() });
  const preview = draft ? `<section class="pack-preview"><h2>Generated draft · review both languages</h2><p><strong>${ESCAPE(draft.title.en)}</strong><br>${ESCAPE(draft.title.hi)}</p><p>${ESCAPE(draft.question.en)}<br>${ESCAPE(draft.question.hi)}</p><ol>${draft.options.map((option) => `<li>${ESCAPE(option.en)} / ${ESCAPE(option.hi)}</li>`).join('')}</ol><p>Hint: ${ESCAPE(draft.hint.en)} / ${ESCAPE(draft.hint.hi)}</p><p>Mission: ${ESCAPE(draft.mission.en)} / ${ESCAPE(draft.mission.hi)}</p><p class="small">The automated safety review passed. Read this draft yourself before it appears in a child session.</p><button id="pack-approve">Approve for local learning</button><button id="pack-discard" class="quiet">Discard draft</button></section>` : '';
  frame('Optional Smart Packs', `${parentHeader()}${message ? errorBox(message) : ''}<p class="small">This optional tool sends only a fixed topic prompt and generated pack text to Google. It never sends a child's name, notes, photos, or recordings. Requests need internet access and may use your API quota.</p><p class="small">A key saved here is encrypted at rest. Since this app runs in a browser, it can still be read at runtime; Google recommends server-side keys for production.</p><p class="small">Saved API key: ${keySaved ? 'encrypted on this device' : 'none'}</p><form id="gemini-key-form" class="stack"><label>Paste or replace your Gemini API key<input name="key" type="password" autocomplete="off" maxlength="512" placeholder="Key stays masked"></label><button type="submit">Encrypt and save key</button></form>${keySaved ? '<button id="gemini-key-delete" class="quiet">Remove saved key</button>' : ''}<label class="inline"><input id="smart-enabled" type="checkbox" ${config.enabled && keySaved ? 'checked' : ''}> Enable Smart Packs (off by default)</label><label>Model ID<input id="smart-model" value="${ESCAPE(config.model || DEFAULT_GEMINI_MODEL)}" maxlength="80"></label><label>Topic<select id="smart-theme"><option value="language">Language and sounds</option><option value="numbers">Counting</option><option value="nature">Nature</option><option value="shapes">Shapes</option><option value="feelings">Feelings</option><option value="kindness">Kindness</option></select></label><button id="pack-generate" ${!config.enabled || !keySaved ? 'disabled' : ''}>Generate and safety-check draft</button><div id="pack-preview">${preview}</div>`);
  setState({ screen: 'parent' });
  root.querySelector('#home').addEventListener('click', renderParent);
  root.querySelector('#gemini-key-form').addEventListener('submit', async (event) => {
    event.preventDefault(); const key = new FormData(event.currentTarget).get('key');
    try { await saveGeminiKey(key, { parentUnlocked: isParentUnlocked() }); renderSmartPacks('API key encrypted on this device.'); }
    catch (error) { logError('Gemini key encryption failed', error); renderSmartPacks('The key could not be saved. Check it and try again.'); }
  });
  root.querySelector('#gemini-key-delete')?.addEventListener('click', async () => {
    if (!window.confirm('Remove the encrypted key and turn off Smart Packs?')) return;
    try { await deleteGeminiKey({ parentUnlocked: isParentUnlocked() }); await put('settings', 'smartPacks', { ...config, enabled: false }); renderSmartPacks('Saved API key removed.'); }
    catch (error) { logError('Gemini key removal failed', error); renderSmartPacks('The saved key could not be removed.'); }
  });
  root.querySelector('#smart-enabled').addEventListener('change', async (event) => {
    if (event.target.checked && !keySaved) return renderSmartPacks('Save an API key before enabling this optional feature.');
    await put('settings', 'smartPacks', { enabled: event.target.checked, model: root.querySelector('#smart-model').value.trim() || DEFAULT_GEMINI_MODEL });
    renderSmartPacks(event.target.checked ? 'Smart Packs enabled for parent use.' : 'Smart Packs disabled.');
  });
  root.querySelector('#smart-model').addEventListener('change', async (event) => { await put('settings', 'smartPacks', { ...config, model: event.target.value.trim() || DEFAULT_GEMINI_MODEL }); });
  root.querySelector('#pack-generate').addEventListener('click', async () => {
    if (!config.enabled || !keySaved) return;
    const button = root.querySelector('#pack-generate'); button.disabled = true; button.textContent = 'Creating a draft…';
    try { const apiKey = await readGeminiKey({ parentUnlocked: isParentUnlocked() }); const generated = await generateReviewedPack({ apiKey, model: root.querySelector('#smart-model').value.trim(), themeId: root.querySelector('#smart-theme').value }); renderSmartPacks('Safety review passed. Please review and approve the draft.', generated); }
    catch (error) { logError('Gemini pack generation failed', error); renderSmartPacks(error?.name === 'SmartPackRejectedError' ? 'The automated review did not approve this draft. Nothing was saved.' : 'A draft could not be created. Check the connection, key, and model, then try again.'); }
  });
  root.querySelector('#pack-approve')?.addEventListener('click', async () => {
    const approved = await get('settings', 'approvedSmartPacks') ?? [];
    await put('settings', 'approvedSmartPacks', [{ ...draft, approved: true }, ...approved].slice(0, 20));
    renderSmartPacks('Pack approved and saved locally for learning sessions.');
  });
  root.querySelector('#pack-discard')?.addEventListener('click', () => renderSmartPacks('Draft discarded without saving.'));
}
async function saveSchedule() {
  const schedule = await get('schedule', 'week') ?? defaultSchedule();
  root.querySelectorAll('[data-day][data-field]').forEach((field) => { const day = Number(field.dataset.day), key = field.dataset.field; schedule[day][key] = field.type === 'checkbox' ? field.checked : key === 'maxSessions' ? Number(field.value) : field.value || null; });
  await put('schedule', 'week', schedule); renderParent('Weekly schedule saved.');
}
function renderPinChange(message = '') {
  frame('Change parent PIN', `${message ? errorBox(message) : ''}<form id="change-form" class="stack"><label>Current PIN<input name="old" type="password" inputmode="numeric" required></label><label>New PIN<input name="next" type="password" inputmode="numeric" pattern="[0-9]{4,6}" required></label><label>Confirm new PIN<input name="confirm" type="password" inputmode="numeric" pattern="[0-9]{4,6}" required></label><button>Save new PIN</button><button type="button" id="back" class="quiet">Cancel</button></form>`); root.querySelector('#back').addEventListener('click', renderParent);
  root.querySelector('#change-form').addEventListener('submit', async (event) => { event.preventDefault(); const f = new FormData(event.currentTarget); try { await changePin(f.get('old'), f.get('next'), f.get('confirm')); renderParent('Parent PIN updated.'); } catch (error) { logError('PIN update failed', error); renderPinChange('We could not update the PIN. Check the details and try again.'); } });
}
function renderReset(message = '', fromPin = false) {
  frame('Reset parent PIN', `<p class="sub">Resetting removes the PIN and permanently deletes any optional vault data. This information cannot be recovered. Learning progress is kept unless you choose to erase everything.</p>${message ? errorBox(message) : ''}<form id="reset-form" class="stack"><label>Step 1: type RESET<input name="first" autocomplete="off" required></label><label>Step 2: type RESET NANHE KADAM<input name="final" autocomplete="off" required></label><label class="inline"><input type="checkbox" name="wipe"> Also erase progress and history</label><button>Confirm reset</button><button type="button" id="back" class="quiet">Cancel</button></form>`); setState({ screen: fromPin ? 'reset' : 'parent' }); root.querySelector('#back').addEventListener('click', () => fromPin ? renderPin(false) : renderParent());
  root.querySelector('#reset-form').addEventListener('submit', async (event) => { event.preventDefault(); const f = new FormData(event.currentTarget); try { await resetPin({ firstConfirmation: f.get('first'), finalConfirmation: f.get('final'), wipeProgress: f.has('wipe') }); renderPin(true, 'PIN reset. Set a new parent PIN.'); } catch (error) { logError('PIN reset failed', error); renderReset('We could not complete the reset. Check both confirmations and try again.', fromPin); } });
}
function renderSessionResumePrompt() { /* Sessions resume directly within the engine's 30-minute window. */ }
registerLearningActivities();
init();








