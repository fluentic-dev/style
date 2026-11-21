import { deepStrictEqual, equal, ok } from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { CompilerRuntimeMode, createCompiler, createCompilerCache } from '../compiler';
import { createCssCollector } from '../compiler/extract';
import { createTracer } from '../compiler/transform/evaluator/tracer';
import { createExtractPlugin } from '../compiler/transform/extract/plugin';
import { BabelCore, babelTransform } from '../compiler/transform/utils/babel';
import { clearResolverCache } from '../compiler/utils/file_resolver';
import { test } from './setup';

test('extraction resolves style inputs without tracing ordinary icon maps', () => {
  const imports: string[] = [];
  const collector = createCssCollector();
  const result = babelTransform({
    filePath: '/app/component.tsx',
    code: `
      import { style } from '@fluentic/style';
      import { Icon } from 'icons';
      import { color } from './tokens';
      export const icons = { overview: [Icon, 'violet'] };
      const sizes = { small: 8 };
      const padding = sizes.small;
      export const card = style({ color, padding });
    `,
    plugins: [createExtractPlugin({
      projectDir: '/app',
      runtimeMode: null,
      options: { css: { layer: false } },
      collector,
      tracer: {
        resolveImport(_babel, source) {
          imports.push(source);
          return new Map([['color', { ok: true, value: 'red' }]]);
        },
      },
    })],
  });
  ok(result);
  deepStrictEqual(imports, ['./tokens']);
  const css = collector.getItems().map((rule) => rule.css).join('\n');
  ok(css.includes('color: red'));
  ok(css.includes('padding: 8px'));
});

test('import tracing evaluates only requested exports and retains transitive invalidation', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'fluentic-lazy-imports-'));
  const parsed: string[] = [];
  const babel: typeof BabelCore = {
    ...BabelCore,
    parseSync(code, options) {
      parsed.push(options?.filename ?? '');
      return BabelCore.parseSync(code, options);
    },
  };
  const cacheDir = path.join(root, '.cache');
  const tracer = createTracer({
    projectDir: root,
    cacheDir,
    runtimeMode: null,
    options: {},
    cache: createCompilerCache({ cacheDir }),
  });
  const read = () => {
    tracer.beginCompilation();
    return tracer.traceModule(babel, './barrel', path.join(root, 'entry.ts'))?.get('color');
  };
  try {
    writeFileSync(path.join(root, 'constants.ts'), `export const base = 'red';`);
    writeFileSync(path.join(root, 'icons.ts'), `export const Icon = 'must not be read';`);
    writeFileSync(
      path.join(root, 'shared.ts'),
      `
      import { Icon } from './icons';
      import { base } from './constants';
      export const icons = { overview: Icon };
      export const color = base;
      export const loop = loop;
    `,
    );
    writeFileSync(path.join(root, 'barrel.ts'), `export * from './shared';`);
    deepStrictEqual(read(), { ok: true, value: 'red' });
    equal(parsed.some((file) => file.endsWith('/icons.ts')), false);
    const count = parsed.length;
    deepStrictEqual(read(), { ok: true, value: 'red' });
    equal(parsed.length, count);

    writeFileSync(path.join(root, 'constants.ts'), `export const base = 'blue';`);
    clearResolverCache();
    deepStrictEqual(read(), { ok: true, value: 'blue' });
    const loop = tracer.traceModule(babel, './shared', path.join(root, 'entry.ts'))?.get('loop');
    equal(loop?.ok, false);
    equal(parsed.some((file) => file.endsWith('/icons.ts')), false);
  } finally {
    clearResolverCache();
    rmSync(root, { recursive: true, force: true });
  }
});

test('runtime import fast path still rewrites escaped module specifiers', () => {
  const compiler = createCompiler({
    projectDir: '/app',
    cacheDir: '/tmp/fluentic-unused-import-cache',
    runtimeMode: CompilerRuntimeMode.Prod,
  }, {});
  const result = compiler.compileExtract({
    code: String.raw`export { getClassName } from '@fluentic\u002fstyle';`,
    filePath: '/app/entry.ts',
    sourcemap: null,
  });
  ok(result?.code.includes('@fluentic/style/entry/prod'));
});

test('lazy local initializers retain their declaration environment across shadowing', () => {
  const compiler = createCompiler({
    projectDir: '/app',
    cacheDir: '/tmp/fluentic-unused-import-cache',
    runtimeMode: null,
  }, { css: { layer: false } });
  const result = compiler.compileExtract({
    code: `
      import { style } from '@fluentic/style';
      const gap = 8;
      const padding = gap;
      export function card() {
        const gap = 16;
        return style({ padding, margin: gap });
      }
    `,
    filePath: '/app/shadow.ts',
    sourcemap: null,
  });
  ok(result);
  const css = result.rules.map((rule) => rule.css).join('\n');
  ok(css.includes('padding: 8px'));
  ok(css.includes('margin: 16px'));
});
