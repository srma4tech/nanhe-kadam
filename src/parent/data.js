export const BACKUP_FORMAT = 'nanhe-kadam-backup';
export const BACKUP_VERSION = 1;
export const BACKUP_STORES = ['settings', 'schedule', 'progress', 'history', 'journal'];
const SECRET_KEYS = new Set(['parentPin', 'pinAttempts']);

function safeJsonValue(value) {
  if (value === null || ['string', 'boolean', 'number'].includes(typeof value)) return true;
  if (typeof value !== 'object' || (typeof Blob !== 'undefined' && value instanceof Blob) || (typeof File !== 'undefined' && value instanceof File)) return false;
  if (Array.isArray(value)) return value.every(safeJsonValue);
  return Object.entries(value).every(([key, child]) => key !== '__proto__' && key !== 'constructor' && safeJsonValue(child));
}

export function isBackupMedia(value) { return containsMedia(value); }

function containsMedia(value) {
  if (!value || typeof value !== 'object') return false;
  if (value.blob instanceof Blob || value.type === 'audio' || value.type === 'photo') return true;
  return Object.values(value).some((child) => child && typeof child === 'object' && containsMedia(child));
}

export function createBackup(datasets, createdAt = new Date().toISOString()) {
  const stores = {};
  for (const store of BACKUP_STORES) {
    stores[store] = (datasets[store] || []).filter(({ key, value }) => !SECRET_KEYS.has(String(key)) && !containsMedia(value) && safeJsonValue(value)).map(({ key, value }) => ({ key, value }));
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt, stores };
}

export function validateBackup(backup) {
  const errors = [];
  if (!backup || typeof backup !== 'object' || Array.isArray(backup)) return ['Backup must be a JSON object.'];
  if (backup.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION) errors.push('Backup format or version is unsupported.');
  if (!backup.stores || typeof backup.stores !== 'object' || Array.isArray(backup.stores)) return [...errors, 'Backup stores must be an object.'];
  for (const store of Object.keys(backup.stores)) if (!BACKUP_STORES.includes(store)) errors.push('Backup contains a restricted or unknown store.');
  for (const store of BACKUP_STORES) {
    const rows = backup.stores[store] ?? [];
    if (!Array.isArray(rows)) { errors.push('Each backup store must contain a list.'); continue; }
    const keys = new Set();
    for (const row of rows) {
      if (!row || typeof row !== 'object' || typeof row.key !== 'string' || !row.key || ['__proto__', 'constructor'].includes(row.key)) { errors.push('Backup contains an invalid record key.'); continue; }
      if (keys.has(row.key)) errors.push('Backup contains duplicate record keys.');
      keys.add(row.key);
      if (SECRET_KEYS.has(row.key)) errors.push('Backup contains a protected PIN record.');
      if (!safeJsonValue(row.value) || containsMedia(row.value)) errors.push('Backup contains a non-JSON or media value.');
    }
  }
  return errors;
}

export async function restoreBackup(backup, putRecord) {
  const errors = validateBackup(backup);
  if (errors.length) throw new Error('Backup could not be validated.');
  for (const store of BACKUP_STORES) {
    for (const { key, value } of backup.stores[store] ?? []) await putRecord(store, key, value);
  }
  return { restoredRecords: BACKUP_STORES.reduce((sum, store) => sum + (backup.stores[store]?.length ?? 0), 0) };
}
