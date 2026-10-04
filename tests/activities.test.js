import test from 'node:test';
import assert from 'node:assert/strict';
import { answerActivity, createActivityState, smartPackToActivity } from '../src/activities/activities.js';

const sample = { answer: 1 };
test('activity gives a gentle hint after two misses and welcomes any correct answer', () => {
  let state = createActivityState(sample);
  state = answerActivity(state, 0);
  assert.equal(state.hint, false);
  state = answerActivity(state, 2);
  assert.equal(state.hint, true);
  state = answerActivity(state, 1);
  assert.equal(state.complete, true);
});
test('completed activity ignores later taps without penalty', () => {
  let state = answerActivity(createActivityState(sample), 1);
  assert.deepEqual(answerActivity(state, 0), state);
});
test('only parent-approved Smart Packs convert to offline activity data', () => {
  const pack = { id: 'pack-1', approved: true, question: { hi: 'प्रश्न', en: 'Question' }, options: [{ id: 'a', hi: 'एक', en: 'One' }, { id: 'b', hi: 'दो', en: 'Two' }, { id: 'c', hi: 'तीन', en: 'Three' }], answerId: 'b', hint: { hi: 'संकेत', en: 'Hint' } };
  assert.equal(smartPackToActivity({ ...pack, approved: false }), null);
  const activity = smartPackToActivity(pack);
  assert.equal(activity.answer, 1); assert.equal(activity.kind, 'matching'); assert.equal(activity.conceptId, 'pack-1');
});
