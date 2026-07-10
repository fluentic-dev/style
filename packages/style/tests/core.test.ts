import { getElementClassName } from '../atomic/element';
import {
  createDefaultedTailwindStyleConfig,
  createTailwindClassNameTransform,
  createTailwindExtendedStyleTransform,
  createTailwindStyleConfig,
  createTailwindStyleTransform,
  defaultTailwindColors,
  TailwindSelectors,
} from '../presets/tailwind';
import { classNameTransform, classNameValue, createClassNameFn, getStyleFnMeta } from '../style';
import {
  assertCompileError,
  assertEnum,
  assertRunTestsCallsite,
  bindScope,
  BUILDER_SLOT_ID,
  BUILDER_STATE,
  type BuilderData,
  combineStyle,
  configureTestRuntime,
  createCombinedStylePool,
  createCompiler,
  createDebugSlot,
  createDebugStyle,
  createNamedTokens,
  createSelectorAssert,
  createStyleFn,
  createTheme,
  createThemeRule,
  createToken,
  CSS_CONFIG,
  type DebugData,
  deepEqual,
  DEV_CONFIG,
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
  selector,
  setBuildMeta,
  style,
  styles,
  test,
  testDir,
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
  configureTestRuntime({ dev: true });

  const tracedStyle = style({ color: 'purple' });
  const tracedStyleHover = style({ color: 'purple' }).hover({ color: 'violet' });
  const tracedSlot = style.slot({ color: 'purple' });
  const tracedOverride = tracedSlot({ color: 'violet' });

  configureTestRuntime({ dev: false });

  assertRunTestsCallsite(getRuntimeCallsite(tracedStyle));
  assertRunTestsCallsite(getRuntimeCallsite(tracedStyleHover, 1));
  assertRunTestsCallsite(getRuntimeCallsite(tracedSlot));
  assertRunTestsCallsite(getRuntimeCallsite(tracedOverride));
});

test('style function meta distinguishes style object and class name builders', () => {
  const styleTransform = createTailwindStyleTransform(createTailwindStyleConfig({}));
  const { style: customStyle } = createStyleFn({
    selectors: TailwindSelectors,
    transform: styleTransform,
  });

  const classNameTransformValue = classNameTransform({
    transform(className: string) {
      return { color: className };
    },
  });
  const { className } = createClassNameFn({
    selectors: TailwindSelectors,
    transform: classNameTransformValue,
  });

  const styleMeta = getStyleFnMeta(customStyle);
  const classNameMeta = getStyleFnMeta(className);

  equal(styleMeta.mode, 'StyleObject');
  equal(styleMeta.selectors, TailwindSelectors);
  equal(styleMeta.transform, styleTransform);
  equal(classNameMeta.mode, 'ClassName');
  equal(classNameMeta.selectors, TailwindSelectors);
  equal(classNameMeta.transform, classNameTransformValue);
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

  configureTestRuntime({ dev: true });
  globalThis.Error = function() {
    throw new OriginalError('runtime trace should not run for injected debug data');
  } as unknown as ErrorConstructor;

  try {
    debugStyle = createDebugStyle({ color: 'purple', backgroundColor: 'blue' }, debug);
  } finally {
    globalThis.Error = OriginalError;
    configureTestRuntime({ dev: false });
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

test('dev debug transform flattens raw and plain spreads into consuming callsites', () => {
  const result = injectStyleDebugData(
    `
import { style } from '@fluentic/style';
import { spacing } from './tokens';

const pageContainerTokens = style.raw({
  display: 'flex',
  minHeight: '100vh',
  padding: spacing.container,
});

const pageTitleTokens = style.plain({
  fontSize: 48,
});

const pageStyles = {
  container: style.slot({
    ...pageContainerTokens,
    ...pageTitleTokens,
    color: 'black',
  }),
};
`,
    '/src/styles.ts',
    {},
    'http://127.0.0.1:4321/src/styles.ts',
  );

  notIncludes(result.code, `label: ["raw", "style.raw", "styles.ts"]`);
  notIncludes(result.code, `label: ["plain", "style.plain", "styles.ts"]`);
  includes(result.code, `"display": { 0: [17, 5], 1: [6, 3] }`);
  includes(result.code, `"minHeight": { 0: [17, 5], 1: [7, 3] }`);
  includes(result.code, `"padding": { 0: [17, 5], 1: [8, 3] }`);
  includes(result.code, `"fontSize": { 0: [18, 5], 1: [12, 3] }`);
  includes(result.code, `"color": [19, 5]`);
  includes(result.code, `"padding": "--var-`);
});

test('dev debug transform can trace raw and plain spreads to value sources', () => {
  const result = injectStyleDebugData(
    `
import { style } from '@fluentic/style';
import { spacing } from './tokens';

const pageContainerTokens = style.raw({
  display: 'flex',
  minHeight: '100vh',
  padding: spacing.container,
});

const pageTitleTokens = style.plain({
  fontSize: 48,
});

const pageStyles = {
  container: style.slot({
    ...pageContainerTokens,
    ...pageTitleTokens,
    color: 'black',
  }),
};
`,
    '/src/styles.ts',
    {
      sourcemapTrace: 'value',
    },
    'http://127.0.0.1:4321/src/styles.ts',
  );

  notIncludes(result.code, `label: ["raw", "style.raw", "styles.ts"]`);
  notIncludes(result.code, `label: ["plain", "style.plain", "styles.ts"]`);
  includes(result.code, `"display": { 0: [17, 5], 1: [6, 3] }`);
  includes(result.code, `"minHeight": { 0: [17, 5], 1: [7, 3] }`);
  includes(result.code, `"padding": { 0: [17, 5], 1: [8, 3] }`);
  includes(result.code, `"fontSize": { 0: [18, 5], 1: [12, 3] }`);
  includes(result.code, `"color": [19, 5]`);
});

test('dev debug transform traces imported object spreads to style and value sources', () => {
  const result = injectStyleDebugData(
    [
      `import { style } from '@fluentic/style';`,
      `import { textBase } from './fixtures/shared';`,
      ``,
      `const pageStyles = {`,
      `  container: style.slot({`,
      `    ...textBase,`,
      `    margin: 0,`,
      `  }),`,
      `};`,
    ].join('\n'),
    testDir + 'debug-imported-spread.ts',
    { rootDir: testDir },
  );

  includes(result.code, `"color": { 0: [6, 5], 1: [15, 3, undefined, "source:///fixtures/shared.ts"] }`);
  includes(result.code, `"fontSize": { 0: [6, 5], 1: [16, 3, undefined, "source:///fixtures/shared.ts"] }`);
  includes(result.code, `"margin": [7, 5]`);
});

test('dev debug transform traces selector style arguments to their own fields', () => {
  const result = injectStyleDebugData(
    [
      `import { style } from '@fluentic/style';`,
      ``,
      `const pageStyles = {`,
      `  container: style.slot({`,
      `    color: 'red',`,
      `  }).media('(max-width: 700px)', {`,
      `    padding: 12,`,
      `  }).hover({`,
      `    backgroundColor: 'blue',`,
      `  }),`,
      `};`,
    ].join('\n'),
    '/src/styles.ts',
    {},
    'http://127.0.0.1:4321/src/styles.ts',
  );

  includes(result.code, `.media('(max-width: 700px)', {\n    padding: 12\n  }, { $$debug: true, loc: [6, 6]`);
  includes(result.code, `label: ["media", "style.media", "styles.ts"], fields: { "padding": [7, 5] }`);
  includes(result.code, `.hover({\n    backgroundColor: 'blue'\n  }, { $$debug: true, loc: [8, 6]`);
  includes(result.code, `label: ["hover", "style.hover", "styles.ts"], fields: { "backgroundColor": [9, 5] }`);
});

test('dev debug transform traces chain merge to style or value sites', () => {
  const result = injectStyleDebugData(
    `import { style } from '@fluentic/style';

const shared = style({
  display: 'flex',
  color: 'blue',
});

const button = style({
  backgroundColor: 'white',
}).merge(shared);
`,
    '/src/merge.ts',
    {
      sourcemapTrace: 'value',
    },
    'http://127.0.0.1:4321/src/merge.ts',
  );

  includes(result.code, `"backgroundColor": [9, 3]`);
  includes(result.code, `.merge(shared, { $$debug: true, loc: [10, 4]`);
  includes(result.code, `"display": { 0: [10, 4], 1: [4, 3] }`);
  includes(result.code, `"color": { 0: [10, 4], 1: [5, 3] }`);
});

test('dev debug transform traces imported chain merge to leaf sources', () => {
  const result = injectStyleDebugData(
    [
      `import { style } from '@fluentic/style';`,
      `import { sharedInteractive } from './fixtures/merge_common';`,
      ``,
      `const button = style({`,
      `  boxShadow: 'none',`,
      `}).merge(sharedInteractive);`,
    ].join('\n'),
    testDir + 'debug-imported-merge.ts',
    { rootDir: testDir },
  );

  includes(result.code, `.merge(sharedInteractive, { $$debug: true, loc: [6, 4]`);
  includes(
    result.code,
    `"backgroundColor": { 0: [6, 4], 1: [10, 3, undefined, "source:///fixtures/merge_common.ts"] }`,
  );
  includes(result.code, `"borderColor": { 0: [6, 4], 1: [4, 3, undefined, "source:///fixtures/merge_common.ts"] }`);
  includes(result.code, `"color": { 0: [6, 4], 1: [12, 3, undefined, "source:///fixtures/merge_common.ts"] }`);
});

test('dev debug transform injects scope item override callsites', () => {
  const result = injectStyleDebugData(
    `
import { style } from '@fluentic/style';
import { buttonBaseStyles, pageStyles } from './styles';
import { themeColor } from './tokens';

const heroButton = buttonBaseStyles.container({
  backgroundColor: 'blue',
  color: 'white',
});

const compactItems = [
  pageStyles.panel({
    padding: 12,
    borderRadius: 18,
  }),
  themeColor('red'),
];

const exportedTitle = pageStyles.title({
  fontSize: 36,
});

export { exportedTitle };

export const primaryButtonTheme = style.scope([
  buttonBaseStyles.container({
    backgroundColor: 'green',
    color: 'white',
  }),
  buttonBaseStyles.label({
    letterSpacing: 0,
  }),
]);

export const buttonBaseState = style.scope()
  .hover([
    buttonBaseStyles.container({
      opacity: .86,
    }),
  ])
  .active([
    buttonBaseStyles.container({
      transform: 'translateY(1px)',
    }),
  ]);

export const pageTheme = style.scope([
  heroButton,
  ...compactItems,
]).media('(max-width: 700px)', [
  exportedTitle,
  buttonBaseStyles.container({
    minWidth: 0,
  }),
]);
`,
    '/src/styles.ts',
    {},
    'http://127.0.0.1:4321/src/styles.ts',
  );

  notIncludes(result.code, `label: ["scope", "style.scope", "styles.ts"]`);
  notIncludes(result.code, `label: ["media", "style.media", "styles.ts"]`);
  notIncludes(result.code, `label: ["hover", "style.hover", "styles.ts"]`);
  notIncludes(result.code, `label: ["active", "style.active", "styles.ts"]`);
  includes(result.code, `"backgroundColor": [7, 3]`);
  includes(result.code, `"padding": [13, 5]`);
  includes(result.code, `themeColor('red', {`);
  includes(result.code, `"fontSize": [20, 3]`);
  includes(result.code, `"backgroundColor": [27, 5]`);
  includes(result.code, `"letterSpacing": [31, 5]`);
  includes(result.code, `"opacity": [38, 7]`);
  includes(result.code, `"transform": [43, 7]`);
  includes(result.code, `"minWidth": [53, 5]`);
  includes(result.code, `sourceUrl: _styleDebugSourceUrl`);
});

test('dev debug transform does not inject provider debug into token getter values', () => {
  const result = injectStyleDebugData(
    `
import { createTokens, createValues, style } from '@fluentic/style';

const vars = createTokens({ color: '#0f766e' });
const linkedColors = createValues(['brand | mint']);

export const theme = style.scope([
  vars.color(linkedColors('brand | mint')),
]);
`,
    '/src/styles.ts',
    {},
    'http://127.0.0.1:4321/src/styles.ts',
  );

  includes(result.code, `vars.color(linkedColors('brand | mint'), {`);
  notIncludes(result.code, `linkedColors('brand | mint', {`);
});

test('dev debug transform treats static style.value values as static', () => {
  const result = injectStyleDebugData(
    `
import { style } from '@fluentic/style';

const styles = {
  card: style({ padding: style.value(18, 2) }),
};
`,
    '/src/page.tsx',
    {},
    undefined,
  );

  includes(result.code, `"padding": [5, 17]`);
  notIncludes(result.code, `"padding": "--token-`);
});

test('dev debug transform rejects invalid static selector args', () => {
  let error: unknown = null;

  try {
    injectStyleDebugData(
      `
import { style } from '@fluentic/style';

const rule = style({ color: 'red' }).select('.parent .child', { color: 'blue' });
`,
      '/tmp/debug-invalid-selector.ts',
    );
  } catch (err: unknown) {
    error = err;
  }

  assertCompileError(error, 'Invalid selector\n\nstyle.select(".parent .child")');
  assertCompileError(error, 'Selector must target the current element only');
});

test('dev debug transform rejects invalid custom selector definitions', () => {
  const custom = createStyleFn({
    style: null as any,
    selectors: {
      invalidState: selector('.parent .child'),
    },
  }).style;
  let error: unknown = null;

  try {
    injectStyleDebugData(
      `
import { style } from '@fluentic/style';

const rule = style({ color: 'red' }).invalidState({ color: 'blue' });
`,
      '/tmp/debug-invalid-selector-definition.ts',
      {
        importSources: [{
          source: '@fluentic/style',
          name: 'style',
          styleFn: custom,
        }],
      },
    );
  } catch (err: unknown) {
    error = err;
  }

  assertCompileError(error, 'Invalid selector definition\n\nstyle.invalidState: ".parent .child"');
  assertCompileError(error, 'Selector must target the current element only');
});

test('custom selector assert can carry typed enum args', () => {
  const toneAssert = assertEnum(['brand', 'danger']);
  const stateAssert = assertEnum(['open', 'closed']);
  const custom = createStyleFn({
    style: null as any,
    selectors: {
      tone: selector('[data-tone="$"]', toneAssert),
      state: selector('[data-state="$$"]', stateAssert),
    },
  }).style;

  custom().tone('brand', { color: 'blue' });
  custom().state(['open', 'closed'], { opacity: 1 });

  const checkTypesOnly = false as boolean;
  if (checkTypesOnly) {
    // @ts-expect-error enum assert narrows single selector arg
    custom().tone('neutral', { color: 'gray' });
    // @ts-expect-error enum assert narrows array selector args
    custom().state(['open', 'pending'], { opacity: 0.5 });
  }

  let error: unknown = null;

  try {
    toneAssert('neutral');
  } catch (err: unknown) {
    error = err;
  }

  assertCompileError(error, 'value must be one of: brand, danger');
});

test('custom selector assert helper can carry typed args', () => {
  const placementAssert = createSelectorAssert<'top' | 'right' | 'bottom' | 'left'>((value) => {
    if (!['top', 'right', 'bottom', 'left'].includes(value)) {
      throw new Error('placement must be top, right, bottom, or left');
    }
  });
  const custom = createStyleFn({
    style: null as any,
    selectors: {
      placement: selector('[data-placement="$"]', placementAssert),
    },
  }).style;

  custom().placement('top', { opacity: 1 });

  const checkTypesOnly = false as boolean;
  if (checkTypesOnly) {
    // @ts-expect-error custom assert narrows selector arg
    custom().placement('center', { opacity: 0.5 });
  }

  let error: unknown = null;

  try {
    placementAssert('center');
  } catch (err: unknown) {
    error = err;
  }

  assertCompileError(error, 'placement must be top, right, bottom, or left');
});

test('custom builders support fixed media selector helpers', () => {
  const custom = createStyleFn({
    style: null as any,
    selectors: {
      md: selector('@media (min-width: 768px) and (max-width: 1023.98px)', 'media'),
      lg: selector('@media (min-width: 1024px)', 'media'),
    },
  }).style;

  const rule = custom({ color: 'black' })
    .md({ color: 'blue' })
    .lg(2, { color: 'red' });
  const css = getSheetRules(rule).map((item) => item.css).join('\n');

  includes(css, '@media (min-width: 768px) and (max-width: 1023.98px)');
  includes(css, '@media (min-width: 1024px)');
  includes(css, 'color: black');
  includes(css, 'color: blue');
  includes(css, 'color: red');
});

test('tailwind preset maps utility props through normal style chains', () => {
  const Colors = createNamedTokens('test.tailwind.color', {
    accent: '#2563eb',
    accentHover: '#1d4ed8',
    accentText: '#fff',
  });
  const transform = createTailwindStyleTransform(createDefaultedTailwindStyleConfig({
    theme: {
      colors: Colors,
    },
  }));
  const ui = createStyleFn({
    selectors: TailwindSelectors,
    transform,
  }).style;
  const rule = ui({
    inlineFlex: true,
    items: 'center',
    px: '$4',
    py: '$2',
    bg: '$accent',
    text: '$accentText',
    rounded: '$md',
    font: '$semibold',
  })
    .hover({ bg: '$accentHover' })
    .md({ px: '$6' });
  const css = getSheetRules(rule).map((item) => item.css).join('\n');

  includes(css, 'display: inline-flex');
  includes(css, 'align-items: center');
  includes(css, 'padding-inline: 1rem');
  includes(css, 'padding-block: 0.5rem');
  includes(css, 'background-color: var(');
  includes(css, '#2563eb');
  includes(css, '#fff');
  includes(css, 'border-radius: 0.375rem');
  includes(css, 'font-weight: 600');
  includes(css, ':hover');
  includes(css, '#1d4ed8');
  includes(css, '@media (min-width: 768px)');
  includes(css, 'padding-inline: 1.5rem');
});

test('tailwind preset type-checks scale refs', () => {
  const Colors = createNamedTokens('test.tailwind.type.color', {
    accent: '#2563eb',
  });
  const transform = createTailwindStyleTransform(createDefaultedTailwindStyleConfig({
    theme: {
      colors: Colors,
    },
  }));
  const ui = createStyleFn({
    selectors: TailwindSelectors,
    transform,
  }).style;
  const cssUi = createStyleFn({
    selectors: TailwindSelectors,
    transform: createTailwindExtendedStyleTransform(createDefaultedTailwindStyleConfig({
      theme: {
        colors: Colors,
      },
    })),
  }).style;

  ui({
    bg: '$accent',
    text: '$base',
    px: '$4',
    maxW: '42rem',
  });
  cssUi({ color: '$accent2' });

  const plainUi = createStyleFn({
    selectors: TailwindSelectors,
    transform: createTailwindStyleTransform(createTailwindStyleConfig({
      theme: {
        colors: Colors,
      },
    })),
  }).style;

  plainUi({ bg: '$accent' });

  // @ts-expect-error native CSS properties need createTailwindExtendedStyleTransform
  ui({ color: 'red' });

  // @ts-expect-error defaulted config includes non-color scales, not the default color palette
  ui({ bg: '$amber.500' });

  // @ts-expect-error default color palette refs need defaultTailwindColors
  plainUi({ bg: '$amber.500' });

  // @ts-expect-error unknown named color ref
  ui({ bg: '$accent2' });

  // @ts-expect-error unknown spacing ref
  ui({ px: '$space-never' });
});

test('tailwind preset resolves default non-color scale refs', () => {
  const transform = createTailwindStyleTransform(createDefaultedTailwindStyleConfig({}));
  const ui = createStyleFn({
    selectors: TailwindSelectors,
    transform,
  }).style;
  const css = getSheetRules(ui({
    textSize: '$base',
    minH: '$screen',
  })).map((item) => item.css).join('\n');

  includes(css, 'font-size: 1rem');
  includes(css, 'min-height: 100vh');
});

test('tailwind color palette refs are explicit opt in', () => {
  const transform = createTailwindStyleTransform(createDefaultedTailwindStyleConfig({
    theme: {
      colors: defaultTailwindColors,
    },
  }));
  const ui = createStyleFn({
    selectors: TailwindSelectors,
    transform,
  }).style;
  const css = getSheetRules(ui({
    bg: '$blue.600',
    text: '$slate.50',
  })).map((item) => item.css).join('\n');

  includes(css, 'background-color: oklch(54.6% 0.245 262.881)');
  includes(css, 'color: oklch(98.4% 0.003 247.858)');
});

test('tailwind preset keeps defaults opt in at runtime', () => {
  const transform = createTailwindStyleTransform({
    theme: {},
  });
  const ui = createStyleFn({
    selectors: TailwindSelectors,
    transform,
  }).style;
  const css = getSheetRules(ui({
    bg: '$blue.600' as any,
  })).map((item) => item.css).join('\n');

  includes(css, 'background-color: $blue.600');
});

test('tailwind plain config helper does not include default palette refs', () => {
  const transform = createTailwindStyleTransform(createTailwindStyleConfig({}));
  const ui = createStyleFn({
    selectors: TailwindSelectors,
    transform,
  }).style;
  const css = getSheetRules(ui({
    bg: '$blue.600' as any,
  })).map((item) => item.css).join('\n');

  includes(css, 'background-color: $blue.600');
});

test('tailwind preset extends default scales with custom scale entries', () => {
  const transform = createTailwindStyleTransform(createDefaultedTailwindStyleConfig({
    theme: {
      spacing: {
        18: '4.5rem',
      },
      sizes: {
        card: '22rem',
      },
    },
  }));
  const ui = createStyleFn({
    selectors: TailwindSelectors,
    transform,
  }).style;
  const css = getSheetRules(ui({
    size: '$12',
    p: '$18',
    minH: '$card',
  })).map((item) => item.css).join('\n');

  includes(css, 'width: 3rem');
  includes(css, 'height: 3rem');
  includes(css, 'padding: 4.5rem');
  includes(css, 'min-height: 22rem');
});

test('tailwind preset treats bare numbers as literal css numbers', () => {
  const transform = createTailwindStyleTransform(createDefaultedTailwindStyleConfig({}));
  const ui = createStyleFn({
    selectors: TailwindSelectors,
    transform,
  }).style;
  const css = getSheetRules(ui({
    px: 4,
    py: '$4',
    opacity: 0.5,
  })).map((item) => item.css).join('\n');

  includes(css, 'padding-inline: 4px');
  includes(css, 'padding-block: 1rem');
  includes(css, 'opacity: 0.5');
});

test('tailwind preset accepts fluentic tokens directly', () => {
  const accent = createToken('#16a34a');
  const transform = createTailwindStyleTransform(createDefaultedTailwindStyleConfig({}));
  const ui = createStyleFn({
    selectors: TailwindSelectors,
    transform,
  }).style;
  const css = getSheetRules(ui({ bg: accent })).map((item) => item.css).join('\n');

  includes(css, 'var(');
  includes(css, '#16a34a');
});

test('scope chains accept mixed style function items', () => {
  type CssStyle = {
    color?: string;
    padding?: number;
  };
  const Colors = createNamedTokens('test.tailwind.scope.color', {
    accent: '#2563eb',
  });
  const tw = createStyleFn({
    selectors: TailwindSelectors,
    transform: createTailwindStyleTransform(createDefaultedTailwindStyleConfig({
      theme: {
        colors: Colors,
      },
    })),
  }).style;
  const css = createStyleFn<CssStyle, typeof TailwindSelectors>({
    selectors: TailwindSelectors,
  }).style;
  const twSlot = tw.slot({
    bg: '$accent',
    px: '$4',
  });
  const cssSlot = css.slot({
    color: 'black',
    padding: 4,
  });

  const scope = css.scope().hover([
    twSlot({ bg: '$accent' }),
    cssSlot({ color: 'red' }),
  ]);
  tw.scope([
    cssSlot({ padding: 8 }),
  ]);
  const styles = {
    twSlot,
    cssSlot,
  };
  const scoped = combineStyle(styles, scope(twSlot));

  tw.scope().hover([
    twSlot({ px: '$6' }),
    cssSlot({ padding: 8 }),
  ]);

  // @ts-expect-error slot override call still owns its style shape
  twSlot({ color: 'red' });

  const rules = getSheetRules(scoped.twSlot).map((item) => item.css).join('\n');

  includes(rules, ':hover');
  includes(rules, 'background-color: var(');
});

test('named tokens use stable ids for theme overrides', () => {
  const first = createNamedTokens('test.named.color', {
    accent: '#2563eb',
  });
  const second = createNamedTokens('test.named.color', {
    accent: '#2563eb',
  });
  const styles = {
    root: style.slot({
      color: first.accent,
    }),
  };
  const themed = createTheme([
    second.accent('#60a5fa'),
  ]);
  const result = getClassName(styles.root);
  const rule = createThemeRule(themed);

  includes(result.className ?? '', 'color');
  includes(rule, '--token-test-named-color-accent-');
  includes(rule, ':#60a5fa');
});

test('dev debug transform traces imported selector constants', () => {
  let error: unknown = null;

  try {
    injectStyleDebugData(
      `
import { style } from '@fluentic/style';
import { invalidSelect } from './fixtures/selector_values';

const rule = style({ color: 'red' }).select(invalidSelect, { color: 'blue' });
`,
      testDir + '/debug-invalid-imported-selector.ts',
    );
  } catch (err: unknown) {
    error = err;
  }

  assertCompileError(error, 'Invalid selector\n\nstyle.select(".parent .child")');
  assertCompileError(error, 'Selector must target the current element only');
});

test('dev debug transform can skip build-time selector checks', () => {
  const result = injectStyleDebugData(
    `
import { style } from '@fluentic/style';

const rule = style({ color: 'red' }).select('.parent .child', { color: 'blue' });
`,
    '/tmp/debug-skip-invalid-selector.ts',
    { checkSelector: false },
  );

  includes(result.code, ".select('.parent .child'");
});

test('dev debug transform force mode rejects unresolved selector args', () => {
  let error: unknown = null;

  try {
    injectStyleDebugData(
      `
import { style } from '@fluentic/style';

export function makeRule(selector: string) {
  return style({ color: 'red' }).select(selector, { color: 'blue' });
}
`,
      '/tmp/debug-force-unresolved-selector.ts',
      { checkSelector: 'force' },
    );
  } catch (err: unknown) {
    error = err;
  }

  assertCompileError(error, 'Invalid selector\n\nstyle.select(...)');
  assertCompileError(error, 'Selector argument must be statically analyzable');
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
  equal(seenSourceUrl, 'source:///src/page.tsx');
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

test('runtime selector checks stay on in dev unless plugin selector checking is forced', () => {
  configureTestRuntime({ dev: true });
  equal(DEV_CONFIG.isCheckSelectorEnabled, true);

  setBuildMeta({ dev: true, extract: false, hoist: false, rsc: false, css: null });
  equal(DEV_CONFIG.isCheckSelectorEnabled, true);

  setBuildMeta({ dev: true, extract: false, hoist: false, rsc: false, checkSelector: 'force', css: null });
  equal(DEV_CONFIG.isCheckSelectorEnabled, false);

  setBuildMeta(null);
  configureTestRuntime({ dev: false });
});

test('runtime dev defaults enable local class name hashing', () => {
  configureTestRuntime({ dev: true });

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

  configureTestRuntime({ dev: false });

  notEqual(getRuntimeClassName(first), getRuntimeClassName(second));
});

test('runtime local class name can be disabled in dev', () => {
  configureTestRuntime({ dev: true });
  DEV_CONFIG.isLocalClassNameEnabled = false;

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

  configureTestRuntime({ dev: false });

  equal(getRuntimeClassName(first), getRuntimeClassName(second));
});

test('runtime local class name does not affect dedupe key', () => {
  configureTestRuntime({ dev: true });

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

  configureTestRuntime({ dev: false });

  notEqual(getRuntimeClassName(first), getRuntimeClassName(second));
  equal(getRuntimeDedupe(first), getRuntimeDedupe(second));
});

test('runtime config resets scope target prefix to default when omitted', () => {
  configureTestRuntime({ css: { scopeClassNameFormat: 'scope-(className)' } });
  equal(CSS_CONFIG.scopeClassNameFormat, 'scope-(className)');

  configureTestRuntime({ dev: false });
  equal(CSS_CONFIG.scopeClassNameFormat, undefined);
  equal(getScopeParentClassName('hover-bg'), '-hover-bg');
});

test('transform classNameValue customizes runtime debug class names', () => {
  configureTestRuntime({ dev: true });

  const { style: namedStyle } = createStyleFn({
    selectors: TailwindSelectors,
    transform: {
      transform() {
        return {
          color: classNameValue('red', 'text-danger'),
        };
      },
    },
  });

  const result = getClassName(namedStyle({ color: 'ignored' }));

  configureTestRuntime({ dev: false });

  includes(result.className ?? '', 'text-danger-');
  notIncludes(result.className ?? '', 'color-red-');
});

test('runtime debug class names use short hashes', () => {
  configureTestRuntime({ dev: true });

  const result = getClassName(style({
    color: classNameValue('red', 'text-danger'),
  }));
  const markerClassName = getElementClassName(
    'Button',
    '/src/App.tsx\n10:5',
    null,
  );

  configureTestRuntime({ dev: false });

  const classNameHash = result.className?.match(/text-danger--([a-zA-Z0-9]+)\b/)?.[1];
  const markerHash = markerClassName.match(/@button--([a-zA-Z0-9]+)\b/)?.[1];

  equal(classNameHash?.length, 3);
  equal(markerHash?.length, 3);
});

test('runtime debug hash length can be configured', () => {
  configureTestRuntime({ dev: true, hashLength: 5 });

  const result = getClassName(style({
    color: classNameValue('red', 'text-danger'),
  }));

  configureTestRuntime({ dev: false });

  const classNameHash = result.className?.match(/text-danger--([a-zA-Z0-9]+)\b/)?.[1];

  equal(classNameHash?.length, 5);
});

test('runtime debug hash length falls back to css hash length', () => {
  configureTestRuntime({ dev: true, css: { hashLength: 4 } });

  const cssResult = getClassName(style({
    color: classNameValue('red', 'text-danger'),
  }));
  const cssClassName = cssResult.className;

  configureTestRuntime({ dev: true, css: { hashLength: 4 }, hashLength: 5 });

  const devResult = getClassName(style({
    color: classNameValue('blue', 'text-info'),
  }));

  configureTestRuntime({ dev: false });

  const cssHash = cssClassName?.match(/text-danger--([a-zA-Z0-9]+)\b/)?.[1];
  const devHash = devResult.className?.match(/text-info--([a-zA-Z0-9]+)\b/)?.[1];

  equal(cssHash?.length, 4);
  equal(devHash?.length, 5);
});

test('class name builder preserves input tokens as debug class labels', () => {
  configureTestRuntime({ dev: true });

  const { className: cx } = createClassNameFn({
    selectors: TailwindSelectors,
    transform: createTailwindClassNameTransform(createTailwindStyleConfig({})),
  });
  const result = getClassName(cx('flex', 'items-center'));

  configureTestRuntime({ dev: false });

  includes(result.className ?? '', 'flex-');
  includes(result.className ?? '', 'items-center-');
  notIncludes(result.className ?? '', 'display-flex-');
  notIncludes(result.className ?? '', 'align-items-center-');
});

test('class name debug data maps emitted rules to source class tokens', () => {
  configureTestRuntime({ dev: true });

  const { className: cx } = createClassNameFn({
    selectors: TailwindSelectors,
    transform: classNameTransform({
      transform(className: string) {
        if (className === 'flex') return { display: 'flex' };
        if (className === 'text-danger') return { color: 'red' };
        return {};
      },
    }),
  });
  const css = cx('flex', 'text-danger', {
    $$debug: true,
    loc: [1, 1],
    label: ['cx', 'cx', 'class-name.ts'],
    classNames: {
      flex: [10, 7],
      'text-danger': [11, 7],
    },
    sourceUrl: '/src/class-name.ts',
  } as any);
  const rules = getSheetRules(css);
  const displayRule = rules.find((rule) => rule.css.includes('display: flex'));
  const colorRule = rules.find((rule) => rule.css.includes('color: red'));

  configureTestRuntime({ dev: false });

  equal(displayRule?.callsite?.line, 10);
  equal(colorRule?.callsite?.line, 11);
});

test('dev debug transform injects class token locations for class name builders', () => {
  const { className: cx } = createClassNameFn({
    selectors: TailwindSelectors,
    transform: classNameTransform({
      transform(className: string) {
        return className === 'flex' ? { display: 'flex' } : { color: 'red' };
      },
    }),
  });
  const result = injectStyleDebugData(
    `
import { cx } from './style';

const root = cx('flex', 'text-danger');
`,
    '/tmp/class-name-debug.ts',
    {
      importSources: [{
        source: './style',
        name: 'cx',
        styleFn: cx,
      }],
    },
  );

  includes(result.code, 'classNames');
  includes(result.code, '"flex"');
  includes(result.code, '"text-danger"');
});

test('transformClassNameFormat controls transform-returned class name labels', () => {
  configureTestRuntime({
    dev: true,
    css: {
      transformClassNameFormat: '$hash--(className)',
    },
  });

  const result = getClassName(style({
    color: classNameValue('red', 'text-danger'),
  }));

  configureTestRuntime({ dev: false });

  includes(result.className ?? '', '--text-danger');
});

test('runtime config preserves layer placeholder for priority expansion', () => {
  configureTestRuntime({
    css: {
      layers: ['reset', '$layer', 'overrides'],
      layerNamespace: 'app',
    },
  });
  equal(CSS_CONFIG.layers?.join(','), 'reset,$layer,overrides');

  configureTestRuntime({ dev: false });
  equal(CSS_CONFIG.layers?.join(','), '$layer');
});

test('style prop sheet rules dedupe by declaration identity without callsite', () => {
  configureTestRuntime({ dev: true });

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

  configureTestRuntime({ dev: false });

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
