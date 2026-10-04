import test from 'node:test';
import assert from 'node:assert/strict';
import { generateReviewedPack, SmartPackRejectedError, validateSmartPack, DEFAULT_GEMINI_MODEL, GEMINI_ORIGIN } from '../src/ai/gemini.js';

const pack = { title: { hi: 'छोटी सीख', en: 'A Little Lesson' }, question: { hi: 'कितने?', en: 'How many?' }, hint: { hi: 'गिनो।', en: 'Count them.' }, mission: { hi: 'तीन गिनो।', en: 'Count three.' }, options: [{ id: 'one', hi: 'एक', en: 'One' }, { id: 'two', hi: 'दो', en: 'Two' }, { id: 'three', hi: 'तीन', en: 'Three' }], answerId: 'three' };
const response = (object) => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(object) }] } }] }) });

test('pack validation requires bilingual short content, three unique choices and a matching answer', () => {
  assert.equal(validateSmartPack(pack), true);
  assert.equal(validateSmartPack({ ...pack, answerId: 'unknown' }), false);
  assert.equal(validateSmartPack({ ...pack, mission: { en: 'Tell me your phone number', hi: 'ठीक' } }), false);
});
test('generation and safety review use the official REST origin and API-key header only', async () => {
  const calls = [];
  const result = await generateReviewedPack({ apiKey: 'mock-user-key', model: DEFAULT_GEMINI_MODEL, themeId: 'numbers', fetchImpl: async (url, options) => { calls.push({ url, options }); return response(calls.length === 1 ? pack : { approved: true }); } });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, GEMINI_ORIGIN + '/v1beta/models/' + DEFAULT_GEMINI_MODEL + ':generateContent');
  assert.equal(calls[0].options.headers['x-goog-api-key'], 'mock-user-key');
  assert.equal(calls[0].url.includes('mock-user-key'), false);
  assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(result.approved, false);
});
test('rejected safety pass does not return a saveable pack; unsafe theme never calls network', async () => {
  let calls = 0;
  await assert.rejects(generateReviewedPack({ apiKey: 'mock-user-key', fetchImpl: async () => { calls++; return response(calls === 1 ? pack : { approved: false }); } }), SmartPackRejectedError);
  assert.equal(calls, 2);
  await assert.rejects(generateReviewedPack({ apiKey: 'mock-user-key', themeId: 'personal-data', fetchImpl: async () => { calls++; } }));
  assert.equal(calls, 2);
});
