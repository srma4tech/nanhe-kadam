import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLockedUntil } from '../src/session/lock.js';
import { defaultSchedule } from '../src/session/schedule.js';

test('session lock ends at the next enabled planned day', () => {
  const at = new Date(2026, 9, 5, 14, 0).getTime(); // Monday
  const schedule = defaultSchedule();
  const lock = calculateLockedUntil(at, schedule);
  assert.equal(new Date(lock).getDay(), 2); // Tuesday
  assert.equal(new Date(lock).getHours(), 0); // All-day schedule has no start time.
});
test('when no day is planned, lock ends at local day end', () => {
  const at = new Date(2026, 9, 5, 14, 0).getTime(); const schedule = defaultSchedule();
  for (const day of Object.keys(schedule)) schedule[day].enabled = false;
  assert.equal(calculateLockedUntil(at, schedule), new Date(2026, 9, 5, 23, 59, 59, 999).getTime());
});
test('a parent-configured second session can be available on the same all-day schedule', () => {
  const at = new Date(2026, 9, 5, 14, 0).getTime(); const schedule = defaultSchedule();
  schedule[1].maxSessions = 2;
  assert.equal(calculateLockedUntil(at, schedule, 1), at);
  assert.equal(new Date(calculateLockedUntil(at, schedule, 2)).getDay(), 2);
});
