export const GEMINI_ORIGIN = 'https://generativelanguage.googleapis.com';
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
const SAFE_THEME_IDS = new Set(['language', 'numbers', 'nature', 'shapes', 'feelings', 'kindness']);
const MAX_TEXT = 180;

export class GeminiRequestError extends Error {
  constructor() { super('Smart Pack could not be created. Check the connection, model, and API key in parent settings.'); this.name = 'GeminiRequestError'; }
}
export class SmartPackRejectedError extends Error {
  constructor() { super('The safety review did not approve this draft. Try again later.'); this.name = 'SmartPackRejectedError'; }
}

function validTextPair(pair) {
  return pair && ['hi', 'en'].every((lang) => typeof pair[lang] === 'string' && pair[lang].trim().length > 0 && pair[lang].length <= MAX_TEXT && !/https?:\/\//i.test(pair[lang]) && !/\b(phone number|home address|school name|password|secret)\b/i.test(pair[lang]));
}

export function validateSmartPack(pack) {
  if (!pack || typeof pack !== 'object' || !validTextPair(pack.title) || !validTextPair(pack.question) || !validTextPair(pack.hint) || !validTextPair(pack.mission)) return false;
  if (!Array.isArray(pack.options) || pack.options.length !== 3 || !pack.options.every((option) => typeof option.id === 'string' && validTextPair(option))) return false;
  if (new Set(pack.options.map((option) => option.id)).size !== 3) return false;
  return pack.options.some((option) => option.id === pack.answerId);
}

function parseModelJson(response) {
  const text = response?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!text) throw new GeminiRequestError();
  try { return JSON.parse(text.replace(/^\u0060{3}(?:json)?\s*|\s*\u0060{3}$/g, '')); }
  catch { throw new GeminiRequestError(); }
}

async function requestJson({ apiKey, model, prompt, fetchImpl, signal }) {
  if (!apiKey || typeof apiKey !== 'string' || !/^[a-zA-Z0-9._:-]{3,128}$/.test(model)) throw new GeminiRequestError();
  try {
    const response = await fetchImpl(GEMINI_ORIGIN + '/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
      method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.3, maxOutputTokens: 900 } })
    });
    if (!response.ok) throw new GeminiRequestError();
    return parseModelJson(await response.json());
  } catch (error) {
    if (error instanceof GeminiRequestError) throw error;
    throw new GeminiRequestError();
  }
}

function packPrompt(theme) {
  return [
    'Create one very short child-safe learning activity for ages 3 to 6 in Hindi and English.',
    'Use only this topic: ' + theme + '. Use a playful, calm tone. No scores, pressure, external links, personal data, or copyrighted lyrics.',
    'Return JSON only with title, question, hint, mission as {hi,en}; options as exactly three {id,hi,en} objects; answerId matching one option id.',
    'Keep every text field under 180 characters. Never ask for a name, address, school, secret, photo, recording, or contact details.'
  ].join(' ');
}

export async function generateReviewedPack({ apiKey, model = DEFAULT_GEMINI_MODEL, themeId = 'language', fetchImpl = globalThis.fetch, signal } = {}) {
  if (!SAFE_THEME_IDS.has(themeId)) throw new GeminiRequestError();
  const theme = { language: 'early language and simple sounds', numbers: 'counting small groups to five', nature: 'noticing local plants safely', shapes: 'basic shapes', feelings: 'naming calm everyday feelings', kindness: 'simple ways to help at home' }[themeId];
  const pack = await requestJson({ apiKey, model, prompt: packPrompt(theme), fetchImpl, signal });
  if (!validateSmartPack(pack)) throw new GeminiRequestError();
  const review = await requestJson({
    apiKey, model, fetchImpl, signal,
    prompt: 'Review this child activity for ages 3 to 6. It must be safe, non-pressuring, bilingual, contain no personal-data request, unsafe instruction, medical advice, or copied copyrighted text. Return JSON only: {"approved":true} or {"approved":false}. Activity: ' + JSON.stringify(pack)
  });
  if (review?.approved !== true) throw new SmartPackRejectedError();
  return { ...pack, id: 'smart-' + Date.now().toString(36), themeId, createdAt: Date.now(), approved: false };
}
