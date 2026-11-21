import { deepStrictEqual, equal, ok } from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
import type { ResolvedConfig } from 'vite';
import { CompilerRuntimeMode, createCompiler } from '../compiler';
import type { CompilerOptions, TransformExtractArgs } from '../compiler';
import { getCompilerCacheIdentity } from '../compiler/compiler/cache_identity';
import { clearResolverCache } from '../compiler/utils/file_resolver';
import { CSS_CONFIG } from '../config/config/css';
import { createVitePluginState } from '../plugin/bundler/vite/state';
import { PrioritySelectors } from '../selector/presets';
import { createStyleFn } from '../style/style';
import { test } from './setup';

function fixture(run: (fixture: ReturnType<typeof setup>) => void) {
  const root = mkdtempSync(path.join(tmpdir(), 'fluentic-persistent-'));
  try {
    run(setup(root));
  } finally {
    clearResolverCache();
    rmSync(root, { recursive: true, force: true });
  }
}

function setup(root: string) {
  const cacheDir = path.join(root, '.cache');
  const write = (file: string, code: string) => {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, code);
    return target;
  };
  write('tokens.ts', "export const color = 'red';");
  write('barrel.ts', "export { color } from './tokens';");
  const args: TransformExtractArgs = {
    filePath: path.join(root, 'entry.ts'),
    sourcemap: null,
    code:
      "import { style } from '@fluentic/style'; import { color } from './barrel'; export const card = style({color});",
  };
  const compiler = (options: CompilerOptions = {}, runtimeMode: CompilerRuntimeMode | null = null) =>
    createCompiler({ projectDir: root, cacheDir, runtimeMode }, {
      css: { layer: false },
      ...options,
    });
  const css = (instance: ReturnType<typeof compiler>, input = args) =>
    instance.compileExtract(input)!.rules.map((rule) => rule.css).join('\n');
  return { root, cacheDir, write, args, compiler, css };
}

test('persistent extraction reuses complete output and restores CSS into a fresh collector', () =>
  fixture((f) => {
    ok(getCompilerCacheIdentity(), 'compiler implementation must be fingerprintable');
    const first = f.compiler();
    const cold = first.compileExtract(f.args);
    equal(first.getPersistentCacheStats().writes, 1);
    const second = f.compiler();
    deepStrictEqual(second.compileExtract(f.args), cold);
    equal(second.getPersistentCacheStats().hits, 1);
    equal(second.getExtractedCss(), first.getExtractedCss());
    const empty = f.compiler();
    equal(empty.getExtractedCss(), '', 'unvisited modules must not contribute cached CSS');
  }));

test('persistent extraction invalidates transitive content even with preserved timestamps', () =>
  fixture((f) => {
    const timestamp = new Date('2020-01-01T00:00:00Z');
    const target = path.join(f.root, 'tokens.ts');
    utimesSync(target, timestamp, timestamp);
    const instance = f.compiler();
    ok(f.css(instance).includes('color: red'));
    f.write('tokens.ts', "export const color = 'tan';");
    utimesSync(target, timestamp, timestamp);
    ok(f.css(instance).includes('color: tan'));
    equal(instance.getPersistentCacheStats().hits, 0);
    equal(instance.getPersistentCacheStats().writes, 2);
    equal(f.css(f.compiler()), f.css(f.compiler({ cache: { persistent: false } })));
  }));

test('persistent extraction re-resolves added higher-priority files and symlink targets', () =>
  fixture((f) => {
    rmSync(path.join(f.root, 'tokens.ts'));
    f.write('tokens.js', "export const color = 'red';");
    const instance = f.compiler();
    ok(f.css(instance).includes('color: red'));
    f.write('tokens.ts', "export const color = 'tan';");
    ok(f.css(instance).includes('color: tan'));
    rmSync(path.join(f.root, 'tokens.ts'));
    f.write('other.ts', "export const color = 'blue';");
    symlinkSync(path.join(f.root, 'other.ts'), path.join(f.root, 'tokens.ts'));
    ok(f.css(instance).includes('color: blue'));
  }));

test('persistent extraction tracks unresolved imports and deleted dependencies', () =>
  fixture((f) => {
    const instance = f.compiler();
    f.write('barrel.ts', "export { color } from './missing';");
    const missing = instance.compileExtract(f.args);
    equal(instance.getPersistentCacheStats().writes, 1);
    f.write('missing.ts', "export const color = 'purple';");
    ok(f.css(instance).includes('color: purple'));
    rmSync(path.join(f.root, 'missing.ts'));
    deepStrictEqual(instance.compileExtract(f.args), missing);
    equal(instance.getPersistentCacheStats().hits, 0);
  }));

test('persistent extraction follows changed package exports and tsconfig aliases', () =>
  fixture((f) => {
    f.write('node_modules/colors/package.json', JSON.stringify({ name: 'colors', exports: './red.js' }));
    f.write('node_modules/colors/red.js', "export const color = 'red';");
    f.write('node_modules/colors/blue.js', "export const color = 'blue';");
    f.write('barrel.ts', "export { color } from 'colors';");
    const instance = f.compiler();
    ok(f.css(instance).includes('color: red'));
    f.write('node_modules/colors/package.json', JSON.stringify({ name: 'colors', exports: './blue.js' }));
    ok(f.css(instance).includes('color: blue'));
    const config = (target: string) =>
      JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@colors': [target] } } });
    f.write('tsconfig.json', config('./tokens.ts'));
    f.write('barrel.ts', "export { color } from '@colors';");
    ok(f.css(instance).includes('color: red'));
    f.write('other.ts', "export const color = 'green';");
    f.write('tsconfig.json', config('./other.ts'));
    ok(f.css(instance).includes('color: green'));
  }));

test('persistent extraction keys source, sourcemaps, configuration and runtime mode', () =>
  fixture((f) => {
    f.css(f.compiler());
    const changedSource = { ...f.args, code: f.args.code.replace('style({color})', 'style({color, padding: 7})') };
    const instance = f.compiler();
    ok(f.css(instance, changedSource).includes('padding: 7px'));
    equal(instance.getPersistentCacheStats().hits, 0);
    const map = { version: 3, names: [], sources: ['original.ts'], sourcesContent: [f.args.code], mappings: '' };
    const withMap = { ...f.args, sourcemap: JSON.stringify(map) };
    instance.compileExtract(withMap);
    equal(instance.getPersistentCacheStats().hits, 0);
    const changedOptions = f.compiler({ css: { debugClassName: true } });
    changedOptions.compileExtract(withMap);
    equal(changedOptions.getPersistentCacheStats().hits, 0);
    const production = f.compiler({}, CompilerRuntimeMode.Prod);
    const result = production.compileExtract(f.args);
    equal(production.getPersistentCacheStats().hits, 0);
    deepStrictEqual(
      result,
      f.compiler({ cache: { persistent: false } }, CompilerRuntimeMode.Prod).compileExtract(f.args),
    );
    const before = CSS_CONFIG.layerNamespace;
    try {
      CSS_CONFIG.layerNamespace = 'changed-cache-test';
      const changedGlobal = f.compiler({}, CompilerRuntimeMode.Prod);
      changedGlobal.compileExtract(f.args);
      equal(changedGlobal.getPersistentCacheStats().hits, 0);
    } finally {
      CSS_CONFIG.layerNamespace = before;
    }
  }));

test('persistent extraction supports style metadata and can explicitly bypass callbacks', () =>
  fixture((f) => {
    const { style } = createStyleFn({ selectors: PrioritySelectors });
    const options = { importSources: [{ source: '@fluentic/style', name: 'style', styleFn: style }] };
    f.css(f.compiler(options));
    const warm = f.compiler(options);
    f.css(warm);
    equal(warm.getPersistentCacheStats().hits, 1);
    for (
      const unsafe of [
        { getSourcemapFilePath: () => 'dynamic.ts' },
        { importSources: [{ ...options.importSources[0]!, check: () => true }] },
      ]
    ) {
      const instance = f.compiler({ ...unsafe, cache: { dynamicConfig: false } });
      f.css(instance);
      equal(instance.getPersistentCacheStats().bypasses, 1);
      equal(instance.getPersistentCacheStats().writes, 0);
    }
  }));

test('persistent extraction recovers from corrupt records and unwritable cache locations', () =>
  fixture((f) => {
    f.css(f.compiler());
    const folder = path.join(f.cacheDir, 'extract-v1');
    const filename = path.join(
      folder,
      readdirSync(folder, { recursive: true, encoding: 'utf8' }).find((name) => name.endsWith('.bin'))!,
    );
    writeFileSync(filename, 'corrupt');
    const recovered = f.compiler();
    ok(f.css(recovered).includes('color: red'));
    equal(recovered.getPersistentCacheStats().writes, 1);
    rmSync(f.cacheDir, { recursive: true });
    writeFileSync(f.cacheDir, 'not a directory');
    const blocked = f.compiler();
    ok(f.css(blocked).includes('color: red'));
    equal(blocked.getPersistentCacheStats().writes, 0);
  }));

test('persistent extraction reuses disk output in a separate Node process', () =>
  fixture((f) => {
    const compilerPath = fileURLToPath(new URL('../compiler/compiler/compiler.ts', import.meta.url));
    const worker = f.write(
      'worker.mts',
      `
    import { createCompiler } from ${JSON.stringify(compilerPath)};
    const compiler = createCompiler(${JSON.stringify({ projectDir: f.root, cacheDir: f.cacheDir, runtimeMode: null })},
      { css: { layer: false } });
    const result = compiler.compileExtract(${JSON.stringify(f.args)});
    console.log(JSON.stringify({ result, css: compiler.getExtractedCss(), stats: compiler.getPersistentCacheStats() }));
  `,
    );
    const execute = (flags: string[] = []) => {
      const child = spawnSync(process.execPath, [
        ...flags,
        '--import',
        createRequire(import.meta.url).resolve('tsx'),
        worker,
      ], {
        encoding: 'utf8',
      });
      equal(child.status, 0, child.stderr);
      return JSON.parse(child.stdout);
    };
    const cold = execute();
    const warm = execute();
    equal(cold.stats.writes, 1);
    equal(warm.stats.hits, 1);
    deepStrictEqual(warm.result, cold.result);
    equal(warm.css, cold.css);
    equal(execute(['--conditions=fluentic-cache-test']).stats.writes, 1);
    equal(execute().stats.hits, 1, 'another compiler/runtime fingerprint must not displace this cache');
    f.write('tokens.ts', "export const color = 'blue';");
    const changed = execute();
    equal(changed.stats.hits, 0);
    ok(changed.css.includes('color: blue'));
  }));

test('Vite production options permit persistent cache hits', () =>
  fixture((f) => {
    const create = () => {
      const state = createVitePluginState({ cache: { location: f.cacheDir } });
      state.setConfig({ root: f.root, command: 'build' } as ResolvedConfig);
      return state.getState().compiler;
    };
    const first = create();
    const output = first.compileExtract(f.args);
    equal(first.getPersistentCacheStats().writes, 1);
    const second = create();
    deepStrictEqual(second.compileExtract(f.args), output);
    equal(second.getPersistentCacheStats().hits, 1);
  }));

test('persistent extraction bypasses inherited options and metadata accessors', () =>
  fixture((f) => {
    const options = Object.assign(Object.create({ css: { layer: false } }), { cache: { persistent: true } });
    const inherited = createCompiler({ projectDir: f.root, cacheDir: f.cacheDir, runtimeMode: null }, options);
    f.css(inherited);
    equal(inherited.getPersistentCacheStats().bypasses, 1);
    const { style } = createStyleFn({ selectors: PrioritySelectors });
    const key = Symbol.for('@fluentic/style.style.fn:meta');
    const meta = Object.getOwnPropertyDescriptor(style, key)!.value;
    Object.defineProperty(style, key, { get: () => meta });
    const dynamic = f.compiler({ importSources: [{ source: '@fluentic/style', name: 'style', styleFn: style }] });
    f.css(dynamic);
    equal(dynamic.getPersistentCacheStats().bypasses, 1);
  }));

test('persistent extraction invalidates when the working directory changes', () =>
  fixture((f) => {
    const previous = process.cwd();
    const instance = f.compiler();
    f.css(instance);
    try {
      process.chdir(f.root);
      f.css(instance);
      equal(instance.getPersistentCacheStats().hits, 0);
      equal(instance.getPersistentCacheStats().writes, 2);
    } finally {
      process.chdir(previous);
    }
  }));

test('persistent extraction can explicitly opt out of the default disk cache', () =>
  fixture((f) => {
    const cached = f.compiler();
    const expected = cached.compileExtract(f.args);
    equal(cached.getPersistentCacheStats().writes, 1);
    const disabled = f.compiler({ cache: { persistent: false } });
    deepStrictEqual(disabled.compileExtract(f.args), expected);
    deepStrictEqual(disabled.compileExtract(f.args), expected);
    deepStrictEqual(disabled.getPersistentCacheStats(), { hits: 0, misses: 0, bypasses: 2, writes: 0 });
  }));

test('persistent check warnings replay on hits with identical output', () =>
  fixture((f) => {
    f.write('tokens.ts', "export const color = 'red !important';");
    const options: CompilerOptions = { check: { important: { rawValue: 'warn' } } };
    const messages: unknown[][] = [];
    const previous = console.warn;
    console.warn = (...args: unknown[]) => {
      messages.push(args);
    };
    try {
      const first = f.compiler(options);
      const output = first.compileExtract(f.args);
      const coldMessages = messages.splice(0);
      equal(coldMessages.length, 1);
      const warm = f.compiler(options);
      deepStrictEqual(warm.compileExtract(f.args), output);
      equal(warm.getPersistentCacheStats().hits, 1);
      deepStrictEqual(messages.splice(0), coldMessages);
      f.write('tokens.ts', "export const color = 'blue';");
      f.css(warm);
      equal(messages.length, 0);
      equal(warm.getPersistentCacheStats().misses, 1);
    } finally {
      console.warn = previous;
    }
  }));

function captureFailure(run: () => unknown): Error {
  try {
    run();
  } catch (error) {
    ok(error instanceof Error);
    return error;
  }
  throw new Error('Expected compilation failure');
}

test('persistent check errors replay code frames and invalidate on dependency and severity changes', () =>
  fixture((f) => {
    f.write('tokens.ts', "export const color = 'red !important';");
    const options: CompilerOptions = { check: { important: { rawValue: 'error' } } };
    const first = f.compiler(options);
    const cold = captureFailure(() => first.compileExtract(f.args));
    equal(first.getPersistentCacheStats().writes, 1);
    const warm = f.compiler(options);
    const hit = captureFailure(() => warm.compileExtract(f.args));
    deepStrictEqual([hit.name, hit.message, hit.stack], [cold.name, cold.message, cold.stack]);
    ok(hit.message.includes(f.args.filePath));
    ok(stripVTControlCharacters(hit.message).includes('> 1 |'));
    equal(warm.getPersistentCacheStats().hits, 1);
    equal(warm.getExtractedCss(), '');
    const disabled = f.compiler({ check: { important: { rawValue: false } } });
    ok(f.css(disabled).includes('!important'));
    equal(disabled.getPersistentCacheStats().hits, 0);
    f.write('tokens.ts', "export const color = 'blue';");
    ok(f.css(warm).includes('blue'));
    equal(warm.getPersistentCacheStats().misses, 1);
  }));

test('cached outside-sheet errors preserve earlier warnings and roll back partial CSS', () =>
  fixture((f) => {
    const input = {
      ...f.args,
      code: `import { style } from '@fluentic/style';
export const good = style({ color: 'blue' });
export const warning = style({ color: 'red !important' });
export const bad = style({ color: style.important('green') });`,
    };
    const options: CompilerOptions = { check: { important: { rawValue: 'warn', outsideSheet: 'error' } } };
    const messages: unknown[][] = [];
    const previous = console.warn;
    console.warn = (...args: unknown[]) => {
      messages.push(args);
    };
    try {
      const first = f.compiler(options);
      const cold = captureFailure(() => first.compileExtract(input));
      const warnings = messages.splice(0);
      equal(warnings.length, 1);
      equal(first.getExtractedCss(), '');
      const second = f.compiler(options);
      equal(captureFailure(() => second.compileExtract(input)).message, cold.message);
      equal(second.getPersistentCacheStats().hits, 1);
      deepStrictEqual(messages.splice(0), warnings);
      equal(second.getExtractedCss(), '');
      const changed = {
        ...input,
        code: "import { style } from '@fluentic/style'; export const good = style({color:'pink'});",
      };
      ok(f.css(second, changed).includes('pink'));
    } finally {
      console.warn = previous;
    }
  }));

test('callback caching defaults on, skips callback execution on hits, and detects changed source', () =>
  fixture((f) => {
    let calls = 0;
    const format = ({ name }: { name: string | null; }) => {
      calls++;
      return 'one-' + name;
    };
    const input = {
      ...f.args,
      code:
        "import { style, createToken } from '@fluentic/style'; const color = createToken('red', 'color'); export const card = style({color});",
    };
    const options: CompilerOptions = { css: { layer: false, tokenNameFormat: format } };
    const cold = f.compiler(options).compileExtract(input);
    ok(calls > 0);
    calls = 0;
    const warm = f.compiler(options);
    deepStrictEqual(warm.compileExtract(input), cold);
    equal(warm.getPersistentCacheStats().hits, 1);
    equal(calls, 0);
    const changed = f.compiler({ css: { layer: false, tokenNameFormat: ({ name }) => 'two-' + name } });
    ok(changed.compileExtract(input)!.code.includes('two-'));
    equal(changed.getPersistentCacheStats().hits, 0);
    const off = f.compiler({ ...options, cache: { dynamicConfig: false } });
    off.compileExtract(input);
    equal(off.getPersistentCacheStats().bypasses, 1);
    ok(calls > 0);
  }));

test('cache version invalidates callbacks with changed captured state and separates number/string namespaces', () =>
  fixture((f) => {
    let prefix = 'one';
    const options: CompilerOptions = {
      cache: { version: 1 },
      css: { layer: false, tokenNameFormat: ({ name }) => prefix + '-' + name },
    };
    const input = {
      ...f.args,
      code:
        "import { style, createToken } from '@fluentic/style'; const color = createToken('red', 'color'); export const card = style({color});",
    };
    const compiler = f.compiler(options);
    ok(compiler.compileExtract(input)!.code.includes('one-'));
    prefix = 'two';
    options.cache!.version = 2;
    ok(compiler.compileExtract(input)!.code.includes('two-'));
    equal(compiler.getPersistentCacheStats().hits, 0);
    const warm = f.compiler(options);
    warm.compileExtract(input);
    equal(warm.getPersistentCacheStats().hits, 1);
    options.cache!.version = '2';
    const separate = f.compiler(options);
    separate.compileExtract(input);
    equal(separate.getPersistentCacheStats().hits, 0);
  }));

test('custom cache location resolves from project root and contains both persistent caches', () =>
  fixture((f) => {
    const options: CompilerOptions = { cache: { location: 'custom/cache', version: 'test' } };
    const compiler = f.compiler(options);
    f.css(compiler);
    const folder = path.join(f.root, 'custom/cache');
    ok(readdirSync(folder).includes('extract-v1'));
    ok(readdirSync(folder).includes('trace-metadata-v1'));
    const warm = f.compiler(options);
    f.css(warm);
    equal(warm.getPersistentCacheStats().hits, 1);
    const state = createVitePluginState(options);
    state.setConfig({ root: f.root, command: 'build' } as ResolvedConfig);
    equal(state.getState().cacheDir, folder);
  }));

test('unrelated compiler errors are not persisted as diagnostic failures', () =>
  fixture((f) => {
    const compiler = f.compiler({ check: { important: { rawValue: 'error' } } });
    captureFailure(() => compiler.compileExtract({ ...f.args, code: 'export const = ;' }));
    equal(compiler.getPersistentCacheStats().writes, 0);
  }));

test('diagnostic failures survive process restart without recompilation', () =>
  fixture((f) => {
    f.write('tokens.ts', "export const color = 'red !important';");
    const modulePath = fileURLToPath(new URL('../compiler/index.ts', import.meta.url));
    const script = f.write(
      'diagnostic-process.mjs',
      `
      import { createCompiler } from ${JSON.stringify(modulePath)};
      const compiler = createCompiler(${
        JSON.stringify({ projectDir: f.root, cacheDir: f.cacheDir, runtimeMode: null })
      },
        { check: { important: { rawValue: 'error' } }, cache: { version: 'diagnostics' } });
      try { compiler.compileExtract(${JSON.stringify(f.args)}); process.exitCode = 1; }
      catch (error) { console.log(JSON.stringify({ message: error.message, stats: compiler.getPersistentCacheStats() })); }
    `,
    );
    const require = createRequire(import.meta.url);
    const execute = () => {
      const child = spawnSync(process.execPath, ['--import', require.resolve('tsx'), script], { encoding: 'utf8' });
      equal(child.status, 0, child.stderr);
      return JSON.parse(child.stdout.trim()) as { message: string; stats: { hits: number; writes: number; }; };
    };
    const cold = execute();
    equal(cold.stats.writes, 1);
    const warm = execute();
    equal(warm.stats.hits, 1);
    equal(warm.message, cold.message);
  }));

test('opaque bound callbacks still bypass caching even with dynamic configuration enabled', () =>
  fixture((f) => {
    const compiler = f.compiler({
      getSourcemapFilePath: function(this: { path: string; }) {
        return this.path;
      }.bind({ path: 'map.ts' }),
    });
    f.css(compiler);
    equal(compiler.getPersistentCacheStats().bypasses, 1);
  }));
