export function checkEnvironment(win = window) {
  const missing = [];
  if (!win.isSecureContext) missing.push('isSecureContext');
  if (!win.crypto?.subtle) missing.push('crypto.subtle');
  if (!win.navigator || !('serviceWorker' in win.navigator)) missing.push('serviceWorker');
  if (!('indexedDB' in win)) missing.push('indexedDB');
  return { ok: missing.length === 0, missing };
}

