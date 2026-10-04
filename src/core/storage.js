export const DB_NAME = 'nanhe-kadam';
export const DB_VERSION = 1;
export const STORE_NAMES = ['settings', 'schedule', 'progress', 'history', 'journal', 'recordings', 'vault'];
export class StorageQuotaError extends Error {
  constructor(message = 'Device storage is full. Free space in the parent area and try again.') { super(message); this.name = 'StorageQuotaError'; this.code = 'QUOTA_EXCEEDED'; }
}
let databasePromise;
function quota(error) { return error?.name === 'QuotaExceededError' || error?.code === 22 || error?.code === 1014; }
export function openDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is not available in this browser.'));
  if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      for (const name of STORE_NAMES) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
      // Future schema migrations belong here; migrations must preserve existing records.
      if (event.oldVersion < 1) { /* Initial schema. */ }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close another app tab to finish the storage update.'));
  });
  return databasePromise;
}
async function operation(store, mode, action) {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode); const objectStore = tx.objectStore(store); let result;
      try { result = action(objectStore); } catch (error) { reject(error); return; }
      tx.oncomplete = () => resolve(result?.result);
      tx.onerror = () => reject(tx.error || result?.error);
      tx.onabort = () => reject(tx.error || result?.error || new Error('Storage operation was cancelled.'));
    });
  } catch (error) { if (quota(error)) throw new StorageQuotaError(); throw error; }
}
export const get = (store, key) => operation(store, 'readonly', (s) => s.get(key));
export const put = (store, key, value) => operation(store, 'readwrite', (s) => s.put(value, key));
export const del = (store, key) => operation(store, 'readwrite', (s) => s.delete(key));
export const list = (store) => operation(store, 'readonly', (s) => s.getAll());
export async function clearStore(store) { return operation(store, 'readwrite', (s) => s.clear()); }
export async function clearAll() { for (const name of STORE_NAMES) await clearStore(name); }
export async function estimateStorage() {
  if (!navigator.storage?.estimate) return { usage: null, quota: null, percent: null };
  try { const { usage = null, quota: limit = null } = await navigator.storage.estimate(); return { usage, quota: limit, percent: usage != null && limit ? Math.round(usage / limit * 100) : null }; }
  catch { return { usage: null, quota: null, percent: null }; }
}
export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false;
  try { return await navigator.storage.persist(); } catch { return false; }
}
