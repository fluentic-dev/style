import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
const cwd = fileURLToPath(new URL('../..', import.meta.url));

async function start() {
  const proc = spawn('pnpm', [
    '--filter',
    '@benchmark/app-fluentic-style',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    '5310',
    '--strictPort',
  ], { cwd, stdio: 'pipe' });
  let url = null;
  proc.stdout.on('data', (b) => {
    const s = String(b);
    const m = s.match(/Local:\s+(http:\/\/127\.0\.0\.1:\d+\/)/);
    if (m) url = m[1];
  });
  for (let i = 0; i < 80 && !url; i++) await wait(250);
  if (!url) throw new Error('preview start failed');
  return { proc, url };
}

const { proc, url } = await start();
try {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${url}?verify=1&fluenticMode=chain&rows=50`, { waitUntil: 'networkidle' });
  console.log(await page.title());
  await ctx.close();
  await browser.close();
} finally {
  proc.kill('SIGTERM');
}
