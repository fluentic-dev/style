import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const distDir = new URL('./dist/assets/', import.meta.url);

const files = await readdir(distDir);
const css = await readAssets(files.filter((file) => file.endsWith('.css')));
const js = await readAssets(files.filter((file) => file.endsWith('.js')));

const checks = [
  ['css emits theme classes', () => css.includes('.theme-')],
  ['css emits createValues tokens', () => css.includes('--token-space--md-') && css.includes('--token-tone--Soft-')],
  ['css emits parent scoped hover selectors', () => css.includes(':where(.-') && css.includes(':hover')],
  [
    'css keeps token aliases as nested fallbacks',
    () => css.includes('--token-accentAlias-') && css.includes('var(--token-accent-'),
  ],
  ['css has no object fallback leak', () => !css.includes('[object Object]')],
  [
    'js keeps runtime checklist UI',
    () => js.includes('getClassName output') && js.includes('combineStyle carry') && js.includes('merge helpers'),
  ],
  [
    'js keeps contract component UI',
    () => js.includes('Runtime contract') && js.includes('contract-card') && js.includes('Public runtime API'),
  ],
];

let ok = true;

for (const [label, pass] of checks) {
  if (pass()) {
    console.log(`pass ${label}`);
  } else {
    console.error(`FAIL ${label}`);
    ok = false;
  }
}

if (!ok) {
  process.exit(1);
}

async function readAssets(names) {
  const chunks = [];

  for (const name of names) {
    chunks.push(await readFile(join(distDir.pathname, name), 'utf8'));
  }

  return chunks.join('\n');
}
