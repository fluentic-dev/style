import * as Babel from '@babel/standalone';
import {
  compareLayerPriority,
  createLayerPool,
  getLayerBlockCss,
  getLayerBundleCss,
  type LayerPriority,
} from '../../../../packages/style/atomic/layer';
import { configureRuntime } from '../../../../packages/style/config';
import { RUNTIME_CONFIG } from '../../../../packages/style/config/config';
import { getClassName } from '../../../../packages/style/runtime/core';
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
type RuntimeResult = { html: string; css: string; };
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

  // Force options needed for the playground trace panel and class name readability
  configureRuntime({ ...request.config, dev: true, localClassName: true, debugClassName: true });

  const source = transformRuntimeSource(
    request.files
      .map((file) => `/* ${file.name} */\n${stripModuleSyntax(file.code)}`)
      .join('\n\n'),
  );

  const cssRules: SheetRule[] = [];
  const seen = new Set<string>();

  function collectFromStyleProp(styleProp: StyleProp) {
    for (const rule of collectStylePropSheetRules(styleProp)) {
      if (seen.has(rule.css)) continue;
      seen.add(rule.css);
      cssRules.push(rule);
    }
  }

  // Real getClassName wrapped to also collect CSS rules for the iframe stylesheet
  function wrappedGetClassName(styleProp: StyleProp, props: Record<string, unknown> = {}) {
    collectFromStyleProp(styleProp);
    return getClassName(styleProp, props as Parameters<typeof getClassName>[1]);
  }

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
    return { type, props: props ?? {}, children };
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

function formatRuntimeCss(rules: SheetRule[]) {
  const layerState = createLayerPool(RUNTIME_CONFIG.layerNamespace);
  const sortedRules = rules
    .filter(hasLayerPriority)
    .slice()
    .sort((a, b) => compareLayerPriority(a.priority, b.priority));

  if (RUNTIME_CONFIG.priorityMode === 'layer') {
    return sortedRules
      .map((rule) => getLayerBlockCss(layerState.getName(rule.priority), rule.css))
      .join('\n');
  }

  if (RUNTIME_CONFIG.layer === false) {
    return sortedRules.map((rule) => rule.css).join('\n');
  }

  return getLayerBundleCss(
    RUNTIME_CONFIG.layers,
    RUNTIME_CONFIG.layerNamespace,
    sortedRules.map((rule) => rule.css),
  );
}

function hasLayerPriority(rule: SheetRule): rule is SheetRule & { priority: LayerPriority; } {
  return !!rule.priority;
}

function stripModuleSyntax(code: string) {
  return code
    .replace(/import\s+[^;]+;\n?/g, '')
    .replace(/export\s+function\s+/g, 'function ')
    .replace(/export\s+const\s+/g, 'const ')
    .replace(/export\s+let\s+/g, 'let ')
    .replace(/export\s+var\s+/g, 'var ');
}

function transformRuntimeSource(source: string) {
  const result = Babel.transform(source, {
    filename: 'playground.tsx',
    presets: [
      ['typescript', { allExtensions: true, isTSX: true }],
      ['react', { pragma: 'h', pragmaFrag: 'Fragment', runtime: 'classic' }],
    ],
    sourceMaps: false,
  });

  return result.code ?? source;
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
