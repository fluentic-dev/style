import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const assetsDir = new URL('./dist/assets/', import.meta.url);
const cssFiles = readdirSync(assetsDir).filter((file) => file.endsWith('.css'));

if (!cssFiles.length) {
  throw new Error('expected extracted CSS assets');
}

const css = cssFiles
  .map((file) => readFileSync(join(assetsDir.pathname, file), 'utf8'))
  .join('\n');

assertIncludes(css, '@keyframes');
assertIncludes(css, 'static-card-enter');
assertIncludes(css, 'static-card-lift');
assertIncludes(css, 'animation-name');
assertIncludes(css, 'var(--token-static-enter-transform');

console.log('Verified static value refs example CSS.');

function assertIncludes(actual, expected) {
  if (!actual.includes(expected)) {
    throw new Error(`expected CSS to include ${expected}`);
  }
}
