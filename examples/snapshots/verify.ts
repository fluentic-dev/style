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
      description: 'contains flex-direction:row (from row:true)',
      pass: (s) => s.includes('flex-direction:row'),
    },
    {
      description: 'contains flex-direction:column (from column:true)',
      pass: (s) => s.includes('flex-direction:column'),
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
      description: 'hover selector with flex-direction:column',
      pass: (s) => /flex-direction:column/.test(s) && /:hover/.test(s),
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
      description: 'uses createPrecompiledStyle (compiled at build time)',
      pass: (s) => s.includes('createPrecompiledStyle'),
    },
  ];

  const cssOk = check('002', 'extracted.css', css, cssChecks);
  const compiledOk = check('002', 'compiled.js', compiled, compiledChecks);

  return cssOk && compiledOk;
}

const ok = await verify002();

if (!ok) {
  console.error('\nVerification FAILED. Run "npm run generate" first if files are missing.');
  process.exit(1);
}

console.log('\nAll checks passed.');
