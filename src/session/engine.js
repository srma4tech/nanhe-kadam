import { get, put } from '../core/storage.js';
import { now } from '../core/clock.js';
import { dayPlan, defaultSchedule } from './schedule.js';
import { endSession } from './lock.js';
export const ACTIVE_KEY = 'activeSession';
export const RESUME_WINDOW_MS = 30 * 60 * 1000;
export const FULL_STEPS = [{ id: 'hello', label: 'Hello', minutes: 1 }, { id: 'rhyme', label: 'Rhyme', minutes: 3 }, { id: 'revision', label: 'Revision round', minutes: 5 }, { id: 'theme', label: 'Theme', minutes: 7 }, { id: 'story', label: 'Family-voice story', minutes: 2 }, { id: 'goodbye', label: 'Mission and goodbye', minutes: 2 }];
const stepModules = new Map();
export function registerStepModule(id, render) {
  if (typeof id !== 'string' || typeof render !== 'function') throw new TypeError('A step id and render function are required.');
  stepModules.set(id, render);
  return () => stepModules.delete(id);
}
export function getStepModule(id) { return stepModules.get(id) ?? null; }
export function sessionPlan(day, schedule) { return dayPlan(day, schedule?.[day]); }
export function canResume(session, at) { return Boolean(session && at - session.lastActivityAt <= RESUME_WINDOW_MS && at >= session.lastActivityAt); }
export function canAdvanceStep(step, stepStartedAt, at, completed = false) { return Boolean(step && (completed || at - stepStartedAt >= step.minutes * 60000)); }
export async function resumeSession() {
  const session = await get('progress', ACTIVE_KEY); if (!session) return null;
  const current = await now(); if (!canResume(session, current)) { await endSession(await get('schedule', 'week') ?? defaultSchedule(), current); return null; }
  return session;
}
export async function startSession({ at = null, day = new Date().getDay() } = {}) {
  const current = at ?? await now(); const schedule = await get('schedule', 'week') ?? defaultSchedule(); const plan = sessionPlan(day, schedule);
  if (plan.kind !== 'session') return { kind: plan.kind, steps: [] };
  const session = { id: `${current}`, kind: 'session', day, steps: plan.steps, stepIndex: 0, stepStartedAt: current, stepCompleted: false, startedAt: current, lastActivityAt: current };
  await put('progress', ACTIVE_KEY, session); return session;
}
export async function advanceSession(session, { completed = false, at = null } = {}) {
  const current = at ?? await now(); const step = session.steps[session.stepIndex];
  if (!step) return { done: true, session: null };
  if (!canAdvanceStep(step, session.stepStartedAt, current, completed)) return { done: false, session, wait: true };
  if (session.stepIndex + 1 >= session.steps.length) {
    const schedule = await get('schedule', 'week') ?? defaultSchedule(); const lock = await endSession(schedule, current);
    return { done: true, session: null, lock };
  }
  const next = { ...session, stepIndex: session.stepIndex + 1, stepStartedAt: current, stepCompleted: false, lastActivityAt: current };
  await put('progress', ACTIVE_KEY, next); return { done: false, session: next, wait: false };
}
export async function markSessionActive(session, at = null) {
  const updated = { ...session, lastActivityAt: at ?? await now() }; await put('progress', ACTIVE_KEY, updated); return updated;
}



