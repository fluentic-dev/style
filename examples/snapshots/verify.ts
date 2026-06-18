import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const snapshotsDir = path.join(__dirname, 'data');

type Check = {
  description: string;
  pass: (content: string) => boolean;
};

async function readSnapshot(id: string, file: string) {
  return readFile(path.join(snapshotsDir, id, file), 'utf8');
}

function check(id: string, file: string, content: string, checks: Check[]) {
  let failed = false;
  for (const c of checks) {
    if (!c.pass(content)) {
      console.error(`  FAIL [${id}/${file}] ${c.description}`);
      failed = true;
    } else {
      console.log(`  pass [${id}/${file}] ${c.description}`);
    }
  }
  return !failed;
}

async function verify002() {
  console.log('\nVerifying snapshot 002-transform (transform: row/column -> flexDirection)');

  const id = '002-transform';
  const css = await readSnapshot(id, 'extracted.css');
  const compiled = await readSnapshot(id, 'compiled.js');

  const cssChecks: Check[] = [
    {
      description: 'contains flex-direction: row (from row:true)',
      pass: (s) => s.includes('flex-direction: row'),
    },
    {
      description: 'contains flex-direction: column (from column:true)',
      pass: (s) => s.includes('flex-direction: column'),
    },
    {
      description: 'does not contain raw "row:" CSS property',
      pass: (s) => !/\brow:[^/]/.test(s),
    },
    {
      description: 'does not contain raw "column:" CSS property',
      pass: (s) => !/\bcolumn:[^/]/.test(s),
    },
    {
      description: 'hover selector with flex-direction: column',
      pass: (s) => /flex-direction: column/.test(s) && /:hover/.test(s),
    },
  ];

  const compiledChecks: Check[] = [
    {
      description: 'custom props not present in compiled output (row:true removed)',
      pass: (s) => !s.includes('row:true') && !s.includes('row: true'),
    },
    {
      description: 'custom props not present in compiled output (column:true removed)',
      pass: (s) => !s.includes('column:true') && !s.includes('column: true'),
    },
    {
      description: 'uses createExtractedStyle (compiled at build time)',
      pass: (s) => s.includes('createExtractedStyle'),
    },
  ];

  const cssOk = check(id, 'extracted.css', css, cssChecks);
  const compiledOk = check(id, 'compiled.js', compiled, compiledChecks);

  return cssOk && compiledOk;
}

async function verify003() {
  console.log('\nVerifying snapshot 003-explicit-scope (explicit scope binding)');

  const id = '003-explicit-scope';
  const css = await readSnapshot(id, 'extracted.css');
  const compiled = await readSnapshot(id, 'compiled.js');

  const cssChecks: Check[] = [
    {
      description: 'contains scoped parent root color',
      pass: (s) => s.includes('color: purple'),
    },
    {
      description: 'contains scoped child label color',
      pass: (s) => s.includes('color: teal'),
    },
  ];

  const compiledChecks: Check[] = [
    {
      description: 'parent passes combined child styles explicitly',
      pass: (s) => /<Child\s+styles=\{childCss\}\s*\/>/.test(s),
    },
    {
      description: 'child style combiner is local to the child styles object',
      pass: (s) => s.includes('combineStyle.for(childStyles)'),
    },
    {
      description: 'child extends incoming combined styles',
      pass: (s) => s.includes('props.styles'),
    },
    {
      description: 'compiled output has no scope prop',
      pass: (s) => !s.includes('scope='),
    },
  ];

  const cssOk = check(id, 'extracted.css', css, cssChecks);
  const compiledOk = check(id, 'compiled.js', compiled, compiledChecks);

  return cssOk && compiledOk;
}

async function verify004() {
  console.log('\nVerifying snapshot 004-nested-tokens (nested tokens and themes)');

  const id = '004-nested-tokens';
  const css = await readSnapshot(id, 'extracted.css');
  const compiled = await readSnapshot(id, 'compiled.js');

  const cssChecks: Check[] = [
    {
      description: 'contains light theme token values',
      pass: (s) => s.includes(':#ffffff') && s.includes(':#17201b') && s.includes(':#0f766e'),
    },
    {
      description: 'contains dark theme token values',
      pass: (s) => s.includes(':#101715') && s.includes(':#eef8f4') && s.includes(':#5eead4'),
    },
    {
      description: 'component styles read token variables',
      pass: (s) =>
        s.includes('background-color: var(--var-') &&
        s.includes('box-shadow: var(--var-') &&
        s.includes('var(--token-'),
    },
  ];

  const compiledChecks: Check[] = [
    {
      description: 'nested token tree is compiled',
      pass: (s) =>
        /createExtractedToken\(['"]tokens-/.test(s) &&
        s.includes('--color--bg') &&
        s.includes('--color--accentText') &&
        s.includes('--shadow--card'),
    },
    {
      description: 'themes are extracted',
      pass: (s) => s.includes('createExtractedTheme'),
    },
    {
      description: 'runtime createTheme import is removed',
      pass: (s) => !s.includes('createTheme,'),
    },
  ];

  const cssOk = check(id, 'extracted.css', css, cssChecks);
  const compiledOk = check(id, 'compiled.js', compiled, compiledChecks);

  return cssOk && compiledOk;
}

async function verify005() {
  console.log('\nVerifying snapshot 005-custom-design-system (multi style function composition)');

  const id = '005-custom-design-system';
  const css = await readSnapshot(id, 'extracted.css');
  const compiled = await readSnapshot(id, 'compiled.js');

  const cssChecks: Check[] = [
    {
      description: 'layout transform emits flex row',
      pass: (s) => s.includes('display: flex') && s.includes('flex-direction: row'),
    },
    {
      description: 'fixed responsive selector emits md media query',
      pass: (s) => s.includes('@media (min-width: 768px) and (max-width: 1023.98px)'),
    },
    {
      description: 'ui transform emits elevation and pill radius',
      pass: (s) => s.includes('box-shadow: 0 18px 44px rgba(15, 23, 42, 0.12)') && s.includes('border-radius: 999px'),
    },
    {
      description: 'custom selectors emit pressed, hover, and tone selectors',
      pass: (s) => s.includes('[aria-pressed="true"]') && s.includes(':hover') && s.includes('[data-tone="brand"]'),
    },
  ];

  const compiledChecks: Check[] = [
    {
      description: 'static style.merge calls are extracted',
      pass: (s) => !s.includes('style.merge('),
    },
    {
      description: 'compiled output has extracted slot helpers',
      pass: (s) => s.includes('createExtractedSlot'),
    },
  ];

  const cssOk = check(id, 'extracted.css', css, cssChecks);
  const compiledOk = check(id, 'compiled.js', compiled, compiledChecks);

  return cssOk && compiledOk;
}

const ok = (await verify002()) && (await verify003()) && (await verify004()) && (await verify005());

if (!ok) {
  console.error('\nVerification FAILED. Run "npm run generate" first if files are missing.');
  process.exit(1);
}

console.log('\nAll checks passed.');
