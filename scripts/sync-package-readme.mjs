import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const rootReadme = join(rootDir, 'README.md');
const packageReadme = join(rootDir, 'packages/style/README.md');
const command = process.argv[2] || 'copy';

if (command === 'copy') {
  copyFileSync(rootReadme, packageReadme);
} else if (command === 'clean') {
  if (existsSync(packageReadme)) rmSync(packageReadme);
} else if (command === 'run') {
  const args = process.argv.slice(3);

  if (!args.length) {
    throw new Error('sync-package-readme run requires a command.');
  }

  copyFileSync(rootReadme, packageReadme);

  const clean = () => {
    if (existsSync(packageReadme)) rmSync(packageReadme);
  };

  const child = spawn(args[0], args.slice(1), {
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  child.on('error', (error) => {
    clean();
    throw error;
  });

  child.on('exit', (code, signal) => {
    clean();
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });
} else {
  throw new Error(`Unknown sync-package-readme command: ${command}`);
}
