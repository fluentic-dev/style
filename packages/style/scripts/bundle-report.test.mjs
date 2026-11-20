import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  formatBytes,
  renderReport,
  replaceReport,
  REPORT_END,
  REPORT_START,
  syncReportFiles,
} from './bundle-report.mjs';

test('reports retain exact byte counts beside rounded KiB values', () => {
  assert.equal(formatBytes(5097), '4.98 KiB');
  const report = renderReport({
    package: '@fluentic/style',
    version: 'test',
    tools: { vite: '8' },
    rows: [
      { name: 'runtime', graphRaw: 10000, graphGzip: 3000, minRaw: 8000, minGzip: 5097 },
    ],
  });
  assert.match(report, /@fluentic\/style@test/);
  assert.match(report, /4\.98 KiB \| 5097 \|/);
});

test('documentation replacement preserves authored prose and rejects malformed markers', () => {
  const source = `Intro\n${REPORT_START}\nold\n${REPORT_END}\nOutro`;
  assert.equal(replaceReport(source, 'new\n'), `Intro\n${REPORT_START}\n\nnew\n\n${REPORT_END}\nOutro`);
  for (const invalid of ['missing', `${REPORT_END}${REPORT_START}`, source + REPORT_START, source + REPORT_END]) {
    assert.throws(() => replaceReport(invalid, 'new'), /exactly one ordered pair/);
  }
});

test('check mode fails on missing or stale files without modifying any output', () => {
  const root = mkdtempSync(join(tmpdir(), 'fluentic-bundle-test-'));
  const path = join(root, 'nested/report.json');
  try {
    assert.throws(() => syncReportFiles([[path, 'first']], true), /Stale bundle reports/);
    assert.equal(syncReportFiles([[path, 'first']], false), 1);
    assert.equal(syncReportFiles([[path, 'first']], true), 0);
    assert.throws(() => syncReportFiles([[path, 'changed']], true), /Stale bundle reports/);
    assert.equal(readFileSync(path, 'utf8'), 'first');
    assert.equal(syncReportFiles([[path, 'changed']], false), 1);
    assert.equal(syncReportFiles([[path, 'changed']], true), 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
