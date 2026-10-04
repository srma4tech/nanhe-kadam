import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKOFF_MS, constantTimeEqual, isValidPin, nextThrottle } from '../src/parent/pin.js';

test('PIN accepts only 4 to 6 decimal digits', () => {
  assert.equal(isValidPin('1234'), true); assert.equal(isValidPin('123456'), true);
  for (const pin of ['123', '1234567', '12a4', '']) assert.equal(isValidPin(pin), false);
});
test('five incorrect attempts trigger increasing persisted delays', () => {
  let state = { count: 0, level: 0, blockUntil: 0 }; let now = 10_000;
  for (const delay of BACKOFF_MS) {
    for (let i = 0; i < 5; i++) state = nextThrottle(state, now);
    assert.equal(state.blockUntil, now + delay); assert.equal(state.count, 0);
    now = state.blockUntil + 1; state = { ...state, blockUntil: 0 };
  }
});
test('hash equality checks all bytes and rejects different lengths', () => {
  assert.equal(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2])), true);
  assert.equal(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 3])), false);
  assert.equal(constantTimeEqual(new Uint8Array([1]), new Uint8Array([1, 0])), false);
});
