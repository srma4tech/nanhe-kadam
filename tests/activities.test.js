import test from 'node:test';
import assert from 'node:assert/strict';
import { answerActivity, createActivityState } from '../src/activities/activities.js';

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
