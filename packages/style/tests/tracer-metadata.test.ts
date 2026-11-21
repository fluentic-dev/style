import { deepStrictEqual, equal, ok } from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCompiler, createCompilerCache } from '../compiler';
import type { CompilerOptions } from '../compiler';
import { createTraceMetadataCache } from '../compiler/transform/evaluator/metadata_cache';
import { createTracer } from '../compiler/transform/evaluator/tracer';
import { BabelCore } from '../compiler/transform/utils/babel';
import { clearResolverCache } from '../compiler/utils/file_resolver';
import { test } from './setup';

function fixture(run: (f: ReturnType<typeof setup>) => void) {
  const root = mkdtempSync(path.join(tmpdir(), 'fluentic-trace-metadata-'));
  try {
    run(setup(root));
  } finally {
    clearResolverCache();
    rmSync(root, { recursive: true, force: true });
  }
}
function setup(root: string) {
  const cacheDir = path.join(root, '.cache');
  const write = (name: string, content: string) => {
    const filename = path.join(root, name);
    mkdirSync(path.dirname(filename), { recursive: true });
    writeFileSync(filename, content);
    return filename;
  };
  write('color.ts', "export const color = 'red';");
  write('values.ts', "export { color } from './color';");
  write('barrel.ts', "export * from './values';");
  const internal = (options: CompilerOptions = {}) => ({
    projectDir: root,
    cacheDir,
    runtimeMode: null,
    options,
    cache: createCompilerCache({ cacheDir }),
  });
  const compiler = (options: CompilerOptions = {}) =>
    createCompiler({ projectDir: root, cacheDir, runtimeMode: null }, {
      css: { layer: false },
      ...options,
    });
  const input = (file = 'entry.ts') => ({
    filePath: path.join(root, file),
    sourcemap: null,
    code:
      "import { style } from '@fluentic/style'; import { color } from './barrel'; export const rule = style({color});",
  });
  const css = (instance: ReturnType<typeof compiler>, file = 'entry.ts') =>
    instance.compileExtract(input(file))!.rules.map((r) => r.css).join('\n');
  return { root, cacheDir, write, compiler, input, css, internal };
}

test('tracer metadata is restored from disk and creates independent mutable ASTs', () =>
  fixture((f) => {
    const first = createTraceMetadataCache(f.internal());
    const file = path.join(f.root, 'module.ts');
    const code = "import { color } from './color'; export const value = color;";
    const ast = first.parse(BabelCore, file, code)!;
    const original = JSON.parse(JSON.stringify(ast));
    equal(first.getStats().writes, 1);
    ast.program.body.splice(0);
    deepStrictEqual(first.parse(BabelCore, file, code), original);
    equal(first.getStats().memoryHits, 1);
    const restored = createTraceMetadataCache(f.internal());
    deepStrictEqual(restored.parse(BabelCore, file, code), original);
    equal(restored.getStats().diskHits, 1);
    equal(restored.getStats().parses, 0);
  }));

test('tracer metadata bypasses custom parsers and non-JSON literal values', () =>
  fixture((f) => {
    const metadata = createTraceMetadataCache(f.internal());
    const file = path.join(f.root, 'module.ts');
    const ast = metadata.parse(BabelCore, file, 'export const value = 1e999;')!;
    equal(metadata.getStats().writes, 0);
    const custom = {
      ...BabelCore,
      parseSync: (...args: Parameters<typeof BabelCore.parseSync>) => BabelCore.parseSync(...args),
    };
    metadata.parse(custom, file, 'export const value = 1;');
    metadata.parse(custom, file, 'export const value = 1;');
    equal(metadata.getStats().memoryHits, 0);
    equal(metadata.getStats().writes, 0);
    ok(ast.program.body.length);
  }));

test('tracer reuses evaluated bindings and replays their full dependency graph into transforms', () =>
  fixture((f) => {
    const instance = f.compiler();
    ok(f.css(instance, 'first.ts').includes('color: red'));
    const parsed = instance.getTraceMetadataCacheStats().parses;
    equal(parsed, 3);
    ok(f.css(instance, 'second.ts').includes('color: red'));
    equal(instance.getTraceMetadataCacheStats().parses, parsed);
    equal(instance.getPersistentCacheStats().misses, 2);
    f.write('color.ts', "export const color = 'blue';");
    // The second transform was produced using in-memory bindings. Its disk record
    // must nevertheless contain the entire dependency chain.
    const next = f.compiler();
    ok(f.css(next, 'second.ts').includes('color: blue'));
    equal(next.getPersistentCacheStats().hits, 0);
    equal(next.getTraceMetadataCacheStats().diskHits, 2);
    equal(next.getTraceMetadataCacheStats().parses, 1);
  }));

test('tracer restores metadata on a transform miss without reparsing unchanged linked files', () =>
  fixture((f) => {
    const first = f.compiler();
    f.css(first, 'first.ts');
    const second = f.compiler();
    ok(f.css(second, 'another.ts').includes('color: red'));
    deepStrictEqual(second.getTraceMetadataCacheStats(), { parses: 0, memoryHits: 0, diskHits: 3, writes: 0 });
    const stamp = new Date('2020-01-01T00:00:00Z');
    const file = f.write('color.ts', "export const color = 'tan';");
    utimesSync(file, stamp, stamp);
    ok(f.css(second, 'third.ts').includes('color: tan'));
    f.write('color.ts', "export const color = 'red';");
    utimesSync(file, stamp, stamp);
    ok(f.css(second, 'fourth.ts').includes('color: red'));
    equal(second.getTraceMetadataCacheStats().parses, 2);
    ok(second.getTraceMetadataCacheStats().memoryHits >= 4);
  }));

test('cached trace links detect newly resolved modules and higher-priority files', () =>
  fixture((f) => {
    const tracer = createTracer(f.internal());
    const read = () => {
      tracer.beginCompilation();
      return tracer.traceModule(BabelCore, './barrel', path.join(f.root, 'entry.ts'))?.get('color');
    };
    rmSync(path.join(f.root, 'color.ts'));
    equal(read()?.ok, false);
    f.write('color.js', "export const color = 'red';");
    deepStrictEqual(read(), { ok: true, value: 'red' });
    f.write('color.ts', "export const color = 'blue';");
    deepStrictEqual(read(), { ok: true, value: 'blue' });
  }));

test('delayed lazy re-exports refresh a previously captured module before evaluation', () =>
  fixture((f) => {
    f.write('one.ts', 'export const one = 1;');
    f.write('two.ts', 'export const two = 2;');
    f.write('shared.ts', "export { one } from './one'; export { two } from './two';");
    f.write('a.ts', "export * from './shared';");
    const tracer = createTracer(f.internal());
    const from = path.join(f.root, 'entry.ts');
    tracer.beginCompilation();
    deepStrictEqual(tracer.traceModule(BabelCore, './a', from)?.get('one'), { ok: true, value: 1 });
    // Evaluate the other export through a different importer, without recording it
    // on A's previously requested export.
    deepStrictEqual(tracer.traceModule(BabelCore, './shared', from)?.get('two'), { ok: true, value: 2 });
    f.write('two.ts', 'export const two = 3;');
    tracer.beginCompilation();
    deepStrictEqual(tracer.traceModule(BabelCore, './a', from)?.get('two'), { ok: true, value: 3 });
  }));

test('cyclic export-star modules do not retain partial export maps', () =>
  fixture((f) => {
    f.write('a.ts', "export * from './b'; export const color = 'red';");
    f.write('b.ts', "export * from './a';");
    const tracer = createTracer(f.internal());
    tracer.beginCompilation();
    const from = path.join(f.root, 'entry.ts');
    deepStrictEqual(tracer.traceModule(BabelCore, './a', from)?.get('color'), { ok: true, value: 'red' });
    deepStrictEqual(tracer.traceModule(BabelCore, './b', from)?.get('color'), { ok: true, value: 'red' });
  }));

test('metadata corruption is reparsed and disk caching can be disabled', () =>
  fixture((f) => {
    const metadata = createTraceMetadataCache(f.internal());
    const file = path.join(f.root, 'entry.ts');
    const code = 'export const value = 1;';
    metadata.parse(BabelCore, file, code);
    const directory = path.join(f.cacheDir, 'trace-metadata-v1');
    const record = readdirSync(directory, { recursive: true, encoding: 'utf8' }).find((name) =>
      name.endsWith('.json')
    )!;
    writeFileSync(path.join(directory, record), '{}');
    const next = createTraceMetadataCache(f.internal());
    ok(next.parse(BabelCore, file, code));
    equal(next.getStats().parses, 1);
    equal(next.getStats().writes, 1);
    const off = createTraceMetadataCache(f.internal({ cache: { persistent: false } }));
    off.parse(BabelCore, file, code);
    off.parse(BabelCore, file, code);
    deepStrictEqual(off.getStats(), { parses: 1, memoryHits: 1, diskHits: 0, writes: 0 });
  }));

test('tracer metadata survives process restarts while linked values stay fresh', () =>
  fixture((f) => {
    const compilerPath = fileURLToPath(new URL('../compiler/compiler/compiler.ts', import.meta.url));
    const worker = f.write(
      'worker.mts',
      `
    import { createCompiler } from ${JSON.stringify(compilerPath)};
    const compiler = createCompiler(${
        JSON.stringify({ projectDir: f.root, cacheDir: f.cacheDir, runtimeMode: null })
      }, { css: { layer: false } });
    const input = ${JSON.stringify(f.input())};
    input.filePath = ${JSON.stringify(f.root)} + '/' + process.argv[2];
    const result = compiler.compileExtract(input);
    console.log(JSON.stringify({ css: result.rules.map(r => r.css).join('\\n'), stats: compiler.getTraceMetadataCacheStats() }));
  `,
    );
    const execute = (entry: string) => {
      const child = spawnSync(process.execPath, [
        '--import',
        createRequire(import.meta.url).resolve('tsx'),
        worker,
        entry,
      ], { encoding: 'utf8' });
      equal(child.status, 0, child.stderr);
      return JSON.parse(child.stdout);
    };
    const first = execute('first.ts');
    const second = execute('second.ts');
    equal(first.stats.parses, 3);
    equal(second.stats.parses, 0);
    equal(second.stats.diskHits, 3);
    equal(second.css, first.css);
    f.write('color.ts', "export const color = 'blue';");
    const changed = execute('second.ts');
    equal(changed.stats.parses, 1);
    equal(changed.stats.diskHits, 2);
    ok(changed.css.includes('color: blue'));
  }));

test('configuration changes rebuild evaluated tokens while reusing syntax metadata', () =>
  fixture((f) => {
    f.write('color.ts', "import { createToken } from '@fluentic/style'; export const color = createToken('red');");
    const cssOptions = { layer: false, tokenNameFormat: 'one-$hash' };
    const instance = f.compiler({ css: cssOptions });
    ok(f.css(instance).includes('--one-'));
    cssOptions.tokenNameFormat = 'two-$hash';
    const changed = f.css(instance);
    ok(changed.includes('--two-'));
    equal(changed.includes('--one-'), false);
    equal(instance.getTraceMetadataCacheStats().parses, 3);
    ok(instance.getTraceMetadataCacheStats().memoryHits >= 3);
  }));

test('cache version changes invalidate in-memory and persistent tracer metadata', () =>
  fixture((f) => {
    const options = { cache: { version: 1 as string | number } };
    const file = path.join(f.root, 'version.ts');
    const code = 'export const value = 1;';
    const cache = createTraceMetadataCache(f.internal(options));
    cache.parse(BabelCore, file, code);
    cache.parse(BabelCore, file, code);
    equal(cache.getStats().memoryHits, 1);
    options.cache.version = 2;
    cache.parse(BabelCore, file, code);
    equal(cache.getStats().parses, 2);
    const fresh = createTraceMetadataCache(f.internal(options));
    fresh.parse(BabelCore, file, code);
    equal(fresh.getStats().diskHits, 1);
    options.cache.version = '2';
    const stringVersion = createTraceMetadataCache(f.internal(options));
    stringVersion.parse(BabelCore, file, code);
    equal(stringVersion.getStats().diskHits, 0);
  }));
