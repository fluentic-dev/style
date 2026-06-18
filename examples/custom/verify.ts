import { createCompiler } from '../../packages/style/compiler';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { style, sx, ui } from './src/style.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const compiler = createCompiler({
  projectDir: __dirname,
  cacheDir: __dirname + '/.verify-cache',
}, {
  css: { debugClassName: true },
  importSources: [
    { source: './src/style', name: 'style', styleFn: style },
    { source: './src/style', name: 'sx', styleFn: sx },
    { source: './src/style', name: 'ui', styleFn: ui },
  ],
});

const source = `
import { style, sx, ui } from './src/style';

const button = style.merge(
  style.slot({ color: 'black' }).pressed({ transform: 'translateY(1px)' }),
  sx({ row: true, center: true, gapX: 8 }),
  sx().md({ gapX: 12 }),
  ui({ elevated: true, pill: true }),
  ui().hover({ color: 'teal' }),
  ui().tone('brand', { backgroundColor: '#dff7ed' }),
  ui().tone('danger', { backgroundColor: '#ffe4e6', color: '#be123c' }),
);
`;

const result = compiler.compileExtract({
  code: source,
  filePath: '/custom/verify.tsx',
  sourcemap: null,
});
if (!result) {
  console.error('FAIL: compiler returned null');
  process.exit(1);
}

const css = compiler.getExtractedCss();
const compiled = result.code ?? '';

type Check = { description: string; pass: boolean; };

const checks: Check[] = [
  {
    description: 'style.merge is fully extracted',
    pass: !compiled.includes('style.merge('),
  },
  {
    description: 'layout transform emits flex row',
    pass: css.includes('display: flex') && css.includes('flex-direction: row'),
  },
  {
    description: 'layout transform emits centering declarations',
    pass: css.includes('align-items: center') && css.includes('justify-content: center'),
  },
  {
    description: 'fixed md selector emits media query',
    pass: css.includes('@media (768px <= width < 1024px)'),
  },
  {
    description: 'ui transform emits elevation and pill radius',
    pass: css.includes('box-shadow: 0 18px 44px rgba(15, 23, 42, 0.12)') && css.includes('border-radius: 999px'),
  },
  {
    description: 'custom ui selectors emit hover and data tone selectors',
    pass: css.includes(':hover') && css.includes('[data-tone="brand"]') && css.includes('[data-tone="danger"]'),
  },
  {
    description: 'app selector priority emits pressed selector',
    pass: css.includes('[aria-pressed="true"]') && css.includes('translateY(1px)'),
  },
  {
    description: 'custom shorthand props are removed',
    pass: !/\brow:[^/]/.test(css) && !/\bcenter:[^/]/.test(css) && !/\belevated:[^/]/.test(css),
  },
];

let failed = false;
for (const c of checks) {
  if (c.pass) {
    console.log(`  pass  ${c.description}`);
  } else {
    console.error(`  FAIL  ${c.description}`);
    failed = true;
  }
}

if (failed) {
  console.error('\nVerify FAILED.');
  console.error('\nCompiled output:\n' + compiled);
  console.error('\nGenerated CSS:\n' + css);
  process.exit(1);
}

console.log('\nAll checks passed.');
console.log('\nGenerated CSS:\n' + css);
