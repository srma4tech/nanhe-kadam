import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLearningSummary, DAILY_REVIEW_LIMIT, isDue, isMonthlyMela, nextMastery, recordRecall, reviewAfterDays, reviewDurationMs, REVIEW_INTERVAL_DAYS, REVIEW_TIME_CAP_MS, selectDailyReviews } from '../src/revision/spaced.js';

const DAY = 86_400_000;
test('mastery stays between zero and three and schedules 1/3/7/21 day intervals', () => {
  assert.deepEqual(REVIEW_INTERVAL_DAYS, [1, 3, 7, 21]);
  assert.equal(nextMastery(0, false), 0); assert.equal(nextMastery(0, true), 1);
  assert.equal(nextMastery(3, true), 3); assert.equal(nextMastery(3, false), 2);
  const saved = recordRecall({ mastery: 1 }, true, 1000);
  assert.equal(saved.mastery, 2); assert.equal(saved.dueAt, 1000 + 7 * DAY);
});
test('due review planner favors weak and matching-theme items, adds an easy win, and respects cap', () => {
  const at = 30 * DAY;
  const records = Array.from({ length: 10 }, (_, index) => ({ id: `weak-${index}`, mastery: index === 0 ? 0 : 1, dueAt: at - index, theme: index === 8 ? 'today' : 'other' }));
  records.push({ id: 'easy', mastery: 3, dueAt: at + DAY, theme: 'today' });
  const queue = selectDailyReviews(records, at, 'today');
  assert.ok(queue.length <= DAILY_REVIEW_LIMIT);
  assert.equal(queue[0].id, 'weak-0');
  assert.ok(queue.some((item) => item.id === 'easy'));
  assert.ok(queue.some((item) => item.id === 'weak-8'));
  assert.ok(reviewDurationMs(queue.length) <= REVIEW_TIME_CAP_MS);
  assert.equal(isDue(records.at(-1), at), false);
});
test('weekly summary is local aggregate and monthly mela date stays an adventure marker', () => {
  const at = 30 * DAY;
  const summary = buildLearningSummary([{ mastery: 2, dueAt: at - 1, reviewedAt: at - DAY }, { mastery: 0, dueAt: at + DAY, reviewedAt: at - 10 * DAY }], at);
  assert.deepEqual(summary, { total: 2, due: 1, strong: 1, practicedThisWeek: 1 });
  assert.equal(isMonthlyMela(new Date(2026, 3, 1)), true);
  assert.equal(isMonthlyMela(new Date(2026, 3, 3)), false);
});
