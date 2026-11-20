import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixtureDir = join(root, 'app/global-transport-test');
assert(!existsSync(fixtureDir), 'temporary global transport fixture already exists');
const base = process.env.NEXT_GLOBAL_TEST_URL ?? 'http://127.0.0.1:4181';
const require = createRequire(import.meta.url);
let server;
let output = '';

mkdirSync(fixtureDir);
writeFileSync(
  join(fixtureDir, 'page.tsx'),
  `
import { Suspense } from 'react';
import { style } from '@fluentic/style';
import { createGlobalSheet } from '@fluentic/style/css';
async function Late({ tone }) {
  await new Promise(resolve => setTimeout(resolve, 30));
  createGlobalSheet({ order: 1, layer: true }, [style.selector('[data-global-request-probe]', { color: tone })]);
  return <p data-global-request-probe css={style({ color: 'purple' })}>Request-local global rule</p>;
}
export default async function Page({ searchParams }) {
  const { tone } = await searchParams;
  return <Suspense fallback={<p>Loading</p>}><Late tone={tone} /></Suspense>;
}
`,
);

try {
  if (!process.env.NEXT_GLOBAL_TEST_URL) {
    server = spawn(process.execPath, [
      require.resolve('next/dist/bin/next'),
      'dev',
      ...(process.env.NEXT_GLOBAL_TEST_WEBPACK ? ['--webpack'] : []),
      '--hostname',
      '127.0.0.1',
      '--port',
      '4181',
    ], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    server.stdout.on('data', (chunk) => {
      output += chunk;
    });
    server.stderr.on('data', (chunk) => {
      output += chunk;
    });
  }
  await waitForServer();
  const html = await get('/');
  const first = batches(html);
  assert(
    first.some((batch) => batch.rules.some((rule) => /body\{margin: 0/.test(rule.css))),
    'missing initial global reset',
  );
  const second = batches(await get('/'));
  assert(
    second.some((batch) => batch.rules.some((rule) => /body\{margin: 0/.test(rule.css))),
    'module cache lost globals on second request',
  );
  const flight = await get('/rsc', { RSC: '1' });
  assert(flight.includes('data-css-global-rules-dev'), 'missing global transport in Flight');
  assert(flight.includes('data-global-rsc-note'), 'missing route global styles in Flight');
  const results = await Promise.all(['red', 'blue'].map(async (tone) => {
    const response = await get('/global-transport-test?tone=' + tone);
    const requestRules = batches(response).flatMap((batch) => batch.rules).filter((rule) =>
      rule.css.includes('[data-global-request-probe]')
    );
    assert(
      requestRules.every((rule) => rule.globalSheet?.order === 1 && rule.layer === 'style'),
      'global ordering metadata was lost',
    );
    const css = batches(response).flatMap((batch) => batch.rules).map((rule) => rule.css)
      .filter((css) => css.includes('[data-global-request-probe]')).join('\n');
    assert(css.includes('color: ' + tone), 'streamed request global was not delivered: ' + tone);
    const seeds = [...response.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]);
    const finalSeed = seeds.findLast((seed) => seed.includes('color: purple'));
    assert(finalSeed?.includes('[data-global-request-probe]{color: ' + tone), 'HTML renderer lost request globals');
    assert(
      finalSeed.indexOf('color: purple') < finalSeed.indexOf('[data-global-request-probe]{color: ' + tone),
      'positive global seed preceded regular CSS',
    );
    assert(
      !finalSeed.includes('[data-global-request-probe]{color: ' + (tone === 'red' ? 'blue' : 'red')),
      'concurrent globals leaked into HTML seed',
    );

    assert(
      !css.includes('color: ' + (tone === 'red' ? 'blue' : 'red')),
      'request globals leaked across concurrent responses',
    );
    return tone;
  }));
  console.log(
    'Verified initial/repeated HTML, Flight navigation, streaming, and isolated concurrent globals:',
    results.join(', '),
  );
} catch (error) {
  console.error(output.slice(-4000));
  throw error;
} finally {
  if (server && server.exitCode === null) {
    const exited = once(server, 'exit');
    server.kill('SIGTERM');
    await exited;
  }
  rmSync(fixtureDir, { recursive: true, force: true });
}

async function get(route, headers) {
  const response = await fetch(base + route, { headers });
  assert(response.ok, route + ' returned ' + response.status);
  return response.text();
}

function batches(html) {
  return [...html.matchAll(/<script\b(?=[^>]*data-css-global-rules-dev=)[^>]*>([\s\S]*?)<\/script>/g)]
    .flatMap((match) => JSON.parse(match[1]));
}

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < 60000) {
    try {
      if ((await fetch(base)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Next dev server did not start');
}
