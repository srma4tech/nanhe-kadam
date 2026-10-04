import { get, put, del, clearStore, clearAll } from '../core/storage.js';
import { now } from '../core/clock.js';
export const PIN_KEY = 'parentPin';
export const ATTEMPT_KEY = 'pinAttempts';
export const PIN_ITERATIONS = 210000;
export const PARENT_IDLE_MS = 5 * 60 * 1000;
export const BACKOFF_MS = [30_000, 120_000, 600_000, 1_800_000];
let unlockedUntil = 0;
export function isValidPin(pin) { return typeof pin === 'string' && /^\d{4,6}$/.test(pin); }
export function nextThrottle(attempts, currentTime) {
  const count = attempts.count + 1;
  if (count < 5) return { count, level: attempts.level ?? 0, blockUntil: attempts.blockUntil ?? 0 };
  const level = Math.min((attempts.level ?? 0), BACKOFF_MS.length - 1);
  return { count: 0, level: Math.min(level + 1, BACKOFF_MS.length - 1), blockUntil: currentTime + BACKOFF_MS[level] };
}
export function constantTimeEqual(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array) || a.length !== b.length) return false;
  let mismatch = 0; for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i]; return mismatch === 0;
}
async function derive(pin, salt, iterations = PIN_ITERATIONS) {
  const encoder = new TextEncoder(); const material = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, 256));
}
export async function hasPin() { return Boolean(await get('settings', PIN_KEY)); }
export async function setPin(pin, confirmation) {
  if (!isValidPin(pin) || pin !== confirmation) throw new Error('Enter a matching PIN with 4 to 6 digits.');
  const salt = crypto.getRandomValues(new Uint8Array(16)); const hash = await derive(pin, salt);
  await put('settings', PIN_KEY, { salt: [...salt], iterations: PIN_ITERATIONS, hash: [...hash] });
  await put('settings', ATTEMPT_KEY, { count: 0, level: 0, blockUntil: 0 });
}
export async function verifyPin(pin) {
  if (!isValidPin(pin)) return { ok: false, error: 'Enter 4 to 6 digits.' };
  const current = await now(); let attempt = await get('settings', ATTEMPT_KEY) ?? { count: 0, level: 0, blockUntil: 0 };
  if (current < (attempt.blockUntil ?? 0)) return { ok: false, lockedFor: attempt.blockUntil - current };
  const saved = await get('settings', PIN_KEY); if (!saved) return { ok: false, error: 'Set up a parent PIN first.' };
  const candidate = await derive(pin, new Uint8Array(saved.salt), saved.iterations);
  if (constantTimeEqual(candidate, new Uint8Array(saved.hash))) {
    await put('settings', ATTEMPT_KEY, { count: 0, level: 0, blockUntil: 0 }); unlockedUntil = performance.now() + PARENT_IDLE_MS; return { ok: true };
  }
  attempt = nextThrottle(attempt, current); await put('settings', ATTEMPT_KEY, attempt);
  return { ok: false, lockedFor: attempt.blockUntil > current ? attempt.blockUntil - current : 0 };
}
export function isParentUnlocked() { return performance.now() < unlockedUntil; }
export function touchParent() { if (isParentUnlocked()) unlockedUntil = performance.now() + PARENT_IDLE_MS; }
export function lockParent() { unlockedUntil = 0; }
export async function changePin(oldPin, newPin, confirmation) {
  const result = await verifyPin(oldPin); if (!result.ok) throw new Error(result.lockedFor ? `Try again in ${Math.ceil(result.lockedFor / 1000)} seconds.` : 'The current PIN is not correct.');
  await setPin(newPin, confirmation);
}
export async function resetPin({ firstConfirmation, finalConfirmation, wipeProgress = false } = {}) {
  if (firstConfirmation !== 'RESET' || finalConfirmation !== 'RESET NANHE KADAM') throw new Error('Complete both reset confirmations to continue.');
  await clearStore('vault'); await del('settings', PIN_KEY); await del('settings', ATTEMPT_KEY); lockParent();
  if (wipeProgress) await clearAll();
  return { keptProgress: !wipeProgress };
}
export async function requestPersistentStorageForParent() {
  if (!isParentUnlocked()) throw new Error('Parent authentication is required.');
  return navigator.storage?.persist ? navigator.storage.persist().catch(() => false) : false;
}


