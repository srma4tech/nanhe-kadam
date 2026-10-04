import test from 'node:test';
import assert from 'node:assert/strict';
import { FULL_STEPS, canAdvanceStep, canResume, RESUME_WINDOW_MS, sessionPlan, getStepModule, registerStepModule } from '../src/session/engine.js';

test('full session is 20 minutes across the six requested steps', () => {
  assert.deepEqual(FULL_STEPS.map((step) => step.minutes), [1, 3, 5, 7, 2, 2]);
  assert.equal(FULL_STEPS.reduce((sum, step) => sum + step.minutes, 0), 20);
  assert.equal(sessionPlan(1).steps.length, 6);
});
test('steps wait for minimum duration unless completed by the user', () => {
  const step = { minutes: 3 };
  assert.equal(canAdvanceStep(step, 1000, 1000 + 179_999), false);
  assert.equal(canAdvanceStep(step, 1000, 1000 + 180_000), true);
  assert.equal(canAdvanceStep(step, 1000, 1000, true), true);
});
test('interrupted sessions resume up to 30 minutes and not beyond', () => {
  const session = { lastActivityAt: 5000 };
  assert.equal(canResume(session, 5000 + RESUME_WINDOW_MS), true);
  assert.equal(canResume(session, 5000 + RESUME_WINDOW_MS + 1), false);
  assert.equal(canResume(session, 4999), false);
});
test('step content can be replaced through the module registry', () => {
  const render = () => 'replacement'; const unregister = registerStepModule('test-step', render);
  assert.equal(getStepModule('test-step'), render); unregister(); assert.equal(getStepModule('test-step'), null);
});
