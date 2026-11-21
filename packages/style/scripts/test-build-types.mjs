import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = mkdtempSync(join(tmpdir(), 'fluentic-native-types-'));
let watcher;
try {
  mkdirSync(join(fixture, 'scripts'));
  mkdirSync(join(fixture, 'nested'));
  symlinkSync(join(root, 'node_modules'), join(fixture, 'node_modules'), 'dir');
  copyFileSync(join(root, 'scripts/build-types.mjs'), join(fixture, 'scripts/build-types.mjs'));
  writeFileSync(
    join(fixture, 'package.json'),
    JSON.stringify({
      name: 'native-types-fixture',
      type: 'module',
      exports: { '.': { types: './dist/types/index.d.ts' } },
    }),
  );
  writeFileSync(
    join(fixture, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: { strict: true, target: 'ES2020', module: 'ESNext', moduleResolution: 'Bundler', types: [] },
    }),
  );
  writeFileSync(join(fixture, 'nested/index.ts'), 'export interface Value { label: string; }\n');
  const source = "export type { Value } from './nested';\nexport type Inline = import('./nested').Value;\n";
  writeFileSync(join(fixture, 'index.ts'), source);
  const run = () => spawnSync(process.execPath, ['scripts/build-types.mjs'], { cwd: fixture, encoding: 'utf8' });
  const built = run();
  assert.equal(built.status, 0, built.stdout + built.stderr);
  const declaration = () => readFileSync(join(fixture, 'dist/types/index.d.ts'), 'utf8');
  assert.equal((declaration().match(/\.\/nested\/index\.js/g) ?? []).length, 2);
  const good = declaration();
  writeFileSync(join(fixture, 'index.ts'), source + 'export const broken: string = 1;\n');
  assert.notEqual(run().status, 0);
  assert.equal(declaration(), good, 'failed checks preserve the last valid declarations');
  writeFileSync(join(fixture, 'index.ts'), source);
  watcher = spawn(process.execPath, ['scripts/build-types.mjs', '--watch'], {
    cwd: fixture,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  watcher.stdout.on('data', (chunk) => {
    output += chunk;
  });
  watcher.stderr.on('data', (chunk) => {
    output += chunk;
  });
  async function waitFor(predicate) {
    const deadline = Date.now() + 20000;
    while (!predicate()) {
      assert.equal(watcher.exitCode, null, output);
      assert(Date.now() < deadline, `Timed out waiting for native watch: ${output}`);
      await delay(50);
    }
  }
  const completed = () => (output.match(/Generated declarations/g) ?? []).length;
  await waitFor(() => completed() >= 1);
  writeFileSync(join(fixture, 'index.ts'), source + "export const watched = 'updated';\n");
  // Finalization replaces the output directory before writing declarations.
  // Wait for its completion message before reading the rebuilt file.
  await waitFor(() => completed() >= 2);
  await waitFor(() => declaration().includes('updated'));
  assert.match(declaration(), /updated/);
  console.log('Native declaration emit, specifier rewriting, error handling, and watch checks passed.');
} finally {
  if (watcher && watcher.exitCode === null) {
    const exited = once(watcher, 'exit');
    watcher.kill('SIGTERM');
    await exited;
  }
  rmSync(fixture, { recursive: true, force: true });
}
