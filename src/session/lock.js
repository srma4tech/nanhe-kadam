import { get, put } from '../core/storage.js';
import { now } from '../core/clock.js';
import { nextStartTimestamp } from './schedule.js';
export const LOCK_KEY = 'sessionLock';
export function calculateLockedUntil(completedAt, schedule, sessionsToday = 1) {
  const day = new Date(completedAt).getDay(); const config = schedule?.[day];
  if (config?.enabled && !config.paused && !config.skipped && sessionsToday < (config.maxSessions ?? 1)) {
    if (!config.startTime) return completedAt;
    const [hour, minute] = config.startTime.split(':').map(Number); const sameDayStart = new Date(completedAt); sameDayStart.setHours(hour, minute, 0, 0);
    if (sameDayStart.getTime() > completedAt) return sameDayStart.getTime();
    return completedAt;
  }
  const next = nextStartTimestamp(schedule, completedAt);
  if (next != null) return next;
  const end = new Date(completedAt); end.setHours(23, 59, 59, 999); return end.getTime();
}
export async function endSession(schedule, at = null) {
  const endedAt = at ?? await now(); const date = new Date(endedAt); const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const completed = await get('history', 'dailyCount'); const sessionsToday = (completed?.dayKey === dayKey ? completed.count : 0) + 1;
  const lock = { lockedUntil: calculateLockedUntil(endedAt, schedule, sessionsToday), endedAt };
  await put('history', LOCK_KEY, lock); await put('progress', 'activeSession', null); return lock;
}
export async function getLockState(at = null) {
  const value = await get('history', LOCK_KEY); const current = at ?? await now();
  return { locked: Boolean(value && current < value.lockedUntil), lockedUntil: value?.lockedUntil ?? null };
}
export async function overrideLock({ parentUnlocked = false } = {}) {
  if (!parentUnlocked) throw new Error('Parent authentication is required.');
  const { del } = await import('../core/storage.js'); await del('history', LOCK_KEY);
}
