import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const bundler = process.argv.includes('--webpack') ? '--webpack' : '--turbopack';
const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = mkdtempSync(path.join(root, '.fingerprint-'));

try {
  mkdirSync(path.join(fixture, 'app'));
  writeFileSync(path.join(fixture, 'package.json'), '{"private":true}');
  writeFileSync(
    path.join(fixture, 'next.config.mjs'),
    [
      "import fluentic from '@fluentic/style/plugin/nextjs';",
      'export default fluentic({',
      "  output: 'export',",
      '  experimental: { turbopackFileSystemCacheForBuild: true },',
      '});',
    ].join('\n'),
  );
  writeFileSync(
    path.join(fixture, 'app/layout.jsx'),
    [
      'export default function Layout({ children }) {',
      '  return <html><body>{children}</body></html>;',
      '}',
    ].join('\n'),
  );

  writeFileSync(
    path.join(fixture, 'app/priority.js'),
    [
      "import { style } from '@fluentic/style';",
      "export const priority = style({ width: style.weight('917px', 2) });",
    ].join('\n'),
  );

  const before = build(731);
  const after = build(732);
  assert.notEqual(after.css, before.css);
  assert.notEqual(after.href, before.href, 'changed CSS reused its exported stylesheet URL');
  assert.deepEqual(build(732), after, 'identical CSS must keep the same stylesheet URL');
  assert.doesNotMatch(after.css, /width:\s*731px\b/);
  console.log(`Verified stylesheet fingerprints and cross-module priority in ${bundler.slice(2)} static exports.`);
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

function build(width) {
  writeFileSync(
    path.join(fixture, 'app/page.jsx'),
    [
      "import { getClassName, style } from '@fluentic/style';",
      "import { priority } from './priority';",
      `const panel = style({ width: '${width}px' });`,
      'export default function Page() { return <main {...getClassName([priority, panel])}>Panel</main>; }',
    ].join('\n'),
  );
  execFileSync(process.execPath, [require.resolve('next/dist/bin/next'), 'build', bundler], {
    cwd: fixture,
    stdio: 'inherit',
  });

  const html = readFileSync(path.join(fixture, 'out/index.html'), 'utf8');
  for (const [link] of html.matchAll(/<link\b[^>]+>/g)) {
    if (!link.includes('rel="stylesheet"')) continue;
    const href = /href="([^"]+)"/.exec(link)?.[1];
    assert.ok(href);
    const pathname = new URL(href, 'http://localhost').pathname;
    const css = readFileSync(path.join(fixture, 'out', pathname), 'utf8');
    const declaration = new RegExp(`width:\\s*${width}px\\b`).exec(css);
    if (!declaration) continue;
    assert.ok(!css.includes('__fluentic_style_css_marker__'));
    const priority = /width:\s*917px\b/.exec(css);
    assert.ok(priority && priority.index > declaration.index, 'higher-priority rule must follow the base rule');
    return { css, href: pathname };
  }
  assert.fail(`exported HTML did not reference CSS containing the ${width}px declaration`);
}
