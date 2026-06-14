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
import {
  createExtractedScope,
  createExtractedSlot,
  createExtractedStyle,
  createExtractedToken,
  withTokens,
} from '../builder/extract';
import type { CompilerOptions } from '../compiler';
import { configureRuntime, RUNTIME_CONFIG } from '../config';
import { setBuildMeta } from '../config/build';
import { traceDevSourcemaps } from '../dev/trace';
import { enableDevUtils } from '../dev/utils';
import { createPluginCompiler, createTransformFilter, getRuntimeImportAliases } from '../plugin/utils';
import { normalizeSidecarRoutePath } from '../plugin/utils/sidecar/utils';
import { plugin as viteStylePlugin } from '../plugin/vite';
import { prependWebpackRuntimeEntry } from '../plugin/webpack/utils';
import { createCombinedStylePool } from '../runtime/core/cache/pool';
import { resolveStyleProp } from '../runtime/core/cache/prop';
import { getCombinedStyleScopes } from '../runtime/core/combinedStyle';
import { getClassName } from '../runtime/core/getClassName';
import { getSheetRules } from '../runtime/core/getSheetRules';
import { transformElement } from '../runtime/core/jsx';
import { ELEMENT_CSS_DATA_ATTR } from '../runtime/rsc/constants';
import { transformElement as transformRscElement } from '../runtime/rsc/jsx';
import { clearRscStyleStore, getRscStyleCss } from '../runtime/rsc/styleStore';
import { createThemeRule, getGlobalSheet, setGlobalSheet } from '../runtime/sheet';
import { bindScope, type CombinedStyleFor, combineStyle, getToken } from '../runtime/style';
import { selector } from '../selector/selector';
import { createDevSheet, createProdSheet } from '../sheet';
import { getRuleCallsite } from '../sheet/sourcemap';
import { createTheme, createToken, createTokens } from '../style';
import { traceCallsite } from '../utils/trace';

export {
  bindScope,
  BUILDER_SLOT_ID,
  BUILDER_STATE,
  BUILDER_TYPE_SCOPE,
  clearRscStyleStore,
  combineStyle,
  configureRuntime,
  createCombinedStylePool,
  createDevSheet,
  createExtractedScope,
  createExtractedSlot,
  createExtractedStyle,
  createExtractedToken,
  createPluginCompiler,
  createProdSheet,
  createScopeBuilder,
  createSlotBuilder,
  createStyleBuilder,
  createTheme,
  createThemeRule,
  createToken,
  createTokens,
  createTransformFilter,
  ELEMENT_CSS_DATA_ATTR,
  enableDevUtils,
  fileURLToPath,
  getClassName,
  getCombinedStyleScopes,
  getGlobalSheet,
  getRscStyleCss,
  getRuleCallsite,
  getRuntimeImportAliases,
  getScopeParentClassName,
  getSheetRules,
  getToken,
  isSlotOverrideData,
  normalizeSidecarRoutePath,
  prependWebpackRuntimeEntry,
  readFileSync,
  resolveStyleProp,
  RUNTIME_CONFIG,
  selector,
  setBuildMeta,
  setGlobalSheet,
  traceCallsite,
  traceDevSourcemaps,
  transformElement,
  transformRscElement,
  viteStylePlugin,
  withTokens,
};

export type { BuilderData, DebugData, StyleData };

export const tests: [name: string, fn: () => void | Promise<void>][] = [];
export const testDir = fileURLToPath(new URL('.', import.meta.url));

type TestCompilerTransformResult = {
  code: string;
  map: string | null;
  css: string[];
};

type DebugTransformOptions = CompilerOptions & {
  rootDir?: string;
};

export const selectors = {
  hover: selector(':hover'),
  nthChild: selector(':nth-child($)', 'value'),
};

type SelectorTable = typeof selectors;
type StyleApi = ReturnType<typeof createStyleBuilder<Record<string, unknown>, SelectorTable>>;
type SlotApi = ReturnType<typeof createSlotBuilder<Record<string, unknown>, SelectorTable>>;
type ScopeApi = ReturnType<typeof createScopeBuilder<Record<string, unknown>, SelectorTable>>;

export const style = createStyleBuilder<Record<string, unknown>, SelectorTable>(
  selectors,
  null,
) as (StyleApi & { slot: SlotApi; scope: ScopeApi; });

style.slot = createSlotBuilder<Record<string, unknown>, typeof selectors>(selectors, null);
style.scope = createScopeBuilder<Record<string, unknown>, typeof selectors>(selectors);

export const styles = {
  container: style.slot({
    color: 'red',
  }),
  label: style.slot({
    color: 'black',
  }),
};

function assertCombineStyleTypes() {
  const combine = combineStyle.for(styles);
  const stylesInput: CombinedStyleFor<typeof styles> = combineStyle(styles);
  const combineInput: CombinedStyleFor<typeof combine> = combine();

  combine(stylesInput, combineInput);
}

void assertCombineStyleTypes;

export const theme = style.scope([
  styles.container({
    color: 'blue',
  }),
  styles.label({
    color: 'white',
  }),
]);

export const hoverTheme = style.scope().hover([
  styles.label({
    color: 'yellow',
  }),
]);

export function test(name: string, fn: () => void) {
  tests.push([name, fn]);
}

export function equal(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`expected ${String(expected)}, got ${String(actual)}`);
  }
}

export function deepEqual(actual: unknown, expected: unknown) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(`expected ${expectedJson}, got ${actualJson}`);
  }
}

export function notEqual(actual: unknown, expected: unknown) {
  if (actual === expected) {
    throw new Error(`expected ${String(actual)} not to equal ${String(expected)}`);
  }
}

export function includes(actual: string, expected: string) {
  if (!actual.includes(expected)) {
    throw new Error(`expected ${actual} to include ${expected}`);
  }
}

export function notIncludes(actual: string, expected: string) {
  if (actual.includes(expected)) {
    throw new Error(`expected ${actual} not to include ${expected}`);
  }
}

export function countOccurrences(actual: string, expected: string) {
  return actual.split(expected).length - 1;
}

export function before(actual: string, first: string, second: string) {
  const firstIndex = actual.indexOf(first);
  const secondIndex = actual.indexOf(second);

  if (firstIndex === -1 || secondIndex === -1 || firstIndex >= secondIndex) {
    throw new Error(`expected ${first} to appear before ${second} in ${actual}`);
  }
}

export function getLayerNameForRule(css: string, declaration: string) {
  const escapedDeclaration = declaration.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`@layer ([^{\\s]+) \\{[^}]*${escapedDeclaration}`).exec(css);

  if (!match) {
    throw new Error(`expected ${css} to include ${declaration} in a layer`);
  }

  return match[1];
}

export function getCallStringArgs(code: string, fnName: string) {
  const escapedFnName = fnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = code.matchAll(new RegExp(`${escapedFnName}\\("([^"]+)"`, 'g'));

  return Array.from(matches, (match) => match[1]);
}

export function assertCompileError(error: unknown, expectedMessage: string) {
  const message = error instanceof Error ? error.message : String(error);
  if (!error || !message.includes(expectedMessage)) {
    throw new Error(`expected compile error containing: ${expectedMessage}, got ${String(error)}`);
  }
}

export function assertRunTestsCallsite(callsite: { filePath?: string; } | null) {
  equal(callsite?.filePath?.includes('/tests/') && callsite?.filePath?.endsWith('.test.ts'), true);
  equal((callsite as BuilderCallsite | null)?.stack.split('\n').length, 2);
  notIncludes((callsite as BuilderCallsite | null)?.stack ?? '', 'runtimeCallsite');
  notIncludes((callsite as BuilderCallsite | null)?.stack ?? '', '$fn_');
}

export function getCssClassNames(rules: string[]) {
  return rules
    .map((rule) => rule.match(/\.([^.{\s]+)\{/)?.[1])
    .filter((className) => typeof className === 'string');
}

export function createCompiler(options: CompilerOptions = {}) {
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

export function injectStyleDebugData(
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

export function createDebugStyle(
  value: Record<string, unknown>,
  debug: DebugData,
): StyleData {
  return (style as unknown as (
    value: Record<string, unknown>,
    debug: DebugData,
  ) => StyleData)(value, debug);
}

export function createDebugSlot(
  value: Record<string, unknown>,
  debug: DebugData,
): SlotData {
  return (style.slot as unknown as (
    value: Record<string, unknown>,
    debug: DebugData,
  ) => SlotData)(value, debug);
}

export function getRuntimeCallsite(data: BuilderData, index = 0): BuilderCallsite | null {
  const item = data[BUILDER_STATE].items[index];

  if (!isRuntimeItem(item)) {
    throw new Error('expected runtime item with callsite');
  }

  return item.callsite;
}

export function getRuntimeClassName(data: BuilderData, index = 0) {
  const item = data[BUILDER_STATE].items[index];

  if (!isRuntimeItem(item)) {
    throw new Error('expected runtime item with className');
  }

  return item.className;
}

export function getRuntimeDedupe(data: BuilderData, index = 0) {
  const item = data[BUILDER_STATE].items[index];

  if (!isRuntimeItem(item)) {
    throw new Error('expected runtime item with dedupe');
  }

  return item.dedupe;
}

export function isRuntimeItem(item: unknown): item is RuntimeItem {
  return typeof item === 'object' && item !== null && 'callsite' in item;
}

export function isRuntimeScopeItem(item: unknown): item is RuntimeScopeItem {
  return typeof item === 'object' && item !== null && 'parentSelector' in item;
}

export function createFakeDocument() {
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

export function getInlineSourceMap(text: string) {
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

export async function withBrowserWindow<T>(
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

export function createFetchResponse(text: string, ok = true) {
  return {
    ok,
    text: async () => text,
  };
}

export class FakeText {
  parentNode: FakeElement | null = null;

  constructor(public data: string) {}

  get textContent() {
    return this.data;
  }

  set textContent(value: string) {
    this.data = value;
  }
}

export class FakeElement {
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

export class FakeFragment {
  childNodes: any[] = [];

  appendChild(child: any) {
    this.childNodes.push(child);
    return child;
  }
}

export async function runTests() {
  for (let i = 0, len = tests.length; i < len; i++) {
    const [name, fn] = tests[i];

    await fn();
    console.log('ok', name);
  }
}
