import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackup, restoreBackup, validateBackup } from '../src/parent/data.js';

test('export excludes vault, PIN records, and audio/photo media', () => {
  const backup = createBackup({
    settings: [{ key: 'parentPin', value: { hash: 'secret' } }, { key: 'pinAttempts', value: { count: 3 } }, { key: 'speech', value: { lang: 'hi-IN' } }],
    progress: [{ key: 'reviewMastery', value: [{ id: 'math', mastery: 1 }] }],
    journal: [{ key: 'p1', value: { type: 'photo', blob: new Blob(['x']) } }, { key: 'note', value: { text: 'kept locally' } }],
    recordings: [{ key: 'clip', value: { type: 'audio', blob: new Blob(['x']) } }],
    vault: [{ key: 'gemini', value: 'never exported' }]
  }, '2026-01-01T00:00:00.000Z');
  assert.deepEqual(backup.stores.settings.map((row) => row.key), ['speech']);
  assert.deepEqual(backup.stores.journal.map((row) => row.key), ['note']);
  assert.deepEqual(backup.stores.progress.map((row) => row.key), ['reviewMastery']);
  assert.equal('vault' in backup.stores, false);
  assert.deepEqual(validateBackup(backup), []);
});

test('validation rejects unknown stores, protected keys, duplicate keys, and malformed records', () => {
  const backup = createBackup({});
  backup.stores.vault = [];
  backup.stores.settings = [{ key: 'parentPin', value: 'x' }, { key: 'theme', value: true }, { key: 'theme', value: false }, { key: '__proto__', value: {} }];
  const errors = validateBackup(backup);
  assert.ok(errors.length >= 4);
});

test('restore validates all data before applying and merges only listed records', async () => {
  const backup = createBackup({ schedule: [{ key: 'week', value: { 1: { enabled: true } } }] });
  const applied = [];
  const result = await restoreBackup(backup, async (...args) => applied.push(args));
  assert.equal(result.restoredRecords, 1);
  assert.equal(applied[0][0], 'schedule');
  backup.stores.settings = [{ key: 'parentPin', value: 'bad' }];
  await assert.rejects(restoreBackup(backup, async (...args) => applied.push(args)));
  assert.equal(applied.length, 1);
});
