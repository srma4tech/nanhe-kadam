import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateContent, validateDataset } from '../scripts/validate-content.mjs';

test('curriculum has 28 valid bilingual daily plans', async () => {
  assert.deepEqual(await validateContent(), []);
});

test('validator fixture rejects missing language, duplicate ID, unsafe asset, and unapproved license', async () => {
  const plans = JSON.parse(await readFile(new URL('../content/curriculum.json', import.meta.url), 'utf8'));
  plans[1] = { ...plans[1], id: plans[0].id, license: 'UNKNOWN', asset: '../secret.png', theme: { en: '' } };
  const errors = validateDataset(plans, { assets: new Set() });
  assert.ok(errors.some((error) => error.includes('Duplicate id')));
  assert.ok(errors.some((error) => error.includes('Hindi and English theme')));
  assert.ok(errors.some((error) => error.includes('non-allow-listed')));
  assert.ok(errors.some((error) => error.includes('unsafe local asset')));
});
