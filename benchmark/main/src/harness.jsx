import React from 'react';
import { createRoot } from 'react-dom/client';
import { MEASURED_RUNS, REMOUNT_STEPS, UPDATE_STEPS, WARMUP_RUNS } from './data.js';

async function twoFrames() {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function readStyleTelemetry() {
  let ruleCount = 0;
  let cssTextBytes = 0;

  for (const sheet of document.styleSheets) {
    try {
      const rules = sheet.cssRules || [];
      ruleCount += rules.length;

      for (let i = 0; i < rules.length; i++) {
        cssTextBytes += rules[i].cssText.length;
      }
    } catch {
      // Local benchmarks should not create cross-origin sheets, but skip if a browser blocks one.
    }
  }

  return {
    styleTagCount: document.querySelectorAll('style').length,
    fluenticStyleTagCount: document.querySelectorAll('style[data-fluentic-style]').length,
    emotionStyleTagCount: document.querySelectorAll('style[data-emotion]').length,
    styledComponentsStyleTagCount: document.querySelectorAll('style[data-styled], style[data-styled-version]').length,
    ruleCount,
    cssTextBytes,
  };
}

async function runCase(AppLayout) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const tMount = performance.now();
  root.render(<AppLayout view='dashboard' tick={0} liteStyle={false} />);
  await twoFrames();
  const initialMountMs = performance.now() - tMount;

  const tUnmount = performance.now();
  root.unmount();
  await twoFrames();
  const unmountMs = performance.now() - tUnmount;

  let remountMs = 0;
  for (let i = 0; i < REMOUNT_STEPS; i++) {
    const remountRoot = createRoot(host);
    const tRemount = performance.now();
    remountRoot.render(<AppLayout view='dashboard' tick={i} liteStyle={false} />);
    await twoFrames();
    remountMs += performance.now() - tRemount;
    remountRoot.unmount();
    await twoFrames();
  }
  remountMs /= REMOUNT_STEPS;

  const root2 = createRoot(host);
  root2.render(<AppLayout view='dashboard' tick={0} liteStyle={false} />);
  await twoFrames();
  const tRoute = performance.now();
  root2.render(<AppLayout view='details' tick={0} liteStyle={false} />);
  await twoFrames();
  const routeSwitchMs = performance.now() - tRoute;
  const tUpdateNoStyle = performance.now();
  for (let i = 1; i <= UPDATE_STEPS; i++) {
    root2.render(<AppLayout view='details' tick={i} liteStyle={false} />);
    await twoFrames();
  }
  const updateNoStyleMs = (performance.now() - tUpdateNoStyle) / UPDATE_STEPS;
  const tUpdateLite = performance.now();
  for (let i = 1; i <= UPDATE_STEPS; i++) {
    root2.render(<AppLayout view='dashboard' tick={i} liteStyle={true} />);
    await twoFrames();
  }
  const updateLiteStyleMs = (performance.now() - tUpdateLite) / UPDATE_STEPS;
  root2.unmount();
  host.remove();

  return {
    initialMountMs,
    unmountMs,
    remountMs,
    routeSwitchMs,
    updateNoStyleMs,
    updateLiteStyleMs,
  };
}
function mean(nums) {
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}
function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function p95(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1);
  return s[idx];
}
function summarize(samples, key) {
  const values = samples.map((s) => s[key]);
  return { mean: mean(values), median: median(values), p95: p95(values), values };
}
export async function runMeasured(AppLayout) {
  const coldSample = await runCase(AppLayout);
  for (let i = 0; i < WARMUP_RUNS; i++) await runCase(AppLayout);
  const samples = [];
  for (let i = 0; i < MEASURED_RUNS; i++) samples.push(await runCase(AppLayout));
  const styleTelemetry = readStyleTelemetry();
  const mount = summarize(samples, 'initialMountMs');
  const unmount = summarize(samples, 'unmountMs');
  const remount = summarize(samples, 'remountMs');
  const route = summarize(samples, 'routeSwitchMs');
  const noStyle = summarize(samples, 'updateNoStyleMs');
  const lite = summarize(samples, 'updateLiteStyleMs');
  return {
    initialMountMs: mount.mean,
    unmountMs: unmount.mean,
    remountMs: remount.mean,
    routeSwitchMs: route.mean,
    updateNoStyleMs: noStyle.mean,
    updateLiteStyleMs: lite.mean,
    coldInitialMountMs: coldSample.initialMountMs,
    coldSample,
    stats: {
      initialMountMs: mount,
      unmountMs: unmount,
      remountMs: remount,
      routeSwitchMs: route,
      updateNoStyleMs: noStyle,
      updateLiteStyleMs: lite,
    },
    samples,
    styleTelemetry,
    benchConfig: {
      warmupRuns: WARMUP_RUNS,
      measuredRuns: MEASURED_RUNS,
      remountSteps: REMOUNT_STEPS,
      updateSteps: UPDATE_STEPS,
      primaryMetric: 'median',
      notes: [
        'React app timings use production builds and browser automation.',
        'initialMountMs is the post-warmup mount metric; coldInitialMountMs captures the first in-page run before warmups.',
        'Static top-level style creation is intentionally not cleared between measured runs; use sheet/API benchmarks for fresh insertion costs.',
      ],
    },
  };
}
export function mountSingleBench({ AppLayout, lib }) {
  const verifyParams = new URLSearchParams(window.location.search);
  const autorun = verifyParams.get('autorun') === '1';

  if (verifyParams.get('verify') === '1') {
    const tick = Number(verifyParams.get('tick') || 1);
    const view = verifyParams.get('view') || 'dashboard';
    const liteStyle = verifyParams.get('liteStyle') !== '0';

    createRoot(document.getElementById('root')).render(
      <AppLayout view={view} tick={tick} liteStyle={liteStyle} />,
    );
    return;
  }

  if (autorun) {
    runMeasured(AppLayout).then((out) => {
      window.__benchResult = { lib, ...out };
    }).catch((error) => {
      window.__benchError = error?.message || String(error);
      throw error;
    });
    return;
  }

  function App() {
    const [running, setRunning] = React.useState(false);
    const [result, setResult] = React.useState(null);
    async function run() {
      setRunning(true);
      const out = await runMeasured(AppLayout);
      setResult(out);
      window.__benchResult = { lib, ...out };
      setRunning(false);
    }
    return (
      <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
        <h2 style={{ marginTop: 0 }}>{lib} isolated benchmark</h2>
        <button onClick={run} disabled={running}>{running ? 'Running...' : 'Run Benchmark'}</button>
        {result && <pre id='bench-json'>{JSON.stringify({ lib, ...result }, null, 2)}</pre>}
      </div>
    );
  }
  createRoot(document.getElementById('root')).render(<App />);
}
