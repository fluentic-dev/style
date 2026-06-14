import {
  assertCompileError,
  assertRunTestsCallsite,
  bindScope,
  BUILDER_SLOT_ID,
  BUILDER_STATE,
  type BuilderData,
  combineStyle,
  configureRuntime,
  createCombinedStylePool,
  createCompiler,
  createDebugSlot,
  createDebugStyle,
  type DebugData,
  deepEqual,
  equal,
  getClassName,
  getRuntimeCallsite,
  getRuntimeClassName,
  getRuntimeDedupe,
  getScopeParentClassName,
  getSheetRules,
  hoverTheme,
  includes,
  injectStyleDebugData,
  isRuntimeScopeItem,
  isSlotOverrideData,
  normalizeSidecarRoutePath,
  notEqual,
  notIncludes,
  resolveStyleProp,
  RUNTIME_CONFIG,
  style,
  styles,
  test,
  theme,
} from './setup';

test('pool reuses equivalent scope paths', () => {
  const pool = createCombinedStylePool();

  const first = pool.get(styles, [], [theme(styles.container)]).style;
  const second = pool.get(styles, [], [theme(styles.container)]).style;

  equal(first, second);
});

test('pool ttl zero does not retain instances', () => {
  const pool = createCombinedStylePool(0);
  const first = pool.get(styles, [], [theme(styles.container)]).style;
  const second = pool.get(styles, [], [theme(styles.container)]).style;

  notEqual(first, second);
});

test('static combineStyle reuses equivalent scope paths', () => {
  const first = combineStyle(styles, theme(styles.container));
  const second = combineStyle(styles, [theme(styles.container)]);

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
    didThrow = error instanceof TypeError &&
      /same styles object/.test(error.message);
  }

  equal(didThrow, true);
});

test('static getClassName resolves combineStyle and runtime instances the same way', () => {
  const pool = createCombinedStylePool();
  const staticCss = combineStyle(styles, theme(styles.container));
  const runtimeCss = pool.get(styles, [], [theme(styles.container)]).style;

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

test('style prop sheet rules dedupe by declaration identity without callsite', () => {
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

  const css = combineStyle({ first, second });
  const rules = getSheetRules([css.first, css.second]);

  equal(rules.length, 1);
  includes(rules[0].css, 'background-color: blue');
  equal(rules[0].callsite?.filePath, '/src/two.ts');
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
  const pool = createCombinedStylePool();
  const scoped = pool.get(styles, [], [hoverTheme(styles.container)]).style;
  const container = resolveStyleProp(scoped.container);
  const label = resolveStyleProp(scoped.label);
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

  const pool = createCombinedStylePool();
  const scoped = pool.get(
    nestedStyles,
    [],
    bindScope(nestedStyles.card, hoverScope),
  ).style;

  const card = resolveStyleProp(scoped.card);
  const note = resolveStyleProp(scoped.note);
  const button = resolveStyleProp(scoped.button);
  const scopeItems = hoverScope[BUILDER_STATE].items;

  const noteScopeItem = scopeItems.find(
    (item) => isRuntimeScopeItem(item) && item.property === 'color',
  );
  const buttonScopeItems = scopeItems.filter(
    (item) => isRuntimeScopeItem(item) && item.property === 'background',
  );

  if (!noteScopeItem || !isRuntimeScopeItem(noteScopeItem)) {
    throw new Error('expected note scope item');
  }

  if (buttonScopeItems.some((item) => !isRuntimeScopeItem(item))) {
    throw new Error('expected runtime button scope items');
  }

  const noteParentClassName = getScopeParentClassName(noteScopeItem.className);
  const buttonClassNames = buttonScopeItems.map((item) => {
    if (!isRuntimeScopeItem(item)) throw new Error('expected runtime button scope item');
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

  const pool = createCombinedStylePool();
  const scoped = pool.get(
    debugStyles,
    [],
    bindScope(debugStyles.card, hoverScope),
  ).style;

  const card = resolveStyleProp((scoped as any).card);
  const button = resolveStyleProp((scoped as any).button);
  const scopeItems = hoverScope[BUILDER_STATE].items.filter(
    (item: unknown) => isRuntimeScopeItem(item) && item.property === 'background',
  );

  const cardClasses = card.className.split(' ');
  const buttonClasses = button.className.split(' ');

  for (const item of scopeItems) {
    if (!isRuntimeScopeItem(item)) throw new Error('expected runtime scope item');

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

  const pool = createCombinedStylePool();
  const scoped = pool.get(
    themedStyles,
    [],
    bindScope(themedStyles.card, themeScope),
  ).style;

  const card = resolveStyleProp(scoped.card);
  const label = resolveStyleProp(scoped.label);
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

  if (!cardBackground || !isRuntimeScopeItem(cardBackground)) {
    throw new Error('expected card background scope item');
  }
  if (!labelBackground || !isRuntimeScopeItem(labelBackground)) {
    throw new Error('expected label background scope item');
  }

  equal(cardBackground.value, 'linear-gradient(135deg, #fef3c7, #fde68a)');
  equal(labelBackground.value, '#dcfce7');
  equal(cardClasses.includes(cardBackground.className), true);
  equal(labelClasses.includes(labelBackground.className), true);
  equal(cardClasses.includes(labelBackground.className), false);
  equal(labelClasses.includes(cardBackground.className), false);
});
