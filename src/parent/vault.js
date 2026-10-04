import { get, put, del } from '../core/storage.js';
import { isParentUnlocked, requireCryptoSubtle } from './pin.js';

export const API_KEY_CIPHER_ID = 'geminiApiKeyCipher';
export const DEVICE_KEY_ID = 'geminiDeviceKey';

function requireParent(parentUnlocked = isParentUnlocked()) {
  if (!parentUnlocked) throw new Error('Parent authentication is required.');
}

export async function saveGeminiKey(apiKey, { parentUnlocked, cryptoObject = globalThis.crypto, read = get, write = put } = {}) {
  requireParent(parentUnlocked);
  const value = String(apiKey ?? '').trim();
  if (value.length < 10 || value.length > 512) throw new Error('Enter a valid API key.');
  const subtle = requireCryptoSubtle(cryptoObject);
  let key = await read('vault', DEVICE_KEY_ID);
  if (!key) {
    key = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await write('vault', DEVICE_KEY_ID, key);
  }
  const iv = cryptoObject.getRandomValues(new Uint8Array(12));
  const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value));
  await write('vault', API_KEY_CIPHER_ID, { iv: [...iv], ciphertext: [...new Uint8Array(ciphertext)] });
}

export async function readGeminiKey({ parentUnlocked, cryptoObject = globalThis.crypto, read = get } = {}) {
  requireParent(parentUnlocked);
  const subtle = requireCryptoSubtle(cryptoObject);
  const key = await read('vault', DEVICE_KEY_ID); const record = await read('vault', API_KEY_CIPHER_ID);
  if (!key || !record) return null;
  try {
    const plaintext = await subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(record.iv) }, key, new Uint8Array(record.ciphertext));
    return new TextDecoder().decode(plaintext);
  } catch { throw new Error('Saved API key could not be unlocked. Replace it in parent settings.'); }
}

export async function hasGeminiKey({ parentUnlocked, read = get } = {}) {
  requireParent(parentUnlocked);
  return Boolean(await read('vault', API_KEY_CIPHER_ID));
}

export async function deleteGeminiKey({ parentUnlocked, remove = del } = {}) {
  requireParent(parentUnlocked);
  await remove('vault', API_KEY_CIPHER_ID);
  await remove('vault', DEVICE_KEY_ID);
}

