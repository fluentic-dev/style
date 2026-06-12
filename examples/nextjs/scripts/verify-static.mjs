import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const outDir = join(root, 'out');

assert(existsSync(outDir), 'missing out directory; run pnpm run ssg:build first');

const cssFiles = findFiles(outDir, (file) => file.endsWith('.css'));
assert(cssFiles.length > 0, 'expected exported CSS assets in out');

const css = cssFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
assert(css.includes('font-size') || css.includes('fontSize'), 'exported CSS did not include expected rules');
assert(!css.includes('__style_runtime_css_virtual_marker__'), 'virtual CSS marker was not replaced');
assert(!css.includes('.__style_runtime_css_virtual_marker__'), 'virtual CSS marker class was not replaced');

const server = spawn('npx', ['serve', 'out', '-l', 'tcp://127.0.0.1:4182'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});

try {
  await waitFor(async () => {
    const response = await fetch('http://127.0.0.1:4182/');
    return response.ok;
  });

  for (const route of ['/', '/ssg/', '/rsc/', '/client/', '/ssr/']) {
    const response = await fetch(`http://127.0.0.1:4182${route}`);
    assert(response.ok, `${route} returned ${response.status}`);
    const html = await response.text();
    assert(html.includes('class='), `${route} did not render class attributes`);
  }

  console.log('Verified static export and served routes: /, /ssg/, /rsc/, /client/, /ssr/');
} finally {
  server.kill('SIGTERM');
}

function findFiles(dir, predicate) {
  if (!existsSync(dir)) return [];

  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath, predicate));
    } else if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function waitFor(check) {
  const started = Date.now();
  while (Date.now() - started < 30000) {
    try {
      if (await check()) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error('static server did not start in time');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
