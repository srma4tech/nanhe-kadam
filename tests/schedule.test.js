import test from 'node:test';
import assert from 'node:assert/strict';
import { dayPlan, defaultSchedule, isLightDay, isSessionAvailable, DEFAULT_THEMES } from '../src/session/schedule.js';

test('Friday and Saturday use the four-step light flow', () => {
  for (const day of [5, 6]) { assert.equal(isLightDay(day), true); assert.deepEqual(dayPlan(day).steps.map((step) => step.id), ['hello', 'rhyme', 'theme', 'goodbye']); }
  assert.equal(dayPlan(5).steps.reduce((sum, step) => sum + step.minutes, 0), 10);
});
test('Sunday is adventure only', () => { assert.deepEqual(dayPlan(0), { kind: 'adventure', steps: [] }); });
test('default weekly themes follow the agreed rhythm', () => {
  assert.match(DEFAULT_THEMES[1][0], /English and Hindi/); assert.deepEqual(DEFAULT_THEMES[2], ['Language', 'Maths']);
  assert.deepEqual(DEFAULT_THEMES[4], ['Nature', 'General awareness']); assert.deepEqual(DEFAULT_THEMES[6], ['Light weekly recap', 'Story']);
});
test('schedule has no default start time and respects pauses and daily caps', () => {
  const schedule = defaultSchedule(); const monday = schedule[1];
  assert.equal(monday.startTime, null); assert.equal(isSessionAvailable(1, monday, new Date(2026, 0, 5, 0, 1), 0), true);
  assert.equal(isSessionAvailable(1, monday, new Date(), 1), false); monday.paused = true; assert.equal(isSessionAvailable(1, monday), false);
});
