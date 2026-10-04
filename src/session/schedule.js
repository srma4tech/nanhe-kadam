export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DEFAULT_THEMES = {
  0: ['Adventure card'],
  1: ['Language: English and Hindi'],
  2: ['Language', 'Maths'],
  3: ['Language', 'Maths'],
  4: ['Nature', 'General awareness'],
  5: ['Light revision', 'Family conversation'],
  6: ['Light weekly recap', 'Story'],
};
export function defaultDay(day) { return { enabled: day !== 0, startTime: null, maxSessions: 1, paused: false, skipped: false, themes: DEFAULT_THEMES[day] ?? [] }; }
export function defaultSchedule() { return Object.fromEntries(WEEKDAYS.map((_, day) => [day, defaultDay(day)])); }
export function isLightDay(day) { return day === 5 || day === 6; }
export function dayPlan(day, config = defaultDay(day)) {
  if (day === 0) return { kind: 'adventure', steps: [] };
  if (!config.enabled || config.paused || config.skipped) return { kind: 'unavailable', steps: [] };
  const steps = isLightDay(day)
    ? [{ id: 'hello', label: 'Hello', minutes: 1 }, { id: 'rhyme', label: 'Rhyme', minutes: 2 }, { id: 'theme', label: day === 6 ? 'Weekly recap' : 'Short theme', minutes: 5 }, { id: 'goodbye', label: 'Mission and goodbye', minutes: 2 }]
    : [{ id: 'hello', label: 'Hello', minutes: 1 }, { id: 'rhyme', label: 'Rhyme', minutes: 3 }, { id: 'revision', label: 'Revision round', minutes: 5 }, { id: 'theme', label: 'Theme', minutes: 7 }, { id: 'story', label: 'Family-voice story', minutes: 2 }, { id: 'goodbye', label: 'Mission and goodbye', minutes: 2 }];
  return { kind: 'session', steps };
}
export function isSessionAvailable(day, config, nowDate = new Date(), sessionsToday = 0) {
  if (day === 0 || !config?.enabled || config.paused || config.skipped || sessionsToday >= config.maxSessions) return false;
  if (!config.startTime) return true;
  const [hour, minute] = config.startTime.split(':').map(Number);
  return nowDate.getHours() * 60 + nowDate.getMinutes() >= hour * 60 + minute;
}
export function nextStartTimestamp(schedule, fromTimestamp) {
  const from = new Date(fromTimestamp);
  for (let offset = 0; offset <= 7; offset++) {
    const date = new Date(from); date.setDate(from.getDate() + offset); date.setHours(0, 0, 0, 0);
    const config = schedule?.[date.getDay()] ?? defaultDay(date.getDay());
    if (date.getDay() === 0 || !config.enabled || config.paused || config.skipped) continue;
    if (offset === 0 && config.startTime) { const [h, m] = config.startTime.split(':').map(Number); date.setHours(h, m, 0, 0); if (date.getTime() <= fromTimestamp) continue; }
    else if (offset === 0) continue;
    else if (config.startTime) { const [h, m] = config.startTime.split(':').map(Number); date.setHours(h, m, 0, 0); }
    return date.getTime();
  }
  return null;
}

