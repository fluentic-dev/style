import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const app = {
  name: 'style-cache-browser',
  filter: '@benchmark/app-fluentic-cache',
  port: Number(process.env.PORT || 5410),
};
const defaultVariants = [
  'parentHoisted',
  'parentHoistedClassName',
  'childHoistedSameMap',
  'childNewMapSameSlots',
  'childInlineDynamic',
  'fluenticNoCssCreateElement',
  'reactNoCssCreateElement',
  'gooberHoistedClass',
  'gooberInlineDynamic',
  'emotionHoistedClass',
  'emotionInlineDynamic',
  'styledComponentsDynamicProp',
];
const variants = (process.env.VARIANTS ||
  defaultVariants.join(','))
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const REPORT_KIND = process.env.BENCH_KIND || 'style-cache-browser-benchmark';
const REPORT_LABEL = process.env.BENCH_LABEL || 'Style cache benchmark';
const OUTPUT_PREFIX = process.env.OUTPUT_PREFIX || 'fluentic-cache';
const ITEMS = Number(process.env.ITEMS || 1000);
const REPEATS = Number(process.env.REPEATS || 3);
const WARMUPS = Number(process.env.WARMUPS || 3);
const MEASURED = Number(process.env.MEASURED || 20);
const UPDATE_STEPS = Number(process.env.UPDATE_STEPS || 20);
const OUT_DIR = process.env.BENCH_OUT_DIR || join(process.cwd(), 'results');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runCmd(cmd, args) {
  await new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: 'inherit' });
    proc.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} ${args.join(' ')} -> ${code}`));
      }
    });
  });
}

async function startPreview() {
  const proc = spawn('pnpm', [
    '--filter',
    app.filter,
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    String(app.port),
    '--strictPort',
  ], { stdio: 'pipe' });

  let ready = false;
  let localUrl = null;

  const onOutput = (buf) => {
    const match = String(buf).match(/Local:\s+(http:\/\/(?:127\.0\.0\.1|localhost):\d+\/)/);

    if (match) {
      ready = true;
      localUrl = match[1].replace('localhost', '127.0.0.1');
    }
  };

  proc.stdout.on('data', onOutput);
  proc.stderr.on('data', onOutput);

  for (let i = 0; i < 160 && !ready; i++) {
    await wait(250);
  }

  if (!ready || !localUrl) {
    proc.kill('SIGTERM');
    throw new Error(`${app.filter} preview did not start`);
  }

  return { proc, localUrl };
}

function getChromeExecutablePath() {
  const candidates = [
    process.env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  return undefined;
}

await runCmd('pnpm', ['--filter', app.filter, 'build']);

const chromeExecutablePath = getChromeExecutablePath();
const browser = await chromium.launch({
  headless: true,
  executablePath: chromeExecutablePath,
});
const browserVersion = await browser.version();
const runsByVariant = new Map(variants.map((variant) => [variant, []]));
let preview;

try {
  preview = await startPreview();

  for (let repeat = 0; repeat < REPEATS; repeat++) {
    const order = rotate(variants, repeat);
    console.log(`\nRepeat ${repeat + 1}/${REPEATS}: ${order.join(', ')}`);

    for (const variant of order) {
      console.log(`Running ${variant}...`);
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      try {
        const search = new URLSearchParams({
          autorun: '1',
          variant,
          items: String(ITEMS),
          warmups: String(WARMUPS),
          measured: String(MEASURED),
          updateSteps: String(UPDATE_STEPS),
        });

        await page.goto(`${preview.localUrl}?${search}`, { waitUntil: 'load' });
        await page.waitForFunction(() => !!window.__benchResult, null, { timeout: 600000 });
        runsByVariant.get(variant).push(await page.evaluate(() => window.__benchResult));
      } finally {
        await context.close().catch(() => {});
      }
    }
  }
} finally {
  preview?.proc.kill('SIGTERM');
  await browser.close();
}

const results = variants.map((variant) => summarizeVariant(variant, runsByVariant.get(variant)));

const report = {
  kind: REPORT_KIND,
  createdAt: new Date().toISOString(),
  settings: {
    items: ITEMS,
    repeats: REPEATS,
    warmups: WARMUPS,
    measured: MEASURED,
    updateSteps: UPDATE_STEPS,
    order: 'rotated by repeat to reduce fixed-order browser/JIT bias',
    notes: [
      'Each variant runs in a fresh browser context.',
      'The app lazily initializes only the selected library family for a page load.',
      'Fluentic css-prop elements use Fluentic createElement explicitly; other libraries use React JSX.',
      'The no-css createElement variants isolate Fluentic JSX runtime fast-path overhead after the css-prop presence check.',
      'Warmups intentionally measure warmed cache behavior; use lower warmups for colder insertion stress.',
    ],
  },
  environment: {
    node: process.version,
    v8: process.versions.v8,
    platform: process.platform,
    arch: process.arch,
    browser: browserVersion,
    chromeExecutablePath: chromeExecutablePath || null,
  },
  results,
};

mkdirSync(OUT_DIR, { recursive: true });
const outputPath = join(OUT_DIR, `${OUTPUT_PREFIX}-${Date.now()}.json`);
writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log(`\n${REPORT_LABEL} report: ${outputPath}\n`);
console.table(
  results.map((result) => ({
    variant: result.variant,
    repeats: result.repeats,
    mountMedian: result.mountMs.median.toFixed(2),
    updateMedian: result.updateMs.median.toFixed(2),
    mountP95: result.mountMs.p95.toFixed(2),
    updateP95: result.updateMs.p95.toFixed(2),
    rules: result.styleTelemetry.ruleCount,
    styleTags: result.styleTelemetry.styleTagCount,
    fluenticTags: result.styleTelemetry.fluenticStyleTagCount,
  })),
);

function rotate(items, offset) {
  const index = offset % items.length;

  return items.slice(index).concat(items.slice(0, index));
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function p95(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);

  return sorted[index];
}

function stdev(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);

  return Math.sqrt(mean(values.map((value) => (value - avg) ** 2)));
}

function summarizeValues(values) {
  return {
    mean: mean(values),
    median: median(values),
    min: Math.min(...values),
    max: Math.max(...values),
    p95: p95(values),
    stdev: stdev(values),
    values,
  };
}

function summarizeVariant(variant, runs) {
  if (!runs?.length) throw new Error(`${variant} produced no benchmark runs`);

  return {
    variant,
    repeats: runs.length,
    items: ITEMS,
    warmups: WARMUPS,
    measured: MEASURED,
    updateSteps: UPDATE_STEPS,
    mountMs: summarizeValues(runs.map((run) => run.mountMs.median)),
    updateMs: summarizeValues(runs.map((run) => run.updateMs.median)),
    styleTelemetry: runs.at(-1).styleTelemetry,
    runs,
  };
}
