import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const REPORT_START = '{/* bundle-report:start */}';
export const REPORT_END = '{/* bundle-report:end */}';

export function formatBytes(value) {
  return value < 1024 ? `${value} B` : `${(value / 1024).toFixed(2)} KiB`;
}

export function renderReport(report) {
  return [
    `Measured package: **${report.package}@${report.version}**.`,
    '',
    `Vite ${report.tools.vite}; gzip level 9; KiB = 1,024 bytes.`,
    'Each row is an independent bundle; rows are not additive.',
    '',
    '| Entry | Graph raw | Graph gzip | Min raw | Min gzip | Exact min gzip (bytes) |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
    ...report.rows.map((row) =>
      `| ${row.name} | ${formatBytes(row.graphRaw)} | ${formatBytes(row.graphGzip)} | ${formatBytes(row.minRaw)} | ${
        formatBytes(row.minGzip)
      } | ${row.minGzip} |`
    ),
    '',
  ].join('\n');
}

export function replaceReport(source, generated) {
  const start = source.indexOf(REPORT_START);
  const end = source.indexOf(REPORT_END);
  if (
    start < 0 || end < start || source.indexOf(REPORT_START, start + REPORT_START.length) !== -1 ||
    source.indexOf(REPORT_END, end + REPORT_END.length) !== -1
  ) {
    throw new Error('Expected exactly one ordered pair of bundle report markers');
  }
  return source.slice(0, start + REPORT_START.length) + '\n\n' + generated + '\n' + source.slice(end);
}

export function syncReportFiles(files, check) {
  const stale = files.filter(([path, contents]) => !existsSync(path) || readFileSync(path, 'utf8') !== contents);
  if (check && stale.length) {
    throw new Error(
      `Stale bundle reports: ${stale.map(([path]) => path).join(', ')}. Run pnpm report:bundle:update after building.`,
    );
  }
  for (const [path, contents] of stale) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
  }
  return stale.length;
}
