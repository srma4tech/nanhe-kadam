let appState = Object.freeze({ screen: 'loading' });
const listeners = new Set();
export function getState() { return appState; }
export function setState(patch) { appState = Object.freeze({ ...appState, ...patch }); for (const listener of listeners) listener(appState); return appState; }
export function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function navigate(screen, data = {}) { return setState({ screen, ...data }); }
