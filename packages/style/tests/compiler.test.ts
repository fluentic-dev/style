import { mkdtempSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { formatClassName } from '../atomic/debug/className';
import { compareLayerPriority, type LayerPriority } from '../atomic/layer';
import { normalizeDebugKeywordValue, normalizePropertyName, sanitizeDebugPropertyName } from '../atomic/utils/debug';
import { CompilerRuntimeMode } from '../compiler';
import webpackLoader from '../plugin/bundler/webpack/loader';
import { webpackRegistry } from '../plugin/bundler/webpack/utils';
import { writeCacheFile } from '../plugin/utils/cache';
import {
  createDefaultedTailwindStyleConfig,
  createTailwindStyleTransform,
  defaultTailwindColors,
  TailwindSelectors,
} from '../presets/tailwind';
import {
  assertCompileError,
  before,
  BUILDER_STATE,
  countOccurrences,
  createCompiler,
  createPluginCompiler,
  createStyleFn,
  createTransformFilter,
  createWebpackRuntimeModuleSource,
  deepEqual,
  equal,
  fileURLToPath,
  getCallStringArgs,
  getCssClassNames,
  includes,
  injectDevCssLink,
  injectStyleDebugData,
  nextLoader,
  nextRegistry,
  notEqual,
  notIncludes,
  prependWebpackRuntimeEntry,
  readFileSync,
  selector,
  style,
  test,
  testDir,
  transformCssOutput,
  viteStylePlugin,
} from './setup';

test('debug utility normalizers keep property and keyword names class-safe', () => {
  equal(normalizePropertyName(' backgroundColor '), 'background-color');
  equal(normalizePropertyName('margin_inlineStart'), 'margin-inline-start');

  equal(sanitizeDebugPropertyName('--token-surface'), 'token-surface');
  equal(sanitizeDebugPropertyName(' color / accent '), 'color-accent');
  equal(sanitizeDebugPropertyName('___'), '');

  equal(normalizeDebugKeywordValue(' Inline-Flex '), 'inline-flex');
  equal(normalizeDebugKeywordValue('-invalid'), null);
  equal(normalizeDebugKeywordValue('var(--x)'), null);
});

test('debug class name formatter drops optional segments and applies length modes', () => {
  const format = '[(atRule:5)-][(scopeSelector:10!)-][(property:12)][-(selector)][-(value)]';

  equal(
    formatClassName(format, 'abc123', {
      atRule: 'container',
      scopeSelector: 'card-content-area',
      property: 'color',
      selector: 'hover',
      value: 'red',
    }),
    'card-conte-color-hover-red-abc123',
  );

  equal(
    formatClassName(format, 'def456', {
      atRule: 'dark',
      scopeSelector: null,
      property: 'background-color',
      selector: 'focus',
      value: null,
    }),
    'dark--focus-def456',
  );

  equal(
    formatClassName(format, 'ghi789', {
      atRule: null,
      scopeSelector: null,
      property: 'color',
      selector: null,
      value: null,
    }),
    'color-ghi789',
  );

  equal(
    formatClassName('$hash--[(property)]', null, {
      atRule: null,
      scopeSelector: null,
      property: 'color',
      selector: null,
      value: null,
    }),
    '$hash--color',
  );

  equal(
    formatClassName('$hash--[(property)]', 'jkl012', {
      atRule: null,
      scopeSelector: null,
      property: 'color',
      selector: null,
      value: null,
    }),
    'jkl012--color',
  );

  equal(
    formatClassName('[(property)]-[$hash]', 'mno345', {
      atRule: null,
      scopeSelector: null,
      property: 'color',
      selector: null,
      value: null,
    }),
    'color-mno345',
  );

  equal(
    formatClassName('[(atRule)-](property)[-(value)]-$hash', 'nop678', {
      atRule: null,
      scopeSelector: null,
      property: '',
      selector: null,
      value: null,
    }),
    '-nop678',
  );
});

test('debug transform injects host element marker metadata from css prop label', () => {
  const result = injectStyleDebugData(
    `
import { style } from '@fluentic/style';

const css = {
  container: style({ color: 'red' }),
  label: style({ color: 'black' }),
};

export function App() {
  return <main css={[css.container, css.label]} />;
}
`,
    '/project/src/App.tsx',
    {
      rootDir: '/project',
      css: { debugElementClassName: true },
    },
  );

  includes(result.code, '$$elementDebug: true');
  includes(result.code, 'css={[{');
  includes(result.code, 'label: "container"');
  includes(result.code, 'sourceUrl: _');
  includes(result.code, 'loc: [');
});

test('debug transform points element marker metadata at host element', () => {
  const result = injectStyleDebugData(
    `
import { style } from '@fluentic/style';

const css = { root: style({ color: 'red' }) };

export function App() {
  return (
    <main
      id="demo"
      css={css.root}
    />
  );
}
`,
    '/project/src/App.tsx',
    { rootDir: '/project' },
  );

  includes(result.code, '$$elementDebug: true');
  includes(result.code, 'label: "root"');
  includes(result.code, 'loc: [8, 5]');
});

test('debug transform accepts top-level element marker option', () => {
  const result = injectStyleDebugData(
    `
import { style } from '@fluentic/style';

const container = style({ color: 'red' });

export function App() {
  return <main css={container} />;
}
`,
    '/project/src/App.tsx',
    {
      rootDir: '/project',
      debugElementClassName: true,
    },
  );

  includes(result.code, '$$elementDebug: true');
});

test('debug transform injects host element marker metadata by default', () => {
  const result = injectStyleDebugData(
    `
import { style } from '@fluentic/style';

const container = style({ color: 'red' });

export function App() {
  return <main css={container} />;
}
`,
    '/project/src/App.tsx',
    { rootDir: '/project' },
  );

  includes(result.code, '$$elementDebug: true');
});

test('debug transform injects createTheme callsite metadata', () => {
  const result = injectStyleDebugData(
    `
import { createTheme, createToken } from '@fluentic/style';

const color = createToken('blue');
export const theme = createTheme([color('red')]);
`,
    '/project/src/styles.ts',
    { rootDir: '/project' },
  );

  includes(result.code, 'createTheme([color(\'red\')], "');
  includes(result.code, 'filePath: _styleDebugSourceUrl');
  includes(result.code, 'line: 5');
  notIncludes(result.code, 'color(\'red\', {');
});

test('debug transform maps slot override chain merge fields to the merge call', () => {
  const result = injectStyleDebugData(
    `
import { style } from '@fluentic/style';

const localSlotMergeInteraction = style({
  outline: '3px solid #facc15',
});

const buttonBaseStyles = {
  container: style.slot({ color: 'black' }),
};

export const slotOverrideChainTheme = style.scope([
  buttonBaseStyles.container({
    color: '#ffffff',
  }).merge(localSlotMergeInteraction),
]);
`,
    '/project/src/page.tsx',
    { rootDir: '/project', sourcemapTrace: 'style' },
  );

  includes(result.code, '}).merge(localSlotMergeInteraction, { $$debug: true, loc: [15, 6]');
  includes(result.code, '"outline": { 0: [15, 6], 1: [5, 3] }');
  notIncludes(result.code, '}).merge(localSlotMergeInteraction, { $$debug: true, loc: [12, 3]');
  notIncludes(result.code, '}).merge(localSlotMergeInteraction, { $$debug: true, loc: [13, 3]');
});

test('debug transform skips host element marker metadata when explicitly disabled', () => {
  const result = injectStyleDebugData(
    `
import { style } from '@fluentic/style';

const container = style({ color: 'red' });

export function App() {
  return <main css={container} />;
}
`,
    '/project/src/App.tsx',
    {
      rootDir: '/project',
      dev: { elementClassName: false },
    },
  );

  notIncludes(result.code, '$$elementDebug: true');
});

test('compiler extracts scope base and parent selector rules', () => {
  const compiler = createCompiler({
    layer: false,
    css: { classNamePrefix: 't', debugClassName: true },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const styles = {
  container: style.slot({ display: 'flex' }),
  label: style.slot({ color: 'black' }),
};

const scope = style.scope([
  styles.label({ color: 'pink' }),
]).hover([
  styles.label({ color: 'blue' }),
]);
`,
    '/tmp/compiler-scope-parent-selector.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\\n');

  includes(result.code, 'createExtractedScope');
  includes(result.code, '1]');
  includes(css, 'color: pink');
  includes(css, 'color: blue');
  includes(css, ':where(');
  includes(css, ':hover)');
});

test('compiler extracts merged style chains', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const interaction = style({ borderColor: 'gray' })
  .hover({ color: 'blue' })
  .active({ color: 'red' });

const button = style({ color: 'black' })
  .merge(interaction)
  .focusVisible({ outlineColor: 'purple' });
`,
    '/tmp/compiler-merge-style.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  notIncludes(result.code, '.merge(');
  includes(css, 'color: black');
  includes(css, 'border-color: gray');
  includes(css, ':hover');
  includes(css, 'color: blue');
  includes(css, ':active');
  includes(css, 'color: red');
  includes(css, ':focus-visible');
  includes(css, 'outline-color: purple');
});

test('compiler preserves extracted style merge item order', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const shared = style({ color: 'blue' });

export const button = style({ color: 'black' })
  .merge(shared)
  .hover({ color: 'red' });
`,
    '/tmp/compiler-merge-style-order.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  notIncludes(result.code, '.merge(');
  includes(result.code, 'createExtractedStyleMerge');

  const mergeCall = result.code.slice(result.code.indexOf('= createExtractedStyleMerge'));
  const localBaseIndex = mergeCall.indexOf('color-black');
  const sharedIndex = mergeCall.indexOf('shared');
  const localHoverIndex = mergeCall.indexOf('color-hover-red');

  if (
    localBaseIndex === -1 ||
    sharedIndex === -1 ||
    localHoverIndex === -1 ||
    !(localBaseIndex < sharedIndex && sharedIndex < localHoverIndex)
  ) {
    throw new Error(`expected merge output to preserve base -> merged style -> hover order:\n${result.code}`);
  }
});

test('compiler detects chain merge methods from selector config', () => {
  const ui = createStyleFn({
    style: null as any,
    selectors: {
      compose: selector('...'),
      hover: selector(':hover'),
    },
  }).style;

  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
    importSources: [{
      source: /ui-style$/,
      name: 'ui',
      styleFn: ui,
    }],
  });
  const result = compiler.transform(
    `
import { ui } from './ui-style';

const shared = ui({ borderColor: 'gray' })
  .hover({ color: 'blue' });

export const button = ui({ color: 'black' })
  .compose(shared);
`,
    '/tmp/compiler-selector-merge-alias.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  notIncludes(result.code, '.compose(');
  includes(css, 'color: black');
  includes(css, 'border-color: gray');
  includes(css, ':hover');
  includes(css, 'color: blue');
});

test('compiler sourcemap toStyle traces merged rules to the merge call', () => {
  const code = [
    `import { style } from '@fluentic/style';`,
    ``,
    `const base = style.raw({`,
    `  color: 'blue',`,
    `});`,
    ``,
    `const interaction = style({`,
    `  ...base,`,
    `  borderColor: 'gray',`,
    `});`,
    ``,
    `export const button = style({ backgroundColor: 'white' })`,
    `  .merge(interaction);`,
  ].join('\n');
  const mergeLine = code.split('\n').findIndex((line) => line.includes('.merge')) + 1;
  const mergeColumn = code.split('\n')[mergeLine - 1].indexOf('merge') + 1;
  const compiler = createPluginCompiler({
    dev: false,
    projectDir: testDir,
    cacheDir: testDir + '.test-cache',
    runtimeMode: null,
    options: {
      css: { layer: false, debugClassName: true, localClassName: true },
      dev: { sourcemapMode: 'style' },
    },
  });
  const result = compiler.compiler.compileExtract({
    code,
    filePath: '/tmp/compiler-merge-trace-style.ts',
    sourcemap: null,
  });

  if (!result) throw new Error('expected compiler transform result');

  equal(
    result.rules.some((rule) =>
      rule.css.includes('color: blue') &&
      rule.trace?.line === mergeLine &&
      rule.trace?.column === mergeColumn
    ),
    true,
  );
  equal(
    result.rules.some((rule) =>
      rule.css.includes('border-color: gray') &&
      rule.trace?.line === mergeLine &&
      rule.trace?.column === mergeColumn
    ),
    true,
  );
});

test('compiler sourcemap toStyle traces scope merge rules to the merge call', () => {
  const code = [
    `import { style } from '@fluentic/style';`,
    ``,
    `const styles = {`,
    `  button: style.slot({`,
    `    color: 'black',`,
    `  }),`,
    `};`,
    ``,
    `const cancelTheme = style.scope([`,
    `  styles.button({`,
    `    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',`,
    `  }),`,
    `]);`,
    ``,
    `export const mergedTheme = style.scope()`,
    `  .merge(cancelTheme);`,
  ].join('\n');
  const mergeLine = code.split('\n').findIndex((line) => line.includes('.merge')) + 1;
  const mergeColumn = code.split('\n')[mergeLine - 1].indexOf('merge') + 1;
  const compiler = createPluginCompiler({
    dev: false,
    projectDir: testDir,
    cacheDir: testDir + '.test-cache',
    runtimeMode: null,
    options: {
      css: { layer: false, debugClassName: true, localClassName: true },
      dev: { sourcemapMode: 'style' },
    },
  });
  const result = compiler.compiler.compileExtract({
    code,
    filePath: '/tmp/compiler-scope-merge-trace-style.ts',
    sourcemap: null,
  });

  if (!result) throw new Error('expected compiler transform result');

  equal(
    result.rules.some((rule) =>
      rule.css.includes('box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08)') &&
      rule.trace?.line === mergeLine &&
      rule.trace?.column === mergeColumn
    ),
    true,
  );
});

test('compiler sourcemap toStyle traces scope slot override merge to the merge call', () => {
  const code = [
    `import { style } from '@fluentic/style';`,
    ``,
    `const styles = {`,
    `  button: style.slot({ color: 'black' }),`,
    `};`,
    ``,
    `const override = styles.button({`,
    `  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',`,
    `});`,
    ``,
    `export const mergedTheme = style.scope()`,
    `  .merge(override);`,
  ].join('\n');
  const mergeLine = code.split('\n').findIndex((line) => line.includes('.merge')) + 1;
  const mergeColumn = code.split('\n')[mergeLine - 1].indexOf('merge') + 1;
  const compiler = createPluginCompiler({
    dev: false,
    projectDir: testDir,
    cacheDir: testDir + '.test-cache',
    runtimeMode: null,
    options: {
      css: { layer: false, debugClassName: true, localClassName: true },
      dev: { sourcemapMode: 'style' },
    },
  });
  const result = compiler.compiler.compileExtract({
    code,
    filePath: '/tmp/compiler-scope-slot-override-merge-trace-style.ts',
    sourcemap: null,
  });

  if (!result) throw new Error('expected compiler transform result');

  equal(
    result.rules.some((rule) =>
      rule.css.includes('box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08)') &&
      rule.trace?.line === mergeLine &&
      rule.trace?.column === mergeColumn
    ),
    true,
  );
});

test('compiler sourcemap toStyle traces slot override chain merge to the merge call', () => {
  const code = [
    `import { style } from '@fluentic/style';`,
    ``,
    `const shared = style({`,
    `  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',`,
    `});`,
    `const styles = {`,
    `  button: style.slot({ color: 'black' }),`,
    `};`,
    ``,
    `export const theme = style.scope([`,
    `  styles.button({ color: 'red' }).merge(shared),`,
    `]);`,
  ].join('\n');
  const mergeLine = code.split('\n').findIndex((line) => line.includes('.merge')) + 1;
  const mergeColumn = code.split('\n')[mergeLine - 1].indexOf('merge') + 1;
  const compiler = createPluginCompiler({
    dev: false,
    projectDir: testDir,
    cacheDir: testDir + '.test-cache',
    runtimeMode: null,
    options: {
      css: { layer: false, debugClassName: true, localClassName: true },
      dev: { sourcemapMode: 'style' },
    },
  });
  const result = compiler.compiler.compileExtract({
    code,
    filePath: '/tmp/compiler-slot-override-chain-merge-trace-style.ts',
    sourcemap: null,
  });

  if (!result) throw new Error('expected compiler transform result');

  equal(
    result.rules.some((rule) =>
      rule.css.includes('box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08)') &&
      rule.trace?.line === mergeLine &&
      rule.trace?.column === mergeColumn
    ),
    true,
  );
});

test('compiler sourcemap toStyle traces slot base merge to the merge call', () => {
  const code = [
    `import { style } from '@fluentic/style';`,
    ``,
    `const shared = style({`,
    `  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',`,
    `});`,
    `const styles = {`,
    `  button: style.slot({ color: 'black' })`,
    `    .merge(shared),`,
    `};`,
    ``,
    `export const theme = style.scope([`,
    `  styles.button({ color: 'red' }),`,
    `]);`,
  ].join('\n');
  const mergeLine = code.split('\n').findIndex((line) => line.includes('.merge')) + 1;
  const mergeColumn = code.split('\n')[mergeLine - 1].indexOf('merge') + 1;
  const compiler = createPluginCompiler({
    dev: false,
    projectDir: testDir,
    cacheDir: testDir + '.test-cache',
    runtimeMode: null,
    options: {
      css: { layer: false, debugClassName: true, localClassName: true },
      dev: { sourcemapMode: 'style' },
    },
  });
  const result = compiler.compiler.compileExtract({
    code,
    filePath: '/tmp/compiler-slot-base-merge-trace-style.ts',
    sourcemap: null,
  });

  if (!result) throw new Error('expected compiler transform result');

  equal(
    result.rules.some((rule) =>
      rule.css.includes('box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08)') &&
      rule.trace?.line === mergeLine &&
      rule.trace?.column === mergeColumn
    ),
    true,
  );
});

test('compiler sourcemap toValue traces merged rules to original fields', () => {
  const code = [
    `import { style } from '@fluentic/style';`,
    ``,
    `const base = style.raw({`,
    `  color: 'blue',`,
    `});`,
    ``,
    `const interaction = style({`,
    `  ...base,`,
    `  borderColor: 'gray',`,
    `});`,
    ``,
    `export const button = style({ backgroundColor: 'white' })`,
    `  .merge(interaction);`,
  ].join('\n');
  const compiler = createPluginCompiler({
    dev: false,
    projectDir: testDir,
    cacheDir: testDir + '.test-cache',
    runtimeMode: null,
    options: {
      css: { layer: false, debugClassName: true, localClassName: true },
      dev: { sourcemapMode: 'value' },
    },
  });
  const result = compiler.compiler.compileExtract({
    code,
    filePath: '/tmp/compiler-merge-trace-value.ts',
    sourcemap: null,
  });

  if (!result) throw new Error('expected compiler transform result');

  equal(
    result.rules.some((rule) =>
      rule.css.includes('color: blue') &&
      rule.trace?.line === 4 &&
      rule.trace?.column === 3
    ),
    true,
  );
  equal(
    result.rules.some((rule) =>
      rule.css.includes('border-color: gray') &&
      rule.trace?.line === 9 &&
      rule.trace?.column === 3
    ),
    true,
  );
});

test('compiler extracts merged style chains into slots', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const interaction = style({ borderColor: 'gray' })
  .hover({ color: 'blue' });

const button = style.slot({ color: 'black' })
  .merge(interaction);
`,
    '/tmp/compiler-merge-slot.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  notIncludes(result.code, '.merge(');
  includes(result.code, 'createExtractedSlot');
  includes(css, 'color: black');
  includes(css, 'border-color: gray');
  includes(css, ':hover');
  includes(css, 'color: blue');
});

test('compiler extracts static merge helper with direct multi-styleFn chains', () => {
  const sx = createStyleFn({
    style: null as any,
    selectors: {
      hover: selector(':hover'),
    },
    transform: {
      transform(style: Record<string, unknown>) {
        const result = { ...style };
        if (result.row === true) {
          delete result.row;
          result.display = 'flex';
          result.flexDirection = 'row';
        }
        return result;
      },
    },
  }).style;

  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
    importSources: [{
      source: './sx-*',
      name: 'sx',
      styleFn: sx,
    }],
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';
import { sx } from './sx-style';

const button = style.merge(
  style.slot({ color: 'black' }),
  sx({ row: true }),
  sx().hover({ color: 'blue' }),
);
`,
    '/tmp/compiler-static-merge-multi-stylefn.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  notIncludes(result.code, '.merge(');
  includes(result.code, 'createExtractedSlot');
  includes(css, 'color: black');
  includes(css, 'display: flex');
  includes(css, 'flex-direction: row');
  includes(css, ':hover');
  includes(css, 'color: blue');
});

test('compiler transforms dynamic tailwind scale refs before hoisting runtime variables', () => {
  const tw = createStyleFn({
    selectors: TailwindSelectors,
    transform: createTailwindStyleTransform(createDefaultedTailwindStyleConfig({
      theme: {
        colors: defaultTailwindColors,
      },
    })),
  }).style;
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
    importSources: [{
      source: './tw',
      name: 'tw',
      styleFn: tw,
    }],
  });
  const result = compiler.transform(
    `
import { tw } from './tw';

export function Button({ isDanger }: { isDanger: boolean }) {
  return (
    <button
      css={tw({
        px: '$4',
        bg: isDanger ? '$red.600' : '$blue.600',
      }).hover({
        bg: isDanger ? '$red.700' : '$blue.700',
      })}
    />
  );
}
`,
    '/tmp/compiler-tailwind-dynamic.tsx',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(css, 'padding-inline: 1rem');
  includes(css, 'background-color: var(--var-');
  includes(css, ':hover');
  includes(result.code, 'oklch(57.7% 0.245 27.325)');
  includes(result.code, 'oklch(54.6% 0.245 262.881)');
  includes(result.code, 'oklch(50.5% 0.213 27.518)');
  includes(result.code, 'oklch(48.8% 0.243 264.376)');
  notIncludes(result.code, 'transformExtractedValue');
  notIncludes(result.code, "from './tw'");
  notIncludes(result.code, '$red.600');
  notIncludes(result.code, '$blue.600');
  notIncludes(result.code, '$red.700');
  notIncludes(result.code, '$blue.700');
});

test('compiler leaves opaque tailwind runtime values on regular token binding path', () => {
  const tw = createStyleFn({
    selectors: TailwindSelectors,
    transform: createTailwindStyleTransform(createDefaultedTailwindStyleConfig({
      theme: {
        colors: defaultTailwindColors,
      },
    })),
  }).style;
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
    importSources: [{
      source: './tw',
      name: 'tw',
      styleFn: tw,
    }],
  });
  const result = compiler.transform(
    `
import { tw } from './tw';

export function Swatch({ swatch }) {
  return <span css={tw({ bg: swatch })} />;
}
`,
    '/tmp/compiler-tailwind-opaque-runtime.tsx',
  );

  if (!result) throw new Error('expected compiler transform result');

  includes(result.code, 'createExtractedToken');
  includes(result.code, 'withTokens');
  includes(result.code, '_fluenticToken(swatch)');
  includes(result.css.join('\n'), 'background-color: var(--var-');
  notIncludes(result.code, 'transformExtractedValue');
  notIncludes(result.code, "from './tw'");
  notIncludes(result.code, '$blue.600');
});

test('compiler importSources can match source by regexp', () => {
  const sx = createStyleFn({
    style: null as any,
    selectors: {},
    transform: {
      transform(style: Record<string, unknown>) {
        return style.row === true ? { display: 'flex', flexDirection: 'row' } : style;
      },
    },
  }).style;

  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
    importSources: [{
      source: /sx-style$/,
      name: 'sx',
      styleFn: sx,
    }],
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';
import { sx } from './sx-style';

const button = style.merge(
  style({ color: 'black' }),
  sx({ row: true }),
);
`,
    '/tmp/compiler-regexp-import-source.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(css, 'color: black');
  includes(css, 'display: flex');
  includes(css, 'flex-direction: row');
});

test('compiler extracts merged scope chains', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const styles = {
  label: style.slot({ color: 'black' }),
};

const interactiveScope = style.scope([
  styles.label({ color: 'blue' }),
]).hover([
  styles.label({ color: 'red' }),
]);

const mergedScope = style.scope().merge(interactiveScope);
`,
    '/tmp/compiler-merge-scope.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  notIncludes(result.code, '.merge(');
  includes(result.code, 'createExtractedScope');
  includes(css, 'color: blue');
  includes(css, ':hover');
  includes(css, 'color: red');
});

test('compiler extracts nested merged style chains', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const base = style({ borderColor: 'gray' })
  .hover({ color: 'blue' });

const pressed = style({ backgroundColor: 'white' })
  .merge(base)
  .active({ color: 'red' });

const leaf = style({ color: 'black' })
  .merge(pressed)
  .focusVisible({ outlineColor: 'purple' });
`,
    '/tmp/compiler-nested-merge-style.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  notIncludes(result.code, '.merge(');
  includes(css, 'color: black');
  includes(css, 'background-color: white');
  includes(css, 'border-color: gray');
  includes(css, ':hover');
  includes(css, 'color: blue');
  includes(css, ':active');
  includes(css, 'color: red');
  includes(css, ':focus-visible');
  includes(css, 'outline-color: purple');
});

test('compiler extracts cross-file merged style chains', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
  });

  const commonFilePath = testDir + 'fixtures/merge_common.ts';
  const commonResult = compiler.transform(readFileSync(commonFilePath, 'utf8'), commonFilePath);
  if (!commonResult) throw new Error('expected common merge compiler transform result');

  const result = compiler.transform(
    `
import { style } from '@fluentic/style';
import { sharedInteractive } from './fixtures/merge_common';

export const button = style({ color: '#0f172a' })
  .merge(sharedInteractive)
  .focusVisible({ outlineColor: '#7c3aed' });
`,
    fileURLToPath(new URL('./merge-entry.ts', import.meta.url)),
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  notIncludes(result.code, '.merge(');
  includes(result.code, 'createExtractedStyleMerge');
  includes(result.code, 'sharedInteractive');
  includes(css, 'color: #0f172a');
  includes(css, 'background-color: #ffffff');
  includes(css, 'border-color: #94a3b8');
  includes(css, ':hover');
  includes(css, 'color: #2563eb');
  includes(css, ':active');
  includes(css, 'color: #dc2626');
  includes(css, ':focus-visible');
  includes(css, 'outline-color: #7c3aed');
});

test('compiler trace cache invalidates when transitive imported values change', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'fluentic-style-trace-cache-'));
  const constantsPath = path.join(root, 'constants.ts');
  const sharedPath = path.join(root, 'shared.ts');
  const entryPath = path.join(root, 'entry.ts');

  writeFileSync(constantsPath, `export const sharedColor = 'red';\n`, 'utf8');
  writeFileSync(
    sharedPath,
    [
      `import { style } from '@fluentic/style';`,
      `import { sharedColor } from './constants';`,
      `export const shared = style.raw({ color: sharedColor });`,
    ].join('\n'),
    'utf8',
  );

  const code = [
    `import { style } from '@fluentic/style';`,
    `import { shared } from './shared';`,
    `export const rule = style({ ...shared, backgroundColor: 'white' });`,
  ].join('\n');

  const compiler = createPluginCompiler({
    dev: false,
    projectDir: root,
    cacheDir: path.join(root, '.cache'),
    runtimeMode: null,
    options: {
      css: {
        layer: false,
      },
    },
  });

  const first = compiler.compiler.compileExtract({
    code,
    filePath: entryPath,
    sourcemap: null,
  });
  if (!first) throw new Error('expected initial compiler transform result');
  includes(first.rules.map((rule) => rule.css).join('\n'), 'color: red');

  writeFileSync(constantsPath, `export const sharedColor = 'blue';\n`, 'utf8');
  const changedTime = new Date(Date.now() + 10_000);
  utimesSync(constantsPath, changedTime, changedTime);

  const second = compiler.compiler.compileExtract({
    code,
    filePath: entryPath,
    sourcemap: null,
  });
  if (!second) throw new Error('expected updated compiler transform result');

  const secondCss = second.rules.map((rule) => rule.css).join('\n');
  includes(secondCss, 'color: blue');
  notIncludes(secondCss, 'color: red');
});

test('compiler sorts parent-scoped rules after child base and before child selectors', () => {
  const compiler = createCompiler({
    css: { debugClassName: true },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const styles = {
  container: style.slot({ display: 'flex' }),
  label: style.slot({ color: 'black' }).hover({ color: 'green' }),
};

const scope = style.scope().hover([
  styles.label({ color: 'blue' }).hover({ color: 'red' }),
]);
`,
    '/tmp/compiler-scope-parent-selector-layer-priority.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');
  const parentHoverBaseIndex = css.indexOf('color: blue');
  const childBaseIndex = css.indexOf('color: black');
  const childHoverIndex = css.indexOf('color: red');

  equal(parentHoverBaseIndex !== -1, true);
  equal(childBaseIndex !== -1, true);
  equal(childHoverIndex !== -1, true);
  includes(css, ':where(.-');
  equal(childBaseIndex < parentHoverBaseIndex, true);
  equal(parentHoverBaseIndex < childHoverIndex, true);
});

test('compiler evaluates style.value helper as static value tuple', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const styles = {
  container: style.slot({
    display: style.value('flex', 1),
  }),
  hidden: style.slot({
    display: 'none',
  }),
};
`,
    '/tmp/compiler-priority-helper.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(result.code, 'createExtractedSlot');
  includes(css, 'display: none');
  includes(css, 'display: flex');
  equal(css.indexOf('display: none') < css.indexOf('display: flex'), true);
});

test('compiler includes value priority in extracted class hash', () => {
  const compiler = createCompiler({
    layer: false,
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const one = style({
  display: style.value('flex', 1),
});
const two = style({
  display: style.value('flex', 2),
});
`,
    '/tmp/compiler-value-priority-class-hash.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const classNames = getCssClassNames(result.css);

  equal(classNames.length, 2);
  notEqual(classNames[0], classNames[1]);
});

test('compiler extracts keyframes used as style value refs', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
  });
  const result = compiler.transform(
    `
import { createToken, style } from '@fluentic/style';
import { createKeyframes } from '@fluentic/style/css';

const enterTransform = createToken('translateY(8px)', 'enter-transform');
const enter = createKeyframes({
  from: {
    opacity: 0,
    transform: enterTransform,
  },
  to: {
    opacity: 1,
    transform: 'none',
  },
});

const panel = style({
  animationName: enter,
  animationDuration: '180ms',
});
`,
    '/tmp/compiler-keyframes.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(result.code, 'createExtractedStyle');
  includes(result.code, 'createExtractedToken("enter-transform-');
  includes(result.code, 'css: null');
  includes(css, '@keyframes');
  includes(css, 'from{');
  includes(css, 'to{');
  includes(css, 'keyframes-enter');
  includes(css, 'transform: var(--token-enter-transform-');
  includes(css, 'translateY(8px)');
  includes(css, 'animation-name');
});

test('compiler extracts style.keyframes with style function transform', () => {
  const custom = createStyleFn({
    style: null as any,
    selectors: {},
    transform: {
      transform(style: Record<string, unknown>) {
        const result = { ...style };
        if (result.tone === 'brand') {
          delete result.tone;
          result.color = 'blue';
        }
        return result;
      },
    },
  }).style;
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
    importSources: [{
      source: '@fluentic/style',
      name: 'style',
      styleFn: custom,
    }],
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const enter = style.keyframes({
  from: {
    tone: 'brand',
    opacity: 0,
  },
  to: {
    tone: 'brand',
    opacity: 1,
  },
});

const panel = style({
  animationName: enter,
  animationDuration: '180ms',
});
`,
    '/tmp/compiler-style-keyframes.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(result.code, 'createExtractedStyle');
  includes(result.code, 'css: null');
  includes(result.code, 'css: null');
  includes(css, '@keyframes');
  includes(css, 'from{');
  includes(css, 'to{');
  includes(css, 'color: blue;');
  notIncludes(css, 'tone');
  includes(css, 'animation-name');
});

test('compiler extracts font-face used as style value refs', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';
import { createFontFace, fontSrc } from '@fluentic/style/css';
import { MONA_FONT_URL } from './fixtures/font_constants';

const mona = createFontFace({
  src: fontSrc(MONA_FONT_URL, 'woff2'),
  fontWeight: 400,
  fontStyle: 'normal',
  fontDisplay: 'swap',
});

const panel = style({
  fontFamily: mona,
});
`,
    fileURLToPath(new URL('./compiler-font-face.ts', import.meta.url)),
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(result.code, 'createExtractedStyle');
  includes(result.code, 'key: "font-mona-');
  includes(result.code, 'css: null');
  includes(css, '@font-face');
  includes(css, 'font-mona-');
  includes(css, 'src: url("/fonts/Mona-Sans.woff2") format("woff2")');
  includes(css, 'font-weight: 400;');
  notIncludes(css, 'font-weight: 400px;');
  includes(css, 'font-family');
});

test('compiler rejects font-face src that cannot resolve to a static string', () => {
  const compiler = createCompiler({
    layer: false,
  });
  let error: unknown = null;

  try {
    compiler.transform(
      `
import { style } from '@fluentic/style';
import { createFontFace, fontSrc } from '@fluentic/style/css';
import fontUrl from './Mona-Sans.woff2';

const mona = createFontFace({
  src: fontSrc(fontUrl),
});

const panel = style({
  fontFamily: mona,
});
`,
      '/tmp/compiler-font-face-unresolved.ts',
    );
  } catch (err) {
    error = err;
  }

  assertCompileError(error, 'createFontFace descriptors must be statically analyzable');
  assertCompileError(error, 'fontSrc url must be statically analyzable');
});

test('compiler extracts additional at-rule value refs', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';
import {
  createCounterStyle,
  createFontPaletteValues,
  createPositionTry,
  createProperty,
} from '@fluentic/style/css';

const positionTry = createPositionTry({ insetArea: 'bottom', margin: '8px' });
const counterStyle = createCounterStyle({ system: 'cyclic', symbols: '"*"', suffix: '" "' });
const property = createProperty('--spin-angle', {
  syntax: '"<angle>"',
  inherits: false,
  initialValue: '0deg',
});
const palette = createFontPaletteValues({ fontFamily: 'system-ui', basePalette: 1 });

const one = style({
  positionTryFallbacks: positionTry,
  listStyleType: counterStyle,
  transitionProperty: property,
  fontPalette: palette,
});
`,
    '/tmp/compiler-at-rule-value-refs.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(result.code, 'createExtractedStyle');
  includes(result.code, 'css: null');
  includes(css, '@position-try');
  includes(css, 'inset-area: bottom;');
  includes(css, '@counter-style');
  includes(css, 'symbols: "*";');
  includes(css, '@property ---spin-angle-');
  includes(css, 'syntax: "<angle>";');
  includes(css, '@font-palette-values');
  includes(css, 'base-palette: 1;');
});

test('runtime builder preserves explicit zero value priority', () => {
  const prioritized = style({
    display: [0, 'flex'] as never,
  });

  const item = prioritized[BUILDER_STATE].items[0];
  if (Array.isArray(item)) throw new Error('expected runtime style item');

  equal(Array.isArray(item.value), true);
  equal((item.value as [string, number])[0], 'flex');
  equal((item.value as [string, number])[1], 0);
});

test('compiler includes media priority in extracted class hash', () => {
  const compiler = createCompiler({
    layer: false,
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const one = style({ margin: 0 }).media(1, '(max-width: 700px)', {
  color: 'red',
});
const two = style({ margin: 0 }).media(2, '(max-width: 700px)', {
  color: 'red',
});
`,
    '/tmp/compiler-media-priority-class-hash.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const classNames = getCssClassNames(result.css.filter((rule) => rule.includes('@media')));

  equal(classNames.length, 2);
  notEqual(classNames[0], classNames[1]);
});

test('compiler rejects invalid static selector args', () => {
  const compiler = createCompiler({ layer: false });
  let error: unknown = null;

  try {
    compiler.transform(
      `
import { style } from '@fluentic/style';

const rule = style({ color: 'red' }).select('.parent .child', { color: 'blue' });
`,
      '/tmp/compiler-invalid-selector.ts',
    );
  } catch (err: unknown) {
    error = err;
  }

  assertCompileError(error, 'Invalid selector\n\nstyle.select(".parent .child")');
  assertCompileError(error, 'Selector must target the current element only');
});

test('compiler rejects invalid custom selector definitions', () => {
  const custom = createStyleFn({
    style: null as any,
    selectors: {
      invalidState: selector('.parent .child'),
    },
  }).style;
  const compiler = createCompiler({
    layer: false,
    importSources: [{
      source: '@fluentic/style',
      name: 'style',
      styleFn: custom,
    }],
  });
  let error: unknown = null;

  try {
    compiler.transform(
      `
import { style } from '@fluentic/style';

const rule = style({ color: 'red' }).invalidState({ color: 'blue' });
`,
      '/tmp/compiler-invalid-selector-definition.ts',
    );
  } catch (err: unknown) {
    error = err;
  }

  assertCompileError(error, 'Invalid selector definition\n\nstyle.invalidState: ".parent .child"');
  assertCompileError(error, 'Selector must target the current element only');
});

test('compiler can skip build-time selector checks', () => {
  const compiler = createCompiler({ layer: false, checkSelector: false });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const rule = style({ color: 'red' }).select('.parent .child', { color: 'blue' });
`,
    '/tmp/compiler-skip-invalid-selector.ts',
  );

  if (!result) throw new Error('expected compiler transform result');
});

test('compiler force mode rejects unresolved selector args', () => {
  const compiler = createCompiler({ layer: false, checkSelector: 'force' });
  let error: unknown = null;

  try {
    compiler.transform(
      `
import { style } from '@fluentic/style';

export function makeRule(selector: string) {
  return style({ color: 'red' }).select(selector, { color: 'blue' });
}
`,
      '/tmp/compiler-force-unresolved-selector.ts',
    );
  } catch (err: unknown) {
    error = err;
  }

  assertCompileError(error, 'Invalid selector\n\nstyle.select(...)');
  assertCompileError(error, 'Selector argument must be statically analyzable');
});

test('compiler rejects media helper calls that cannot resolve to static values', () => {
  const compiler = createCompiler({ layer: false });
  let error: unknown = null;

  try {
    compiler.transform(
      `
import { style } from '@fluentic/style';

const Breakpoints = {
  min(value: number) {
    return \`(min-width: \${value}px)\`;
  },
};

const rule = style({ color: 'red' }).media(Breakpoints.min(500), {
  color: 'blue',
});
`,
      '/tmp/compiler-media-helper-call.ts',
    );
  } catch (err: unknown) {
    error = err;
  }

  assertCompileError(error, 'Invalid selector\n\nstyle.media(...)');
  assertCompileError(error, 'Selector argument must be statically analyzable');
});

test('compiler rejects invalid static at-rule selector args', () => {
  const compiler = createCompiler({ layer: false });
  let error: unknown = null;

  try {
    compiler.transform(
      `
import { style } from '@fluentic/style';

const rule = style({ color: 'red' }).media('{ color: blue }', { color: 'blue' });
`,
      '/tmp/compiler-invalid-media-selector.ts',
    );
  } catch (err: unknown) {
    error = err;
  }

  assertCompileError(error, 'Invalid selector\n\nstyle.media("{ color: blue }")');
  assertCompileError(error, 'Media query must not contain "{" or "}"');
});

test('compiler keeps nested StyleData chained methods inside at-rules', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const rule = style({ margin: 0 }).media('(max-width: 700px)', style({
  color: 'red',
}).hover({
  color: 'blue',
}));
`,
    '/tmp/compiler-nested-style-data-at-rule.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(css, '@media (max-width: 700px)');
  includes(css, 'color: red');
  includes(css, 'color: blue');
  includes(css, ':hover');
});

test('compiler extracts token values as css variables', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
  });
  const result = compiler.transform(
    `
import { createToken, style } from '@fluentic/style';

const token = createToken('blue');
const styles = {
  container: style.slot({
    backgroundColor: token,
  }),
};
`,
    '/tmp/compiler-token-variable.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(result.code, 'createExtractedSlot');
  includes(result.code, 'createExtractedToken');
  includes(result.code, '[1, "--var-');
  includes(result.code, 'createExtractedToken(');
  includes(css, 'background-color: var(--var-');
  includes(css, ', var(--token-');
  includes(css, ', blue)');
});

test('compiler parses createValues pipe and semicolon labels', () => {
  const compiler = createCompiler({
    layer: false,
  });
  const result = compiler.transform(
    `
import { createValues, style } from '@fluentic/style';

const color = createValues([
  '#ffffff | Surface',
  '#111827; Text',
]);
const space = createValues(Number, [
  '8 | sm',
  '12; md',
]);

export const box = style({
  backgroundColor: color('#ffffff | Surface'),
  color: color('#111827; Text'),
  padding: space('8 | sm'),
  margin: space('12; md'),
});
`,
    '/tmp/compiler-create-values-labels.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(css, ', #ffffff)');
  includes(css, ', #111827)');
  includes(css, ', 8)');
  includes(css, ', 12)');
  notIncludes(css, '| Surface');
  notIncludes(css, '; Text');
  notIncludes(css, '| sm');
  notIncludes(css, '; md');
});

test('compiler extracts traceable plain constants as literal css values', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';
import { palette, spacing } from './fixtures/shared';

const size = {
  buttonMinWidth: 112,
};

const button = style.slot({
  color: palette.accentHover,
  minWidth: size.buttonMinWidth,
  padding: \`\${spacing.md}px \${spacing.sm}px\`,
});
`,
    fileURLToPath(new URL('./constant-style-entry.ts', import.meta.url)),
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(css, 'color: #1d4ed8');
  includes(css, 'min-width: 112px');
  includes(css, 'padding: 12px 8px');
  notIncludes(css, 'var(--var-');
  notIncludes(result.code, '[1, "--var-');
});

test('compiler preserves scope token provider values', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
  });
  const result = compiler.transform(
    `
import { createToken, style } from '@fluentic/style';

const token = createToken('blue');
const styles = {
  container: style.slot({
    backgroundColor: token,
  }),
};
const scope = style.scope([
  token('red'),
  token('green'),
  styles.container({
    color: 'white',
  }),
]);
`,
    '/tmp/compiler-scope-token-provider.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  includes(result.code, 'createExtractedScope');
  includes(result.code, 'const scope = createExtractedScope');
  includes(result.code, "token('green')");
  notIncludes(result.code, "token('red')");
  notIncludes(result.code, 'withTokens');
  notIncludes(result.code, "createExtractedScope([token('red')");
});

test('compiler honors configured token variable prefix', () => {
  const compiler = createCompiler({
    layer: false,
    css: {
      debugClassName: true,
      localClassName: true,
      tokenNameFormat: 'custom-token[-(name)]-$hash',
    },
  });
  const result = compiler.transform(
    `
import { createToken, style } from '@fluentic/style';

const token = createToken('blue');
const styles = {
  container: style.slot({
    backgroundColor: token,
  }),
};
`,
    '/tmp/compiler-custom-token-prefix.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(result.code, '[1, "--custom-token-');
  includes(css, 'background-color: var(--custom-token-');
  includes(css, ', var(--custom-token-');
});

test('compiler uses property-local variables for token values', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true, localClassName: true },
  });
  const filePath = '/tmp/compiler-token-local-variable.ts';
  const result = compiler.transform(
    `
import { createToken, style } from '@fluentic/style';

const token = createToken('blue');
const styles = {
  container: style.slot({
    backgroundColor: token,
  }),
};
`,
    filePath,
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');
  const match = css.match(/background-color: var\((--var-[a-z0-9]+), var\(--token-[^,]+, blue\)/);

  if (!match) throw new Error('expected property-local token variable');

  includes(result.code, `[1, "${match[1]}", createExtractedToken(`);
});

test('compiler extracts static siblings when a style object has a dynamic value', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true, localClassName: true },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';
import bg from './bg.png';

const rule = style({
  backgroundColor: 'coral',
  backgroundImage: 'url(' + bg + ')',
});
`,
    '/tmp/compiler-dynamic-style-value.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(result.code, 'const rule = createExtractedStyle');
  includes(result.code, 'createExtractedStyle');
  includes(result.code, 'bg from');
  includes(result.code, "'url(' + bg + ')'");
  includes(result.code, '[1, "--var-');
  notIncludes(result.code, 'const _fluenticStyle');
  notIncludes(result.code, 'withTokens');
  notIncludes(result.code, 'createExtractedToken');
  includes(css, 'background-color: coral');
  includes(css, 'background-image: var(--var-');
});

test('compiler hoists inline dynamic extracted style with token binding', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true, localClassName: true },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

export function Card({ color }) {
  return style({
    color,
    backgroundColor: 'white',
  });
}
`,
    '/tmp/compiler-inline-dynamic-style.tsx',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(result.code, 'withTokens');
  includes(result.code, 'const _fluenticToken = createExtractedToken(');
  includes(result.code, 'const _fluenticStyle = createExtractedStyle(');
  includes(result.code, 'return withTokens(_fluenticStyle, [_fluenticToken(color)]);');
  notIncludes(result.code, '/tmp/compiler-inline-dynamic-style.tsx:runtime');
  includes(css, 'color: var(--var-');
  includes(css, 'background-color: white');
});

test('compiler preserves merged extracted runtime values when hoisting after top-level deps', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true, localClassName: true },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const compact = !!window.compact;
const density = compact ? 8 : 12;
const dynamicStyle = style({
  gap: density,
  padding: density * 2,
});

export function Card({ color }) {
  return style({
    color,
    backgroundColor: 'white',
  }).merge(dynamicStyle);
}
`,
    '/tmp/compiler-hoisted-merged-runtime-values.tsx',
  );

  if (!result) throw new Error('expected compiler transform result');

  const dynamicStyleIndex = result.code.indexOf('const dynamicStyle = createExtractedStyle');
  const mergedStyleIndex = result.code.indexOf('const _fluenticStyle');

  notIncludes(result.code, '[object Object]');
  includes(result.code, '[1, "--var-');
  includes(result.code, 'density, 1]');
  includes(result.code, 'density * 2, 1]');
  includes(result.code, 'withTokens(_fluenticStyle');
  includes(result.code, '_fluenticToken(color)');

  if (dynamicStyleIndex === -1 || mergedStyleIndex === -1 || dynamicStyleIndex > mergedStyleIndex) {
    throw new Error('expected merged hoist after dynamicStyle dependency');
  }
});

test('compiler hoists inline dynamic extracted slot with token binding', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true, localClassName: true },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

export function useSlot(color) {
  return style.slot({
    color,
    backgroundColor: 'white',
  });
}
`,
    '/tmp/compiler-inline-dynamic-slot.tsx',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(result.code, 'withTokens');
  includes(result.code, 'const _fluenticToken = createExtractedToken(');
  includes(result.code, 'const _fluenticStyle = createExtractedSlot(');
  includes(result.code, 'return withTokens(_fluenticStyle, [_fluenticToken(color)]);');
  includes(css, 'color: var(--var-');
  includes(css, 'background-color: white');
});

test('compiler hoists scope token providers and dynamic scope values with token bindings', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true, localClassName: true },
  });
  const result = compiler.transform(
    `
import { createToken, style } from '@fluentic/style';

const accent = createToken('blue');
const styles = {
  root: style.slot({
    backgroundColor: accent,
  }),
};

export function Card({ color }) {
  return style.scope([
    accent('green'),
    styles.root({
      color,
    }),
  ]);
}
`,
    '/tmp/compiler-scope-hoist-token-bindings.tsx',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(result.code, 'createExtractedScope');
  includes(result.code, 'createExtractedToken');
  includes(result.code, 'withTokens');
  includes(result.code, "accent('green')");
  includes(result.code, '_fluenticToken(color)');
  includes(result.code, '[1, "--var-');
  notIncludes(result.code, 'return style.scope');
  includes(css, 'color: var(--var-');
});

test('compiler can disable extracted style hoisting', () => {
  const compiler = createCompiler({
    hoist: false,
    layer: false,
    css: { debugClassName: true, localClassName: true },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

export function Card({ color }) {
  return style({
    color,
    backgroundColor: 'white',
  });
}
`,
    '/tmp/compiler-inline-dynamic-style-no-hoist.tsx',
  );

  if (!result) throw new Error('expected compiler transform result');

  includes(result.code, 'return createExtractedStyle(');
  notIncludes(result.code, 'withTokens');
  notIncludes(result.code, 'const _fluenticStyle');
});

test('compiler extracts spread style.raw and style.plain objects', () => {
  const compiler = createCompiler({ layer: false });
  const result = compiler.transform(
    `
import { style, createToken } from '@fluentic/style';

const color = createToken('blue');
const base = style.raw({
  display: 'flex',
  backgroundColor: color,
});
const layout = style.plain({
  gap: 12,
  minHeight: '100vh',
});

export const styles = {
  container: style.slot({
    ...base,
    ...layout,
    color: 'red',
  }),
};
`,
    '/tmp/compiler-raw-plain-spread.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(result.code, 'createExtractedSlot');
  includes(css, 'display: flex');
  includes(css, 'background-color: var(--var-');
  includes(css, 'gap: 12px');
  includes(css, 'min-height: 100vh');
  includes(css, 'color: red');
  notIncludes(result.code, 'style.raw');
  notIncludes(result.code, 'style.plain');
  notIncludes(result.code, ' style ');
});

test('compiler extracts imported style.raw and style.plain objects', () => {
  const compiler = createCompiler({ layer: false });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';
import { importedPlainBase, importedRawBase } from './fixtures/raw_plain';

export const styles = {
  container: style.slot({
    ...importedRawBase,
    ...importedPlainBase,
    color: 'red',
  }),
};
`,
    fileURLToPath(new URL('./raw-plain-entry.ts', import.meta.url)),
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(css, 'background-color: #f8fafc');
  includes(css, 'padding: 12px');
  includes(css, 'display: flex');
  includes(css, 'gap: 8px');
  includes(css, 'color: red');
});

test('scope parent selectors use configured target prefix in production mode', () => {
  const scopeTargetPrefix = 'scope-';
  const compiler = createCompiler({
    layer: false,
    css: {
      debugClassName: false,
      scopeTargetPrefix,
    },
  });

  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const styles = {
  container: style.slot({ color: 'black' }),
};

const scope = style.scope().hover([
  styles.container({ color: 'red' }),
]);
`,
    '/tmp/compiler-scope-parent-selector-prod.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\\n');

  includes(css, '.' + scopeTargetPrefix);
  notIncludes(css, '~');
});

test('compiler resolves cross-file constants slots and scoped overrides', () => {
  const slotsFilePath = testDir + 'fixtures/slots.ts';
  const slotsCode = readFileSync(slotsFilePath, 'utf8');
  const slotsResult = createCompiler({ layer: false, css: { classNamePrefix: 't' } }).transform(
    slotsCode,
    slotsFilePath,
  );
  if (!slotsResult) throw new Error('expected slots compiler transform result');

  const importedSlotIds = getCallStringArgs(slotsResult.code, 'createExtractedSlot');

  const filePath = testDir + 'fixtures/component.ts';
  const code = readFileSync(filePath, 'utf8');
  const compiler = createCompiler({ css: { classNamePrefix: 't' } });
  const result = compiler.transform(code, filePath);

  if (!result) throw new Error('expected compiler transform result');

  includes(result.code, 'createExtractedStyle');
  includes(result.code, 'createExtractedSlot');
  includes(result.code, 'createExtractedScope');
  includes(result.code, 'compactScope');
  includes(result.code, 'objectScope');
  includes(result.code, `[4, "${importedSlotIds[0]}",`);
  includes(result.code, `[4, "${importedSlotIds[1]}",`);

  const css = result.css.join('\n');

  includes(css, '.');
  includes(css, '@media (max-width: 700px)');
  includes(css, '@media (max-width: 600px)');
  includes(css, 'color: #111827');
  includes(css, 'color: #2563eb');
  includes(css, 'color: #1d4ed8');
  includes(css, 'display: block');
});

test('compiler wraps extracted css in layers by default', () => {
  const compiler = createCompiler();
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const rule = style({ color: 'red' });
`,
    '/tmp/compiler-layer-default.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(css, '@layer css;');
  includes(css, '@layer css {');
  notIncludes(css, '@layer css.');
  equal(countOccurrences(css, '@layer css {'), 1);
  includes(css, 'color: red');
});

test('compiler preserves side effect imports during extraction', () => {
  const compiler = createCompiler({
    layer: false,
  });
  const result = compiler.transform(
    `
import './global.css';
import { style } from '@fluentic/style';

const rule = style({ color: 'red' });
`,
    '/tmp/compiler-side-effect-import.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  includes(result.code, "import './global.css';");
  includes(result.css.join('\n'), 'color: red');
});

test('plugin filter include can opt node_modules packages into transform', () => {
  const code = `
import { style } from '@fluentic/style';

const rule = style({ color: 'red' });
`;
  const nodeModuleId = '/tmp/project/node_modules/@acme/ui/button.tsx';

  equal(createTransformFilter()(nodeModuleId), false);

  const filter = createTransformFilter({
    include: ['**/node_modules/@acme/ui/**/*.{ts,tsx}'],
  });

  equal(filter(nodeModuleId), true);
  equal(filter('/tmp/project/node_modules/@acme/ui/nested/card.ts'), true);
  equal(filter('/tmp/project/node_modules/@acme/ui/nested/card.js'), false);

  const included = createCompiler({
    layer: false,
  }).transform(code, nodeModuleId);

  if (!included) throw new Error('expected explicit include to transform node_modules package');

  includes(included.css.join('\n'), 'color: red');

  const excludedFilter = createTransformFilter({
    include: ['**/node_modules/@acme/ui/**/*.{ts,tsx}'],
    exclude: ['**/node_modules/@acme/ui/button.tsx'],
  });

  equal(excludedFilter(nodeModuleId), false);
  equal(excludedFilter('/tmp/project/node_modules/@acme/ui/card.tsx'), true);
});

test('vite plugin leaves style calls for runtime css mode', async () => {
  const plugin = viteStylePlugin({ extract: false } as any) as any;
  plugin.configResolved({ command: 'serve', root: '/tmp' });
  const source =
    `import { style } from '@fluentic/style';\nexport const styles = { root: style.slot({ color: 'red' }) };`;
  const result = await plugin.transform.call({}, source, '/tmp/runtime-mode.ts');

  equal(typeof result?.code, 'string');
  notIncludes(result.code, 'virtual:fluentic-style');
  includes(result.code, 'style.slot');
  notIncludes(result.code, 'createExtractedSlot');
  equal(Array.isArray(result.map?.sources), true);
});

test('vite plugin extracts style calls for extracted css mode', async () => {
  const plugin = viteStylePlugin({ extract: true } as any) as any;
  plugin.configResolved({ command: 'build', root: '/tmp' });
  const source =
    `import { style } from '@fluentic/style';\nexport const styles = { root: style.slot({ color: 'red' }) };`;
  const result = await plugin.transform.call({}, source, '/tmp/extracted-mode.ts');

  equal(typeof result?.code, 'string');
  includes(result.code, 'createExtractedSlot');
});

test('vite plugin imports runtime once from html entry', () => {
  const plugin = viteStylePlugin() as any;
  const tags = plugin.transformIndexHtml.handler();

  equal(plugin.transformIndexHtml.order, 'pre');
  equal(tags.length, 1);
  equal(tags[0].tag, 'script');
  equal(tags[0].attrs.type, 'module');
  equal(tags[0].children, 'import "virtual:fluentic-style";');
  equal(tags[0].injectTo, 'head-prepend');
});

test('plugin cssOutput transforms final css with lightningcss', async () => {
  const css = '.x{user-select: none}';

  const prefixed = await transformCssOutput(
    css,
    { targets: { safari: 8 << 16 } },
    'test.css',
  );

  includes(prefixed, '-webkit-user-select: none');
  includes(prefixed, 'user-select: none');

  const unprefixed = await transformCssOutput(
    css,
    { targets: { safari: 8 << 16 }, vendorPrefixes: false },
    'test.css',
  );

  notIncludes(unprefixed, '-webkit-user-select');
  includes(unprefixed, 'user-select: none');
});

test('next dev css link is appended after layout children', () => {
  const result = injectDevCssLink(
    `
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
      <StyleDev />
    </html>
  );
}
`,
    'http://127.0.0.1:4180/__fluentic/dev.css',
  );

  before(result, '<StyleDev />', 'data-fluentic-style-rsc-dev-link');
});

test('next dev loader uses rsc debug payload transport', async () => {
  let extractCalls = 0;
  let debugRscCalls = 0;
  const compilerId = 'next-dev-client-test';

  nextRegistry.setEntry(compilerId, {
    compiler: {
      compileExtract(args: { code: string; filePath: string; sourcemap: unknown; }) {
        extractCalls++;
        equal(args.filePath, '/tmp/project/app/client.tsx');

        return {
          code: 'export const ok = true;',
          rules: [{ key: 'test', css: '.test{}' }],
          sourcemap: null,
        };
      },
      compileDebugRSC() {
        debugRscCalls++;

        return {
          code: 'export const ok = true;',
          css: '.test{}',
          rules: [{ key: 'test', css: '.test{}' }],
          sourcemap: null,
        };
      },
    },
    configHash: 'hash',
    cssCache: {
      setFileCss() {},
    },
    cssEntryImportPath: '@fluentic/style/plugin/nextjs/bundle.css',
    dev: true,
    devCssHref: null,
    filter: () => true,
    isServer: false,
  });

  const result = await new Promise<{ code: string; map: unknown; }>((resolve, reject) => {
    const context = {
      async() {
        return (err: Error | null, code: string, map: unknown) => {
          if (err) reject(err);
          else resolve({ code, map });
        };
      },
      getOptions() {
        return { compilerId };
      },
      resourcePath: '/tmp/project/app/client.tsx',
      rootContext: '/tmp/project',
    };

    nextLoader.call(context as any, 'import { style } from "@fluentic/style";', null as any);
  });

  equal(extractCalls, 0);
  equal(debugRscCalls, 1);
  includes(result.code, 'export const ok = true;');
});

test('next dev loader keeps precollect css from the server graph', async () => {
  const writes: Array<{ filePath: string; rules: Array<{ className: string; css: string; }>; }> = [];

  async function runNextDevLoader(args: { compilerId: string; isServer: boolean; }) {
    nextRegistry.setEntry(args.compilerId, {
      compiler: {
        compileExtract() {
          throw new Error('dev loader should not use extracted mode');
        },
        compileDebugRSC() {
          return {
            code: 'export const ok = true;',
            css: args.isServer ? '.server{}' : '.client{}',
            rules: [{
              className: args.isServer ? 'server' : 'client',
              css: args.isServer ? '.server{}' : '.client{}',
            }],
            sourcemap: null,
          };
        },
      },
      configHash: 'hash',
      cssCache: {
        setFileCss(item: { filePath: string; rules: Array<{ className: string; css: string; }>; }) {
          writes.push({
            filePath: item.filePath,
            rules: item.rules,
          });
        },
      },
      cssEntryImportPath: '@fluentic/style/plugin/nextjs/bundle.css',
      dev: true,
      devCssHref: null,
      filter: () => true,
      isServer: args.isServer,
    });

    await new Promise<{ code: string; map: unknown; }>((resolve, reject) => {
      const context = {
        async() {
          return (err: Error | null, code: string, map: unknown) => {
            if (err) reject(err);
            else resolve({ code, map });
          };
        },
        getOptions() {
          return { compilerId: args.compilerId };
        },
        resourcePath: '/tmp/project/app/page.tsx',
        rootContext: '/tmp/project',
      };

      nextLoader.call(context as any, 'import { style } from "@fluentic/style";', null as any);
    });
  }

  await runNextDevLoader({ compilerId: 'next-dev-server-precollect-test', isServer: true });
  await runNextDevLoader({ compilerId: 'next-dev-client-precollect-test', isServer: false });

  equal(writes.length, 1);
  equal(writes[0]?.rules[0]?.className, 'server');
});

test('next turbopack dev loader uses rsc runtime for explicit getClassName calls', async () => {
  const compilerId = 'nextjs:turbopack-explicit-get-class-name-test';

  nextRegistry.setEntry(compilerId, {
    compiler: {
      compileExtract() {
        throw new Error('dev loader should not use extracted mode');
      },
      compileDebugRSC() {
        return {
          code: 'import { getClassName } from "@fluentic/style/entry/rsc-dev";\nexport const ok = getClassName;',
          css: '',
          rules: [],
          sourcemap: null,
        };
      },
    },
    configHash: 'hash',
    cssCache: null,
    cssEntryImportPath: '@fluentic/style/plugin/nextjs/bundle.css',
    dev: true,
    devCssHref: null,
    filter: () => true,
    isServer: false,
  });

  const result = await new Promise<{ code: string; map: unknown; }>((resolve, reject) => {
    const context = {
      async() {
        return (err: Error | null, code: string, map: unknown) => {
          if (err) reject(err);
          else resolve({ code, map });
        };
      },
      getOptions() {
        return {
          compilerId,
          isServer: false,
        };
      },
      resourcePath: '/tmp/project/lib/Chrome.tsx',
      rootContext: '/tmp/project',
    };

    nextLoader.call(context as any, 'import { getClassName } from "@fluentic/style";', null as any);
  });

  includes(result.code, 'from "@fluentic/style/entry/rsc-dev"');
  notIncludes(result.code, 'from "@fluentic/style/entry/dev"');
});

test('webpack plugin prepends runtime to existing entries', () => {
  const runtime = '/tmp/fluentic-style/webpack-runtime.js';

  deepEqual(
    prependWebpackRuntimeEntry({
      app: { import: ['/tmp/app/src/main.tsx'] },
      admin: { import: ['/tmp/app/src/admin.tsx'] },
    }, runtime),
    {
      app: { import: [runtime, '/tmp/app/src/main.tsx'] },
      admin: { import: [runtime, '/tmp/app/src/admin.tsx'] },
    },
  );
  deepEqual(
    prependWebpackRuntimeEntry({
      app: { import: [runtime, '/tmp/app/src/main.tsx'] },
    }, runtime),
    {
      app: { import: [runtime, '/tmp/app/src/main.tsx'] },
    },
  );
});

test('webpack runtime module can publish rspack sidecar url', () => {
  const source = createWebpackRuntimeModuleSource(false, null, {
    runtimeImportPath: '@fluentic/style/entry/dev',
    sidecarUrl: 'http://127.0.0.1:4321',
  });

  includes(source, `import "@fluentic/style/entry/dev";`);
  includes(source, `globalThis[Symbol.for("FLUENTIC_STYLE_SIDECAR_URL")] = "http://127.0.0.1:4321";`);
});

test('plugin compiler rewrites root runtime imports but preserves plugin jsx runtime imports', () => {
  const compiler = createPluginCompiler({
    dev: true,
    projectDir: testDir,
    cacheDir: testDir + '.test-cache',
    options: {},
    runtimeMode: CompilerRuntimeMode.Dev,
  });

  const result = compiler.transform(
    [
      'import { style } from "@fluentic/style";',
      'import { jsx } from "@fluentic/style/plugin/jsx/jsx-runtime";',
      'export const value = jsx("div", { css: style({ color: "red" }) });',
    ].join('\n'),
    '/project/src/App.tsx',
  );

  if (!result) throw new Error('expected transform result');

  includes(result.code, '@fluentic/style/entry/dev');
  includes(result.code, '@fluentic/style/plugin/jsx/jsx-runtime');
  notIncludes(result.code, 'from "@fluentic/style"');
  notIncludes(result.code, '@fluentic/style/entry/dev/jsx-runtime');
});

test('plugin compiler rewrites rsc dev helper imports through runtime mode', () => {
  const compiler = createPluginCompiler({
    dev: true,
    projectDir: testDir,
    cacheDir: testDir + '.test-cache',
    options: {},
    runtimeMode: CompilerRuntimeMode.RscDev,
  });

  const result = compiler.transform(
    [
      'import { StyleDev } from "@fluentic/style/dev/rsc";',
      'export { StyleDev as FluenticStyleDev } from "@fluentic/style/dev/rsc";',
      'export const value = StyleDev;',
    ].join('\n'),
    '/project/src/App.tsx',
  );

  if (!result) throw new Error('expected transform result');

  includes(result.code, 'from "@fluentic/style/entry/rsc-dev/dev"');
  notIncludes(result.code, '@fluentic/style/dev/rsc');
});

test('plugin compiler rewrites rsc prod extracted runtime imports', () => {
  const compiler = createPluginCompiler({
    dev: false,
    projectDir: testDir,
    cacheDir: testDir + '.test-cache',
    options: {},
    runtimeMode: CompilerRuntimeMode.RscProd,
  });

  const result = compiler.transform(
    `
import { combineStyle, getClassName, style } from "@fluentic/style";

const styles = {
  card: style.slot({ color: "red" }),
};

export function render() {
  const css = combineStyle(styles);
  return getClassName(css.card);
}
`,
    '/project/src/rsc-prod.tsx',
  );

  if (!result) throw new Error('expected transform result');

  includes(result.code, 'from "@fluentic/style/entry/rsc-prod/runtime"');
  includes(result.code, 'getClassName(css.card)');
  notIncludes(result.code, 'from "@fluentic/style/entry/prod/runtime"');
});

test('webpack loader rewrites dev style imports to the dev runtime', async () => {
  const compilerId = 'test-webpack-dev-runtime';

  webpackRegistry.setEntry(compilerId, {
    transform() {
      return {
        code: [
          'import { style } from "@fluentic/style/entry/dev";',
          'import { jsx } from "@fluentic/style/plugin/jsx/jsx-runtime";',
          'export const value = jsx("div", { css: style({ color: "red" }) });',
        ].join('\n'),
        map: null,
        rules: [],
      };
    },
  });

  const result = await new Promise<{ code: string; map: unknown; }>((resolve, reject) => {
    webpackLoader.call(
      {
        async() {
          return (err: Error | null, code?: string, map?: unknown) => {
            if (err) {
              reject(err);
              return;
            }

            resolve({ code: code ?? '', map });
          };
        },
        getOptions() {
          return { compilerId };
        },
        resourcePath: '/project/src/App.tsx',
        rootContext: '/project',
      } as never,
      'export {};',
      undefined,
    );
  });

  includes(result.code, '@fluentic/style/entry/dev');
  includes(result.code, '@fluentic/style/plugin/jsx/jsx-runtime');
  notIncludes(result.code, 'from "@fluentic/style"');
  notIncludes(result.code, '@fluentic/style/entry/dev/jsx-runtime');
});

test('cache file writes preserve timestamp when content is unchanged', () => {
  const cacheDir = mkdtempSync(path.join(tmpdir(), 'fluentic-style-cache-'));
  const filePath = writeCacheFile(cacheDir, 'runtime.js', 'export {};');
  const timestamp = new Date('2024-01-01T00:00:00.000Z');

  utimesSync(filePath, timestamp, timestamp);
  writeCacheFile(cacheDir, 'runtime.js', 'export {};');

  equal(statSync(filePath).mtimeMs, timestamp.getTime());
});

test('compiler can disable extracted css layer wrapping', () => {
  const compiler = createCompiler({ layer: false });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const rule = style({ color: 'red' });
`,
    '/tmp/compiler-layer-disabled.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  notIncludes(css, '@layer');
  includes(css, 'color: red');
});

test('compiler uses custom extracted css layer config', () => {
  const compiler = createCompiler({
    css: {
      layers: ['reset', '$layer', 'overrides'],
      layerNamespace: 'app',
    },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const rule = style({ color: 'red' });
`,
    '/tmp/compiler-layer-custom.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(css, '@layer reset, app, overrides;');
  includes(css, ', overrides;');
  includes(css, '@layer app {');
  notIncludes(css, '@layer app.');
  equal(countOccurrences(css, '@layer app {'), 1);
});

test('compiler extracts style imports from root entry', () => {
  const compiler = createCompiler({ layer: false });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const rule = style.slot({ display: 'grid', gap: 16 });
`,
    '/tmp/compiler-root-entry.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(css, 'display: grid');
  includes(css, 'gap: 16px');
  includes(result.code, 'createExtractedSlot');
});

test('compiler extracts explicit getClassName calls for next link props', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
  });
  const result = compiler.transform(
    `
import { combineStyle, style } from '@fluentic/style';
import { getClassName } from '@fluentic/style';
import Link from 'next/link';

const page = {
  nav: style.slot({ display: 'flex' }),
  link: style.slot({ color: 'black', textDecoration: 'none' }).hover({ color: 'teal' }),
};

export function Chrome() {
  const css = combineStyle(page);

  return (
    <nav css={css.nav}>
      <Link href="/" {...getClassName(css.link)}>Home</Link>
    </nav>
  );
}
`,
    '/tmp/compiler-next-link-get-class-name.tsx',
  );

  if (!result) throw new Error('expected compiler transform result');

  includes(result.code, 'from "@fluentic/style/entry/prod/runtime"');
  includes(result.code, 'getClassName(css.link)');
  includes(result.css.join('\n'), 'text-decoration: none');
  includes(result.css.join('\n'), ':hover');
});

test('compiler keeps bindScope on prod runtime import', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
  });
  const result = compiler.transform(
    `
import { bindScope, combineStyle, style } from '@fluentic/style';

const cardStyles = {
  card: style.slot({ padding: 16 }),
  label: style.slot({ color: 'black' }),
};

export function Card(props) {
  const css = combineStyle(
    cardStyles,
    bindScope(cardStyles.card, props.theme),
  );

  return <article css={css.card}><p css={css.label}>Label</p></article>;
}
`,
    '/tmp/compiler-bind-scope-runtime.tsx',
  );

  if (!result) throw new Error('expected compiler transform result');

  includes(result.code, 'from "@fluentic/style/entry/prod/runtime"');
  includes(result.code, 'bindScope(cardStyles.card, props.theme)');
  includes(result.code, 'combineStyle(cardStyles');
  includes(result.css.join('\n'), 'padding: 16px');
});

test('compiler dedupes identical extracted style declarations', () => {
  const compiler = createCompiler({
    layer: false,
    css: { localClassName: true },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const one = style({ color: 'purple' });
const two = style({ color: 'purple' });
`,
    '/tmp/compiler-local-classname.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const classNames = result.css
    .map((rule) => rule.match(/^\.(.+?)\{/)?.[1])
    .filter((className) => typeof className === 'string');

  equal(classNames.length, 2);
  notEqual(classNames[0], classNames[1]);
});

test('compiler sorts extracted css by layer priority', () => {
  const compiler = createCompiler({ layer: false, css: { debugClassName: true } });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const rule = style({ marginTop: 2, margin: 1 }).hover({ color: 'red' }).media('(max-width: 600px)', { display: 'flex' });
`,
    '/tmp/compiler-layer-sort.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  before(css, '.margin-', '.margin-top-');
  before(css, '.margin-top-', '@media (max-width: 600px)');
  before(css, '@media (max-width: 600px)', '.color-hover-red');
});

test('layer priority keeps parent and media inside selector buckets', () => {
  const beforePriority = (low: LayerPriority, high: LayerPriority) => {
    equal(compareLayerPriority(low, high) < 0, true);
  };

  const base: LayerPriority = [0, 0, 0, 0, 0, 0, 0];
  const weightedBaseMedia: LayerPriority = [0, 0, 0, 4, 0, 0, 0];
  const parentSelector: LayerPriority = [0, 1, 8, 4, 0, 0, 0];
  const directSelector: LayerPriority = [0, 2, 0, 0, 0, 0, 0];
  const directSelectorMedia: LayerPriority = [0, 2, 0, 4, 0, 0, 0];
  const parentDirectSelector: LayerPriority = [0, 2, 1, 0, 0, 0, 0];
  const priorityDirectSelector: LayerPriority = [0, 4, 0, 0, 0, 0, 0];
  const explicitValue: LayerPriority = [1, 0, 0, 0, 0, 0, 0];

  beforePriority(base, weightedBaseMedia);
  beforePriority(weightedBaseMedia, parentSelector);
  beforePriority(parentSelector, directSelector);
  beforePriority(directSelector, directSelectorMedia);
  beforePriority(directSelectorMedia, parentDirectSelector);
  beforePriority(parentDirectSelector, priorityDirectSelector);
  beforePriority(priorityDirectSelector, explicitValue);
});

test('compiler expands value, media, selector, and property priority layers', () => {
  const compiler = createCompiler({ layer: false, css: { debugClassName: true } });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const rule = style({ color: 'black' })
  .select('.is-open', { color: 'green' })
  .hover({ color: 'red' })
  .media('(max-width: 700px)', { color: 'blue' })
  .media(2, '(max-width: 600px)', { color: 'purple' })
  .media(2, '(max-width: 600px)', { color: [1, 'orange'] });

const equalWeight = style({ backgroundColor: [1, 'black'] })
  .media(2, '(max-width: 600px)', { backgroundColor: [1, 'purple'] })
  .hover({ backgroundColor: [1, 'red'] });
`,
    '/tmp/compiler-expanded-layer-priority.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  before(css, 'color: black', '@media (max-width: 700px)');
  before(css, '@media (max-width: 700px)', '@media (max-width: 600px)');
  before(css, 'color: purple', 'color: green');
  before(css, 'color: green', 'color: red');
  before(css, 'color: red', 'color: orange');
  before(css, 'color: purple', 'color: orange');
  before(css, 'background-color: black', 'background-color: purple');
  before(css, 'background-color: purple', 'background-color: red');
});

test('compiler sorts direct scope overrides after slot shorthand priority', () => {
  const compiler = createCompiler({ layer: false, css: { debugClassName: true } });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const styles = {
  button: style.slot({ background: 'black' }).hover({ backgroundColor: 'green' }),
};

const scope = style.scope([
  styles.button().hover({ background: '#ad5a2b' }),
]);
`,
    '/tmp/compiler-scope-origin-priority.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  before(css, 'background-color: green', 'background: #ad5a2b');
});

test('compiler extracts createTheme token overrides to an extracted theme', () => {
  const compiler = createCompiler({ layer: false, css: { themeNamePrefix: 'theme-' } });
  const result = compiler.transform(
    `
import { createTheme, createToken } from '@fluentic/style';

const color = createToken('blue');
export const dark = createTheme([color('red')], 'dark');
`,
    '/tmp/compiler-theme.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\\n');

  includes(result.code, 'createExtractedTheme');
  includes(css, '.theme-');
  includes(css, ':red');
  notIncludes(result.code, 'createTheme,');
});

test('compiler extracts createTheme from root import source', () => {
  const compiler = createCompiler({ layer: false, css: { themeNamePrefix: 'theme-' } });
  const result = compiler.transform(
    `
import { createTheme, createToken } from '@fluentic/style';

const color = createToken('blue');
export const dark = createTheme([color('red')], 'dark');
`,
    '/tmp/compiler-theme-root.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\\n');

  includes(result.code, 'createExtractedTheme');
  includes(css, '.theme-');
  includes(css, ':red');
  notIncludes(result.code, 'createTheme,');
});

test('compiler extracts createTheme with imported nested tokens and aliases', () => {
  const compiler = createCompiler({ layer: false });
  const result = compiler.transform(
    `
import { createTheme, style } from '@fluentic/style';
import { brand, tokens } from './fixtures/theme_tokens';

export const theme = createTheme([
  tokens.color.text('white'),
  tokens.color.bg(brand),
]);

export const styles = {
  root: style.slot({
    color: tokens.color.text,
    backgroundColor: tokens.color.bg,
  }),
};
`,
    fileURLToPath(new URL('./theme-entry.ts', import.meta.url)),
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\\n');

  includes(result.code, 'createExtractedTheme');
  includes(css, ':white');
  includes(css, 'var(--token-');
  includes(css, 'blue');

  const textVar = css.match(/color: var\(--var-[^,]+, var\(--token-([^,)]+)/)?.[1];
  const bgVar = css.match(/background-color: var\(--var-[^,]+, var\(--token-([^,)]+)/)?.[1];

  if (!textVar || !bgVar) {
    throw new Error(`expected imported token styles in ${css}`);
  }

  notEqual(textVar, bgVar);
  includes(css, '--token-' + textVar + ':white');
  includes(css, '--token-' + bgVar + ':var(--token-');
});

test('compiler extracts createTheme from named token proxy members', () => {
  const compiler = createCompiler({ layer: false, css: { themeNamePrefix: 'theme-' } });
  const result = compiler.transform(
    `
import { createTheme } from '@fluentic/style';
import { createNamedTokens } from '@fluentic/style/dialect';

export const Colors = createNamedTokens('app.color', {
  accent: '#2563eb',
  accentHover: '#1d4ed8',
});

export const Themes = {
  brand: createTheme([
    Colors.accent('#60a5fa'),
    Colors.accentHover('#2563eb'),
  ]),
};
`,
    '/tmp/compiler-named-token-theme.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\\n');

  includes(result.code, 'createExtractedTheme');
  includes(css, '.theme-');
  includes(css, '--token-app-color-accent-');
  includes(css, '--token-app-color-accentHover-');
  includes(css, ':#60a5fa');
  includes(css, ':#2563eb');
  notIncludes(result.code, 'createTheme,');
});

test('compiler extracts createTheme from named token proxy members with spread color scales', () => {
  const compiler = createCompiler({ layer: false, css: { themeNamePrefix: 'theme-' } });
  const result = compiler.transform(
    `
import { createTheme } from '@fluentic/style';
import { createNamedTokens } from '@fluentic/style/dialect';
import { defaultTailwindColors } from '@fluentic/style/presets/tailwind';

export const Colors = createNamedTokens('app.color', {
  ...defaultTailwindColors,
  accent: '#2563eb',
});

export const Themes = {
  brand: createTheme([
    Colors.accent('#60a5fa'),
    Colors.blue['600']('#2563eb'),
  ]),
};
`,
    testDir + '/compiler-named-token-theme-spread-scale.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\\n');

  includes(result.code, 'createExtractedTheme');
  includes(css, '.theme-');
  includes(css, '--token-app-color-accent-');
  includes(css, '--token-app-color-blue-600-');
  includes(css, ':#60a5fa');
  includes(css, ':#2563eb');
  notIncludes(result.code, 'createTheme,');
});

test('compiler keeps token identity across separately extracted theme and style modules', () => {
  const compiler = createCompiler({ layer: false });
  const themeFile = fileURLToPath(new URL('./fixtures/theme_cross_themes.ts', import.meta.url));
  const stylesFile = fileURLToPath(new URL('./fixtures/theme_cross_styles.ts', import.meta.url));

  const themeResult = compiler.transform(readFileSync(themeFile, 'utf8'), themeFile);
  const stylesResult = compiler.transform(readFileSync(stylesFile, 'utf8'), stylesFile);

  if (!themeResult) throw new Error('expected theme compiler transform result');
  if (!stylesResult) throw new Error('expected styles compiler transform result');

  const css = stylesResult.css.join('\n');
  const themeTextVar = css.match(/(--token-[^:;{]+--color--text[^:;{]*):#0f172a/)?.[1];
  const themeSurfaceVar = css.match(/(--token-[^:;{]+--color--surface[^:;{]*):var\(--token-/)?.[1];
  const themeSpaceVar = css.match(/(--token-[^:;{]+--space--panel[^:;{]*):32/)?.[1];
  const styleTextVar = css.match(/color: var\(--var-[^,]+, var\((--token-[^,)]+)/)?.[1];
  const styleSurfaceVar = css.match(/background-color: var\(--var-[^,]+, var\((--token-[^,)]+)/)?.[1];
  const styleSpaceVar = css.match(/padding: var\(--var-[^,]+, var\((--token-[^,)]+)/)?.[1];

  if (!themeTextVar || !themeSurfaceVar || !themeSpaceVar) {
    throw new Error(`expected extracted theme token variables in ${css}`);
  }

  equal(styleTextVar, themeTextVar);
  equal(styleSurfaceVar, themeSurfaceVar);
  equal(styleSpaceVar, themeSpaceVar);
  notEqual(themeTextVar, themeSurfaceVar);
  notEqual(themeSurfaceVar, themeSpaceVar);
  includes(themeResult.code, 'createExtractedTheme');
  includes(stylesResult.code, 'createExtractedSlot');
});

test('compiler rejects createTheme values that are not token overrides', () => {
  const compiler = createCompiler({ layer: false });
  let error: unknown = null;

  try {
    compiler.transform(
      `
import { createTheme } from '@fluentic/style';

export const theme = createTheme(['red']);
`,
      '/tmp/compiler-theme-invalid.ts',
    );
  } catch (err: unknown) {
    error = err;
  }

  assertCompileError(error, 'must be a token override');
});

test('compiler default hashed class names do not need leading digit escapes', () => {
  const compiler = createCompiler({ layer: false });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const rule = style({ width: 18, display: 'flex', color: 'red' });
`,
    '/tmp/compiler-hash-leading-digit.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  notIncludes(css, '\\31');
  includes(css, '{width: 18px}');
  includes(css, '{display: flex}');
  includes(css, '{color: red}');
});

test('compiler debug extracted css keeps readable values and hash suffix', () => {
  const compiler = createCompiler({ layer: false, css: { debugClassName: true } });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const rule = style({
  width: 18,
  opacity: 0.5,
  color: 'red',
  backgroundImage: 'linear-gradient(red, blue)',
}).hover({
  color: 'blue',
  opacity: 0.25,
});
`,
    '/tmp/compiler-debug-css.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(css, 'width');
  includes(css, '{width: 18px}');
  includes(css, 'opacity');
  includes(css, '{opacity: 0.5}');
  includes(css, 'color-red');
  includes(css, '{color: red}');
  includes(css, 'background-image');
  includes(css, '{background-image: linear-gradient(red, blue)}');
  includes(css, 'color-hover-blue');
  includes(css, ':hover{color: blue}');
  includes(css, 'opacity-hover');
  includes(css, ':hover{opacity: 0.25}');
});

test('compiler debug classNameFormat applies property and value lengths independently', () => {
  const compiler = createCompiler({
    layer: false,
    css: {
      debugClassName: true,
      classNameFormat: '[(property:16!)][-(value:6)]-$hash',
    },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const rule = style({
  backgroundImage: 'none',
  color: 'rebeccapurple',
  width: 18,
});
`,
    '/tmp/compiler-debug-lengths.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(css, '.background-image-');
  includes(css, '.color-');
  includes(css, '.width-');
});

test('compiler debug classNameFormat keeps common keyword values with value length', () => {
  const compiler = createCompiler({
    layer: false,
    css: {
      debugClassName: true,
      classNameFormat: '[(property)][-(value:10)]-$hash',
    },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const rule = style({
  alignItems: 'center',
  boxSizing: 'border-box',
  cursor: 'pointer',
  display: 'flex',
  fontSize: '1.5rem',
  fontWeight: 820,
  justifyContent: 'center',
  overflow: 'hidden',
  pointerEvents: 'none',
  textTransform: 'uppercase',
});
`,
    '/tmp/compiler-debug-keyword-values.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(css, '.items-center-');
  includes(css, '.box-sizing-border-box-');
  includes(css, '.cursor-pointer-');
  includes(css, '.display-flex-');
  includes(css, '.font-820-');
  includes(css, '.font-size-');
  includes(css, '.justify-center-');
  includes(css, '.overflow-hidden-');
  includes(css, '.pointer-none-');
  includes(css, '.text-transform-uppercase-');
});
