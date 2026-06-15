import { createCompiler } from '@fluentic/style/compiler';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cases } from '../src/selector-cases.ts';

type PluginMode = {
  label: string;
  transform: 'debug' | 'extract';
};

type CaseResult = {
  ok: boolean;
  threw: boolean;
  message: string;
};

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const cacheDir = path.join(rootDir, 'node_modules/.cache/fluentic-selector-check');

const modes: PluginMode[] = [
  { label: 'plugin dev transform', transform: 'debug' },
  { label: 'plugin extract transform', transform: 'extract' },
];

let failed = false;

for (const mode of modes) {
  console.log('\n' + mode.label);
  console.log('='.repeat(mode.label.length));

  for (const item of cases) {
    const result = runPluginCase(mode, item);
    const status = result.ok ? 'OK' : 'FAIL';
    const expectation = item.expectError ? 'expected throw' : 'expected pass';

    console.log('\n[' + status + '] ' + item.group + ' / ' + item.name + ' (' + expectation + ')');
    console.log(item.code);

    if (result.message) {
      console.log('\n' + indent(result.message.trim(), '  '));
    }

    if (!result.ok) failed = true;
  }
}

if (failed) {
  process.exitCode = 1;
}

function runPluginCase(
  mode: PluginMode,
  item: typeof cases[number],
): CaseResult {
  const compiler = createCompiler(
    { projectDir: rootDir, cacheDir },
    { layer: false, checkSelector: true },
  );
  const filePath = path.join(
    rootDir,
    'src/__plugin_selector_cases__',
    slug(item.group + '-' + item.name) + '.ts',
  );
  const code = [
    `import { style } from '@fluentic/style';`,
    ``,
    `export const value = ${item.code};`,
    ``,
  ].join('\n');

  try {
    if (mode.transform === 'debug') {
      compiler.compileDebug({ code, filePath, sourcemap: null });
    } else {
      compiler.compileExtract({ code, filePath, sourcemap: null });
    }

    return {
      ok: !item.expectError,
      threw: false,
      message: item.expectError
        ? 'Expected plugin selector check to throw, but transform completed.'
        : 'Transform completed without selector errors.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      ok: item.expectError,
      threw: true,
      message,
    };
  }
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function indent(value: string, prefix: string) {
  return value.split('\n').map((line) => prefix + line).join('\n');
}
