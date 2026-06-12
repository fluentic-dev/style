import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const nextDir = join(root, '.next');

assert(existsSync(nextDir), 'missing .next output; run pnpm run build first');

const cssFiles = findFiles(join(nextDir, 'static'), (file) => file.endsWith('.css'));
assert(cssFiles.length > 0, 'expected extracted CSS assets in .next/static');

const css = cssFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
assert(css.includes('font-size') || css.includes('fontSize'), 'extracted CSS did not include expected rules');
assert(!css.includes('__style_runtime_css_virtual_marker__'), 'virtual CSS marker was not replaced');
assert(!css.includes('.__style_runtime_css_virtual_marker__'), 'virtual CSS marker class was not replaced');

const server = spawn('pnpm', ['run', 'start'], {
  cwd: root,
  env: { ...process.env, PORT: '4180' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

try {
  await waitFor(async () => {
    const response = await fetch('http://127.0.0.1:4180/');
    return response.ok;
  });

  for (const route of ['/', '/ssg', '/ssr', '/rsc', '/client']) {
    const response = await fetch(`http://127.0.0.1:4180${route}`);
    assert(response.ok, `${route} returned ${response.status}`);
    const html = await response.text();
    assert(html.includes('class='), `${route} did not render class attributes`);
    assertCssCoversHtmlClasses(css, html, route);
  }

  console.log('Verified extracted CSS and rendered routes: /, /ssg, /ssr, /rsc, /client');
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
  throw new Error('Next server did not start in time');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertCssCoversHtmlClasses(css, html, route) {
  const classes = new Set();

  for (const match of html.matchAll(/class="([^"]+)"/g)) {
    for (const className of match[1].split(/\s+/)) {
      if (className) classes.add(className);
    }
  }

  const missing = [...classes].filter((className) => !css.includes(`.${escapeCssClass(className)}`));
  assert(
    missing.length === 0,
    `${route} rendered classes without extracted CSS: ${missing.slice(0, 12).join(', ')}`,
  );
}

function escapeCssClass(className) {
  const escaped = className.replace(/([\\.:\\[\\](),#>+~*=!|^$@])/g, '\\$1');

  if (/^[0-9]/.test(escaped)) return `\\3${escaped[0]} ${escaped.slice(1)}`;
  if (/^-[0-9]/.test(escaped)) return `-\\3${escaped[1]} ${escaped.slice(2)}`;

  return escaped;
}
