import { get, put, del } from './storage.js';
export const CLOCK_KEY = 'clock';
export const BACKWARD_TAMPER_MS = 2 * 60 * 1000;
export function effectiveTimestamp(deviceNow, lastSeenMax) {
  if (lastSeenMax == null) return deviceNow;
  if (deviceNow < lastSeenMax - BACKWARD_TAMPER_MS) return lastSeenMax;
  return Math.max(deviceNow, lastSeenMax);
}
export async function now() {
  const deviceNow = Date.now(); const saved = await get('settings', CLOCK_KEY); const effective = effectiveTimestamp(deviceNow, saved?.lastSeenMax ?? null);
  if (!saved || effective > saved.lastSeenMax) await put('settings', CLOCK_KEY, { lastSeenMax: effective });
  const devMode = await get('settings', 'developerMode'); const offset = devMode?.enabled ? (await get('settings', 'devClockOffset'))?.minutes ?? 0 : 0;
  return effective + offset * 60000;
}
export async function setDevOffset(minutes, { parentUnlocked = false } = {}) {
  if (!parentUnlocked && !(await get('settings', 'developerMode'))?.enabled) throw new Error('Enable developer mode from the parent area first.');
  if (!Number.isFinite(minutes) || Math.abs(minutes) > 1440) throw new RangeError('Time offset must be within one day.');
  await put('settings', 'devClockOffset', { minutes });
}
export async function clearDevOffset({ parentUnlocked = false } = {}) {
  if (!parentUnlocked && !(await get('settings', 'developerMode'))?.enabled) throw new Error('Enable developer mode from the parent area first.');
  await del('settings', 'devClockOffset');
  const active = await get('progress', 'activeSession'); const saved = await get('settings', CLOCK_KEY);
  if (active) { const current = effectiveTimestamp(Date.now(), saved?.lastSeenMax ?? null); await put('progress', 'activeSession', { ...active, stepStartedAt: current, lastActivityAt: current, stepCompleted: false }); }
}


