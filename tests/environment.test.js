import test from 'node:test';
import assert from 'node:assert/strict';
import { checkEnvironment } from '../src/core/environment.js';

const supportedWindow = () => ({
  isSecureContext: true,
  crypto: { subtle: {} },
  navigator: { serviceWorker: {} },
  indexedDB: {},
});

test('secure supported environment passes', () => {
  assert.deepEqual(checkEnvironment(supportedWindow()), { ok: true, missing: [] });
});
test('non-secure context is reported', () => {
  const win = supportedWindow(); win.isSecureContext = false;
  assert.deepEqual(checkEnvironment(win), { ok: false, missing: ['isSecureContext'] });
});
test('missing Web Crypto is reported', () => {
  const win = supportedWindow(); win.crypto = undefined;
  assert.deepEqual(checkEnvironment(win), { ok: false, missing: ['crypto.subtle'] });
});
test('missing service worker support is reported', () => {
  const win = supportedWindow(); delete win.navigator.serviceWorker;
  assert.deepEqual(checkEnvironment(win), { ok: false, missing: ['serviceWorker'] });
});
test('missing IndexedDB support is reported', () => {
  const win = supportedWindow(); delete win.indexedDB;
  assert.deepEqual(checkEnvironment(win), { ok: false, missing: ['indexedDB'] });
});
