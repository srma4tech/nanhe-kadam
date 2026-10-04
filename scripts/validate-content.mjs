import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allowedLicenses = new Set(['ORIGINAL', 'CC0-1.0', 'CC-BY-4.0']);
const required = ['id', 'week', 'day', 'theme', 'concept', 'activity', 'mission', 'story', 'paperPrompt', 'license'];

export function validateDataset(plans, { schema = null, assets = new Set() } = {}) {
  const errors = [];
  if (!Array.isArray(plans)) return ['Curriculum must be an array.'];
  const ids = new Set();
  for (const [index, plan] of plans.entries()) {
    const where = `item ${index + 1}`;
    if (!plan || typeof plan !== 'object' || Array.isArray(plan)) { errors.push(`${where} must be an object.`); continue; }
    for (const field of required) if (!(field in plan)) errors.push(`${where} is missing ${field}.`);
    if (typeof plan.id !== 'string' || !/^w[1-4]-d[1-7]$/.test(plan.id)) errors.push(`${where} has an invalid id.`);
    else if (ids.has(plan.id)) errors.push(`Duplicate id: ${plan.id}.`); else ids.add(plan.id);
    if (!Number.isInteger(plan.week) || plan.week < 1 || plan.week > 4 || !Number.isInteger(plan.day) || plan.day < 1 || plan.day > 7) errors.push(`${where} has an invalid week/day.`);
    for (const field of ['theme', 'concept', 'activity', 'mission', 'paperPrompt']) {
      if (!plan[field] || ['hi', 'en'].some((lang) => typeof plan[field][lang] !== 'string' || !plan[field][lang].trim())) errors.push(`${where} needs Hindi and English ${field} text.`);
    }
    if (!plan.story || !plan.story.title || !plan.story.summary) errors.push(`${where} needs a bilingual story title and summary.`);
    else for (const field of ['title', 'summary']) if (['hi', 'en'].some((lang) => typeof plan.story[field][lang] !== 'string' || !plan.story[field][lang].trim())) errors.push(`${where} needs bilingual story ${field}.`);
    for (const license of [plan.license, plan.story?.license]) if (!allowedLicenses.has(license)) errors.push(`${where} uses a non-allow-listed license: ${license}.`);
    if (plan.asset) {
      const assetPath = path.normalize(plan.asset);
      if (path.isAbsolute(assetPath) || assetPath.startsWith('..') || !assets.has(assetPath)) errors.push(`${where} references a missing or unsafe local asset: ${plan.asset}.`);
    }
    if (schema && required.some((field) => !schema.required.includes(field))) errors.push('Schema does not declare every required field.');
  }
  if (plans.length !== 28) errors.push(`Expected 28 daily plans, found ${plans.length}.`);
  return errors;
}

export async function validateContent(base = root) {
  const schemaPath = path.join(base, 'content/schemas/day-plan.schema.json');
  const curriculumPath = path.join(base, 'content/curriculum.json');
  const [schema, plans] = await Promise.all([
    readFile(schemaPath, 'utf8').then(JSON.parse),
    readFile(curriculumPath, 'utf8').then(JSON.parse)
  ]);
  if (schema.type !== 'object' || !schema.properties || !Array.isArray(schema.required)) throw new Error('Day-plan schema is malformed.');
  const files = await readdir(path.join(base, 'assets'), { withFileTypes: true });
  const assets = new Set(files.filter((entry) => entry.isFile()).map((entry) => path.join('assets', entry.name)));
  const errors = validateDataset(plans, { schema, assets });
  for (const plan of plans) if (plan.asset) await access(path.join(base, plan.asset)).catch(() => errors.push(`Missing asset: ${plan.asset}.`));
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = await validateContent();
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('Content validation passed: 28 bilingual daily plans, unique IDs, approved licenses, and local asset references.');
}
