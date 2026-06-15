import {
  normalizeDebugKeywordValue,
  normalizePropertyName,
  sanitizeDebugPropertyName,
} from '../atomic/utils/debug';
import {
  assertCompileError,
  before,
  BUILDER_STATE,
  countOccurrences,
  createCompiler,
  createStyleFn,
  createTransformFilter,
  deepEqual,
  equal,
  fileURLToPath,
  getCallStringArgs,
  getCssClassNames,
  getRuntimeImportAliases,
  includes,
  notEqual,
  notIncludes,
  prependWebpackRuntimeEntry,
  readFileSync,
  selector,
  style,
  test,
  testDir,
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
  includes(result.code, 'true]');
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

test('compiler evaluates style.priority helper as static priority tuple', () => {
  const compiler = createCompiler({
    layer: false,
    css: { debugClassName: true },
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
  const compiler = createCompiler({ layer: false, styleFn: custom });
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
  includes(result.code, '[1, "--token-');
  includes(result.code, 'createExtractedToken(');
  includes(css, 'background-color: var(--token-');
  includes(css, ', var(--token-');
  includes(css, ', blue)');
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
  includes(result.code, 'withTokens');
  includes(result.code, "token('green')");
  notIncludes(result.code, "token('red')");
  notIncludes(result.code, 'createExtractedScope([token');
  before(result.code, "const token = createToken('blue'", 'const scope = withTokens');
});

test('compiler honors configured token variable prefix', () => {
  const compiler = createCompiler({
    layer: false,
    css: {
      debugClassName: true,
      localClassName: true,
      tokenVarPrefix: 'custom-token-',
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
  notIncludes(result.code, '[1, "--token-');
  notIncludes(css, 'background-color: var(--token-');
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
  const match = css.match(/background-color: var\((--token-[a-z0-9]+), var\(--token-[^,]+, blue\)/);

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

  includes(result.code, 'createExtractedStyle');
  includes(result.code, 'bg from');
  includes(result.code, "'url(' + bg + ')'");
  includes(result.code, '[1, "--token-');
  includes(css, 'background-color: coral');
  includes(css, 'background-image: var(--token-');
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
  includes(css, 'color: var(--token-');
  includes(css, 'background-color: white');
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
  includes(css, 'color: var(--token-');
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
  includes(result.code, '[1, "--token-');
  notIncludes(result.code, 'return style.scope');
  includes(css, 'color: var(--token-');
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
  includes(css, 'background-color: var(--token-');
  includes(css, 'gap: 12px');
  includes(css, 'min-height: 100vh');
  includes(css, 'color: red');
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

test('runtime import aliases split production extracted and runtime entries', () => {
  const extracted = getRuntimeImportAliases({
    dev: false,
    extract: true,
    hoist: true,
    rsc: false,
    css: null,
  });
  const prod = getRuntimeImportAliases({
    dev: false,
    extract: false,
    hoist: true,
    rsc: false,
    css: null,
  });
  const dev = getRuntimeImportAliases({
    dev: true,
    extract: false,
    hoist: true,
    rsc: false,
    css: null,
  });

  equal(extracted['@fluentic/style/jsx-runtime'], '@fluentic/style/jsx-runtime/extracted');
  equal(extracted['@fluentic/style/jsx-dev-runtime'], '@fluentic/style/jsx-dev-runtime/extracted');
  equal(prod['@fluentic/style/jsx-runtime'], '@fluentic/style/jsx-runtime/prod');
  equal(Object.keys(dev).length, 0);
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

test('compiler extracts style imports from server entry', () => {
  const compiler = createCompiler({ layer: false });
  const result = compiler.transform(
    `
import { style } from '@fluentic/style/server';

const rule = style.slot({ display: 'grid', gap: 16 });
`,
    '/tmp/compiler-server-entry.ts',
  );

  if (!result) throw new Error('expected compiler transform result');

  const css = result.css.join('\n');

  includes(css, 'display: grid');
  includes(css, 'gap: 16px');
  includes(result.code, 'createExtractedSlot');
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

  const textVar = css.match(/color: var\(--token-[^,]+, var\(--token-([^,)]+)/)?.[1];
  const bgVar = css.match(/background-color: var\(--token-[^,]+, var\(--token-([^,)]+)/)?.[1];

  if (!textVar || !bgVar) {
    throw new Error(`expected imported token styles in ${css}`);
  }

  notEqual(textVar, bgVar);
  includes(css, '--token-' + textVar + ':white');
  includes(css, '--token-' + bgVar + ':var(--token-');
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
  const themeTextVar = css.match(/(--token-[^:;{]+--color--text):#0f172a/)?.[1];
  const themeSurfaceVar = css.match(/(--token-[^:;{]+--color--surface):var\(--token-/)?.[1];
  const themeSpaceVar = css.match(/(--token-[^:;{]+--space--panel):32/)?.[1];
  const styleTextVar = css.match(/color: var\(--token-[^,]+, var\((--token-[^,)]+)/)?.[1];
  const styleSurfaceVar = css.match(/background-color: var\(--token-[^,]+, var\((--token-[^,)]+)/)?.[1];
  const styleSpaceVar = css.match(/padding: var\(--token-[^,]+, var\((--token-[^,)]+)/)?.[1];

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

test('compiler debug names keep common keyword values with tight property length', () => {
  const compiler = createCompiler({
    css: {
      debugClassName: true,
      debugPropertyLength: 8,
      debugValueLength: 10,
      layer: false,
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
  notIncludes(css, '.font-size-1\\.5rem-');
  includes(css, '.justify-center-');
  includes(css, '.overflow-hidden-');
  includes(css, '.pointer-none-');
  includes(css, '.text-transform-uppercase-');
});
