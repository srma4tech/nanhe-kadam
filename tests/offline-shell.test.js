import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

test('service-worker app shell includes the full static module import graph', async () => {
  const serviceWorker = await readFile(path.join(root, 'sw.js'), 'utf8');
  const listed = new Set([...serviceWorker.matchAll(/['"](\.\/[^'"]+)['"]/g)].map((match) => match[1].replaceAll('\\', '/')));
  const pending = ['src/ui/app.js']; const seen = new Set();
  while (pending.length) {
    const file = pending.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    assert.ok(listed.has('./' + file.replaceAll('\\', '/')), 'service worker must precache ' + file);
    const source = await readFile(path.join(root, file), 'utf8');
    for (const [, specifier] of source.matchAll(/(?:from\s*|import\s*\()\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(file.replaceAll('\\', '/')), specifier));
      pending.push(dependency);
    }
  }
  assert.ok(seen.has('src/revision/spaced.js'));
  assert.match(serviceWorker, /CACHE_NAME\s*=\s*.*v2/);
});

test('service-worker installation waits for parent update approval', async () => {
  const source = await readFile(path.join(root, 'sw.js'), 'utf8');
  const install = source.slice(source.indexOf("addEventListener('install'"), source.indexOf("addEventListener('activate'"));
  assert.doesNotMatch(install, /^\s*self\.skipWaiting/m);
  assert.match(source, /event\.data\?\.type === 'APPLY_UPDATE'/);
});

test('keyboard skip link, focus style, reduced motion, and minimum touch targets exist', async () => {
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  const css = await readFile(path.join(root, 'src/ui/styles.css'), 'utf8');
  assert.match(html, /Skip to app content/);
  assert.match(css, /button\.quiet\{min-height:64px/);
  assert.match(css, /\.voice-list button\{min-height:64px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
