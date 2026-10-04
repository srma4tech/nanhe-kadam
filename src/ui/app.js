import { get, put, del, estimateStorage } from '../core/storage.js';
import { now, setDevOffset, clearDevOffset } from '../core/clock.js';
import { getState, setState } from '../core/state.js';
import { hasPin, setPin, verifyPin, changePin, resetPin, isParentUnlocked, touchParent, lockParent, requestPersistentStorageForParent, PARENT_IDLE_MS } from '../parent/pin.js';
import { defaultSchedule, WEEKDAYS, isSessionAvailable, dayPlan, isLightDay } from '../session/schedule.js';
import { startSession, resumeSession, advanceSession, markSessionActive, getStepModule } from '../session/engine.js';
import { getLockState, overrideLock } from '../session/lock.js';

const root = document.querySelector('#app');
const ESCAPE = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let timer; let parentTouchTimer; let registration; let quotaNotice = false; let companion = { name: 'Little friend', emoji: '🌱' };
let session = null; let selectedEmoji = '🌱'; let updateReady = false;
const EMOJIS = ['🌱', '🐦', '🐰', '🐢'];
function frame(title, body, cls = '') { setState({ screen: title === 'Parent area' || title === 'Change parent PIN' || title === 'Reset parent PIN' ? 'parent' : title === 'Parent setup' ? 'pin' : title === 'Choose a companion' ? 'setup' : title ? 'child' : getState().screen }); root.innerHTML = `<section class="screen ${cls}"><div class="brand"><img src="./assets/icon-192.png" alt=""><span>Nanhe Kadam</span></div>${title ? `<h1 class="title">${title}</h1>` : ''}${body}</section>`; }
function errorBox(message) { return `<p class="error" role="alert">${ESCAPE(message)}</p>`; }
function attachParentHold() {
  const target = document.createElement('button'); target.className = 'parent-corner'; target.setAttribute('aria-label', 'Parent area'); target.title = 'Hold for parent area'; root.append(target);
  const begin = (event) => { event.preventDefault(); clearTimeout(parentTouchTimer); parentTouchTimer = setTimeout(() => { lockParent(); renderPin(); }, 3000); };
  const cancel = () => clearTimeout(parentTouchTimer);
  target.addEventListener('pointerdown', begin); ['pointerup', 'pointercancel', 'pointerleave'].forEach((name) => target.addEventListener(name, cancel));
}
function childFrame(title, content) { frame(title, content, 'center'); attachParentHold(); }
function installVisibilityLock() { window.addEventListener('unhandledrejection', (event) => { if (event.reason?.name === 'StorageQuotaError') { event.preventDefault(); quotaNotice = true; if (getState().screen === 'parent' && isParentUnlocked()) renderParent('Device storage is full. Please free space and try again.'); } }); root.addEventListener('pointerdown', (event) => { if (getState().screen === 'parent') { if (isParentUnlocked()) touchParent(); else { event.stopImmediatePropagation(); renderHome(); } } }, true); root.addEventListener('keydown', () => { if (getState().screen === 'parent' && isParentUnlocked()) touchParent(); }, true); document.addEventListener('visibilitychange', () => { if (document.hidden) { lockParent(); if (getState().screen === 'parent') renderHome(); } }); setInterval(() => { if (getState().screen === 'parent' && !isParentUnlocked()) renderHome(); }, 5000); }
async function init() {
  try {
    registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.register('./sw.js') : null;
    if (registration) {
      registration.addEventListener('updatefound', () => { const worker = registration.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) updateReady = true; }); });
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
    }
    installVisibilityLock();
      if (!await hasPin()) return renderPin(true);
    const saved = await get('settings', 'companion'); if (!saved) return renderCompanion(); companion = saved;
    session = await resumeSession(); if (session) return renderSession();
    await ensureSchedule(); renderHome();
  } catch (error) { showFatal(error); }
}
async function ensureSchedule() { if (!await get('schedule', 'week')) await put('schedule', 'week', defaultSchedule()); }
function showFatal(error) { frame('A little pause', `<p class="sub">The app could not open its local information. Please ask a parent to reopen it.</p>${error?.name === 'StorageQuotaError' ? errorBox('Device storage is full. A parent can free space and try again.') : ''}`, 'center'); }
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
    } catch (error) { renderPin(setup, error.message); }
  });
}
function renderCompanion(fromParent = false) {
  selectedEmoji = companion.emoji; const options = EMOJIS.map((emoji) => `<button class="emoji-choice ${emoji === selectedEmoji ? 'selected' : ''}" type="button" data-emoji="${emoji}" aria-label="Choose ${emoji}">${emoji}</button>`).join('');
  frame('Choose a companion', `<p class="sub">Give your learning companion a name. Please do not use a child's name.</p><form id="companion-form" class="stack"><label>Companion name<input name="name" maxlength="24" value="${ESCAPE(companion.name)}" required></label><div class="emoji-options" aria-label="Choose a companion">${options}</div><button type="submit">Save and continue</button></form>`, 'center');
  if (fromParent) setState({ screen: 'parent' });
  root.querySelectorAll('[data-emoji]').forEach((button) => button.addEventListener('click', () => { selectedEmoji = button.dataset.emoji; root.querySelectorAll('[data-emoji]').forEach((choice) => choice.classList.toggle('selected', choice === button)); }));
  root.querySelector('#companion-form').addEventListener('submit', async (event) => { event.preventDefault(); const name = new FormData(event.currentTarget).get('name').trim(); if (!name) return; companion = { name, emoji: selectedEmoji }; await put('settings', 'companion', companion); await ensureSchedule(); if (fromParent) renderParent(); else renderHome(); });
}
async function homeStatus() {
  const current = await now(); const date = new Date(current); const day = date.getDay(); const schedule = await get('schedule', 'week') ?? defaultSchedule(); const dayConfig = schedule[day] ?? defaultSchedule()[day];
  if (day === 0) return { kind: 'adventure' };
  const lock = await getLockState(current); if (lock.locked) return { kind: 'locked' };
  const history = await get('history', 'dailyCount'); const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; const count = history?.dayKey === dayKey ? history.count : 0;
  return { kind: isSessionAvailable(day, dayConfig, date, count) ? 'ready' : 'unavailable', day, schedule };
}
async function renderHome() {
  try {
    const status = await homeStatus();
    if (status.kind === 'adventure') { childFrame('Today is for an adventure', `<div class="hero-icon" aria-hidden="true">🧭</div><p class="sub">Look for something lovely to explore together.</p>`); return; }
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
  if (!message && quotaNotice) message = 'Device storage is full. Please ask a parent to free space.';
  if (!isParentUnlocked()) return renderHome(); touchParent(); clearInterval(timer); const schedule = await get('schedule', 'week') ?? defaultSchedule(); const dev = (await get('settings', 'developerMode'))?.enabled ?? false;
  setState({ screen: 'parent' });
  const cards = WEEKDAYS.map((name, day) => { const cfg = schedule[day]; return `<div class="day-card"><div class="day-title">${name}${dayPlan(day, cfg).kind === 'adventure' ? ' · Adventure card' : ''}</div><label class="inline"><input type="checkbox" data-day="${day}" data-field="enabled" ${cfg.enabled ? 'checked' : ''} ${day === 0 ? 'disabled' : ''}> Session available</label><label>Start time (optional)<input type="time" data-day="${day}" data-field="startTime" value="${cfg.startTime ?? ''}" ${day === 0 ? 'disabled' : ''}></label><label>Maximum sessions per day<select data-day="${day}" data-field="maxSessions" ${day === 0 ? 'disabled' : ''}>${[1,2,3].map(n => `<option value="${n}" ${cfg.maxSessions===n?'selected':''}>${n}</option>`).join('')}</select></label><label class="inline"><input type="checkbox" data-day="${day}" data-field="paused" ${cfg.paused ? 'checked' : ''} ${day === 0 ? 'disabled' : ''}> Pause this day</label><label class="inline"><input type="checkbox" data-day="${day}" data-field="skipped" ${cfg.skipped ? 'checked' : ''} ${day === 0 ? 'disabled' : ''}> Skip this day</label></div>`; }).join('');
  const meter = await estimateStorage(); frame('', `${parentHeader()}${message ? errorBox(message) : ''}<p class="small">Changes stay on this device. Storage used: ${meter.usage == null ? 'not available' : `${(meter.usage / 1048576).toFixed(1)} MB`}.</p><div class="list"><h2>Weekly schedule</h2>${cards}<button id="save-schedule">Save schedule</button><button id="change-pin" class="secondary">Change parent PIN</button><button id="reset-pin" class="quiet">Forgot PIN? Reset</button><button id="override-lock" class="quiet">Resume learning today</button><button id="storage-permission" class="quiet">Request persistent storage</button><h2>App update</h2><p class="small">${updateReady ? 'An update is ready.' : 'No update is waiting.'}</p><button id="apply-update" class="secondary" ${!updateReady || session ? 'disabled' : ''}>Apply update${session ? ' after session' : ''}</button><h2>Developer tools</h2><label class="inline"><input id="dev-mode" type="checkbox" ${dev ? 'checked' : ''}> Enable developer mode</label>${dev ? '<div class="split"><button id="skip-time" class="secondary">Add 5 minutes</button><button id="simulate-end" class="secondary">Simulate session end</button></div><button id="clear-time" class="quiet">Clear time skip</button>' : ''}</div>`);
  root.querySelector('#home').addEventListener('click', () => { touchParent(); renderHome(); });
  root.querySelector('#save-schedule').addEventListener('click', saveSchedule);
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
async function saveSchedule() {
  const schedule = await get('schedule', 'week') ?? defaultSchedule();
  root.querySelectorAll('[data-day][data-field]').forEach((field) => { const day = Number(field.dataset.day), key = field.dataset.field; schedule[day][key] = field.type === 'checkbox' ? field.checked : key === 'maxSessions' ? Number(field.value) : field.value || null; });
  await put('schedule', 'week', schedule); renderParent('Weekly schedule saved.');
}
function renderPinChange(message = '') {
  frame('Change parent PIN', `${message ? errorBox(message) : ''}<form id="change-form" class="stack"><label>Current PIN<input name="old" type="password" inputmode="numeric" required></label><label>New PIN<input name="next" type="password" inputmode="numeric" pattern="[0-9]{4,6}" required></label><label>Confirm new PIN<input name="confirm" type="password" inputmode="numeric" pattern="[0-9]{4,6}" required></label><button>Save new PIN</button><button type="button" id="back" class="quiet">Cancel</button></form>`); root.querySelector('#back').addEventListener('click', renderParent);
  root.querySelector('#change-form').addEventListener('submit', async (event) => { event.preventDefault(); const f = new FormData(event.currentTarget); try { await changePin(f.get('old'), f.get('next'), f.get('confirm')); renderParent('Parent PIN updated.'); } catch (error) { renderPinChange(error.message); } });
}
function renderReset(message = '', fromPin = false) {
  frame('Reset parent PIN', `<p class="sub">Resetting removes the PIN and permanently deletes any optional vault data. This information cannot be recovered. Learning progress is kept unless you choose to erase everything.</p>${message ? errorBox(message) : ''}<form id="reset-form" class="stack"><label>Step 1: type RESET<input name="first" autocomplete="off" required></label><label>Step 2: type RESET NANHE KADAM<input name="final" autocomplete="off" required></label><label class="inline"><input type="checkbox" name="wipe"> Also erase progress and history</label><button>Confirm reset</button><button type="button" id="back" class="quiet">Cancel</button></form>`); setState({ screen: fromPin ? 'reset' : 'parent' }); root.querySelector('#back').addEventListener('click', () => fromPin ? renderPin(false) : renderParent());
  root.querySelector('#reset-form').addEventListener('submit', async (event) => { event.preventDefault(); const f = new FormData(event.currentTarget); try { await resetPin({ firstConfirmation: f.get('first'), finalConfirmation: f.get('final'), wipeProgress: f.has('wipe') }); renderPin(true, 'PIN reset. Set a new parent PIN.'); } catch (error) { renderReset(error.message); } });
}
function renderSessionResumePrompt() { /* Sessions resume directly within the engine's 30-minute window. */ }
init();






