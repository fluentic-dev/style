import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { getBenchmarkSelection, getBuildKey, getUniqueBuildApps } from './correctness.mjs';

const presets = {
  quick: {
    rows: '100,500,1500',
    repeats: 2,
    warmups: 2,
    measured: 10,
    updateSteps: 20,
    remountSteps: 5,
  },
  stable: {
    rows: '100,500,1500',
    repeats: 7,
    warmups: 3,
    measured: 15,
    updateSteps: 25,
    remountSteps: 7,
  },
  stress: {
    rows: '100,500,1500,3000',
    repeats: 4,
    warmups: 2,
    measured: 12,
    updateSteps: 30,
    remountSteps: 6,
  },
};
const BENCH_PRESET = process.env.BENCH_PRESET || 'quick';
const preset = presets[BENCH_PRESET] || presets.quick;
const selection = getBenchmarkSelection();
const apps = selection.apps;
const scenarioRows = (process.env.ROWS || preset.rows)
  .split(',')
  .map((item) => Number(item.trim()))
  .filter((item) => Number.isFinite(item) && item > 0);
const scenarios = scenarioRows.map((rows) => ({ name: `${rows}-rows`, rows }));
const REPEATS = Number(process.env.REPEATS || preset.repeats);
const WARMUPS = Number(process.env.WARMUPS || preset.warmups);
const MEASURED = Number(process.env.MEASURED || preset.measured);
const UPDATE_STEPS = Number(process.env.UPDATE_STEPS || preset.updateSteps);
const REMOUNT_STEPS = Number(process.env.REMOUNT_STEPS || preset.remountSteps);
const EXTRA_QUERY = process.env.EXTRA_QUERY || '';
const CDP_METRICS = process.env.CDP_METRICS === '1';
const OUT_DIR = process.env.BENCH_OUT_DIR || join(process.cwd(), 'results');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const mean = (n) => n.reduce((a, b) => a + b, 0) / n.length;
const median = (n) => {
  const sorted = n.slice().sort((a, b) => a - b);
  const index = Math.floor(sorted.length / 2);

  return sorted.length % 2 ? sorted[index] : (sorted[index - 1] + sorted[index]) / 2;
};
const p95 = (n) => {
  const sorted = n.slice().sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);

  return sorted[index];
};
const stdev = (n) => {
  if (n.length < 2) return 0;
  const avg = mean(n);
  const variance = mean(n.map((item) => (item - avg) ** 2));

  return Math.sqrt(variance);
};
const formatMs = (value) => Number.isFinite(value) ? value.toFixed(2) : 'invalid';
const formatKb = (value) => ((value ?? 0) / 1024).toFixed(1);

async function runCmd(cmd, args) {
  await new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit' });
    p.on(
      'exit',
      (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} -> ${code}`))),
    );
  });
}

async function startPreview(filter, port) {
  const args = [
    '--filter',
    filter,
    'serve',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ];
  const app = apps.find((item) => item.filter === filter && item.port === port);
  if (app?.distDir) args.push('--outDir', app.distDir);

  const proc = spawn('pnpm', args, { stdio: 'pipe' });
  let ready = false;
  let localUrl = null;
  const onOutput = (buf) => {
    const m = String(buf).match(/Local:\s+(http:\/\/(?:127\.0\.0\.1|localhost):\d+\/)/);
    if (m) {
      ready = true;
      localUrl = m[1].replace('localhost', '127.0.0.1');
    }
  };
  proc.stdout.on('data', onOutput);
  proc.stderr.on('data', onOutput);
  for (let i = 0; i < 120 && !ready; i++) await wait(250);
  if (!ready || !localUrl) {
    proc.kill('SIGTERM');
    throw new Error(`${filter} preview did not start`);
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

const buildResults = new Map();

for (const app of getUniqueBuildApps(apps)) {
  const args = ['--filter', app.filter, app.buildScript || 'build'];
  if (app.distDir) args.push('--outDir', app.distDir);
  await runCmd('pnpm', args);
  buildResults.set(getBuildKey(app), getDistStats(app));
}
const chromeExecutablePath = getChromeExecutablePath();
const browser = await chromium.launch({
  headless: true,
  executablePath: chromeExecutablePath,
});
const browserVersion = await browser.version();
const summary = [];

try {
  for (const scenario of scenarios) {
    const runsByApp = new Map(apps.map((app) => [app.name, []]));

    for (let repeat = 0; repeat < REPEATS; repeat++) {
      const order = rotate(apps, repeat);
      console.log(
        `\nRunning ${scenario.name} repeat ${repeat + 1}/${REPEATS}: ${order.map((app) => app.name).join(', ')}`,
      );

      for (const app of order) {
        console.log(`  ${app.name}`);
        const { proc, localUrl } = await startPreview(app.filter, app.port);

        try {
          const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
          const page = await ctx.newPage();
          const cdp = CDP_METRICS ? await ctx.newCDPSession(page) : null;
          try {
            if (cdp) await cdp.send('Performance.enable');
            await page.goto(
              `${localUrl}?rows=${scenario.rows}${app.extraQuery}${EXTRA_QUERY}&autorun=1&warmups=${WARMUPS}&measured=${MEASURED}&updateSteps=${UPDATE_STEPS}&remountSteps=${REMOUNT_STEPS}`,
              {
                waitUntil: 'load',
              },
            );
            await page.waitForFunction(() => !!window.__benchResult, null, { timeout: 600000 });
            const result = await page.evaluate(() => window.__benchResult);
            if (cdp) {
              const metrics = await cdp.send('Performance.getMetrics');
              result.cdpMetrics = Object.fromEntries(metrics.metrics.map((metric) => [metric.name, metric.value]));
            }
            runsByApp.get(app.name).push(result);
          } finally {
            await cdp?.detach().catch(() => {});
            await ctx.close().catch(() => {});
          }
        } finally {
          proc.kill('SIGTERM');
        }
      }
    }

    for (const app of apps) {
      const runs = runsByApp.get(app.name);

      summary.push({
        ...summarizeRuns(scenario.name, app.name, runs),
        lane: app.lane || 'static-dashboard',
        experimental: !!app.experimental,
      });
    }
  }
} finally {
  await browser.close();
}

mkdirSync(OUT_DIR, { recursive: true });

const report = {
  kind: 'react-app-benchmark',
  createdAt: new Date().toISOString(),
  preset: BENCH_PRESET,
  repeats: REPEATS,
  browserRunsPerRepeat: {
    warmups: WARMUPS,
    measured: MEASURED,
    updateSteps: UPDATE_STEPS,
    remountSteps: REMOUNT_STEPS,
  },
  order: 'apps are rotated by repeat within each row scenario to reduce fixed-order browser/JIT bias',
  scenarios,
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
    build: buildResults.get(getBuildKey(app)),
  })),
  skippedApps: selection.skipped,
  results: summary,
};
const outputPath = join(OUT_DIR, `bench-${Date.now()}.json`);
writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log(`\nReact app benchmark report: ${outputPath}\n`);
const appByName = new Map(apps.map((app) => [app.name, app]));
console.table(
  summary.map((r) => ({
    scenario: r.scenario,
    library: r.library,
    lane: r.lane,
    mountMean: formatMs(r.initialMount.mean),
    mountMedian: formatMs(r.initialMount.median),
    mountP95: formatMs(r.initialMount.p95),
    coldMountMedian: formatMs(r.coldInitialMount.median),
    remountMedian: formatMs(r.remount.median),
    routeMedian: formatMs(r.route.median),
    updateStyleMedian: formatMs(r.updateStyle.median),
    jsKb: formatKb(getBuildStats(r.library)?.jsBytes),
    cssKb: formatKb(getBuildStats(r.library)?.cssBytes),
    rules: r.styleTelemetry?.ruleCount ?? '',
    styleTags: r.styleTelemetry?.styleTagCount ?? '',
  })),
);

function getBuildStats(appName) {
  const app = appByName.get(appName);

  return app ? buildResults.get(getBuildKey(app)) : null;
}

function summarizeRuns(scenario, library, runs) {
  if (!runs.length) {
    throw new Error(`${library}/${scenario} produced no benchmark runs`);
  }

  return {
    scenario,
    library,
    initialMount: summarizeMetric(runs, 'initialMountMs'),
    unmount: summarizeMetric(runs, 'unmountMs'),
    remount: summarizeMetric(runs, 'remountMs'),
    route: summarizeMetric(runs, 'routeSwitchMs'),
    updateNoStyle: summarizeMetric(runs, 'updateNoStyleMs'),
    updateStyle: summarizeMetric(runs, 'updateLiteStyleMs'),
    coldInitialMount: summarizeMetric(runs, 'coldInitialMountMs'),
    styleTelemetry: runs.at(-1)?.styleTelemetry || null,
    cdpMetrics: runs.at(-1)?.cdpMetrics || null,
  };
}

function summarizeMetric(runs, key) {
  const values = runs.map((r) => r?.[key]).filter((x) => Number.isFinite(x));

  if (!values.length) {
    return {
      mean: null,
      median: null,
      p95: null,
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

function rotate(items, offset) {
  const index = offset % items.length;

  return items.slice(index).concat(items.slice(0, index));
}
