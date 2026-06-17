import * as babel from '@babel/core';
import { createCompiler } from '@fluentic/style/compiler';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const OUT_DIR = process.env.BENCH_OUT_DIR || join(process.cwd(), 'results');
const PROJECT_DIR = resolve(process.env.PROJECT_DIR || process.cwd());
const CACHE_ROOT = resolve(process.env.COMPILER_BENCH_CACHE_DIR || join(process.cwd(), '.cache/compiler-bench'));
const FILES_PER_CORPUS = Number(process.env.FILES || process.env.COMPILER_BENCH_FILES || 100);
const COMPONENTS_PER_FILE = Number(process.env.COMPONENTS || process.env.COMPILER_BENCH_COMPONENTS || 8);
const WARMUPS = Number(process.env.WARMUPS || process.env.COMPILER_BENCH_WARMUPS || 1);
const MEASURED = Number(process.env.MEASURED || process.env.COMPILER_BENCH_MEASURED || 5);
const SOURCEMAP = process.env.SOURCEMAP !== 'false';
const VARIANTS = new Set(
  (process.env.VARIANTS || process.env.APP || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);

const babelOptions = {
  configFile: false,
  babelrc: false,
  parserOpts: {
    plugins: ['typescript', 'jsx'],
    strictMode: false,
    allowImportExportEverywhere: true,
  },
  sourceMaps: SOURCEMAP,
};

const noopPlugin = () => ({
  name: 'compiler-bench-noop',
  visitor: {
    Program() {},
  },
});

const stylexBabelPlugin = await loadStylexBabelPlugin();
const stylexPluginConfig = stylexBabelPlugin
  ? [
    stylexBabelPlugin,
    {
      dev: false,
      runtimeInjection: false,
      treeshakeCompensation: true,
      unstable_moduleResolution: {
        type: 'commonJS',
        rootDir: PROJECT_DIR,
      },
    },
  ]
  : null;

const corpora = [
  createCorpus('unrelated-tsx', FILES_PER_CORPUS, createUnrelatedFixture),
  createCorpus('direct-styles', FILES_PER_CORPUS, createDirectStyleFixture),
  createCorpus('theme-slots', FILES_PER_CORPUS, createThemeSlotFixture),
  createCorpus('stylex-styles', FILES_PER_CORPUS, createStylexFixture),
  createCorpus('mixed-app', FILES_PER_CORPUS, (index) => {
    if (index % 3 === 0) return createUnrelatedFixture(index);
    if (index % 3 === 1) return createDirectStyleFixture(index);
    return createThemeSlotFixture(index);
  }),
];

const cases = [
  {
    name: 'babelParseGenerate',
    run: (corpus) => runBabel(corpus, []),
  },
  {
    name: 'babelNoopPlugin',
    run: (corpus) => runBabel(corpus, [noopPlugin]),
  },
  {
    name: 'fluenticExtractCold',
    run: (corpus) => runFluenticCold(corpus, 'extract', {}),
  },
  {
    name: 'fluenticExtractWarm',
    run: (corpus) => runFluenticWarm(corpus, 'extract', {}),
  },
  {
    name: 'fluenticDebugWarmSourceUrl',
    run: (corpus) => runFluenticWarm(corpus, 'debug', { devSourcemap: 'sourceUrl' }),
  },
  ...(stylexPluginConfig
    ? [{
      name: 'stylexBabelPlugin',
      run: (corpus) => runBabel(corpus, [stylexPluginConfig]),
    }]
    : []),
];

const results = [];

console.log('Starting compiler transform benchmark...');
console.log(
  `files=${FILES_PER_CORPUS} components/file=${COMPONENTS_PER_FILE} warmups=${WARMUPS} measured=${MEASURED}`,
);
if (!stylexBabelPlugin) {
  console.log('StyleX Babel plugin is not installed; skipping stylexBabelPlugin case.');
}

for (const corpus of corpora) {
  console.log(`\nCorpus: ${corpus.name} (${corpus.files.length} files, ${corpus.loc} LOC)`);

  const corpusResults = [];

  for (const benchCase of cases) {
    if (!shouldRun(benchCase.name, corpus.name)) continue;

    for (let i = 0; i < WARMUPS; i++) benchCase.run(corpus);

    const samples = [];

    for (let i = 0; i < MEASURED; i++) {
      samples.push(benchCase.run(corpus).durationMs);
    }

    const result = summarize(benchCase.name, corpus, samples);
    corpusResults.push(result);
    results.push(result);

    console.log(
      `${benchCase.name.padEnd(28)} ${formatMs(result.medianMs).padStart(8)} ms ` +
        `${formatMs(result.medianMsPerFile).padStart(7)} ms/file ` +
        `${Math.round(result.filesPerSecond).toString().padStart(6)} files/sec`,
    );
  }

  const noop = corpusResults.find((item) => item.name === 'babelNoopPlugin');
  if (noop) {
    for (const result of corpusResults) {
      result.overheadVsBabelNoopMs = result.medianMs - noop.medianMs;
      result.overheadVsBabelNoopMsPerFile = result.medianMsPerFile - noop.medianMsPerFile;
    }
  }
}

mkdirSync(OUT_DIR, { recursive: true });

const output = {
  kind: 'compiler-transform-benchmark',
  createdAt: new Date().toISOString(),
  config: {
    projectDir: PROJECT_DIR,
    filesPerCorpus: FILES_PER_CORPUS,
    componentsPerFile: COMPONENTS_PER_FILE,
    warmups: WARMUPS,
    measured: MEASURED,
    sourcemap: SOURCEMAP,
  },
  results,
};
const outputPath = join(OUT_DIR, `compiler-${Date.now()}.json`);

writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`\nCompiler benchmark report: ${outputPath}`);

function shouldRun(caseName, corpusName) {
  if (!VARIANTS.size) return true;
  return VARIANTS.has(caseName) || VARIANTS.has(corpusName) || VARIANTS.has(`${corpusName}:${caseName}`);
}

function runBabel(corpus, plugins) {
  return measure(() => {
    for (const file of corpus.files) {
      const result = babel.transformSync(file.code, {
        ...babelOptions,
        filename: file.filePath,
        sourceFileName: file.filePath,
        plugins,
      });

      if (!result?.code) throw new Error(`Babel returned empty output for ${file.filePath}`);
    }
  });
}

async function loadStylexBabelPlugin() {
  try {
    const mod = await import('@stylexjs/babel-plugin');
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

function runFluenticCold(corpus, mode, options) {
  const cacheDir = join(CACHE_ROOT, `${corpus.name}-${mode}-cold`);

  rmSync(cacheDir, { recursive: true, force: true });

  return runFluentic(corpus, mode, options, cacheDir);
}

function runFluenticWarm(corpus, mode, options) {
  const cacheDir = join(CACHE_ROOT, `${corpus.name}-${mode}-warm`);

  const compiler = createCompiler(
    { projectDir: PROJECT_DIR, cacheDir },
    options,
  );

  runFluenticWithCompiler(corpus, mode, compiler);

  return measure(() => {
    runFluenticWithCompiler(corpus, mode, compiler);
  });
}

function runFluentic(corpus, mode, options, cacheDir) {
  const compiler = createCompiler(
    { projectDir: PROJECT_DIR, cacheDir },
    options,
  );

  return measure(() => {
    runFluenticWithCompiler(corpus, mode, compiler);
  });
}

function runFluenticWithCompiler(corpus, mode, compiler) {
  for (const file of corpus.files) {
    const result = mode === 'debug'
      ? compiler.compileDebug({ code: file.code, filePath: file.filePath, sourcemap: null })
      : compiler.compileExtract({ code: file.code, filePath: file.filePath, sourcemap: null });

    if (!result?.code) throw new Error(`Fluentic returned empty output for ${file.filePath}`);
  }

  if (mode === 'extract') compiler.getExtractedCss();
}

function measure(fn) {
  const start = performance.now();
  fn();
  return { durationMs: performance.now() - start };
}

function summarize(name, corpus, samples) {
  const medianMs = median(samples);

  return {
    name,
    corpus: corpus.name,
    files: corpus.files.length,
    loc: corpus.loc,
    bytes: corpus.bytes,
    samples,
    meanMs: mean(samples),
    medianMs,
    minMs: Math.min(...samples),
    maxMs: Math.max(...samples),
    p95Ms: p95(samples),
    medianMsPerFile: medianMs / corpus.files.length,
    filesPerSecond: corpus.files.length / (medianMs / 1000),
    locPerSecond: corpus.loc / (medianMs / 1000),
  };
}

function createCorpus(name, count, createFixture) {
  const files = [];

  for (let i = 0; i < count; i++) {
    files.push({
      filePath: join(PROJECT_DIR, '__compiler_bench__', name, `fixture-${i}.tsx`),
      code: createFixture(i),
    });
  }

  return {
    name,
    files,
    loc: files.reduce((sum, file) => sum + countLines(file.code), 0),
    bytes: files.reduce((sum, file) => sum + Buffer.byteLength(file.code), 0),
  };
}

function createUnrelatedFixture(index) {
  const rows = Array.from({ length: COMPONENTS_PER_FILE }, (_, componentIndex) => {
    return `
export function Plain${index}_${componentIndex}(props: { active?: boolean; label: string }) {
  const tone = props.active ? 'strong' : 'muted';
  const items = [props.label, tone, String(${componentIndex})];

  return (
    <section data-tone={tone}>
      {items.map((item) => <span key={item}>{item}</span>)}
    </section>
  );
}`;
  }).join('\n');

  return `
import * as React from 'react';

${rows}
`;
}

function createDirectStyleFixture(index) {
  const styles = Array.from({ length: COMPONENTS_PER_FILE }, (_, componentIndex) => {
    return `
const styles${componentIndex} = {
  root: style
    .slot({
      alignItems: 'center',
      border: '1px solid ${componentIndex % 2 ? '#16a34a' : '#d4d4d8'}',
      borderRadius: ${4 + componentIndex % 4},
      display: 'flex',
      gap: ${6 + componentIndex},
      minHeight: ${28 + componentIndex},
      opacity: ${componentIndex % 2 ? 1 : 0.72},
      padding: '${4 + componentIndex}px ${8 + componentIndex}px',
    })
    .media('(min-width: 640px)', { minWidth: ${80 + componentIndex} })
    .hover({ borderColor: '#0ea5e9' }),
  label: style({
    color: '${componentIndex % 2 ? '#111827' : '#334155'}',
    fontWeight: ${componentIndex % 2 ? 700 : 500},
  }),
};`;
  }).join('\n');

  const components = Array.from({ length: COMPONENTS_PER_FILE }, (_, componentIndex) => {
    return `
export function Direct${index}_${componentIndex}(props: { label: string }) {
  return (
    <div css={styles${componentIndex}.root}>
      <span css={styles${componentIndex}.label}>{props.label}</span>
    </div>
  );
}`;
  }).join('\n');

  return `
import * as React from 'react';
import { style } from '@fluentic/style';

${styles}

${components}
`;
}

function createThemeSlotFixture(index) {
  const components = Array.from({ length: COMPONENTS_PER_FILE }, (_, componentIndex) => {
    return `
const css${componentIndex} = combineStyle(card${componentIndex}, ${componentIndex % 2 ? 'darkTheme' : 'lightTheme'});

export function Themed${index}_${componentIndex}(props: { active?: boolean; label: string }) {
  return (
    <article css={props.active ? css${componentIndex}.active : css${componentIndex}.root}>
      <span css={css${componentIndex}.label}>{props.label}</span>
    </article>
  );
}`;
  }).join('\n');

  const cards = Array.from({ length: COMPONENTS_PER_FILE }, (_, componentIndex) => {
    return `
const card${componentIndex} = {
  root: style
    .slot({
      backgroundColor: colorToken,
      border: '1px solid #d4d4d8',
      borderRadius: ${6 + componentIndex % 3},
      color: textToken,
      display: 'grid',
      gap: ${8 + componentIndex},
      padding: ${10 + componentIndex},
    })
    .hover({ borderColor: accentToken }),
  active: style
    .slot({
      backgroundColor: accentToken,
      border: '1px solid #16a34a',
      borderRadius: ${6 + componentIndex % 3},
      color: textToken,
      display: 'grid',
      gap: ${8 + componentIndex},
      padding: ${10 + componentIndex},
    })
    .media('(min-width: 720px)', { gridTemplateColumns: '1fr auto' }),
  label: style.slot({
    color: textToken,
    fontWeight: ${componentIndex % 2 ? 700 : 600},
  }),
};`;
  }).join('\n');

  return `
import * as React from 'react';
import { combineStyle, createTheme, createToken, style } from '@fluentic/style';

const colorToken = createToken('#ffffff');
const textToken = createToken('#111827');
const accentToken = createToken('#16a34a');
const lightTheme = createTheme([
  colorToken('#ffffff'),
  textToken('#111827'),
  accentToken('#16a34a'),
], 'bench-light-${index}');
const darkTheme = createTheme([
  colorToken('#020617'),
  textToken('#f8fafc'),
  accentToken('#38bdf8'),
], 'bench-dark-${index}');

${cards}

${components}
`;
}

function createStylexFixture(index) {
  const styles = Array.from({ length: COMPONENTS_PER_FILE }, (_, componentIndex) => {
    return `
const styles${componentIndex} = stylex.create({
  root: {
    alignItems: 'center',
    borderColor: ${componentIndex % 2 ? "'#16a34a'" : "'#d4d4d8'"},
    borderRadius: ${4 + componentIndex % 4},
    borderStyle: 'solid',
    borderWidth: 1,
    display: 'flex',
    gap: ${6 + componentIndex},
    minHeight: ${28 + componentIndex},
    opacity: ${componentIndex % 2 ? 1 : 0.72},
    paddingBlock: ${4 + componentIndex},
    paddingInline: ${8 + componentIndex},
    ':hover': {
      borderColor: '#0ea5e9',
    },
    '@media (min-width: 640px)': {
      minWidth: ${80 + componentIndex},
    },
  },
  active: {
    borderColor: '#16a34a',
    opacity: 1,
  },
  label: {
    color: ${componentIndex % 2 ? "'#111827'" : "'#334155'"},
    fontWeight: ${componentIndex % 2 ? 700 : 500},
  },
});`;
  }).join('\n');

  const components = Array.from({ length: COMPONENTS_PER_FILE }, (_, componentIndex) => {
    return `
export function StyleX${index}_${componentIndex}(props: { active?: boolean; label: string }) {
  return (
    <div {...stylex.props(styles${componentIndex}.root, props.active && styles${componentIndex}.active)}>
      <span {...stylex.props(styles${componentIndex}.label)}>{props.label}</span>
    </div>
  );
}`;
  }).join('\n');

  return `
import * as React from 'react';
import * as stylex from '@stylexjs/stylex';

${styles}

${components}
`;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.floor(sorted.length / 2);

  return sorted.length % 2 ? sorted[index] : (sorted[index - 1] + sorted[index]) / 2;
}

function p95(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);

  return sorted[index];
}

function countLines(code) {
  return code.split('\n').length;
}

function formatMs(value) {
  return value.toFixed(2);
}
