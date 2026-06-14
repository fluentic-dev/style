import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { build } from 'rolldown';

const packageRoot = resolve(import.meta.dirname, '..');
const distRoot = join(packageRoot, 'dist');
const reportRoot = join(tmpdir(), 'fluentic-style-bundle-report');

const entries = [
  ['jsx extracted', 'jsx-runtime/extracted.js'],
  ['jsx prod', 'jsx-runtime/prod.js'],
  ['jsx full', 'jsx-runtime/index.js'],
  ['jsx server', 'jsx-runtime/server.js'],
  ['style runtime', 'runtime/style/index.js'],
];

const externalDeps = new Set([
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom',
]);

const importPattern = /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;

rmSync(reportRoot, { recursive: true, force: true });
mkdirSync(reportRoot, { recursive: true });

const rows = [];

for (const [name, relativeEntry] of entries) {
  const entry = join(distRoot, relativeEntry);
  if (!existsSync(entry)) {
    rows.push({
      name,
      graphRaw: 0,
      graphGzip: 0,
      minRaw: 0,
      minGzip: 0,
      files: 0,
      deps: 'missing',
    });
    continue;
  }

  const graph = collectGraph(entry);
  const graphFiles = [...graph.files];
  const graphRaw = graphFiles.reduce((total, file) => total + statSync(file).size, 0);
  const graphGzip = gzipSize(Buffer.concat(graphFiles.map((file) => readFileSync(file))));
  const bundle = await minifyBundle(name, entry);

  rows.push({
    name,
    graphRaw,
    graphGzip,
    minRaw: bundle.raw,
    minGzip: bundle.gzip,
    files: graphFiles.length,
    deps: [...graph.externals].sort().join(', ') || '-',
  });
}

printTable(rows);
console.log(`\nMinified bundles written to ${reportRoot}`);

function collectGraph(entry) {
  const files = new Set();
  const externals = new Set();
  const queue = [entry];

  while (queue.length > 0) {
    const file = queue.pop();
    if (!file || files.has(file) || !existsSync(file)) {
      continue;
    }

    files.add(file);
    const source = readFileSync(file, 'utf8');

    for (const specifier of readSpecifiers(source)) {
      if (specifier.startsWith('.') || specifier.startsWith('/')) {
        const resolved = resolveLocalImport(file, specifier);
        if (resolved) {
          queue.push(resolved);
        }
      } else {
        externals.add(specifier);
      }
    }
  }

  return { files, externals };
}

function readSpecifiers(source) {
  const specs = [];
  importPattern.lastIndex = 0;

  for (const match of source.matchAll(importPattern)) {
    specs.push(match[1] || match[2]);
  }

  return specs;
}

function resolveLocalImport(fromFile, specifier) {
  const base = specifier.startsWith('/')
    ? specifier
    : resolve(dirname(fromFile), specifier);

  const candidates = extname(base)
    ? [base]
    : [
      `${base}.js`,
      `${base}.mjs`,
      join(base, 'index.js'),
      join(base, 'index.mjs'),
    ];

  return candidates.find((candidate) => existsSync(candidate));
}

async function minifyBundle(name, entry) {
  const outDir = join(reportRoot, slug(name));

  await build({
    input: entry,
    external: (id) => externalDeps.has(id),
    platform: 'browser',
    treeshake: true,
    output: {
      dir: outDir,
      format: 'esm',
      minify: true,
      sourcemap: false,
      entryFileNames: 'bundle.js',
      chunkFileNames: 'chunk-[hash].js',
    },
  });

  const files = readdirSync(outDir)
    .filter((file) => file.endsWith('.js'))
    .map((file) => join(outDir, file));

  return {
    raw: files.reduce((total, file) => total + statSync(file).size, 0),
    gzip: gzipSize(Buffer.concat(files.map((file) => readFileSync(file)))),
  };
}

function gzipSize(buffer) {
  return gzipSync(buffer, { level: 9 }).length;
}

function slug(value) {
  return value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

function printTable(values) {
  const columns = [
    ['entry', (row) => row.name],
    ['graph raw', (row) => formatBytes(row.graphRaw)],
    ['graph gzip', (row) => formatBytes(row.graphGzip)],
    ['min raw', (row) => formatBytes(row.minRaw)],
    ['min gzip', (row) => formatBytes(row.minGzip)],
    ['files', (row) => String(row.files)],
    ['externals', (row) => row.deps],
  ];

  const table = [
    Object.fromEntries(columns.map(([label]) => [label, label])),
    ...values.map((row) => Object.fromEntries(columns.map(([label, read]) => [label, read(row)]))),
  ];

  const widths = Object.keys(table[0]).map((key) => Math.max(...table.map((row) => row[key].length)));

  for (const [index, row] of table.entries()) {
    const line = Object.values(row)
      .map((value, columnIndex) => value.padEnd(widths[columnIndex]))
      .join('  ');
    console.log(line);

    if (index === 0) {
      console.log(widths.map((width) => '-'.repeat(width)).join('  '));
    }
  }
}

function formatBytes(value) {
  if (value === 0) {
    return '-';
  }

  if (value < 1024) {
    return `${value} B`;
  }

  return `${(value / 1024).toFixed(2)} KB`;
}
