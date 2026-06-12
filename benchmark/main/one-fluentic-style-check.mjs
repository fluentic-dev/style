import { spawn } from 'node:child_process';
const p = spawn('pnpm', [
  '--filter',
  '@benchmark/app-fluentic-style',
  'preview',
  '--host',
  '127.0.0.1',
  '--port',
  '5391',
  '--strictPort',
], { cwd: new URL('../..', import.meta.url).pathname, stdio: 'pipe' });
p.stdout.on('data', (d) => process.stdout.write(String(d)));
p.stderr.on('data', (d) => process.stderr.write(String(d)));
