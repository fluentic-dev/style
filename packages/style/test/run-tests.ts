import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getScopeParentClassName } from '../atomic/scope';
import { createScopeBuilder, createSlotBuilder, createStyleBuilder } from '../builder';
import {
  BUILDER_SLOT_ID,
  BUILDER_STATE,
  BUILDER_TYPE_SCOPE,
  type BuilderCallsite,
  type BuilderData,
  type DebugData,
  isSlotOverrideData,
  type SlotData,
  type StyleData,
} from '../builder/data';
import type { RuntimeItem, RuntimeScopeItem } from '../builder/data/state';
import { createExtractedScope, createExtractedSlot } from '../builder/extract';
import type { CompilerOptions } from '../compiler';
import { configureRuntime, RUNTIME_CONFIG } from '../config';
import { setBuildMeta } from '../config/build';
import { traceDevSourcemaps } from '../dev/trace';
import { enableDevUtils } from '../dev/utils';
import { createPluginCompiler, createTransformFilter } from '../plugin/utils';
import { normalizeSidecarRoutePath } from '../plugin/utils/sidecar/utils';
import { plugin as viteStylePlugin } from '../plugin/vite';
import { prependWebpackRuntimeEntry } from '../plugin/webpack/utils';
import { createCssInstancePool, createCssTheme, getCssInstanceScopes, resolveCssProp } from '../runtime';
import { collectDevCssRules } from '../runtime/dev';
import { transformElement } from '../runtime/core/jsx';
import { CSS_DEV_ATTR, CSS_DEV_STYLE_SEED_GLOBAL } from '../runtime/rsc/constants';
import { transformElement as transformRscElement } from '../runtime/rsc/jsx';
import { getRscDevSeedCss } from '../runtime/rsc/seed';
import { buildThemeRule, getGlobalSheet, setGlobalSheet } from '../runtime/sheet';
import { combineStyle, getClassName, getCss, getToken, bindScope } from '../runtime/style';
import { selector } from '../selector/selector';
import { createDevSheet, createProdSheet } from '../sheet';
import { getRuleCallsite } from '../sheet/sourcemap';
import { createTheme, createToken } from '../style';
import { traceCallsite } from '../utils/trace';

const tests: [name: string, fn: () => void | Promise<void>][] = [];
const testDir = fileURLToPath(new URL('.', import.meta.url));

type TestCompilerTransformResult = {
  code: string;
  map: string | null;
  css: string[];
};

type DebugTransformOptions = CompilerOptions & {
  rootDir?: string;
};

const selectors = {
  hover: selector(':hover'),
  nthChild: selector(':nth-child($)', 'value'),
};

type SelectorTable = typeof selectors;
type StyleApi = ReturnType<typeof createStyleBuilder<Record<string, unknown>, SelectorTable>>;
type SlotApi = ReturnType<typeof createSlotBuilder<Record<string, unknown>, SelectorTable>>;
type ScopeApi = ReturnType<typeof createScopeBuilder<Record<string, unknown>, SelectorTable>>;

const style = createStyleBuilder<Record<string, unknown>, SelectorTable>(
  selectors,
  null,
) as (StyleApi & { slot: SlotApi; scope: ScopeApi; });

style.slot = createSlotBuilder<Record<string, unknown>, typeof selectors>(selectors, null);
style.scope = createScopeBuilder<Record<string, unknown>, typeof selectors>(selectors);

const styles = {
  container: style.slot({
    color: 'red',
  }),
  label: style.slot({
    color: 'black',
  }),
};

const theme = style.scope([
  styles.container({
    color: 'blue',
  }),
  styles.label({
    color: 'white',
  }),
]);

const hoverTheme = style.scope().hover([
  styles.label({
    color: 'yellow',
  }),
]);

test('pool reuses equivalent scope paths', () => {
  const pool = createCssInstancePool();

  const first = pool.get(styles, [], [theme(styles.container)]).instance;
  const second = pool.get(styles, [], [theme(styles.container)]).instance;

  equal(first, second);
});

test('pool ttl zero drops retained instances on cleanup', () => {
  const pool = createCssInstancePool(0);
  const first = pool.get(styles, [], [theme(styles.container)]).instance;
  const second = pool.get(styles, [], [theme(styles.container)]).instance;

  equal(first, second);

  pool.cleanup();

  const third = pool.get(styles, [], [theme(styles.container)]).instance;

  notEqual(first, third);
});

test('static getCss reuses equivalent scope paths', () => {
  const first = getCss(styles, theme(styles.container));
  const second = getCss(styles, [theme(styles.container)]);

  equal(first, second);
});

test('static combineStyle.for reuses equivalent scope paths', () => {
  const combine = combineStyle.for(styles);

  const first = combine(theme(styles.container));
  const second = combine([theme(styles.container)]);

  equal(first, second);
});

test('static combineStyle.for carries combined instance scopes', () => {
  const combine = combineStyle.for(styles);
  const parent = combine(theme(styles.container));
  const child = combine(parent, hoverTheme(styles.container));

  equal((child.label as any).items.length, 3);
});

test('static combineStyle rejects carried instances from another styles object', () => {
  const combine = combineStyle.for(styles);
  const other = combineStyle({
    container: style.slot({
      color: 'green',
    }),
  });
  let didThrow = false;

  try {
    combine(other as any);
  } catch (error) {
    didThrow = error instanceof TypeError
      && /same styles object/.test(error.message);
  }

  equal(didThrow, true);
});

test('static getClassName resolves getCss and runtime instances the same way', () => {
  const pool = createCssInstancePool();
  const staticCss = getCss(styles, theme(styles.container));
  const runtimeCss = pool.get(styles, [], [theme(styles.container)]).instance;

  equal(
    getClassName(staticCss.container).className,
    getClassName(runtimeCss.container).className,
  );
});

test('static getClassName preserves props without css', () => {
  const result = getClassName(undefined, {
    className: ['one', false, ['two']],
    style: [{ color: 'red' }, null, { backgroundColor: 'blue' }],
  });

  equal(result.className, 'one two');
  deepEqual(result.style, {
    color: 'red',
    backgroundColor: 'blue',
  });
});

test('chained slot selectors stay callable as slot overrides', () => {
  const chainedSlot = style.slot({ color: 'red' }).hover({ color: 'pink' });
  const override = chainedSlot({ color: 'blue' });

  equal(typeof chainedSlot, 'function');
  equal(isSlotOverrideData(override), true);
});

test('disallow direct slot factory invocation without variable', () => {
  const compiler = createCompiler();
  const code = `
import { style } from '@fluentic/style';

const bad = style.slot({ color: 'blue' })();
`;

  let error: unknown = null;
  try {
    compiler.transform(code, '/tmp/disallow-slot-direct-call.ts');
  } catch (err: unknown) {
    error = err;
  }

  assertCompileError(error, 'Direct invocation `style.slot(...)()` is not allowed');
});

test('builder callables are trace-marked for runtime callsites', () => {
  configureRuntime({ trace: true });

  const tracedStyle = style({ color: 'purple' });
  const tracedStyleHover = style({ color: 'purple' }).hover({ color: 'violet' });
  const tracedSlot = style.slot({ color: 'purple' });
  const tracedOverride = tracedSlot({ color: 'violet' });

  configureRuntime({ trace: false });

  assertRunTestsCallsite(getRuntimeCallsite(tracedStyle));
  assertRunTestsCallsite(getRuntimeCallsite(tracedStyleHover, 1));
  assertRunTestsCallsite(getRuntimeCallsite(tracedSlot));
  assertRunTestsCallsite(getRuntimeCallsite(tracedOverride));
});

test('builder callables prefer injected debug callsites over runtime traces', () => {
  const debug: DebugData = {
    $$debug: true,
    loc: [10, 5],
    label: ['styles', 'styles.heading', 'styles.ts'],
    fields: {
      backgroundColor: [15, 7],
    },
    sourceUrl: '/src/styles.ts',
  };

  const OriginalError = globalThis.Error;
  let debugStyle: BuilderData | null = null;

  configureRuntime({ trace: true });
  globalThis.Error = function() {
    throw new OriginalError('runtime trace should not run for injected debug data');
  } as unknown as ErrorConstructor;

  try {
    debugStyle = createDebugStyle({ color: 'purple', backgroundColor: 'blue' }, debug);
  } finally {
    globalThis.Error = OriginalError;
    configureRuntime({ trace: false });
  }

  if (!debugStyle) throw new Error('expected debug style data');

  const styleCallsite = getRuntimeCallsite(debugStyle, 0);
  const fieldCallsite = getRuntimeCallsite(debugStyle, 1);

  equal(styleCallsite?.filePath, '/src/styles.ts');
  equal(styleCallsite?.line, 10);
  equal(fieldCallsite?.filePath, '/src/styles.ts');
  equal(fieldCallsite?.line, 15);
});

test('builder slot debug field callsites point at properties', () => {
  const debugSlot = createDebugSlot({ color: 'purple', backgroundColor: 'blue' }, {
    $$debug: true,
    loc: [10, 5],
    label: ['styles', 'styles.heading', 'styles.ts'],
    fields: {
      backgroundColor: [15, 7],
    },
    sourceUrl: '/src/styles.ts',
  });

  const fieldCallsite = getRuntimeCallsite(debugSlot, 1);

  equal(fieldCallsite?.filePath, '/src/styles.ts');
  equal(fieldCallsite?.line, 15);
  equal(fieldCallsite?.column, 7);
});

test('builder debug callsites use sourceUrl', () => {
  const debugStyle = createDebugStyle({ color: 'purple' }, {
    $$debug: true,
    loc: [10, 5],
    label: ['styles', 'styles.heading', 'styles.ts'],
    sourceUrl: 'http://127.0.0.1:4321/src/styles.ts',
  });

  equal(getRuntimeCallsite(debugStyle)?.sourceUrl, 'http://127.0.0.1:4321/src/styles.ts');
});

test('dev debug transform injects declaration and field callsites', () => {
  const file = '/src/page.tsx';
  const result = injectStyleDebugData(
    `
import { style } from '@fluentic/style';

const styles = {
  heading: style({ backgroundColor: 'blue' }),
};
`,
    file,
    {},
    'http://127.0.0.1:4321/src/page.tsx',
  );

  includes(result.code, `$$debug: true`);
  includes(result.code, `loc: [5, 12]`);
  includes(result.code, `"backgroundColor": [5, 20]`);
  includes(result.code, `const _styleDebugSourceUrl = "http://127.0.0.1:4321/src/page.tsx";`);
  includes(result.code, `sourceUrl: _styleDebugSourceUrl`);
});

test('dev debug transform treats static style.priority values as static', () => {
  const result = injectStyleDebugData(
    `
import { style } from '@fluentic/style';

const styles = {
  card: style({ padding: style.priority(18, 2) }),
};
`,
    '/src/page.tsx',
    {},
    undefined,
  );

  includes(result.code, `"padding": [5, 17]`);
  notIncludes(result.code, `"padding": "--token-`);
});

test('dev debug transform lets plugins customize sourcemap file path', () => {
  let seenRelativePath = '';
  let seenSourcePath = '';
  let seenSourceUrl = '';
  const file = '/repo/src/page.tsx';
  const result = injectStyleDebugData(
    `
import { style } from '@fluentic/style';

const rule = style({ color: 'red' });
`,
    file,
    {
      rootDir: '/repo',
      getSourcemapFilePath(info) {
        seenRelativePath = info.relativePath;
        seenSourcePath = info.sourcePath;
        seenSourceUrl = info.sourceUrl ?? '';
        return '/@bundler/' + info.sourcePath;
      },
    },
    'http://127.0.0.1:4321/src/page.tsx',
  );

  equal(seenRelativePath, 'src/page.tsx');
  equal(seenSourcePath, 'src/page.tsx');
  equal(seenSourceUrl, 'http://127.0.0.1:4321/src/page.tsx');
  includes(result.code, `const _styleDebugSourceUrl = "/@bundler/src/page.tsx";`);
  includes(result.code, `sourceUrl: _styleDebugSourceUrl`);
});

test('dev debug transform exposes protocol-ready source path', () => {
  let seenRelativePath = '';
  let seenSourcePath = '';
  const result = injectStyleDebugData(
    `
import { style } from '@fluentic/style';

const rule = style({ color: 'red' });
`,
    '/repo/src/page.tsx',
    {
      rootDir: '/repo/apps/demo',
      getSourcemapFilePath(info) {
        seenRelativePath = info.relativePath;
        seenSourcePath = info.sourcePath;
        return 'source://@' + info.sourcePath;
      },
    },
  );

  equal(seenRelativePath, '../../src/page.tsx');
  equal(seenSourcePath, 'src/page.tsx');
  includes(result.code, `const _styleDebugSourceUrl = "source://@src/page.tsx";`);
  includes(result.code, `sourceUrl: _styleDebugSourceUrl`);
  equal(normalizeSidecarRoutePath({ routePath: 'source://@src/page.tsx' }), '/@src/page.tsx');
});

test('dev debug transform embeds source content when enabled', () => {
  const code = `
import { style } from '@fluentic/style';

const rule = style({ color: 'red' });
`;
  const result = injectStyleDebugData(
    code,
    '/repo/src/page.tsx',
    {
      rootDir: '/repo',
      devSourcemap: 'sourceContent',
    },
    'webpack:///example/src/page.tsx',
  );

  includes(result.code, `sourceUrl: _styleDebugSourceUrl`);
  includes(
    result.code,
    `const _styleDebugSourceUrl = "webpack:///example/src/page.tsx",_styleDebugSourceContent = ${
      JSON.stringify(code)
    };`,
  );
  includes(result.code, `code: _styleDebugSourceContent`);
});

test('dev debug transform omits source content in sourceUrl mode', () => {
  const code = `
import { style } from '@fluentic/style';

const rule = style({ color: 'red' });
`;
  const result = injectStyleDebugData(
    code,
    '/repo/src/page.tsx',
    {
      rootDir: '/repo',
      devSourcemap: 'sourceUrl',
    },
    'webpack:///example/src/page.tsx',
  );

  includes(result.code, `const _styleDebugSourceUrl = "webpack:///example/src/page.tsx";`);
  includes(result.code, `sourceUrl: _styleDebugSourceUrl`);
  notIncludes(result.code, `code: ${JSON.stringify(code)}`);
});

test('runtime dev defaults enable local class name hashing', () => {
  configureRuntime({ dev: true });

  const first = createDebugStyle({ color: 'purple' }, {
    $$debug: true,
    loc: [1, 1],
    label: ['one', 'one', 'one.ts'],
    sourceUrl: '/src/one.ts',
  });
  const second = createDebugStyle({ color: 'purple' }, {
    $$debug: true,
    loc: [1, 1],
    label: ['two', 'two', 'two.ts'],
    sourceUrl: '/src/two.ts',
  });

  configureRuntime({ dev: false });

  notEqual(getRuntimeClassName(first), getRuntimeClassName(second));
});

test('runtime local class name can be disabled in dev', () => {
  configureRuntime({ dev: true, localClassName: false });

  const first = createDebugStyle({ color: 'purple' }, {
    $$debug: true,
    loc: [1, 1],
    label: ['one', 'one', 'one.ts'],
    sourceUrl: '/src/one.ts',
  });
  const second = createDebugStyle({ color: 'purple' }, {
    $$debug: true,
    loc: [1, 1],
    label: ['two', 'two', 'two.ts'],
    sourceUrl: '/src/two.ts',
  });

  configureRuntime({ dev: false });

  equal(getRuntimeClassName(first), getRuntimeClassName(second));
});

test('runtime local class name does not affect dedupe key', () => {
  configureRuntime({ dev: true });

  const first = createDebugStyle({ backgroundColor: 'red' }, {
    $$debug: true,
    loc: [1, 1],
    label: ['one', 'one', 'one.ts'],
    sourceUrl: '/src/one.ts',
  });
  const second = createDebugStyle({ backgroundColor: 'blue' }, {
    $$debug: true,
    loc: [2, 1],
    label: ['two', 'two', 'two.ts'],
    sourceUrl: '/src/two.ts',
  });

  configureRuntime({ dev: false });

  notEqual(getRuntimeClassName(first), getRuntimeClassName(second));
  equal(getRuntimeDedupe(first), getRuntimeDedupe(second));
});

test('runtime config resets scope target prefix to default when omitted', () => {
  configureRuntime({ scopeTargetPrefix: 'scope-' });
  equal(RUNTIME_CONFIG.scopeTargetPrefix, 'scope-');

  configureRuntime({ dev: false });
  equal(RUNTIME_CONFIG.scopeTargetPrefix, '-');
  equal(getScopeParentClassName('hover-bg'), '-hover-bg');
});

test('runtime config preserves layer placeholder for priority expansion', () => {
  configureRuntime({
    layers: ['reset', '$layer', 'overrides'],
    layerNamespace: 'app',
  });
  equal(RUNTIME_CONFIG.layers.join(','), 'reset,$layer,overrides');

  configureRuntime({ dev: false });
  equal(RUNTIME_CONFIG.layers.join(','), '$layer');
});

test('dev css payload dedupes by declaration identity without callsite', () => {
  configureRuntime({ dev: true });

  const first = createDebugStyle({ backgroundColor: 'red' }, {
    $$debug: true,
    loc: [1, 1],
    label: ['one', 'one', 'one.ts'],
    sourceUrl: '/src/one.ts',
  });
  const second = createDebugStyle({ backgroundColor: 'blue' }, {
    $$debug: true,
    loc: [2, 1],
    label: ['two', 'two', 'two.ts'],
    sourceUrl: '/src/two.ts',
  });

  configureRuntime({ dev: false });

  const css = getCss({ first, second });
  const rules = collectDevCssRules([css.first, css.second]);

  equal(rules.length, 1);
  includes(rules[0][1], 'background-color:blue');
  equal(rules[0][2]?.filePath, '/src/two.ts');
});

test('scope arg selectors merge items with normalized parent selector', () => {
  const scope = style.scope().nthChild('2n', [
    styles.label({
      color: 'orange',
    }),
  ]);

  const scopeItem = scope[BUILDER_STATE].items[0];
  if (!isRuntimeScopeItem(scopeItem)) {
    throw new Error('expected runtime scope item in scope result');
  }

  equal(scopeItem.parentSelector, ':nth-child(2n)');
});

test('scope parent selector classes are anchored on the target slot only', () => {
  const pool = createCssInstancePool();
  const scoped = pool.get(styles, [], [hoverTheme(styles.container)]).instance;
  const container = resolveCssProp(scoped.container);
  const label = resolveCssProp(scoped.label);
  const scopeItem = hoverTheme[BUILDER_STATE].items[0];

  if (!isRuntimeScopeItem(scopeItem)) {
    throw new Error('expected runtime scope item in scope result');
  }

  const parentClassName = getScopeParentClassName(scopeItem.className);
  const containerClasses = container.className.split(' ');
  const labelClasses = label.className.split(' ');

  equal(containerClasses.includes(parentClassName), true);
  equal(containerClasses.includes(scopeItem.className), false);
  equal(labelClasses.includes(scopeItem.className), true);
  equal(labelClasses.includes(parentClassName), false);
});

test('nested slot hover inside scope hover does not add child classes to target slot', () => {
  const nestedStyles = {
    card: style.slot({
      padding: 18,
    }),
    note: style.slot({
      color: 'black',
    }),
    button: style.slot({
      background: 'black',
    }).hover({
      background: 'red',
    }),
  };

  const hoverScope = style.scope().hover([
    nestedStyles.note({
      color: 'blue',
    }),
    nestedStyles.button({
      background: 'blue',
    }).hover({
      background: 'red',
    }),
  ]);

  const pool = createCssInstancePool();
  const scoped = pool.get(
    nestedStyles,
    [],
    bindScope(nestedStyles.card, hoverScope),
  ).instance;

  const card = resolveCssProp(scoped.card);
  const note = resolveCssProp(scoped.note);
  const button = resolveCssProp(scoped.button);
  const scopeItems = hoverScope[BUILDER_STATE].items;

  const noteScopeItem = scopeItems.find(
    (item) => !Array.isArray(item) && item.property === 'color',
  );
  const buttonScopeItems = scopeItems.filter(
    (item) => !Array.isArray(item) && item.property === 'background',
  );

  if (!noteScopeItem || Array.isArray(noteScopeItem)) {
    throw new Error('expected note scope item');
  }

  if (buttonScopeItems.some((item) => Array.isArray(item))) {
    throw new Error('expected runtime button scope items');
  }

  const noteParentClassName = getScopeParentClassName(noteScopeItem.className);
  const buttonClassNames = buttonScopeItems.map((item) => {
    if (Array.isArray(item)) throw new Error('expected runtime button scope item');
    return item.className;
  });
  const buttonParentClassNames = buttonClassNames.map((className) => getScopeParentClassName(className));

  const cardClasses = card.className.split(' ');
  const noteClasses = note.className.split(' ');
  const buttonClasses = button.className.split(' ');

  equal(cardClasses.includes(noteScopeItem.className), false);
  equal(cardClasses.includes(noteParentClassName), true);

  for (const className of buttonClassNames) {
    equal(cardClasses.includes(className), false);
    equal(buttonClasses.includes(className), true);
  }

  for (const className of buttonParentClassNames) {
    equal(cardClasses.includes(className), true);
    equal(buttonClasses.includes(className), false);
  }

  equal(noteClasses.includes(noteScopeItem.className), true);
  equal(noteClasses.includes(noteParentClassName), false);
});

test('debug slot ids keep scoped child hover classes off the target slot', () => {
  const debugSlot = style.slot as unknown as (...args: unknown[]) => any;
  const debugScope = style.scope as unknown as (...args: unknown[]) => any;

  const debugStyles = {
    card: debugSlot({
      padding: 18,
    }, {
      $$debug: true,
      loc: [1, 1],
      label: ['slot', 'style.slot', 'debug.ts'],
      sourceUrl: 'debug.ts',
    }),
    button: debugSlot({
      background: 'black',
    }, {
      $$debug: true,
      loc: [4, 1],
      label: ['slot', 'style.slot', 'debug.ts'],
      sourceUrl: 'debug.ts',
    }).hover({
      background: 'red',
    }, {
      $$debug: true,
      loc: [4, 1],
      label: ['hover', 'style.hover', 'debug.ts'],
      sourceUrl: 'debug.ts',
    }),
  };

  const hoverScope = debugScope({
    $$debug: true,
    loc: [9, 20],
    label: ['scope', 'style.scope', 'debug.ts'],
    sourceUrl: 'debug.ts',
  }).hover([
    debugStyles.button({
      background: 'blue',
    }).hover({
      background: 'red',
    }),
  ], {
    $$debug: true,
    loc: [9, 20],
    label: ['hover', 'style.hover', 'debug.ts'],
    sourceUrl: 'debug.ts',
  });

  const pool = createCssInstancePool();
  const scoped = pool.get(
    debugStyles,
    [],
    bindScope(debugStyles.card, hoverScope),
  ).instance;

  const card = resolveCssProp((scoped as any).card);
  const button = resolveCssProp((scoped as any).button);
  const scopeItems = hoverScope[BUILDER_STATE].items.filter(
    (item: any) => !Array.isArray(item) && item.property === 'background',
  );

  const cardClasses = card.className.split(' ');
  const buttonClasses = button.className.split(' ');

  for (const item of scopeItems) {
    if (Array.isArray(item)) throw new Error('expected runtime scope item');

    equal(cardClasses.includes(item.className), false);
    equal(buttonClasses.includes(item.className), true);
    equal(cardClasses.includes(getScopeParentClassName(item.className)), true);
  }
});

test('scope keeps same-property overrides for different slots', () => {
  const themedStyles = {
    card: style.slot({
      background: '#ffffff',
    }),
    label: style.slot({
      background: '#e0f2fe',
    }),
  };

  const themeScope = style.scope([
    themedStyles.card({
      background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
    }),
    themedStyles.label({
      background: '#dcfce7',
    }),
  ]);

  const pool = createCssInstancePool();
  const scoped = pool.get(
    themedStyles,
    [],
    bindScope(themedStyles.card, themeScope),
  ).instance;

  const card = resolveCssProp(scoped.card);
  const label = resolveCssProp(scoped.label);
  const cardClasses = card.className.split(' ');
  const labelClasses = label.className.split(' ');
  const scopeItems = themeScope[BUILDER_STATE].items;

  const cardBackground = scopeItems.find(
    (item) =>
      isRuntimeScopeItem(item) &&
      item.slotId === themedStyles.card[BUILDER_SLOT_ID] &&
      item.property === 'background',
  );
  const labelBackground = scopeItems.find(
    (item) =>
      isRuntimeScopeItem(item) &&
      item.slotId === themedStyles.label[BUILDER_SLOT_ID] &&
      item.property === 'background',
  );

  if (!cardBackground || Array.isArray(cardBackground)) {
    throw new Error('expected card background scope item');
  }
  if (!labelBackground || Array.isArray(labelBackground)) {
    throw new Error('expected label background scope item');
  }

  equal(cardBackground.value, 'linear-gradient(135deg, #fef3c7, #fde68a)');
  equal(labelBackground.value, '#dcfce7');
  equal(cardClasses.includes(cardBackground.className), true);
  equal(labelClasses.includes(labelBackground.className), true);
  equal(cardClasses.includes(labelBackground.className), false);
  equal(labelClasses.includes(cardBackground.className), false);
});

test('compiler extracts scope base and parent selector rules', () => {
  const compiler = createCompiler({
    css: { classNamePrefix: 't', layer: false, debugClassName: true },
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
  includes(result.code, 'true]');
  includes(css, 'color:pink');
  includes(css, 'color:blue');
  includes(css, ':where(');
  includes(css, ':hover)');
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
  const parentHoverBaseIndex = css.indexOf('color:blue');
  const childBaseIndex = css.indexOf('color:black');
  const childHoverIndex = css.indexOf('color:red');

  equal(parentHoverBaseIndex !== -1, true);
  equal(childBaseIndex !== -1, true);
  equal(childHoverIndex !== -1, true);
  includes(css, ':where(.-');
  equal(childBaseIndex < parentHoverBaseIndex, true);
  equal(parentHoverBaseIndex < childHoverIndex, true);
});

test('compiler evaluates style.priority helper as static priority tuple', () => {
  const compiler = createCompiler({
    css: { layer: false, debugClassName: true },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const styles = {
  container: style.slot({
    display: style.priority('flex', 1),
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
  includes(css, 'display:none');
  includes(css, 'display:flex');
  equal(css.indexOf('display:none') < css.indexOf('display:flex'), true);
});

test('compiler includes value priority in extracted class hash', () => {
  const compiler = createCompiler({
    css: { layer: false },
  });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';

const one = style({
  display: style.priority('flex', 1),
});
const two = style({
  display: style.priority('flex', 2),
});
`,
    '/tmp/compiler-value-priority-class-hash.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const classNames = getCssClassNames(result.css);

  equal(classNames.length, 2);
  notEqual(classNames[0], classNames[1]);
});

test('compiler includes media priority in extracted class hash', () => {
  const compiler = createCompiler({
    css: { layer: false },
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

test('compiler extracts token values as css variables', () => {
  const compiler = createCompiler({
    css: { layer: false, debugClassName: true },
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
  includes(result.code, '[1, "--token-');
  includes(result.code, 'createExtractedToken(');
  includes(css, 'background-color:var(--token-');
  includes(css, ', blue)');
});

test('compiler uses property-local variables for token values', () => {
  const compiler = createCompiler({
    css: { layer: false, debugClassName: true, localClassName: true },
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
  const match = css.match(/background-color:var\((--token-[a-z0-9]+), blue\)/);

  if (!match) throw new Error('expected property-local token variable');

  includes(result.code, `[1, "${match[1]}", createExtractedToken(`);
});

test('compiler extracts static siblings when a style object has a dynamic value', () => {
  const compiler = createCompiler({
    css: { layer: false, debugClassName: true, localClassName: true },
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

  includes(result.code, 'createExtractedStyle');
  includes(result.code, 'bg from');
  includes(result.code, "'url(' + bg + ')'");
  includes(result.code, '[1, "--token-');
  includes(css, 'background-color:coral');
  includes(css, 'background-image:var(--token-');
});

test('compiler extracts spread style.raw and style.plain objects', () => {
  const compiler = createCompiler({ css: { layer: false } });
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
  includes(css, 'display:flex');
  includes(css, 'background-color:var(--token-');
  includes(css, 'gap:12px');
  includes(css, 'min-height:100vh');
  includes(css, 'color:red');
});

test('compiler extracts imported style.raw and style.plain objects', () => {
  const compiler = createCompiler({ css: { layer: false } });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style';
import { importedPlainBase, importedRawBase } from './compiler-fixtures/raw_plain';

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

  includes(css, 'background-color:#f8fafc');
  includes(css, 'padding:12px');
  includes(css, 'display:flex');
  includes(css, 'gap:8px');
  includes(css, 'color:red');
});

test('scope parent selectors use configured target prefix in production mode', () => {
  const scopeTargetPrefix = 'scope-';
  const compiler = createCompiler({
    css: {
      layer: false,
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
  const filePath = testDir + 'compiler-fixtures/component.ts';
  const code = readFileSync(filePath, 'utf8');
  const compiler = createCompiler({ css: { classNamePrefix: 't' } });
  const result = compiler.transform(code, filePath);

  if (!result) throw new Error('expected compiler transform result');

  includes(result.code, 'createExtractedStyle');
  includes(result.code, 'createExtractedSlot');
  includes(result.code, 'createExtractedScope');
  includes(result.code, 'compactScope');
  includes(result.code, 'objectScope');

  const css = result.css.join('\n');

  includes(css, '.');
  includes(css, '@media (max-width: 700px)');
  includes(css, '@media (max-width: 600px)');
  includes(css, 'color:#111827');
  includes(css, 'color:#2563eb');
  includes(css, 'color:#1d4ed8');
  includes(css, 'display:block');
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
  includes(css, 'color:red');
});

test('compiler preserves side effect imports during extraction', () => {
  const compiler = createCompiler({
    css: { layer: false },
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
  includes(result.css.join('\n'), 'color:red');
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
    css: { layer: false },
  }).transform(code, nodeModuleId);

  if (!included) throw new Error('expected explicit include to transform node_modules package');

  includes(included.css.join('\n'), 'color:red');

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

test('compiler can disable extracted css layer wrapping', () => {
  const compiler = createCompiler({ css: { layer: false } });
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
  includes(css, 'color:red');
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

test('compiler extracts style imports from server entry', () => {
  const compiler = createCompiler({ css: { layer: false } });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style/server';

const rule = style.slot({ display: 'grid', gap: 16 });
`,
    '/tmp/compiler-server-entry.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(css, 'display:grid');
  includes(css, 'gap:16px');
  includes(result.code, 'createExtractedSlot');
});

test('compiler dedupes identical extracted style declarations', () => {
  const compiler = createCompiler({
    css: { layer: false, localClassName: true },
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
  const compiler = createCompiler({ css: { debugClassName: true, layer: false } });
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

test('compiler sorts direct scope overrides after slot shorthand priority', () => {
  const compiler = createCompiler({ css: { debugClassName: true, layer: false } });
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

  before(css, 'background-color:green', 'background:#ad5a2b');
});

test('compiler extracts createTheme token overrides to an extracted theme', () => {
  const compiler = createCompiler({ css: { layer: false, themeNamePrefix: 'theme-' } });
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

test('compiler extracts createTheme with imported nested tokens and aliases', () => {
  const compiler = createCompiler({ css: { layer: false } });
  const result = compiler.transform(
    `
import { createTheme } from '@fluentic/style';
import { brand, tokens } from './compiler-fixtures/theme_tokens';

export const theme = createTheme([
  tokens.color.text('white'),
  tokens.color.bg(brand),
]);
`,
    fileURLToPath(new URL('./theme-entry.ts', import.meta.url)),
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\\n');

  includes(result.code, 'createExtractedTheme');
  includes(css, ':white');
  includes(css, 'var(--token-');
  includes(css, 'blue');
});

test('compiler rejects createTheme values that are not token overrides', () => {
  const compiler = createCompiler({ css: { layer: false } });
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
  const compiler = createCompiler({ css: { layer: false } });
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
  includes(css, '{width:18px}');
  includes(css, '{display:flex}');
  includes(css, '{color:red}');
});

test('compiler debug extracted css keeps readable values and hash suffix', () => {
  const compiler = createCompiler({ css: { debugClassName: true, layer: false } });
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
  includes(css, '{width:18px}');
  includes(css, 'opacity');
  includes(css, '{opacity:0.5}');
  includes(css, 'color-red');
  includes(css, '{color:red}');
  includes(css, 'background-image');
  includes(css, '{background-image:linear-gradient(red, blue)}');
  includes(css, 'color-hover-blue');
  includes(css, ':hover{color:blue}');
  includes(css, 'opacity-hover');
  includes(css, ':hover{opacity:0.25}');
});

test('compiler debug property and value lengths are applied independently', () => {
  const compiler = createCompiler({
    css: {
      debugClassName: true,
      debugPropertyLength: 16,
      debugValueLength: 6,
      layer: false,
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

test('pool prepends inherited scopes before own scopes', () => {
  const pool = createCssInstancePool();
  const parent = pool.get(styles, [], [theme(styles.container)]).instance;
  const child = pool.get(styles, getCssInstanceScopes(parent), [hoverTheme(styles.container)]).instance;

  equal((child.label as any).items.length, 3);
});

test('bindScope keeps recursive scope order', () => {
  const targets = bindScope(styles.container, [
    theme,
    false,
    [hoverTheme],
  ]);

  equal(targets.length, 2);
});

test('extracted scope parent selector applies target and child classes', () => {
  const extractedCard = createExtractedSlot('extracted-card', [
    ['card-padding', 'card-padding-class'],
  ]);
  const extractedButton = createExtractedSlot('extracted-button', [
    ['button-bg', 'button-bg-class'],
    ['button-hover-bg', 'button-hover-bg-class'],
  ]);
  const extractedScope = createExtractedScope([
    [BUILDER_TYPE_SCOPE, 'extracted-button', 'scope-button-bg', 'scope-button-bg-class', true],
  ]);
  const css = getCss(
    {
      card: extractedCard,
      button: extractedButton,
    },
    bindScope(extractedCard, extractedScope),
  );

  equal(
    getClassName(css.card).className,
    'card-padding-class -scope-button-bg-class',
  );
  equal(
    getClassName(css.button).className,
    'button-bg-class button-hover-bg-class scope-button-bg-class',
  );
});

test('css prop resolver dedupes resolved items', () => {
  const pool = createCssInstancePool();
  const css = pool.get(styles, [], [theme(styles.container)]).instance;
  const result = resolveCssProp([css.container as any, css.container as any]);

  equal(result.className.split(' ').length, 1);
});

test('css prop resolver accepts direct raw style and slot data', () => {
  const directStyles = {
    container: style({
      color: 'red',
    }),
    label: style.slot({
      color: 'black',
    }),
  };

  const result = resolveCssProp([directStyles.container, directStyles.label]);
  const cached = resolveCssProp([directStyles.container, directStyles.label]);

  if (!result.className) throw new Error('expected direct raw css class name');
  equal(result, cached);
});

test('static combineStyle inserts runtime rules synchronously', () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: false,
  });
  const previousSheet = getGlobalSheet();

  setGlobalSheet(sheet);

  try {
    const css = combineStyle(styles);
    const result = getClassName(css.container);

    if (!result.className) throw new Error('expected combined class name');

    const text = document.head.textContent;

    includes(text, 'color:red');
    includes(text, 'color:black');
  } finally {
    setGlobalSheet(previousSheet);
  }
});

test('jsx css prop inserts direct raw style and slot runtime rules', () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: false,
  });
  const directStyles = {
    container: style({
      color: 'maroon',
    }),
    label: style.slot({
      color: 'olive',
    }),
  };
  const previousSheet = getGlobalSheet();

  setGlobalSheet(sheet);

  try {
    const result = transformElement({
      type: 'div',
      props: {
        css: [directStyles.container, directStyles.label],
      },
    });
    const props = result.props as { className?: string; };

    if (!props.className) throw new Error('expected transformed class name');

    const text = document.head.textContent;

    includes(text, 'color:maroon');
    includes(text, 'color:olive');
  } finally {
    setGlobalSheet(previousSheet);
  }
});

test('direct raw css prop keeps token defaults theme-overridable', () => {
  const token = createToken('blue', 'direct-theme-token');
  const tokenStyles = {
    container: style.slot({
      color: token,
    }),
  };
  const theme = createTheme([token('red')], 'direct-runtime-theme');
  const result = resolveCssProp([theme, tokenStyles.container]);

  includes(result.className, theme.className);
  equal(result.style, undefined);
});

test('css prop warns for composition values in dev', () => {
  configureRuntime({ dev: true });

  const token = createToken('blue', 'unsupported-css-token');
  const warnings: unknown[][] = [];
  const warn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    const result = resolveCssProp([styles.container, token('red') as any]);

    if (!result.className) throw new Error('expected supported css prop item to resolve');
    equal(warnings.length, 1);
    includes(String(warnings[0][0]), 'Unsupported css prop value');
  } finally {
    console.warn = warn;
    configureRuntime({ dev: false });
  }
});

test('css prop resolver keeps token defaults in css variable fallback', () => {
  const token = createToken('blue');
  const tokenStyles = {
    container: style.slot({
      backgroundColor: token,
    }),
  };
  const pool = createCssInstancePool();
  const css = pool.get(tokenStyles, [], []).instance;
  const result = resolveCssProp(css.container as any);

  equal(result.style, undefined);
  if (!result.className) throw new Error('expected token class name');
});

test('static getCss resolves dynamic token provider values', () => {
  const token = createToken('blue');
  const tokenStyles = {
    container: style.slot({
      backgroundColor: token,
    }),
  };
  const css = getCss(tokenStyles, token('red'));
  const result = resolveCssProp(css.container as any);

  if (!result.style) throw new Error('expected token variable style');

  const varName = Object.keys(result.style).find((key) => key.startsWith('--token-'));

  if (!varName) throw new Error('expected token variable name');

  equal((result.style as Record<string, unknown>)[varName], 'red');
});

test('static combineStyle.for carries token provider values', () => {
  const token = createToken('blue');
  const tokenStyles = {
    container: style.slot({
      backgroundColor: token,
    }),
  };
  const combine = combineStyle.for(tokenStyles);
  const parent = combine(token('red'));
  const child = combine(parent);
  const result = resolveCssProp(child.container as any);

  if (!result.style) throw new Error('expected token variable style');

  const varName = Object.keys(result.style).find((key) => key.startsWith('--token-'));

  if (!varName) throw new Error('expected token variable name');

  equal((result.style as Record<string, unknown>)[varName], 'red');
});

test('static combineStyle.for lets later token providers override carried values', () => {
  const token = createToken('blue');
  const tokenStyles = {
    container: style.slot({
      backgroundColor: token,
    }),
  };
  const combine = combineStyle.for(tokenStyles);
  const parent = combine(token('red'));
  const child = combine(parent, token('green'));
  const result = resolveCssProp(child.container as any);

  if (!result.style) throw new Error('expected token variable style');

  const varName = Object.keys(result.style).find((key) => key.startsWith('--token-'));

  if (!varName) throw new Error('expected token variable name');

  equal((result.style as Record<string, unknown>)[varName], 'green');
});

test('static getToken resolves token values to css variable fallbacks', () => {
  const base = createToken('blue', 'static-base');
  const alias = createToken(base, 'static-alias');

  equal(getToken('red'), 'red');
  equal(getToken(10), 10);
  equal(getToken(null), null);
  equal(getToken(false), false);
  equal(getToken(base), 'var(--token-static-base, blue)');
  equal(getToken(alias), 'var(--token-static-alias, var(--token-static-base, blue))');
});

test('pool token data compares by token id and primitive value', () => {
  const token = createToken('blue');
  const tokenStyles = {
    container: style.slot({
      backgroundColor: token,
    }),
  };
  const pool = createCssInstancePool();
  const first = pool.get(tokenStyles, [], [token('red')]);
  const second = pool.get(tokenStyles, [], [token('red')], first.tokensData);
  const third = pool.get(tokenStyles, [], [token('green')], second.tokensData);

  equal(first.isTokenDataChanged, true);
  equal(second.isTokenDataChanged, false);
  equal(first.tokensData, second.tokensData);
  equal(third.isTokenDataChanged, true);
  notEqual(second.tokensData, third.tokensData);
});

test('dynamic token providers use last value for duplicate token ids', () => {
  const token = createToken('blue');
  const tokenStyles = {
    container: style.slot({
      backgroundColor: token,
    }),
  };
  const css = getCss(tokenStyles, token('red'), token('green'));
  const result = resolveCssProp(css.container as any);

  if (!result.style) throw new Error('expected token variable style');

  const varName = Object.keys(result.style).find((key) => key.startsWith('--token-'));

  if (!varName) throw new Error('expected token variable name');

  equal((result.style as Record<string, unknown>)[varName], 'green');
});

test('theme css prop contributes class and token declarations stay theme-overridable', () => {
  const token = createToken('blue', 'theme-text');
  const tokenStyles = {
    container: style.slot({
      color: token,
    }),
  };
  const themeData = createTheme([token('red')], 'runtime-theme');
  const theme = createCssTheme(themeData);
  const css = getCss(tokenStyles);
  const result = resolveCssProp([css.container as any, theme]);

  includes(result.className, themeData.className);
  equal(result.style, undefined);

  const rule = buildThemeRule(themeData);
  includes(rule, '.' + themeData.className);
  includes(rule, '--token-theme-text:red');
});

test('local token overrides beat theme class via inline variable', () => {
  const token = createToken('blue', 'theme-local');
  const tokenStyles = {
    container: style.slot({
      color: token,
    }),
  };
  const theme = createCssTheme(createTheme([token('red')], 'runtime-theme-local'));
  const css = getCss(tokenStyles, token('green'));
  const result = resolveCssProp([theme, css.container as any]);

  if (!result.style) throw new Error('expected local token variable style');

  equal((result.style as Record<string, unknown>)['--token-theme-local'], 'green');
});

test('theme token aliases emit nested css variable fallbacks', () => {
  const base = createToken('blue', 'theme-base');
  const alias = createToken(base, 'theme-alias');
  const theme = createTheme([alias(base)], 'runtime-theme-alias');
  const rule = buildThemeRule(theme);

  includes(rule, '--token-theme-alias:var(--token-theme-base, blue)');
});

test('runtime debug variables make tokens use property-local inline styles', () => {
  configureRuntime({ dev: true, localClassName: true, debugClassName: true });

  const token = createToken('blue');
  const debug: DebugData = {
    $$debug: true,
    loc: [4, 14],
    label: ['style.slot', '/tmp/runtime-token-local-variable.ts:4:14', 'runtime-token-local-variable.ts'],
    fields: {
      backgroundColor: [5, 5],
    },
    vars: {
      backgroundColor: '--token-local-value',
    },
    sourceUrl: '/tmp/runtime-token-local-variable.ts',
  };
  const css = style.slot({
    backgroundColor: token,
  }, debug);
  const result = resolveCssProp(css as any);

  if (!result.style) throw new Error('expected token variable style');

  includes(String((result.style as Record<string, unknown>)['--token-local-value']), 'var(--token-');
  includes(String((result.style as Record<string, unknown>)['--token-local-value']), 'blue');
  equal(result.className.includes('bg-'), true);
});

test('css prop resolver wires extracted dynamic variables as inline style', () => {
  const styles = {
    container: createExtractedSlot('dynamic-slot', [
      ['dynamic-dedupe', 'dynamic-class', [1, '--dynamic-value', 'purple']],
    ]),
  };
  const pool = createCssInstancePool();
  const css = pool.get(styles, [], []).instance;
  const result = resolveCssProp(css.container as any);

  equal(result.className, 'dynamic-class');
  equal((result.style as Record<string, unknown>)['--dynamic-value'], 'purple');
});

test('css prop resolver resolves extracted token variable refs', () => {
  const baseToken = createToken('blue');
  const tokenRef = createToken(baseToken);
  const styles = {
    container: createExtractedSlot('token-slot', [
      ['token-dedupe', 'token-class', [1, '--token-value', tokenRef]],
    ]),
  };
  const pool = createCssInstancePool();
  const css = pool.get(styles, [], []).instance;
  const result = resolveCssProp(css.container as any);

  equal(result.className, 'token-class');
  includes(String((result.style as Record<string, unknown>)['--token-value']), 'var(--token-');
  includes(String((result.style as Record<string, unknown>)['--token-value']), 'blue');
});

test('rsc dev payload is emitted by getClassName', () => {
  delete (globalThis as Record<string, unknown>)[CSS_DEV_STYLE_SEED_GLOBAL];
  setBuildMeta({ dev: true, extract: false, rsc: true, css: null });

  const pool = createCssInstancePool();
  const css = pool.get(styles, [], []).instance;
  const manual = getClassName(css.container);
  const manualProps = manual as Record<string, unknown>;
  const result = transformRscElement({
    type: 'div',
    props: {
      css: css.container,
      id: 'target',
    },
  });
  const props = result.props as Record<string, unknown>;
  const seedCss = getRscDevSeedCss();

  setBuildMeta({ dev: false, extract: false, rsc: false, css: null });
  configureRuntime({ dev: false });

  equal(props.id, 'target');
  equal(typeof manual.className, 'string');
  equal(typeof manualProps[CSS_DEV_ATTR], 'string');
  includes(seedCss, '@layer css.');
  includes(seedCss, 'color');
  equal(typeof props.className, 'string');
  equal(typeof props[CSS_DEV_ATTR], 'string');
  equal('css' in props, false);
});

test('rsc getClassName omits dev payload without css rules', () => {
  delete (globalThis as Record<string, unknown>)[CSS_DEV_STYLE_SEED_GLOBAL];
  setBuildMeta({ dev: true, extract: false, rsc: true, css: null });

  const manual = getClassName(undefined, {
    className: 'external',
  }) as Record<string, unknown>;
  const result = transformRscElement({
    type: 'div',
    props: {
      className: 'external',
    },
  });
  const props = result.props as Record<string, unknown>;
  const seedCss = getRscDevSeedCss();

  setBuildMeta({ dev: false, extract: false, rsc: false, css: null });
  configureRuntime({ dev: false });
  delete (globalThis as Record<string, unknown>)[CSS_DEV_STYLE_SEED_GLOBAL];

  equal(manual.className, 'external');
  equal(CSS_DEV_ATTR in manual, false);
  equal(props.className, 'external');
  equal(CSS_DEV_ATTR in props, false);
  equal(seedCss, '');
});

test('rsc dev seed wraps parent selector priority rules in layers', () => {
  delete (globalThis as Record<string, unknown>)[CSS_DEV_STYLE_SEED_GLOBAL];
  setBuildMeta({ dev: true, extract: false, rsc: true, css: null });

  const card = {
    root: style.slot({
      padding: 12,
    }),
    button: style.slot({
      background: 'black',
    }).hover({
      background: 'red',
    }),
  };
  const parentHover = style.scope().hover([
    card.button({
      background: 'blue',
    }),
  ]);
  const css = getCss(card, bindScope(card.root, parentHover));

  getClassName(css.root);
  getClassName(css.button);

  const seedCss = getRscDevSeedCss();
  const blueLayer = getLayerNameForRule(seedCss, 'background:blue');
  const redLayer = getLayerNameForRule(seedCss, 'background:red');

  setBuildMeta({ dev: false, extract: false, rsc: false, css: null });
  configureRuntime({ dev: false });
  delete (globalThis as Record<string, unknown>)[CSS_DEV_STYLE_SEED_GLOBAL];

  includes(seedCss, '@layer css.');
  includes(seedCss, ':hover');
  includes(seedCss, 'background:blue');
  includes(seedCss, 'background:red');
  before(seedCss.split('\n')[0], blueLayer, redLayer);
});

test('dev sheet keeps layer tag first and chunks rule tags', () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    maxRules: 1,
    sourcemap: true,
  });

  sheet.updateLayers(['a', '$layer', 'b']);
  sheet.insert({
    key: 'one',
    css: '.one{color:red}',
    callsite: {
      filePath: '/src/one.ts',
      sourceUrl: 'http://127.0.0.1:43210/lib/styles.ts?__fluentic_source=abc',
      line: 10,
      column: 2,
    },
  });
  sheet.insert({
    key: 'two',
    css: '.two{color:blue}',
    debug: {
      $$debug: true,
      loc: [20, 4],
      label: ['', '', ''],
      sourceUrl: '/src/two.ts',
    },
  });
  sheet.flush();

  equal(document.head.childNodes.length, 3);
  equal(document.head.childNodes[0].getAttribute('data-css-sheet'), 'layers');
  equal(document.head.childNodes[1].getAttribute('data-css-sheet'), 'rules');
  equal(document.head.childNodes[2].getAttribute('data-css-sheet'), 'rules');
  equal(document.head.childNodes[0].textContent, '@layer a, css, b;');
  includes(document.head.childNodes[1].textContent, '@layer css {.one{color:red}}');
  includes(document.head.childNodes[2].textContent, '@layer css {.two{color:blue}}');
  includes(document.head.childNodes[1].textContent, 'sourceMappingURL=');
  equal(
    getInlineSourceMap(document.head.childNodes[1].textContent).sources[0],
    'http://127.0.0.1:43210/lib/styles.ts?__fluentic_source=abc',
  );
  equal(getInlineSourceMap(document.head.childNodes[2].textContent).sources[0], '/src/two.ts');
});

test('dev sheet sourcemap prefers property callsite over whole debug callsite', () => {
  const callsite = getRuleCallsite(
    {
      filePath: '/src/styles.ts',
      sourceUrl: 'http://127.0.0.1:43210/src/styles.ts?__fluentic_source=abc',
      line: 42,
      column: 7,
    },
    {
      $$debug: true,
      loc: [12, 3],
      label: ['', '', ''],
      sourceUrl: '/src/styles.ts',
    },
  );

  equal(callsite?.line, 42);
  equal(callsite?.column, 7);
  equal(callsite?.sourceUrl, 'http://127.0.0.1:43210/src/styles.ts?__fluentic_source=abc');
});

test('dev sheet sourcemap emits sourcesContent from debug code', () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: true,
  });
  const code = 'export const styles = style({ color: "red" });';

  sheet.insert({
    key: 'one',
    css: '.one{color:red}',
    debug: {
      $$debug: true,
      loc: [1, 22],
      label: ['', '', ''],
      sourceUrl: 'webpack:///example/src/styles.ts',
      code,
    },
  });
  sheet.flush();

  const tag = document.head.childNodes[1];
  const map = getInlineSourceMap(tag.textContent);

  equal(map.sources[0], 'webpack:///example/src/styles.ts');
  equal(map.sourcesContent?.[0], code);
});

test('dev sheet sourcemap strips stray /at prefix from source urls', () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: true,
  });

  sheet.insert({
    key: 'one',
    css: '.one{color:red}',
    callsite: {
      filePath: '/src/styles.ts',
      sourceUrl: 'http://localhost:5173/at http://localhost:5173/src/styles.ts',
      line: 7,
      column: 5,
    },
  });
  sheet.flush();

  const tag = document.head.childNodes[1];
  const map = getInlineSourceMap(tag.textContent);

  equal(map.sources[0], 'http://localhost:5173/src/styles.ts');
});

test('dev sheet normalizes original callsite source urls before tracing', () => {
  const callsite = getRuleCallsite(
    {
      filePath: 'source:///at http://localhost:5173/src/styles.ts',
      sourceUrl: 'source:///at http://localhost:5173/src/styles.ts',
      line: 7,
      column: 5,
    },
    null,
  );

  equal(callsite?.filePath, 'http://localhost:5173/src/styles.ts');
  equal(callsite?.sourceUrl, 'http://localhost:5173/src/styles.ts');
});

test('runtime trace parses browser stack frames with source labels', () => {
  const root = globalThis as typeof globalThis & {
    Error: ErrorConstructor;
  };
  const OriginalError = root.Error;

  try {
    root.Error = function(message?: string) {
      return {
        name: 'Error',
        message: message ?? '',
        stack: [
          'Error',
          '    at $fn_style (http://127.0.0.1:4174/node_modules/.vite/deps/style.js:1:1)',
          '    at http://127.0.0.1:4174/shared/App.styles.ts (http://127.0.0.1:4174/src_main_tsx.js:12:34)',
        ].join('\n'),
      };
    } as unknown as ErrorConstructor;

    const callsite = traceCallsite();

    equal(callsite?.filePath, 'http://127.0.0.1:4174/src_main_tsx.js');
    equal(callsite?.sourceUrl, 'http://127.0.0.1:4174/src_main_tsx.js');
    equal(callsite?.line, 12);
    equal(callsite?.column, 34);
  } finally {
    root.Error = OriginalError;
  }
});

test('dev sheet writes one generated css line per sourcemap rule', () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: true,
  });

  sheet.insert({
    key: 'one',
    css: '.one{min-height:100vh}',
    callsite: { filePath: '/src/styles.ts', line: 7, column: 5 },
  });
  sheet.insert({
    key: 'two',
    css: '.two{background-color:red}',
    callsite: { filePath: '/src/styles.ts', line: 108, column: 5 },
  });
  sheet.flush();

  const tag = document.head.childNodes[1];
  const lines = tag.textContent.split('\n').filter(Boolean);

  equal(lines[0], '@layer css {.one{min-height:100vh}}');
  equal(lines[1], '@layer css {.two{background-color:red}}');
  includes(lines[2], 'sourceMappingURL=');
});

test('dev sheet wraps priority rules in generated priority layers', () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: false,
  });

  sheet.updateLayers(['reset', '$layer', 'override']);
  equal(document.head.childNodes[0].textContent, '@layer reset, override;');
  sheet.insert({
    key: 'priority',
    css: '.priority{padding:18px}',
    priority: [2, 0, 0, 0, 0, 0, 2],
  });
  sheet.flush();

  const layerText = document.head.childNodes[0].textContent;
  const ruleText = document.head.childNodes[1].textContent;

  includes(layerText, '@layer reset, css.');
  includes(layerText, ', override;');
  includes(ruleText, '@layer css.');
  includes(ruleText, '{.priority{padding:18px}}');
});

test('dev utils installs on window target', () => {
  const root = globalThis as typeof globalThis & {
    window?: Window & typeof globalThis & Record<string, unknown>;
  };
  const previousWindow = root.window;

  try {
    root.window = {} as Window & typeof globalThis & Record<string, unknown>;
    configureRuntime({ dev: true, devUtils: 'CssDevUtils' });
    enableDevUtils();

    equal(typeof (root.window.CssDevUtils as { traceSourcemap?: unknown; }).traceSourcemap, 'function');
  } finally {
    configureRuntime({ dev: false, devUtils: '' });
    root.window = previousWindow;
  }
});

test('enableDevUtils works without a window global', () => {
  const root = globalThis as unknown as Record<string, unknown> & {
    CssDevUtils?: { traceSourcemap?: unknown; };
    window?: Window & typeof globalThis;
  };
  const previousWindow = root.window;
  const previousUtils = root.CssDevUtils;

  try {
    delete (root as { window?: unknown; }).window;
    delete (root as { CssDevUtils?: unknown; }).CssDevUtils;
    configureRuntime({ dev: true, devUtils: 'CssDevUtils' });

    enableDevUtils();

    const utils = root.CssDevUtils as { traceSourcemap?: unknown; } | undefined;
    equal(typeof utils?.traceSourcemap, 'function');
  } finally {
    configureRuntime({ dev: false });
    root.window = previousWindow;
    root.CssDevUtils = previousUtils;
  }
});

test('dev trace remaps runtime css sourcemaps through generated file sourcemap', async () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: true,
  });

  sheet.insert({
    key: 'one',
    css: '.one{color:red}',
    callsite: {
      filePath: '/assets/app.js?t=123',
      sourceUrl: 'http://localhost/assets/app.js?t=123',
      line: 1,
      column: 1,
    },
  });
  sheet.flush();

  const tag = document.head.childNodes[1];
  const sourceMap = {
    version: 3,
    sources: ['../src/styles.ts'],
    sourcesContent: ['export const styles = style({ color: "red" });'],
    names: [],
    mappings: 'AAAA',
  };
  const fetcher = async (url: string) => {
    if (url === 'http://localhost/assets/app.js') {
      return createFetchResponse('console.log("x");\n//# sourceMappingURL=app.js.map');
    }

    if (url === 'http://localhost/assets/app.js.map') {
      return createFetchResponse(JSON.stringify(sourceMap));
    }

    return createFetchResponse('', false);
  };

  const result = await withBrowserWindow('http://localhost/', fetcher, () => traceDevSourcemaps());
  const map = getInlineSourceMap(tag.textContent);

  equal(result.tags > 0, true);
  equal(result.remapped, 1);
  equal(result.sourcemaps[0], 'http://localhost/assets/app.js.map');
  equal(map.sources[0], 'source:///src/styles.ts');
  equal(map.sourcesContent?.[0], 'export const styles = style({ color: "red" });');
});

test('dev trace resolves inline source maps relative to generated file url', async () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: true,
  });

  sheet.insert({
    key: 'one',
    css: '.one{color:red}',
    callsite: {
      filePath: '/assets/app.js?t=123',
      sourceUrl: 'http://localhost/assets/app.js?t=123',
      line: 1,
      column: 1,
    },
  });
  sheet.flush();

  const tag = document.head.childNodes[1];
  const sourceMap = {
    version: 3,
    sources: ['../src/styles.ts'],
    sourcesContent: ['export const styles = style({ color: "red" });'],
    names: [],
    mappings: 'AAAA',
  };
  const inlineSourceMap = 'data:application/json;charset=utf-8,' +
    encodeURIComponent(JSON.stringify(sourceMap));
  const fetcher = async (url: string) => {
    if (url === 'http://localhost/assets/app.js') {
      return createFetchResponse('console.log("x");\n//# sourceMappingURL=' + inlineSourceMap);
    }

    return createFetchResponse('', false);
  };

  const result = await withBrowserWindow('http://localhost/', fetcher, () => traceDevSourcemaps());
  const map = getInlineSourceMap(tag.textContent);

  equal(result.remapped, 1);
  equal(map.sources[0], 'source:///src/styles.ts');
  equal(map.sourcesContent?.[0], 'export const styles = style({ color: "red" });');
});

test('dev trace uses source protocol without embedded source content', async () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: true,
  });

  sheet.insert({
    key: 'one',
    css: '.one{color:red}',
    callsite: {
      filePath: '/assets/app.js?t=123',
      sourceUrl: 'http://localhost/assets/app.js?t=123',
      line: 1,
      column: 1,
    },
  });
  sheet.flush();

  const tag = document.head.childNodes[1];
  const sourceMap = {
    version: 3,
    sources: ['../src/styles.ts'],
    names: [],
    mappings: 'AAAA',
  };
  const fetcher = async (url: string) => {
    if (url === 'http://localhost/assets/app.js') {
      return createFetchResponse('console.log("x");\n//# sourceMappingURL=app.js.map');
    }

    if (url === 'http://localhost/assets/app.js.map') {
      return createFetchResponse(JSON.stringify(sourceMap));
    }

    return createFetchResponse('', false);
  };

  const result = await withBrowserWindow('http://localhost/', fetcher, () => traceDevSourcemaps());
  const map = getInlineSourceMap(tag.textContent);

  equal(result.remapped, 1);
  equal(map.sources[0], 'source:///src/styles.ts');
  equal(map.sourcesContent, undefined);
});

test('dev trace uses source protocol when generated sourcemap is unresolved', async () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: true,
  });

  sheet.insert({
    key: 'one',
    css: '.one{color:red}',
    callsite: {
      filePath: '/assets/app.js?t=123',
      sourceUrl: 'http://localhost/assets/app.js?t=123',
      line: 3,
      column: 7,
    },
  });
  sheet.flush();

  const tag = document.head.childNodes[1];
  const fetcher = async () => createFetchResponse('', false);

  const result = await withBrowserWindow('http://localhost/', fetcher, () => traceDevSourcemaps());
  const map = getInlineSourceMap(tag.textContent);

  equal(result.remapped, 0);
  equal(result.unresolved, 1);
  equal(map.sources[0], 'source:///assets/app.js');
});

test('dev trace cleans malformed source protocol stack prefixes', async () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: true,
  });

  sheet.insert({
    key: 'one',
    css: '.one{color:red}',
    callsite: {
      filePath: 'source:///at http://localhost:5173/src/styles.ts',
      sourceUrl: 'source:///at http://localhost:5173/src/styles.ts',
      line: 3,
      column: 7,
    },
  });
  sheet.flush();

  const tag = document.head.childNodes[1];

  await withBrowserWindow(
    'http://localhost:5173/',
    async () => createFetchResponse('', false),
    () => traceDevSourcemaps(),
  );
  const map = getInlineSourceMap(tag.textContent);

  equal(map.sources[0], 'source:///src/styles.ts');
});

test('dev trace can fetch vite querystring generated module urls', async () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: true,
  });

  sheet.insert({
    key: 'one',
    css: '.one{color:red}',
    callsite: {
      filePath: 'http://localhost/src/styles.tsx',
      sourceUrl: 'http://localhost/src/styles.tsx?t=123',
      line: 1,
      column: 1,
    },
  });
  sheet.flush();

  const tag = document.head.childNodes[1];
  const sourceMap = {
    version: 3,
    sources: ['styles.tsx'],
    sourcesContent: ['export const styles = style({ color: "red" });'],
    names: [],
    mappings: 'AAAA',
  };
  const fetcher = async (url: string) => {
    if (url === 'http://localhost/src/styles.tsx?t=123') {
      return createFetchResponse(
        'console.log("x");\n//# sourceMappingURL=data:application/json;charset=utf-8,' +
          encodeURIComponent(JSON.stringify(sourceMap)),
      );
    }

    return createFetchResponse('', false);
  };

  const result = await withBrowserWindow('http://localhost/', fetcher, () => traceDevSourcemaps());
  const map = getInlineSourceMap(tag.textContent);

  equal(result.remapped, 1);
  equal(map.sources[0], 'source:///src/styles.tsx');
  equal(map.sourcesContent?.[0], 'export const styles = style({ color: "red" });');
});

test('dev trace keeps querystring sourcemap fetches separate from queryless misses', async () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    sourcemap: true,
  });

  sheet.insert({
    key: 'one',
    css: '.one{color:red}',
    callsite: {
      filePath: 'http://localhost/src/styles.tsx',
      sourceUrl: 'http://localhost/src/styles.tsx',
      line: 1,
      column: 1,
    },
  });
  sheet.insert({
    key: 'two',
    css: '.two{color:blue}',
    callsite: {
      filePath: 'http://localhost/src/styles.tsx',
      sourceUrl: 'http://localhost/src/styles.tsx?t=123',
      line: 1,
      column: 1,
    },
  });
  sheet.flush();

  const tag = document.head.childNodes[1];
  const sourceMap = {
    version: 3,
    sources: ['styles.tsx'],
    sourcesContent: ['export const styles = style({ color: "blue" });'],
    names: [],
    mappings: 'AAAA',
  };
  const fetcher = async (url: string) => {
    if (url === 'http://localhost/src/styles.tsx?t=123') {
      return createFetchResponse(
        'console.log("x");\n//# sourceMappingURL=data:application/json;charset=utf-8,' +
          encodeURIComponent(JSON.stringify(sourceMap)),
      );
    }

    return createFetchResponse('', false);
  };

  const result = await withBrowserWindow('http://localhost/', fetcher, () => traceDevSourcemaps());
  const map = getInlineSourceMap(tag.textContent);

  equal(result.remapped, 1);
  equal(result.unresolved, 1);
  equal(map.sources[0], 'source:///src/styles.tsx');
  equal(map.sourcesContent?.[0], 'export const styles = style({ color: "blue" });');
});

test('dev sheet ignores duplicate keys', () => {
  const document = createFakeDocument();
  const sheet = createDevSheet({
    document: document as unknown as Document,
    maxRules: 10,
    sourcemap: false,
  });

  sheet.insert({ key: 'same', css: '.one{color:red}' });
  sheet.insert({ key: 'same', css: '.two{color:blue}' });
  sheet.flush();

  equal(document.head.childNodes[1].textContent, '@layer css {.one{color:red}}\n');
});

test('prod sheet uses a layer tag and insertRule tag', () => {
  const document = createFakeDocument();
  const sheet = createProdSheet({
    document: document as unknown as Document,
  });

  sheet.updateLayers(['a']);
  sheet.insert({ key: 'one', css: '.one{color:red}' });
  sheet.insert({ key: 'one', css: '.one{color:blue}' });
  sheet.flush();

  equal(document.head.childNodes.length, 2);
  equal(document.head.childNodes[0].getAttribute('data-css-sheet'), 'layers');
  equal(document.head.childNodes[1].getAttribute('data-css-sheet'), 'rules');
  equal(document.head.childNodes[0].textContent, '@layer a;');
  equal(document.head.childNodes[1].sheet.cssRules.length, 1);
  equal(document.head.childNodes[1].sheet.cssRules[0], '@layer css {.one{color:red}}');
});

test('prod sheet creates rule tag lazily', () => {
  const document = createFakeDocument();
  const sheet = createProdSheet({
    document: document as unknown as Document,
  });

  sheet.updateLayers(['a']);
  sheet.flush();

  equal(document.head.childNodes.length, 1);
  equal(document.head.childNodes[0].getAttribute('data-css-sheet'), 'layers');
  equal(document.head.childNodes[0].textContent, '@layer a;');
});

test('prod sheet does not create tags until used', () => {
  const document = createFakeDocument();

  createProdSheet({
    document: document as unknown as Document,
  });

  equal(document.head.childNodes.length, 0);
});

function test(name: string, fn: () => void) {
  tests.push([name, fn]);
}

function equal(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`expected ${String(expected)}, got ${String(actual)}`);
  }
}

function deepEqual(actual: unknown, expected: unknown) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(`expected ${expectedJson}, got ${actualJson}`);
  }
}

function notEqual(actual: unknown, expected: unknown) {
  if (actual === expected) {
    throw new Error(`expected ${String(actual)} not to equal ${String(expected)}`);
  }
}

function includes(actual: string, expected: string) {
  if (!actual.includes(expected)) {
    throw new Error(`expected ${actual} to include ${expected}`);
  }
}

function notIncludes(actual: string, expected: string) {
  if (actual.includes(expected)) {
    throw new Error(`expected ${actual} not to include ${expected}`);
  }
}

function countOccurrences(actual: string, expected: string) {
  return actual.split(expected).length - 1;
}

function before(actual: string, first: string, second: string) {
  const firstIndex = actual.indexOf(first);
  const secondIndex = actual.indexOf(second);

  if (firstIndex === -1 || secondIndex === -1 || firstIndex >= secondIndex) {
    throw new Error(`expected ${first} to appear before ${second} in ${actual}`);
  }
}

function getLayerNameForRule(css: string, declaration: string) {
  const escapedDeclaration = declaration.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`@layer ([^{\\s]+) \\{[^}]*${escapedDeclaration}`).exec(css);

  if (!match) {
    throw new Error(`expected ${css} to include ${declaration} in a layer`);
  }

  return match[1];
}

function assertCompileError(error: unknown, expectedMessage: string) {
  const message = error instanceof Error ? error.message : String(error);
  if (!error || !message.includes(expectedMessage)) {
    throw new Error(`expected compile error containing: ${expectedMessage}, got ${String(error)}`);
  }
}

function assertRunTestsCallsite(callsite: { filePath?: string; } | null) {
  equal(callsite?.filePath?.endsWith('run-tests.ts'), true);
  equal((callsite as BuilderCallsite | null)?.stack.split('\n').length, 2);
  notIncludes((callsite as BuilderCallsite | null)?.stack ?? '', 'runtimeCallsite');
  notIncludes((callsite as BuilderCallsite | null)?.stack ?? '', '$fn_');
}

function getCssClassNames(rules: string[]) {
  return rules
    .map((rule) => rule.match(/\.([^.{\s]+)\{/)?.[1])
    .filter((className) => typeof className === 'string');
}

function createCompiler(options: CompilerOptions = {}) {
  const compiler = createPluginCompiler({
    dev: false,
    projectDir: testDir,
    cacheDir: testDir + '.test-cache',
    options,
  });

  return {
    transform(code: string, id: string): TestCompilerTransformResult | null {
      const result = compiler.compiler.compileExtract({
        code,
        filePath: id,
        sourcemap: null,
      });
      if (!result) return null;

      return {
        code: result.code,
        map: result.sourcemap,
        css: compiler.compiler.getExtractedCss().split('\n').filter(Boolean),
      };
    },
  };
}

function injectStyleDebugData(
  code: string,
  filePath: string,
  options: DebugTransformOptions = {},
  sourceUrl?: string,
) {
  const { rootDir, getSourcemapFilePath, ...compilerOptions } = options;
  const projectDir = rootDir ?? '/';

  const compiler = createPluginCompiler({
    dev: true,
    projectDir,
    cacheDir: testDir + '.test-cache',
    options: {
      ...compilerOptions,
      getSourcemapFilePath(info) {
        if (getSourcemapFilePath) {
          return getSourcemapFilePath({ ...info, sourceUrl: sourceUrl ?? info.sourceUrl });
        }

        return sourceUrl ?? info.sourceUrl;
      },
    },
  });

  const result = compiler.transform(code, filePath);
  if (!result) throw new Error('expected debug transform result');

  return result;
}

function createDebugStyle(
  value: Record<string, unknown>,
  debug: DebugData,
): StyleData {
  return (style as unknown as (
    value: Record<string, unknown>,
    debug: DebugData,
  ) => StyleData)(value, debug);
}

function createDebugSlot(
  value: Record<string, unknown>,
  debug: DebugData,
): SlotData {
  return (style.slot as unknown as (
    value: Record<string, unknown>,
    debug: DebugData,
  ) => SlotData)(value, debug);
}

function getRuntimeCallsite(data: BuilderData, index = 0): BuilderCallsite | null {
  const item = data[BUILDER_STATE].items[index];

  if (!isRuntimeItem(item)) {
    throw new Error('expected runtime item with callsite');
  }

  return item.callsite;
}

function getRuntimeClassName(data: BuilderData, index = 0) {
  const item = data[BUILDER_STATE].items[index];

  if (!isRuntimeItem(item)) {
    throw new Error('expected runtime item with className');
  }

  return item.className;
}

function getRuntimeDedupe(data: BuilderData, index = 0) {
  const item = data[BUILDER_STATE].items[index];

  if (!isRuntimeItem(item)) {
    throw new Error('expected runtime item with dedupe');
  }

  return item.dedupe;
}

function isRuntimeItem(item: unknown): item is RuntimeItem {
  return typeof item === 'object' && item !== null && 'callsite' in item;
}

function isRuntimeScopeItem(item: unknown): item is RuntimeScopeItem {
  return typeof item === 'object' && item !== null && 'parentSelector' in item;
}

function createFakeDocument() {
  const document = {
    head: null as any,
    documentElement: null as any,
    createElement(name: string) {
      return new FakeElement(document, name);
    },
    createTextNode(data: string) {
      return new FakeText(data);
    },
    createDocumentFragment() {
      return new FakeFragment();
    },
    getElementsByTagName(name: string) {
      return name === 'head' ? [document.head] : [];
    },
  };

  document.head = new FakeElement(document, 'head');
  document.documentElement = new FakeElement(document, 'html');

  return document;
}

function getInlineSourceMap(text: string) {
  const base64Marker = 'sourceMappingURL=data:application/json;charset=utf-8;base64,';
  const base64Index = text.indexOf(base64Marker);
  if (base64Index !== -1) {
    const encoded = text.slice(base64Index + base64Marker.length).replace(/\s*\*\/\s*$/, '');

    return JSON.parse(atob(encoded)) as {
      sources: string[];
      sourcesContent?: Array<string | null>;
    };
  }

  const marker = 'sourceMappingURL=data:application/json;charset=utf-8,';
  const index = text.indexOf(marker);
  if (index === -1) throw new Error('expected inline source map');

  const encoded = text.slice(index + marker.length).replace(/\s*\*\/\s*$/, '');

  return JSON.parse(decodeURIComponent(encoded)) as {
    sources: string[];
    sourcesContent?: Array<string | null>;
  };
}

async function withBrowserWindow<T>(
  href: string,
  fetcher: (url: string) => Promise<{ ok: boolean; text(): Promise<string>; }>,
  run: () => Promise<T>,
) {
  const root = globalThis as typeof globalThis & {
    window?: Window & typeof globalThis;
  };
  const previousWindow = root.window;

  try {
    root.window = {
      fetch: fetcher as unknown as typeof fetch,
      location: { href } as Location,
    } as Window & typeof globalThis;

    return await run();
  } finally {
    root.window = previousWindow;
  }
}

function createFetchResponse(text: string, ok = true) {
  return {
    ok,
    text: async () => text,
  };
}

class FakeText {
  parentNode: FakeElement | null = null;

  constructor(public data: string) {}

  get textContent() {
    return this.data;
  }

  set textContent(value: string) {
    this.data = value;
  }
}

class FakeElement {
  parentNode: FakeElement | null = null;
  childNodes: any[] = [];
  attributes: Record<string, string> = Object.create(null);
  sheet = {
    cssRules: [] as string[],
    insertRule: (rule: string, index: number) => {
      this.sheet.cssRules.splice(index, 0, rule);
    },
  };

  constructor(
    public ownerDocument: ReturnType<typeof createFakeDocument>,
    public name: string,
  ) {}

  get nextSibling() {
    if (!this.parentNode) return null;

    const index = this.parentNode.childNodes.indexOf(this);

    return this.parentNode.childNodes[index + 1] || null;
  }

  get textContent() {
    let text = '';

    for (let i = 0, len = this.childNodes.length; i < len; i++) {
      text += this.childNodes[i].textContent || '';
    }

    return text;
  }

  set textContent(value: string) {
    this.childNodes = [new FakeText(value)];
    this.childNodes[0].parentNode = this;
  }

  appendChild(child: any) {
    if (child instanceof FakeFragment) {
      for (let i = 0, len = child.childNodes.length; i < len; i++) {
        this.appendChild(child.childNodes[i]);
      }

      child.childNodes = [];
      return child;
    }

    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  insertBefore(child: any, before: any) {
    if (child instanceof FakeFragment) {
      for (let i = 0, len = child.childNodes.length; i < len; i++) {
        this.insertBefore(child.childNodes[i], before);
      }

      child.childNodes = [];
      return child;
    }

    child.parentNode = this;

    const index = before ? this.childNodes.indexOf(before) : -1;

    if (index === -1) {
      this.childNodes.push(child);
    } else {
      this.childNodes.splice(index, 0, child);
    }

    return child;
  }

  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }

  getAttribute(name: string) {
    return this.attributes[name] || null;
  }
}

class FakeFragment {
  childNodes: any[] = [];

  appendChild(child: any) {
    this.childNodes.push(child);
    return child;
  }
}

for (let i = 0, len = tests.length; i < len; i++) {
  const [name, fn] = tests[i];

  await fn();
  console.log('ok', name);
}
