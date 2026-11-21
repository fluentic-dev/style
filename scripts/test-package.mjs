import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temp = realpathSync(mkdtempSync(join(tmpdir(), 'fluentic-package-')));
function run(command, args, cwd = temp) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: { ...process.env, CI: 'true' } });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${result.status})`);
}
try {
  run('pnpm', ['--filter', '@fluentic/style', 'pack', '--pack-destination', temp], root);
  const tarball = readdirSync(temp).find((file) => file.endsWith('.tgz'));
  assert(tarball, 'pack must create a tarball');
  writeFileSync(
    join(temp, 'package.json'),
    JSON.stringify(
      {
        private: true,
        packageManager: 'pnpm@10.17.1',
        type: 'module',
        dependencies: {
          '@fluentic/style': `file:${join(temp, tarball)}`,
          typescript: '5.9.3',
          'typescript-native': 'npm:typescript@7.0.2',
          '@types/node': '25.9.1',
          '@types/react': '19.2.14',
          '@types/react-dom': '19.2.3',
          react: '19.2.0',
          'react-dom': '19.2.0',
          preact: '10.29.7',
          'solid-js': '1.9.14',
          vite: '8.0.16',
          '@vitejs/plugin-react': '6.0.2',
          '@preact/preset-vite': '2.10.6',
          'vite-plugin-solid': '2.11.12',
          webpack: '5.107.2',
          '@parcel/plugin': '2.16.4',
          next: '16.2.9',
        },
      },
      null,
      2,
    ),
  );
  run('pnpm', ['install', '--ignore-workspace', '--no-frozen-lockfile']);
  const require = createRequire(join(temp, 'package.json'));
  const ts = require('typescript');
  const packageRoot = join(temp, 'node_modules/@fluentic/style');
  const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  const checkTargets = (entry) => {
    for (const target of Object.values(entry)) {
      if (typeof target === 'string') assert(existsSync(join(packageRoot, target)), `Missing export: ${target}`);
      else if (target) checkTargets(target);
    }
  };
  checkTargets(pkg.exports);
  const imports = [];
  for (const [key, entry] of Object.entries(pkg.exports)) {
    if (!entry.types) continue;
    assert(entry.types.endsWith('.d.ts'), `Source type export: ${key}`);
    const name = key === '.' ? pkg.name : pkg.name + key.slice(1);
    imports.push(
      key.startsWith('./types/') ? `import '${name}';` : `import type * as Export${imports.length} from '${name}';`,
    );
  }
  writeFileSync(join(temp, 'exports.ts'), imports.join('\n'));
  writeFileSync(
    join(temp, 'consumer.tsx'),
    `
import { style } from '@fluentic/style';
import { createElement as pluginCreateElement } from '@fluentic/style/plugin/jsx';
import { createElement as runtimeCreateElement } from '@fluentic/style/jsx';
import { plugin } from '@fluentic/style/plugin/vite';
import { createSheet } from '@fluentic/style/css';
const reset = createSheet({ layer: 'reset' }, [style.selector('&', { margin: 0 })]);
const relative = createSheet({ layer: '.reset' }, [style.selector('*', { boxSizing: 'border-box' })]);
const curried = createSheet({ layer: true }, [style.selector('h1')({ fontSize: '1.5rem' })]);
const scopedReset = <div css={reset}><section css={relative}><h1 css={curried} /></section></div>;
// @ts-expect-error Sheet layers accept booleans and strings, not numbers.
createSheet({ layer: 1 }, []);
const css = style({ color: 'red', padding: 4 });
const element = <div css={css}>Packed consumer</div>;
const spreadProps = { key: 'spread', css };
const fallback = <div {...spreadProps} key="explicit">Fallback</div>;
pluginCreateElement('div', null, fallback);
runtimeCreateElement('div', null, fallback);
const vitePlugin = plugin();
// @ts-expect-error A nonexistent API must still be rejected.
style.notARealMethod();
export { element, scopedReset, vitePlugin };
`,
  );
  for (
    const [module, moduleResolution] of [
      [ts.ModuleKind.ESNext, ts.ModuleResolutionKind.Bundler],
      [ts.ModuleKind.Node16, ts.ModuleResolutionKind.Node16],
      [ts.ModuleKind.NodeNext, ts.ModuleResolutionKind.NodeNext],
    ]
  ) {
    // Next.js supports bundler resolution; its own declarations fail Node16/NodeNext.
    writeFileSync(
      join(temp, 'exports.ts'),
      imports.filter((line) => moduleResolution === ts.ModuleResolutionKind.Bundler || !line.includes('/plugin/nextjs'))
        .join('\n'),
    );
    const program = ts.createProgram([join(temp, 'exports.ts'), join(temp, 'consumer.tsx')], {
      module,
      moduleResolution,
      target: ts.ScriptTarget.ES2020,
      lib: ['lib.esnext.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
      strict: true,
      noUncheckedIndexedAccess: true,
      exactOptionalPropertyTypes: true,
      skipLibCheck: false,
      noEmit: true,
      jsx: ts.JsxEmit.ReactJSX,
      jsxImportSource: '@fluentic/style/plugin/jsx',
      esModuleInterop: true,
      types: ['node', 'react'],
      typeRoots: [join(temp, 'node_modules/@types')],
    });
    const errors = ts.getPreEmitDiagnostics(program);
    if (errors.length) {
      throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, {
        getCurrentDirectory: () => temp,
        getCanonicalFileName: (name) => name,
        getNewLine: () => '\n',
      }));
    }
    for (const source of program.getSourceFiles()) {
      if (source.fileName.includes('/@fluentic/style/')) {
        assert(source.isDeclarationFile, `Consumer loaded implementation: ${source.fileName}`);
      }
    }
    console.log(`Strict TypeScript 5.9 packed consumer passed: ${ts.ModuleResolutionKind[moduleResolution]}`);
    const nativeConfig = join(temp, 'tsconfig.native.json');
    writeFileSync(
      nativeConfig,
      JSON.stringify({
        compilerOptions: {
          module: ts.ModuleKind[module],
          moduleResolution: ts.ModuleResolutionKind[moduleResolution],
          target: 'ES2020',
          lib: ['ESNext', 'DOM', 'DOM.Iterable'],
          strict: true,
          noUncheckedIndexedAccess: true,
          exactOptionalPropertyTypes: true,
          skipLibCheck: false,
          noEmit: true,
          jsx: 'react-jsx',
          jsxImportSource: '@fluentic/style/plugin/jsx',
          esModuleInterop: true,
          types: ['node', 'react'],
        },
        files: ['exports.ts', 'consumer.tsx'],
      }),
    );
    const native = spawnSync(process.execPath, [
      join(temp, 'node_modules/typescript-native/bin/tsc'),
      '-p',
      nativeConfig,
      '--listFiles',
      '--pretty',
      'false',
    ], { cwd: temp, encoding: 'utf8' });
    assert.equal(native.status, 0, native.stdout + native.stderr);
    for (const file of native.stdout.split('\n')) {
      if (file.includes('/@fluentic/style/')) {
        assert(file.trim().endsWith('.d.ts'), `Native consumer loaded implementation: ${file}`);
      }
    }
    console.log(`Strict TypeScript 7 packed consumer passed: ${ts.ModuleResolutionKind[moduleResolution]}`);
  }
  run('node', [
    '--input-type=module',
    '-e',
    `
    import { style } from '@fluentic/style';
    import { plugin } from '@fluentic/style/plugin/vite';
    import '@fluentic/style/compiler';
    if (typeof style !== 'function' || plugin().name !== 'fluentic-style') throw new Error('Invalid runtime exports');
  `,
  ]);
  // Exercise the compiler-generated base import from the installed tarball.
  for (const source of ['@fluentic/style/plugin/jsx', '@fluentic/style/jsx']) {
    for (const dev of [false, true]) {
      const compiled = ts.transpileModule(
        `
        const props = { key: 'spread', css: false, className: 'existing' };
        export const element = <div {...props} key="explicit"><span />child</div>;
      `,
        {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2020,
            jsx: dev ? ts.JsxEmit.ReactJSXDev : ts.JsxEmit.ReactJSX,
            jsxImportSource: source,
          },
          fileName: 'fallback.tsx',
        },
      ).outputText;
      assert.match(compiled, /import.*createElement.*from/);
      assert(compiled.includes(`from "${source}"`), 'Fallback must import the base path');
      writeFileSync(join(temp, 'fallback.mjs'), compiled);
      const conditions = dev ? ['--conditions=development'] : [];
      for (const server of source.endsWith('/plugin/jsx') ? [false, true] : [false]) {
        run('node', [
          ...conditions,
          ...(server ? ['--conditions=react-server'] : []),
          '--input-type=module',
          '-e',
          `
          import assert from 'node:assert/strict';
          // Match the configuration normally supplied by the bundler plugin.
          globalThis.FLUENTIC_STYLE_BUILD_CONFIG = JSON.stringify({ hoist: false, css: {} });
          const { element } = await import('./fallback.mjs');
          const { createElement } = await import('${source}');
          const { createElement: expected } = await import('${packageRoot}/dist/${
            source.endsWith('/plugin/jsx')
              ? `entry/${server ? 'rsc-' : ''}${dev ? 'dev' : 'prod'}/jsx-runtime`
              : 'jsx/jsx-runtime'
          }.js');
          assert.equal(createElement, expected);
          assert.equal(element.key, 'explicit');
          assert.equal(element.props.className, 'existing');
          assert.equal('css' in element.props, false);
          assert.equal(element.props.children.length, 2);
          assert.equal(element.props.children[1], 'child');
          `,
        ]);
      }
    }
  }
  for (const example of ['basic', 'preact-basic', 'solid-basic', 'tailwind']) {
    const dest = join(temp, example);
    cpSync(join(root, 'examples', example), dest, {
      recursive: true,
      filter: (file) => !['node_modules', 'dist', '.cache'].includes(file.split('/').at(-1)),
    });
    if (example === 'basic') {
      const main = join(dest, 'src/main.tsx');
      const original = readFileSync(main, 'utf8');
      assert(original.includes('<Page />'), 'React fixture must contain the page render');
      writeFileSync(main, original.replace('<Page />', `<Page {...{ key: 'spread' }} key='explicit' />`));
    }
    rmSync(join(dest, 'package.json'));
    writeFileSync(
      join(dest, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          types: ['vite/client'],
          strict: true,
          noUncheckedIndexedAccess: true,
          skipLibCheck: false,
          noEmit: true,
          jsx: example === 'solid-basic' ? 'preserve' : 'react-jsx',
          jsxImportSource: example === 'solid-basic'
            ? 'solid-js'
            : example === 'preact-basic'
            ? 'preact'
            : '@fluentic/style/plugin/jsx',
          esModuleInterop: true,
        },
        include: ['src'],
      }),
    );
    run(process.execPath, [join(temp, 'node_modules/typescript-native/bin/tsc'), '-p', dest]);
    run('node', [join(dirname(require.resolve('vite/package.json')), 'bin/vite.js'), 'build'], dest);
  }
  console.log('Packed package checks passed.');
  rmSync(temp, { recursive: true, force: true });
} catch (error) {
  console.error(`Package test retained at ${temp}`);
  throw error;
}
