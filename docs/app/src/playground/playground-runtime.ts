import * as Babel from '@babel/standalone';
import {
  compareLayerPriority,
  createLayerPool,
  getLayerBlockCss,
  getLayerBundleCss,
  type LayerPriority,
} from '../../../../packages/style/atomic/layer';
import { createDebugPlugin } from '../../../../packages/style/compiler/transform/debug';
import { configureStyleRuntime } from '../../../../packages/style/config';
import { CSS_CONFIG, CSS_CONFIG_DEFAULT } from '../../../../packages/style/config/config/css';
import { DEV_CONFIG, IS_DEV, setDevRuntimeOptions } from '../../../../packages/style/config/config/dev';
import { getClassName } from '../../../../packages/style/runtime/core';
import { createTransformElement } from '../../../../packages/style/runtime/core/createTransformElement';
import {
  createElementMarkerRuleFromDebug,
  splitElementMarkerStyleProp,
} from '../../../../packages/style/runtime/core/elementMarker';
import { collectStylePropSheetRules } from '../../../../packages/style/runtime/sheet';
import { bindScope, combineStyle } from '../../../../packages/style/runtime/style';
import type { StyleProp } from '../../../../packages/style/runtime/types';
import type { SheetRule } from '../../../../packages/style/sheet';
import { style } from '../../../../packages/style/style';
import { createTheme, resetStyleThemeIdCounter } from '../../../../packages/style/style/theme';
import { resetStyleTokenIdCounter } from '../../../../packages/style/style/token';
import { createTokens } from '../../../../packages/style/style/tokens';
import { createToken } from '../../../../packages/style/style/value';

type PlaygroundFile = { name: string; code: string; };
type RuntimeRequest = { files: PlaygroundFile[]; config: Record<string, unknown>; };
type RuntimeSourcemapMode = 'style' | 'value';
export type RuntimeMarker = {
  className: string;
  css: string;
  filePath: string;
  html?: string;
  line: number;
  column: number;
};
type RuntimeResult = { html: string; css: string; markers: RuntimeMarker[]; };
type VNode = string | number | boolean | null | undefined | VElement | VNode[];
type VElement = {
  type: string | ((props: Record<string, unknown>) => VNode) | typeof Fragment;
  props: Record<string, unknown>;
  children: VNode[];
};

const Fragment = Symbol('Fragment');
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

export function runRuntime(request: RuntimeRequest): RuntimeResult {
  resetStyleTokenIdCounter();
  resetStyleThemeIdCounter();

  // Force options needed for the playground trace panel and class name readability.
  IS_DEV.isDev = true;
  configureStyleRuntime({ css: request.config });
  setDevRuntimeOptions({
    elementClassName: true,
    priorityMode: request.config.priorityMode === 'sort' ? 'sort' : 'layer',
    sourcemapMode: getRuntimeSourcemapMode(request.config.sourcemapMode),
  });

  const source = transformRuntimeSource(
    request.files,
    getRuntimeSourcemapMode(request.config.sourcemapMode),
  );

  const cssRules: SheetRule[] = [];
  const markerRules: SheetRule[] = [];
  const seen = new Set<string>();
  const seenMarkers = new Set<string>();
  const markerHtmlByKey = new Map<string, string>();

  function collectFromStyleProp(styleProp: StyleProp) {
    for (const rule of collectStylePropSheetRules(styleProp)) {
      if (isElementMarkerRule(rule)) {
        collectMarkerRule(rule);
        continue;
      }
      if (seen.has(rule.css)) continue;
      seen.add(rule.css);
      cssRules.push(rule);
    }
  }

  function collectMarkerRule(rule: SheetRule, html?: string) {
    const key = getMarkerRuleKey(rule);

    if (html) markerHtmlByKey.set(key, html);
    if (seenMarkers.has(key)) return key;

    seenMarkers.add(key);
    markerRules.push(rule);

    return key;
  }

  // Real getClassName wrapped to also collect CSS rules for the iframe stylesheet
  function wrappedGetClassName(styleProp: StyleProp, props: Record<string, unknown> = {}) {
    collectFromStyleProp(styleProp);
    return getClassName(styleProp, props as Parameters<typeof getClassName>[1]);
  }

  const transformPlaygroundElement = createTransformElement(wrappedGetClassName);

  // Real combineStyle wrapped to collect CSS for all slots up front
  function wrappedCombineStyle<T extends object>(styles: T, ...args: unknown[]): T {
    const result = combineStyle(styles, ...(args as any[]));

    for (const key of Object.keys(result as object)) {
      const styleProp = (result as Record<string, unknown>)[key];
      if (styleProp) collectFromStyleProp(styleProp as StyleProp);
    }

    return result as any;
  }

  function h(
    type: VElement['type'],
    props: Record<string, unknown> | null,
    ...children: VNode[]
  ): VElement {
    if (typeof type !== 'string') return { type, props: props ?? {}, children };

    const marker = splitElementMarkerStyleProp((props ?? {}).css as StyleProp);
    const markerRule = createElementMarkerRuleFromDebug(marker.debug);

    const transformed = transformPlaygroundElement({
      type: type as Parameters<typeof transformPlaygroundElement>[0]['type'],
      props: (props ?? {}) as Parameters<typeof transformPlaygroundElement>[0]['props'],
    });

    if (markerRule) {
      collectMarkerRule(
        markerRule.rule,
        createSimulatedElementHtml(type, transformed.props as Record<string, unknown>),
      );
    }

    return { type: transformed.type as string, props: transformed.props as Record<string, unknown> ?? {}, children };
  }

  const entry = new Function(
    'style',
    'combineStyle',
    'bindScope',
    'getClassName',
    'createToken',
    'createTokens',
    'createTheme',
    'h',
    'Fragment',
    source + `
return typeof renderApp === "function" ? renderApp
  : typeof App === "function" ? App
  : typeof Page === "function" ? Page
  : null;`,
  )(
    style,
    wrappedCombineStyle,
    bindScope,
    wrappedGetClassName,
    createToken,
    createTokens,
    createTheme,
    h,
    Fragment,
  ) as (() => VNode) | null;

  return {
    html: entry ? renderVNode(entry()) : '',
    css: formatRuntimeCss(cssRules),
    markers: formatMarkers(markerRules, markerHtmlByKey),
  };

  function renderVNode(value: VNode): string {
    if (value === null || value === undefined || typeof value === 'boolean') return '';
    if (typeof value === 'string' || typeof value === 'number') return escapeHtml(String(value));
    if (Array.isArray(value)) return value.map(renderVNode).join('');

    const { type, props, children } = value;

    if (type === Fragment) {
      return children.map(renderVNode).join('');
    }

    if (typeof type === 'function') {
      return renderVNode(type({ ...props, children: children.length <= 1 ? children[0] : children }));
    }

    const attrs = renderAttrs(props);
    const body = children.map(renderVNode).join('');

    return VOID_ELEMENTS.has(type)
      ? `<${type}${attrs}>`
      : `<${type}${attrs}>${body}</${type}>`;
  }

  function renderAttrs(props: Record<string, unknown>) {
    const attrs: string[] = [];
    const classNames: string[] = [];

    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined || value === false) continue;

      if (key === 'children' || key === 'key' || key.startsWith('on')) continue;

      if (key === 'css') {
        const result = wrappedGetClassName(value as StyleProp);
        if (result.className) classNames.push(result.className);
        continue;
      }

      if (key === 'className') {
        classNames.push(String(value));
        continue;
      }

      if (key === 'style' && value && typeof value === 'object') {
        attrs.push(`style="${escapeAttr(styleObjectToString(value as Record<string, unknown>))}"`);
        continue;
      }

      if (value === true) {
        attrs.push(key);
        continue;
      }

      attrs.push(`${toHtmlAttrName(key)}="${escapeAttr(String(value))}"`);
    }

    if (classNames.length) {
      attrs.unshift(`class="${escapeAttr(classNames.join(' '))}"`);
    }

    return attrs.length ? ' ' + attrs.join(' ') : '';
  }
}

function getMarkerRuleKey(rule: SheetRule) {
  return `${rule.key ?? rule.css}-${rule.callsite?.filePath ?? ''}-${rule.callsite?.line ?? 0}-${
    rule.callsite?.column ?? 0
  }`;
}

function isElementMarkerRule(rule: SheetRule) {
  return typeof rule.key === 'string' && rule.key.startsWith('element-marker:');
}

function formatMarkers(rules: SheetRule[], htmlByKey: ReadonlyMap<string, string>): RuntimeMarker[] {
  return rules
    .map((rule) => {
      const callsite = rule.callsite;
      const key = typeof rule.key === 'string' ? rule.key : '';
      if (!callsite || !key.startsWith('element-marker:')) return null;

      const marker: RuntimeMarker = {
        className: key.slice('element-marker:'.length),
        css: rule.css,
        filePath: callsite.filePath,
        line: callsite.line,
        column: callsite.column,
      };
      const html = htmlByKey.get(getMarkerRuleKey(rule));
      if (html) marker.html = html;

      return marker;
    })
    .filter((marker): marker is RuntimeMarker => marker !== null);
}

function createSimulatedElementHtml(type: string, props: Record<string, unknown> | null | undefined) {
  const attrs = getSimulatedElementAttrs(props);

  return VOID_ELEMENTS.has(type)
    ? `<${type}${attrs}>`
    : `<${type}${attrs}>...</${type}>`;
}

function getSimulatedElementAttrs(props: Record<string, unknown> | null | undefined) {
  if (!props) return '';

  const attrs: string[] = [];

  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'children' || key === 'key' || key === 'css' || key.startsWith('on')) continue;

    if (key === 'style' && value && typeof value === 'object') {
      attrs.push(`style="${escapeAttr(styleObjectToString(value as Record<string, unknown>))}"`);
      continue;
    }

    if (value === true) {
      attrs.push(toHtmlAttrName(key));
      continue;
    }

    attrs.push(`${toHtmlAttrName(key)}="${escapeAttr(String(value))}"`);
  }

  return attrs.length ? ' ' + attrs.join(' ') : '';
}

function formatRuntimeCss(rules: SheetRule[]) {
  const layerNamespace = CSS_CONFIG.layerNamespace ?? CSS_CONFIG_DEFAULT.layerNamespace ?? '';
  const layers = CSS_CONFIG.layers ?? CSS_CONFIG_DEFAULT.layers ?? [];
  const layerState = createLayerPool(layerNamespace);
  const sortedRules = rules
    .filter(hasLayerPriority)
    .slice()
    .sort((a, b) => compareLayerPriority(a.priority, b.priority));

  if (DEV_CONFIG.stylePriorityMode === 'layer') {
    return sortedRules
      .map((rule) => getLayerBlockCss(layerState.getName(rule.priority), rule.css))
      .join('\n');
  }

  if (CSS_CONFIG.layer === false) {
    return sortedRules.map((rule) => rule.css).join('\n');
  }

  return getLayerBundleCss(
    layers,
    layerNamespace,
    sortedRules.map((rule) => rule.css),
  );
}

function hasLayerPriority(rule: SheetRule): rule is SheetRule & { priority: LayerPriority; } {
  return !!rule.priority;
}

function stripModuleSyntax(code: string) {
  return code
    .replace(/import\s+[^;]+;\n?/g, '')
    .replace(/const\s+(_styleDebugSource(?:Url|Content)\b)/g, 'var $1')
    .replace(/export\s+function\s+/g, 'function ')
    .replace(/export\s+const\s+/g, 'const ')
    .replace(/export\s+let\s+/g, 'let ')
    .replace(/export\s+var\s+/g, 'var ');
}

function transformRuntimeSource(files: PlaygroundFile[], sourcemapMode: RuntimeSourcemapMode) {
  return files.map((file) => transformRuntimeFile(file, sourcemapMode)).join('\n\n');
}

function transformRuntimeFile(file: PlaygroundFile, sourcemapMode: RuntimeSourcemapMode) {
  const result = Babel.transform(file.code, {
    filename: file.name,
    plugins: [
      createDebugPlugin({
        options: {
          css: {},
          dev: { elementClassName: true, sourcemapMode },
        },
        projectDir: '/',
        sourceUrl: file.name,
        sourceContent: file.code,
        tracer: {
          resolveImport() {
            return null;
          },
        },
      }),
    ],
    presets: [
      ['typescript', { allExtensions: true, isTSX: true }],
      ['react', { pragma: 'h', pragmaFrag: 'Fragment', runtime: 'classic' }],
    ],
    sourceMaps: false,
  });

  return `/* ${file.name} */\n${stripModuleSyntax(result.code ?? file.code)}`;
}

function getRuntimeSourcemapMode(mode: unknown): RuntimeSourcemapMode {
  return mode === 'value' ? 'value' : 'style';
}

function toHtmlAttrName(name: string) {
  if (name === 'htmlFor') return 'for';
  if (name === 'className') return 'class';
  return name.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
}

function styleObjectToString(styleObj: Record<string, unknown>) {
  return Object.entries(styleObj)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${toHtmlAttrName(key)}:${String(value)}`)
    .join(';');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}
