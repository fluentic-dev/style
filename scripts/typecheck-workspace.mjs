import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const ignoredDirs = new Set([
  '.dprint-cache',
  '.git',
  '.next',
  '.source',
  'coverage',
  'dist',
  'node_modules',
  'styled-system',
]);

function findTsconfigs(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    if (ignoredDirs.has(entry)) continue;

    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      findTsconfigs(fullPath, found);
      continue;
    }

    if (entry === 'tsconfig.json') {
      found.push(fullPath);
    }
  }

  return found;
}

function run(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    shell: false,
    stdio: 'inherit',
  }).status ?? 1;
}

const projects = findTsconfigs(root)
  .map((tsconfig) => ({
    dir: tsconfig.slice(0, -'/tsconfig.json'.length),
    name: relative(root, tsconfig.slice(0, -'/tsconfig.json'.length)) || '.',
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const failures = [];

console.log(`Typechecking ${projects.length} tsconfig projects...`);

for (const project of projects) {
  console.log(`\n== ${project.name} ==`);

  if (project.name === 'docs/app') {
    const sourceStatus = run('pnpm', ['run', 'source:gen'], project.dir);
    if (sourceStatus !== 0) {
      failures.push(project.name);
      continue;
    }
  }

  const status = run('pnpm', ['exec', 'tsc', '-p', 'tsconfig.json', '--noEmit'], project.dir);
  if (status !== 0) {
    failures.push(project.name);
  }
}

if (failures.length > 0) {
  console.error(`\nTypecheck failed in ${failures.length} project(s):`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('\nTypecheck passed.');
