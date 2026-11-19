import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Keep JS and declarations current without the JS watcher deleting type output.
const children = [
  spawn(process.execPath, [fileURLToPath(import.meta.resolve('tsdown/run')), '--watch', '--no-clean'], {
    stdio: 'inherit',
  }),
  spawn(process.execPath, ['scripts/build-types.mjs', '--watch'], { stdio: 'inherit' }),
];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
}
for (const child of children) {
  child.on('error', (error) => {
    console.error(error);
    stop(1);
  });
  child.on('exit', (code) => stop(code ?? 1));
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
