import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const benchmarkRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(benchmarkRoot, '../..');
const projectRoot = path.join(repoRoot, 'examples/tailwind');
const fileName = path.join(projectRoot, 'src/autocomplete-bench.tsx');
const tailwindTypesPath = path.join(repoRoot, 'packages/style/presets/tailwind/types.ts');
const tailwindTypesMode = process.env.TAILWIND_TYPES_MODE ?? 'current';

let source = `
import { createStyleFn, style } from '@fluentic/style';
import { createNamedTokens } from '@fluentic/style/dialect';
import {
  createDefaultedTailwindStyleConfig,
  createTailwindExtendedStyleTransform,
  createTailwindStyleConfig,
  createTailwindStyleTransform,
  defaultTailwindColors,
  TailwindSelectors,
} from '@fluentic/style/presets/tailwind';

const LeanColors = createNamedTokens('bench.lean.color', {
  accent: '#2563eb',
  accentHover: '#1d4ed8',
});

const leanConfig = createTailwindStyleConfig({
  theme: {
    colors: LeanColors,
    spacing: {
      1: '0.25rem',
      2: '0.5rem',
      4: '1rem',
      6: '1.5rem',
    },
  },
});

const fullConfig = createDefaultedTailwindStyleConfig({
  theme: {
    colors: createNamedTokens('bench.full.color', {
      ...defaultTailwindColors,
      accent: '#2563eb',
      accentHover: '#1d4ed8',
    }),
    spacing: {
      18: '4.5rem',
    },
    sizes: {
      card: '14.5rem',
    },
  },
});

const { style: leanTw } = createStyleFn({
  selectors: TailwindSelectors,
  transform: createTailwindStyleTransform(leanConfig),
});

const { style: fullTw } = createStyleFn({
  selectors: TailwindSelectors,
  transform: createTailwindExtendedStyleTransform(fullConfig),
});

style({ /*CORE_PROP*/ });
style({ color: /*CORE_COLOR_VALUE*/ });
leanTw({ /*LEAN_PROP*/ });
leanTw({ bg: '$/*LEAN_BG_VALUE*/accent' });
leanTw({ px: '$/*LEAN_PX_VALUE*/4' });
fullTw({ /*FULL_PROP*/ });
fullTw({ bg: '$/*FULL_BG_VALUE*/accent' });
fullTw({ px: '$/*FULL_PX_VALUE*/4' });
fullTw({ color: /*FULL_NATIVE_COLOR_VALUE*/ });
`;

const markers = [
  'CORE_PROP',
  'CORE_COLOR_VALUE',
  'LEAN_PROP',
  'LEAN_BG_VALUE',
  'LEAN_PX_VALUE',
  'FULL_PROP',
  'FULL_BG_VALUE',
  'FULL_PX_VALUE',
  'FULL_NATIVE_COLOR_VALUE',
];
const positions = {};

for (const marker of markers) {
  const token = `/*${marker}*/`;
  const position = source.indexOf(token);
  if (position < 0) throw new Error(`Missing autocomplete marker: ${marker}`);
  positions[marker] = position;
  source = source.slice(0, position) + source.slice(position + token.length);
}

const configPath = path.join(projectRoot, 'tsconfig.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

if (configFile.error) {
  throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
}

const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, projectRoot);
const compilerOptions = {
  ...parsed.options,
  noEmit: true,
  skipLibCheck: true,
};

function createService() {
  const files = new Map([[fileName, { version: 0, text: source }]]);
  const tailwindTypesOverride = createTailwindTypesOverride();
  if (tailwindTypesOverride) {
    files.set(tailwindTypesPath, { version: 0, text: tailwindTypesOverride });
  }

  const host = {
    getScriptFileNames: () => [...parsed.fileNames, fileName],
    getScriptVersion: (name) => files.get(name)?.version.toString() ?? '0',
    getScriptSnapshot: (name) => {
      const file = files.get(name);
      if (file) return ts.ScriptSnapshot.fromString(file.text);
      if (fs.existsSync(name)) return ts.ScriptSnapshot.fromString(fs.readFileSync(name, 'utf8'));
      return undefined;
    },
    getCurrentDirectory: () => projectRoot,
    getCompilationSettings: () => compilerOptions,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
    realpath: ts.sys.realpath,
  };

  return ts.createLanguageService(host, ts.createDocumentRegistry());
}

function createTailwindTypesOverride() {
  if (tailwindTypesMode === 'current') return null;

  const current = fs.readFileSync(tailwindTypesPath, 'utf8');
  if (tailwindTypesMode === 'manual-native-list') {
    return current
      .replace("import type { CSSProperties } from '../../style/types';\n", '')
      .replace(
        /type TailwindCssProperties =\n  & \{\n    \[Property in TailwindNativeCssPropName\]\?: CSSProperties\[Property\] \| null;\n  \}\n  & \{\n    \[Property in `--\$\{string\}`\]\?: string \| number \| null \| undefined;\n  \};/,
        `type TailwindCssProperties =
  & {
    [Property in Exclude<TailwindNativeCssPropName, TailwindNativePropName>]?: string | number | null | undefined;
  }
  & {
    [Property in \`--\${string}\`]?: string | number | null | undefined;
  };`,
      );
  }

  if (tailwindTypesMode === 'all-css-properties') {
    return current.replace(
      /type TailwindNativeCssPropName =[\s\S]*?;\ntype TailwindCssProperties =/,
      `type TailwindNativeCssPropName = Exclude<keyof CSSProperties, TailwindNativePropName>;
type TailwindCssProperties =`,
    );
  }

  throw new Error(`Unknown TAILWIND_TYPES_MODE: ${tailwindTypesMode}`);
}

function getCompletion(service, marker) {
  return service.getCompletionsAtPosition(fileName, positions[marker], {
    includeCompletionsForModuleExports: false,
    includeCompletionsWithInsertText: false,
  });
}

function measureWarm(service, name, marker) {
  const times = [];
  let count = 0;
  let sample = [];

  for (let i = 0; i < 55; i++) {
    const start = performance.now();
    const completions = getCompletion(service, marker);
    const time = performance.now() - start;

    if (i >= 15) times.push(time);
    count = completions?.entries.length ?? 0;
    if (i === 15) sample = completions?.entries.slice(0, 12).map((entry) => entry.name) ?? [];
  }

  times.sort((a, b) => a - b);

  return {
    name,
    count,
    avgMs: average(times),
    p50Ms: percentile(times, 0.5),
    p95Ms: percentile(times, 0.95),
    sample,
  };
}

function measureCold(name, marker) {
  const service = createService();
  const start = performance.now();
  const completions = getCompletion(service, marker);

  return {
    name,
    ms: performance.now() - start,
    count: completions?.entries.length ?? 0,
  };
}

function average(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function percentile(values, p) {
  return values[Math.floor(values.length * p)];
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

const service = createService();
const warmStart = performance.now();
service.getProgram()?.getTypeChecker();
const warmProgramMs = performance.now() - warmStart;

const warm = [
  measureWarm(service, 'core style prop names', 'CORE_PROP'),
  measureWarm(service, 'core style color value', 'CORE_COLOR_VALUE'),
  measureWarm(service, 'lean tw prop names', 'LEAN_PROP'),
  measureWarm(service, 'lean tw bg $ value', 'LEAN_BG_VALUE'),
  measureWarm(service, 'lean tw px $ value', 'LEAN_PX_VALUE'),
  measureWarm(service, 'full extended/defaulted/colors tw prop names', 'FULL_PROP'),
  measureWarm(service, 'full extended/defaulted/colors tw bg $ value', 'FULL_BG_VALUE'),
  measureWarm(service, 'full extended/defaulted/colors tw px $ value', 'FULL_PX_VALUE'),
  measureWarm(service, 'full extended native color value', 'FULL_NATIVE_COLOR_VALUE'),
];

const cold = [
  measureCold('core style prop names', 'CORE_PROP'),
  measureCold('lean tw prop names', 'LEAN_PROP'),
  measureCold('lean tw bg $ value', 'LEAN_BG_VALUE'),
  measureCold('full extended/defaulted/colors tw prop names', 'FULL_PROP'),
  measureCold('full extended/defaulted/colors tw bg $ value', 'FULL_BG_VALUE'),
  measureCold('full extended native color value', 'FULL_NATIVE_COLOR_VALUE'),
];

const diagnostics = service.getSemanticDiagnostics(fileName)
  .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));

const result = {
  benchmark: 'TypeScript Language Service getCompletionsAtPosition',
  tailwindTypesMode,
  projectRoot,
  warmProgramMs: round(warmProgramMs),
  diagnostics,
  warm: warm.map((item) => ({
    ...item,
    avgMs: round(item.avgMs),
    p50Ms: round(item.p50Ms),
    p95Ms: round(item.p95Ms),
  })),
  cold: cold.map((item) => ({
    ...item,
    ms: round(item.ms),
  })),
};

console.log(JSON.stringify(result, null, 2));
