export const MASTERY_MAX = 3;
export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 21];
export const DAILY_REVIEW_LIMIT = 6;
export const REVIEW_TIME_CAP_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function nextMastery(current, correct) {
  const level = Math.max(0, Math.min(MASTERY_MAX, Number(current) || 0));
  return Math.max(0, Math.min(MASTERY_MAX, level + (correct ? 1 : -1)));
}

export function reviewAfterDays(mastery) {
  return REVIEW_INTERVAL_DAYS[Math.max(0, Math.min(MASTERY_MAX, Number(mastery) || 0))];
}

export function recordRecall(record, correct, at = Date.now()) {
  const mastery = nextMastery(record?.mastery ?? 0, correct);
  return { ...(record ?? {}), mastery, reviewedAt: at, dueAt: at + reviewAfterDays(mastery) * DAY_MS, attempts: (record?.attempts ?? 0) + 1 };
}

export function isDue(record, at = Date.now()) { return Boolean(record && record.dueAt <= at); }

export function selectDailyReviews(records, at = Date.now(), theme = null, limit = DAILY_REVIEW_LIMIT) {
  const due = records.filter((item) => isDue(item, at));
  due.sort((a, b) => (a.mastery ?? 0) - (b.mastery ?? 0) || Number(b.theme === theme) - Number(a.theme === theme) || a.dueAt - b.dueAt);
  const cap = Math.min(DAILY_REVIEW_LIMIT, Math.max(0, limit));
  const easy = records.find((item) => (item.mastery ?? 0) >= 2 && !due.slice(0, cap - 1).some((chosen) => chosen.id === item.id));
  if (easy && cap > 0) return [...due.slice(0, cap - 1), easy];
  return due.slice(0, cap);
}

export function reviewDurationMs(count) { return Math.min(REVIEW_TIME_CAP_MS, Math.max(0, count) * 45_000); }

export function buildLearningSummary(records, at = Date.now(), days = 7) {
  const since = at - days * DAY_MS;
  return { total: records.length, due: records.filter((item) => isDue(item, at)).length, strong: records.filter((item) => item.mastery >= 2).length, practicedThisWeek: records.filter((item) => item.reviewedAt >= since && item.reviewedAt <= at).length };
}

export function isMonthlyMela(date = new Date()) { return date.getDate() <= 2; }
