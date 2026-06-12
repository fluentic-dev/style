import { spawnSync } from 'node:child_process';

const checks = ['lintcheck', 'formatcheck', 'typecheck'];
const failures = [];

for (const check of checks) {
  console.log(`\n== ${check} ==`);

  const status = spawnSync('pnpm', ['run', check], {
    shell: false,
    stdio: 'inherit',
  }).status ?? 1;

  if (status !== 0) {
    failures.push(check);
  }
}

if (failures.length > 0) {
  console.error(`\nWorkspace check failed: ${failures.join(', ')}`);
  process.exit(1);
}

console.log('\nWorkspace check passed.');
