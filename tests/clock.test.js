import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKWARD_TAMPER_MS, effectiveTimestamp } from '../src/core/clock.js';

test('clock never moves behind its greatest recorded timestamp', () => {
  assert.equal(effectiveTimestamp(900, 1000), 1000);
  assert.equal(effectiveTimestamp(1001, 1000), 1001);
});
test('a backward jump beyond two minutes keeps the saved time', () => {
  assert.equal(effectiveTimestamp(1000 - BACKWARD_TAMPER_MS - 1, 1000), 1000);
});
test('a small backward adjustment cannot reduce effective time either', () => {
  assert.equal(effectiveTimestamp(1000 - BACKWARD_TAMPER_MS + 1, 1000), 1000);
});
