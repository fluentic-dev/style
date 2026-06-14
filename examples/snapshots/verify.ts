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
  console.log('\nVerifying snapshot 002 (transform: row/column → flexDirection)');

  const css = await readSnapshot('002', 'extracted.css');
  const compiled = await readSnapshot('002', 'compiled.js');

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

  const cssOk = check('002', 'extracted.css', css, cssChecks);
  const compiledOk = check('002', 'compiled.js', compiled, compiledChecks);

  return cssOk && compiledOk;
}

async function verify003() {
  console.log('\nVerifying snapshot 003 (explicit scope binding)');

  const css = await readSnapshot('003', 'extracted.css');
  const compiled = await readSnapshot('003', 'compiled.js');

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

  const cssOk = check('003', 'extracted.css', css, cssChecks);
  const compiledOk = check('003', 'compiled.js', compiled, compiledChecks);

  return cssOk && compiledOk;
}

async function verify004() {
  console.log('\nVerifying snapshot 004 (nested tokens and themes)');

  const css = await readSnapshot('004', 'extracted.css');
  const compiled = await readSnapshot('004', 'compiled.js');

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
      pass: (s) => s.includes('background-color: var(--token-') && s.includes('box-shadow: var(--token-'),
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

  const cssOk = check('004', 'extracted.css', css, cssChecks);
  const compiledOk = check('004', 'compiled.js', compiled, compiledChecks);

  return cssOk && compiledOk;
}

const ok = (await verify002()) && (await verify003()) && (await verify004());

if (!ok) {
  console.error('\nVerification FAILED. Run "npm run generate" first if files are missing.');
  process.exit(1);
}

console.log('\nAll checks passed.');
