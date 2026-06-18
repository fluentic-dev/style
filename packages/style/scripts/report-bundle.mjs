import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { build } from 'vite';

const packageRoot = resolve(import.meta.dirname, '..');
const distRoot = join(packageRoot, 'dist');
const reportRoot = join(tmpdir(), 'fluentic-style-bundle-report');

const entries = [
  {
    name: 'dev runtime',
    imports: [
      ['jsx/jsx-dev-runtime.js', ['Fragment', 'createElement', 'jsxDEV']],
      [
        'index.js',
        [
          'bindScope',
          'combineScope',
          'combineStyle',
          'createStyleFn',
          'createTheme',
          'createToken',
          'createTokens',
          'createValues',
          'getClassName',
          'getToken',
          'style',
        ],
      ],
    ],
  },
  {
    name: 'extracted production runtime',
    imports: [
      [
        'entry/prod/runtime.js',
        [
          'getClassName',
          'mergeClassName',
          'mergeStyle',
        ],
      ],
    ],
  },
  {
    name: 'extracted jsx runtime',
    imports: [
      ['entry/prod/jsx-runtime.js', ['Fragment', 'createElement', 'jsx', 'jsxs']],
    ],
  },
  {
    name: 'extracted generated helpers',
    imports: [
      [
        'entry/prod/extract.js',
        [
          'createExtractedScope',
          'createExtractedSlot',
          'createExtractedSlotOverride',
          'createExtractedStyle',
          'createExtractedTheme',
          'createExtractedToken',
          'withTokens',
        ],
      ],
    ],
  },
  {
    name: 'production runtime',
    imports: [
      ['jsx/jsx-runtime.js', ['Fragment', 'createElement', 'jsx', 'jsxs']],
      [
        'index.js',
        [
          'bindScope',
          'combineScope',
          'combineStyle',
          'createStyleFn',
          'createTheme',
          'createToken',
          'createTokens',
          'createValues',
          'getClassName',
          'getToken',
          'style',
        ],
      ],
    ],
  },
  {
    name: 'server dev rsc runtime',
    imports: [
      ['entry/rsc-dev/jsx-runtime.js', ['Fragment', 'createElement', 'jsx', 'jsxs']],
      [
        'entry/rsc-dev.js',
        [
          'bindScope',
          'combineScope',
          'combineStyle',
          'createStyleFn',
          'createTheme',
          'createToken',
          'createTokens',
          'createValues',
          'getClassName',
          'getToken',
          'style',
        ],
      ],
    ],
  },
  {
    name: 'server extracted production runtime',
    imports: [
      [
        'entry/rsc-prod.js',
        [
          'getClassName',
        ],
      ],
    ],
  },
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

for (const entry of entries) {
  const imports = entry.imports.map(([root, names]) => [join(distRoot, root), names]);
  const missing = imports.map(([root]) => root).filter((root) => !existsSync(root));

  if (missing.length) {
    rows.push({
      name: entry.name,
      graphRaw: 0,
      graphGzip: 0,
      minRaw: 0,
      minGzip: 0,
      files: 0,
      deps: `missing: ${missing.map((root) => root.slice(distRoot.length + 1)).join(', ')}`,
    });
    continue;
  }

  const graph = collectGraph(imports.map(([root]) => root));
  const graphFiles = [...graph.files];
  const graphRaw = graphFiles.reduce((total, file) => total + statSync(file).size, 0);
  const graphGzip = gzipSize(Buffer.concat(graphFiles.map((file) => readFileSync(file))));
  const bundle = await minifyBundle(entry.name, imports);

  rows.push({
    name: entry.name,
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

function collectGraph(entries) {
  const files = new Set();
  const externals = new Set();
  const queue = [...entries];

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

async function minifyBundle(name, imports) {
  const outDir = join(reportRoot, slug(name));
  const entryFile = join(reportRoot, `${slug(name)}.entry.js`);

  writeFileSync(
    entryFile,
    imports.map(([entry, names], index) => {
      const imported = names.map((name) => `${name} as entry${index}_${name}`).join(', ');

      return `import { ${imported} } from ${JSON.stringify(entry)};`;
    }).join('\n') + '\n' +
      `globalThis.__fluenticBundleReport = [${
        imports.flatMap(([, names], index) => names.map((name) => `entry${index}_${name}`)).join(', ')
      }];\n`,
  );

  await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      outDir,
      emptyOutDir: true,
      minify: true,
      sourcemap: false,
      rollupOptions: {
        input: entryFile,
        external: (id) => externalDeps.has(id),
        treeshake: true,
        output: {
          format: 'esm',
          entryFileNames: 'bundle.js',
          chunkFileNames: 'chunk-[hash].js',
        },
      },
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
