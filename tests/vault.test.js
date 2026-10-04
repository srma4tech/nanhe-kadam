import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { deleteGeminiKey, hasGeminiKey, readGeminiKey, saveGeminiKey, API_KEY_CIPHER_ID, DEVICE_KEY_ID } from '../src/parent/vault.js';

function storeFixture() {
  const data = new Map();
  return { data, read: async (_store, key) => data.get(key), write: async (_store, key, value) => data.set(key, value), remove: async (_store, key) => data.delete(key) };
}
test('API key is encrypted with a nonextractable AES key and available only to the parent', async () => {
  const store = storeFixture(); const deps = { parentUnlocked: true, cryptoObject: webcrypto, read: store.read, write: store.write };
  await saveGeminiKey('test-secret-api-key-123', deps);
  const cipher = store.data.get(API_KEY_CIPHER_ID); const deviceKey = store.data.get(DEVICE_KEY_ID);
  assert.equal(deviceKey.extractable, false);
  assert.equal(JSON.stringify(cipher).includes('test-secret-api-key-123'), false);
  assert.equal(await readGeminiKey(deps), 'test-secret-api-key-123');
  assert.equal(await hasGeminiKey(deps), true);
  await assert.rejects(readGeminiKey({ ...deps, parentUnlocked: false }), /Parent authentication/);
  await deleteGeminiKey({ parentUnlocked: true, remove: store.remove });
  assert.equal(await hasGeminiKey(deps), false);
});

