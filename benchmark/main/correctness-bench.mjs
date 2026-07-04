import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { correctnessSpec, getBenchmarkSelection, getBuildKey, getUniqueBuildApps } from './correctness.mjs';

const REPEATS = Number(process.env.REPEATS || 3);
const ROWS = Number(process.env.ROWS || 500);
const OUT_DIR = process.env.BENCH_OUT_DIR || join(process.cwd(), 'results');
const RENDER_TIMEOUT_MS = Number(process.env.RENDER_TIMEOUT_MS || 5000);
const RUNTIME_TIMEOUT_MS = Number(process.env.RUNTIME_TIMEOUT_MS || 180000);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mean = (items) => items.reduce((sum, item) => sum + item, 0) / items.length;
const median = (items) => {
  const sorted = items.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const p95 = (items) => {
  const sorted = items.slice().sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);

  return sorted[index];
};
const stdev = (items) => {
  if (items.length < 2) return 0;
  const avg = mean(items);
  const variance = mean(items.map((item) => (item - avg) ** 2));

  return Math.sqrt(variance);
};

async function runCmd(cmd, args) {
  const startedAt = performance.now();

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

  return performance.now() - startedAt;
}

async function startPreview(app) {
  const args = [
    '--filter',
    app.filter,
    'serve',
    '--host',
    '127.0.0.1',
    '--port',
    String(app.port),
    '--strictPort',
  ];
  if (app.distDir) args.push('--outDir', app.distDir);

  const proc = spawn('pnpm', args, { stdio: 'pipe' });

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

function getDistStats(app) {
  const packageName = app.filter.replace('@benchmark/', '');
  const distPath = join(process.cwd(), '..', 'apps', packageName, app.distDir || 'dist');

  if (!existsSync(distPath)) return { distBytes: 0, jsBytes: 0, cssBytes: 0, fileCount: 0 };

  const stats = { distBytes: 0, jsBytes: 0, cssBytes: 0, fileCount: 0 };

  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      const stat = statSync(path);

      if (stat.isDirectory()) {
        walk(path);
        continue;
      }

      stats.fileCount += 1;
      stats.distBytes += stat.size;
      if (path.endsWith('.js')) stats.jsBytes += stat.size;
      if (path.endsWith('.css')) stats.cssBytes += stat.size;
    }
  }

  walk(distPath);
  return stats;
}

async function readComputed(page, selector) {
  return await page.locator(selector).first().evaluate((node) => {
    const style = getComputedStyle(node);

    return {
      display: style.display,
      justifyContent: style.justifyContent,
      alignItems: style.alignItems,
      backgroundColor: style.backgroundColor,
      color: style.color,
      fontFamily: style.fontFamily,
      minHeight: style.minHeight,
      borderTopColor: style.borderTopColor,
      borderTopStyle: style.borderTopStyle,
      borderTopWidth: style.borderTopWidth,
      gridTemplateColumns: style.gridTemplateColumns,
      fontSize: style.fontSize,
    };
  });
}

function compareComputed(actual, expected) {
  const failures = [];

  for (const [key, value] of Object.entries(expected)) {
    if (key.endsWith('Includes')) {
      const actualKey = key.slice(0, -'Includes'.length);
      if (!String(actual[actualKey] || '').includes(value)) {
        failures.push(
          `${actualKey} expected to include ${JSON.stringify(value)}, got ${JSON.stringify(actual[actualKey])}`,
        );
      }
      continue;
    }

    if (actual[key] !== value) {
      failures.push(`${key} expected ${JSON.stringify(value)}, got ${JSON.stringify(actual[key])}`);
    }
  }

  return failures;
}

async function runDomAssertions(page, assertions, viewportName) {
  const failures = [];

  for (const assertion of assertions) {
    const locator = page.locator(assertion.selector);
    const count = await locator.count();

    if (assertion.count !== undefined && count !== assertion.count) {
      failures.push({
        viewport: viewportName,
        assertion: assertion.name,
        reason: `${assertion.selector} expected count ${assertion.count}, got ${count}`,
      });
      continue;
    }

    if (assertion.countAtMost !== undefined && count > assertion.countAtMost) {
      failures.push({
        viewport: viewportName,
        assertion: assertion.name,
        reason: `${assertion.selector} expected count at most ${assertion.countAtMost}, got ${count}`,
      });
      continue;
    }

    if (assertion.text !== undefined) {
      if (count === 0) {
        failures.push({
          viewport: viewportName,
          assertion: assertion.name,
          reason: `Missing selector ${assertion.selector}`,
        });
        continue;
      }

      const actual = (await locator.first().textContent())?.trim() || '';

      if (actual !== assertion.text) {
        failures.push({
          viewport: viewportName,
          assertion: assertion.name,
          reason: `${assertion.selector} expected text ${JSON.stringify(assertion.text)}, got ${
            JSON.stringify(actual)
          }`,
        });
      }
    }
  }

  return failures;
}

async function runCorrectness(browser, app, localUrl) {
  const failures = [];
  const snapshots = [];

  for (const viewport of correctnessSpec.viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });

    try {
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') pageErrors.push(message.text());
      });

      await page.goto(`${localUrl}?${correctnessSpec.query}${app.extraQuery}`, {
        waitUntil: 'load',
      });

      try {
        await page.waitForSelector('h1', { timeout: RENDER_TIMEOUT_MS });
      } catch {
        failures.push({
          viewport: viewport.name,
          assertion: 'app rendered',
          reason: pageErrors.length
            ? `Missing h1; browser errors: ${pageErrors.join(' | ')}`
            : 'Missing h1 after page load',
        });
        continue;
      }

      const assertions = correctnessSpec.assertions.filter((assertion) => {
        return !assertion.viewport || assertion.viewport === viewport.name;
      });

      for (const assertion of assertions) {
        const locator = page.locator(assertion.selector).first();
        const count = await locator.count();

        if (count === 0) {
          failures.push({
            viewport: viewport.name,
            assertion: assertion.name,
            reason: `Missing selector ${assertion.selector}`,
          });
          continue;
        }

        if (assertion.hover) {
          await locator.hover();
          await page.waitForTimeout(60);
        }

        const actual = await readComputed(page, assertion.selector);
        const computedFailures = compareComputed(actual, assertion.computed);

        for (const reason of computedFailures) {
          failures.push({ viewport: viewport.name, assertion: assertion.name, reason });
        }
      }

      failures.push(...await runDomAssertions(page, correctnessSpec.structureAssertions, viewport.name));

      const snapshot = {
        viewport: viewport.name,
        styleTagCount: await page.locator('style').count(),
        fluenticRuntimeStyleTagCount: await page.locator('style[data-fluentic-style]').count(),
        ruleCount: await page.evaluate(() => {
          let count = 0;

          for (const sheet of document.styleSheets) {
            try {
              count += sheet.cssRules?.length || 0;
            } catch {
              // Cross-origin stylesheets are not expected in these local benchmarks.
            }
          }

          return count;
        }),
      };

      snapshots.push(snapshot);
      failures.push(...compareStyleCorrectness(snapshot, app.styleCorrectness, viewport.name));

      await page.goto(`${localUrl}?${correctnessSpec.detailsQuery}${app.extraQuery}`, {
        waitUntil: 'load',
      });
      await page.waitForSelector('h1', { timeout: RENDER_TIMEOUT_MS });
      failures.push(...await runDomAssertions(page, correctnessSpec.detailsAssertions, viewport.name));
    } finally {
      await page.close();
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    snapshots,
  };
}

function compareStyleCorrectness(snapshot, styleCorrectness, viewportName) {
  if (!styleCorrectness) return [];

  const failures = [];

  if (styleCorrectness.maxStyleTags !== undefined && snapshot.styleTagCount > styleCorrectness.maxStyleTags) {
    failures.push({
      viewport: viewportName,
      assertion: 'style tag count',
      reason: `Expected at most ${styleCorrectness.maxStyleTags} style tags, got ${snapshot.styleTagCount}`,
    });
  }

  if (styleCorrectness.minStyleTags !== undefined && snapshot.styleTagCount < styleCorrectness.minStyleTags) {
    failures.push({
      viewport: viewportName,
      assertion: 'style tag count',
      reason: `Expected at least ${styleCorrectness.minStyleTags} style tags, got ${snapshot.styleTagCount}`,
    });
  }

  if (
    styleCorrectness.fluenticRuntimeTags !== undefined &&
    snapshot.fluenticRuntimeStyleTagCount !== styleCorrectness.fluenticRuntimeTags
  ) {
    failures.push({
      viewport: viewportName,
      assertion: 'fluentic runtime style tags',
      reason:
        `Expected ${styleCorrectness.fluenticRuntimeTags} Fluentic runtime style tags, got ${snapshot.fluenticRuntimeStyleTagCount}`,
    });
  }

  if (
    styleCorrectness.minFluenticRuntimeTags !== undefined &&
    snapshot.fluenticRuntimeStyleTagCount < styleCorrectness.minFluenticRuntimeTags
  ) {
    failures.push({
      viewport: viewportName,
      assertion: 'fluentic runtime style tags',
      reason:
        `Expected at least ${styleCorrectness.minFluenticRuntimeTags} Fluentic runtime style tags, got ${snapshot.fluenticRuntimeStyleTagCount}`,
    });
  }

  if (styleCorrectness.minRules !== undefined && snapshot.ruleCount < styleCorrectness.minRules) {
    failures.push({
      viewport: viewportName,
      assertion: 'stylesheet rule count',
      reason: `Expected at least ${styleCorrectness.minRules} stylesheet rules, got ${snapshot.ruleCount}`,
    });
  }

  if (styleCorrectness.maxRules !== undefined && snapshot.ruleCount > styleCorrectness.maxRules) {
    failures.push({
      viewport: viewportName,
      assertion: 'stylesheet rule count',
      reason: `Expected at most ${styleCorrectness.maxRules} stylesheet rules, got ${snapshot.ruleCount}`,
    });
  }

  return failures;
}

async function runRuntime(browser, app, localUrl) {
  const runs = [];

  for (let i = 0; i < REPEATS; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    try {
      await page.goto(`${localUrl}?rows=${ROWS}${app.extraQuery}&autorun=1`, {
        waitUntil: 'load',
      });
      await page.waitForFunction(() => !!window.__benchResult, null, { timeout: RUNTIME_TIMEOUT_MS });
      runs.push(await page.evaluate(() => window.__benchResult));
    } finally {
      await ctx.close();
    }
  }

  return summarizeRuns(runs);
}

function summarizeRuns(runs) {
  return {
    initialMountMs: summarizeMetric(runs, 'initialMountMs'),
    coldInitialMountMs: summarizeMetric(runs, 'coldInitialMountMs'),
    unmountMs: summarizeMetric(runs, 'unmountMs'),
    remountMs: summarizeMetric(runs, 'remountMs'),
    routeSwitchMs: summarizeMetric(runs, 'routeSwitchMs'),
    updateNoStyleMs: summarizeMetric(runs, 'updateNoStyleMs'),
    updateLiteStyleMs: summarizeMetric(runs, 'updateLiteStyleMs'),
  };
}

function summarizeMetric(runs, key) {
  const values = runs.map((run) => run?.[key]).filter((value) => Number.isFinite(value));

  if (!values.length) {
    return {
      mean: null,
      median: null,
      min: null,
      max: null,
      p95: null,
      stdev: null,
      values,
    };
  }

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

const selection = getBenchmarkSelection();
const apps = selection.apps;
const results = [];
const buildResults = new Map();

await runCmd('pnpm', ['--filter', '@fluentic/style', 'build']);

for (const app of getUniqueBuildApps(apps)) {
  console.log(`\nBuilding ${app.name}...`);
  const args = ['--filter', app.filter, app.buildScript || 'build'];
  if (app.distDir) args.push('--outDir', app.distDir);
  const buildMs = await runCmd('pnpm', args);
  const dist = getDistStats(app);

  buildResults.set(getBuildKey(app), { buildMs, ...dist });
}

for (const app of apps) {
  results.push({
    app: app.name,
    filter: app.filter,
    lane: app.lane || 'static-dashboard',
    experimental: !!app.experimental,
    build: buildResults.get(getBuildKey(app)),
    correctness: null,
    runtime: null,
  });
}

const chromeExecutablePath = getChromeExecutablePath();
const browser = await chromium.launch({
  headless: true,
  executablePath: chromeExecutablePath,
});
const browserVersion = await browser.version();

try {
  for (const app of apps) {
    console.log(`\nChecking ${app.name}...`);
    const result = results.find((item) => item.app === app.name);
    let preview;

    try {
      preview = await startPreview(app);
    } catch (error) {
      result.correctness = {
        passed: false,
        failures: [{
          viewport: 'all',
          assertion: 'preview started',
          reason: error?.message || String(error),
        }],
        snapshots: [],
      };
      console.log(`Skipping runtime for ${app.name}; preview failed.`);
      continue;
    }

    try {
      try {
        result.correctness = await runCorrectness(browser, app, preview.localUrl);
      } catch (error) {
        result.correctness = {
          passed: false,
          failures: [{
            viewport: 'all',
            assertion: 'correctness runner',
            reason: error?.message || String(error),
          }],
          snapshots: [],
        };
      }

      if (result.correctness.passed) {
        console.log(`Running runtime benchmark for ${app.name}...`);
        try {
          result.runtime = await runRuntime(browser, app, preview.localUrl);
        } catch (error) {
          result.runtimeError = error?.message || String(error);
        }
      } else {
        console.log(`Skipping runtime for ${app.name}; correctness failed.`);
      }
    } finally {
      preview.proc.kill('SIGTERM');
    }
  }
} finally {
  await browser.close();
}

mkdirSync(OUT_DIR, { recursive: true });

const report = {
  correctness: correctnessSpec.name,
  rows: ROWS,
  repeats: REPEATS,
  createdAt: new Date().toISOString(),
  environment: {
    node: process.version,
    v8: process.versions.v8,
    platform: process.platform,
    arch: process.arch,
    browser: browserVersion,
    chromeExecutablePath: chromeExecutablePath || null,
  },
  selectedApps: apps.map((app) => ({
    name: app.name,
    filter: app.filter,
    lane: app.lane || 'static-dashboard',
    experimental: !!app.experimental,
  })),
  skippedApps: selection.skipped,
  results,
};

const outputPath = join(OUT_DIR, `correctness-${Date.now()}.json`);
writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log(`\nCorrectness benchmark report: ${outputPath}\n`);
console.table(
  results.map((result) => ({
    library: result.app,
    lane: result.lane,
    correct: result.correctness?.passed ? 'pass' : 'fail',
    failures: result.correctness?.failures.length ?? '',
    buildMs: result.build.buildMs.toFixed(0),
    jsKb: (result.build.jsBytes / 1024).toFixed(1),
    cssKb: (result.build.cssBytes / 1024).toFixed(1),
    rules: result.correctness?.snapshots?.[0]?.ruleCount ?? '',
    coldMountMs: result.runtime ? result.runtime.coldInitialMountMs.mean.toFixed(2) : 'invalid',
    mountMs: result.runtime ? result.runtime.initialMountMs.mean.toFixed(2) : 'invalid',
    updateStyleMs: result.runtime ? result.runtime.updateLiteStyleMs.mean.toFixed(2) : 'invalid',
    runtimeError: result.runtimeError ? 'yes' : '',
  })),
);

for (const result of results) {
  if (result.correctness?.passed) continue;

  console.log(`\n${result.app} correctness failures:`);
  for (const failure of result.correctness?.failures || []) {
    console.log(`- [${failure.viewport}] ${failure.assertion}: ${failure.reason}`);
  }
}
