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

[
  '@keyframes',
  '@font-face',
  '@position-try',
  '@counter-style',
  '@property --at-rule-spin-angle',
  '@scroll-timeline',
  '@view-timeline',
  '@font-palette-values',
  'position-try-fallbacks',
  'list-style-type',
  'transition-property',
  'animation-timeline',
  'font-palette',
].forEach(assertIncludes);

console.log('Verified at-rule value refs example CSS.');

function assertIncludes(expected) {
  if (!css.includes(expected)) {
    throw new Error(`expected CSS to include ${expected}`);
  }
}
