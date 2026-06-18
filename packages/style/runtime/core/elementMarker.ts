import { getElementClassName } from '../../atomic/element';
import { CSS_CONFIG } from '../../config/config/css';
import { DEV_CONFIG } from '../../config/config/dev';
import type { ElementClassNameFormat } from '../../config/types';
import type { SheetCallsite, SheetRule } from '../../sheet';
import { createSourceMapComment, type SourcemapRule } from '../../sheet/sourcemap';
import { createStyleTag } from '../../sheet/utils';
import { globalData } from '../../utils/global';
import { createElementMarkerRule } from '../sheet/element';
import type { ElementDebugData, StyleProp } from '../types';

export type ElementMarkerStyleProp = {
  debug: ElementDebugData | undefined;
  styleProp: StyleProp | undefined;
};

type ElementMarkerSheet = {
  tag: HTMLStyleElement;
  rules: SourcemapRule[];
  inserted: Set<string>;
  classNames: Set<string>;
};

const ELEMENT_MARKER_SHEET = globalData<{ sheet: ElementMarkerSheet | null; }>(
  'runtime.elementMarkerSheet',
  () => ({ sheet: null }),
);

export function createElementMarkerClassName(
  debug: ElementDebugData | undefined,
) {
  if (!DEV_CONFIG.isDev || !DEV_CONFIG.isElementClassNameEnabled) return null;

  const callsite = getElementCallsite(debug);
  if (!callsite) return null;

  const className = getElementClassName(
    debug?.label,
    getElementCallsiteId(callsite),
    CSS_CONFIG.elementClassNameFormat as ElementClassNameFormat | undefined || null,
  );

  insertElementMarkerRule(className, callsite);

  return className;
}

export function splitElementMarkerStyleProp(styleProp: StyleProp): ElementMarkerStyleProp {
  if (isElementDebugData(styleProp)) {
    return { debug: styleProp, styleProp: undefined };
  }

  if (!Array.isArray(styleProp) || !isElementDebugData(styleProp[0])) {
    return { debug: undefined, styleProp };
  }

  return {
    debug: styleProp[0],
    styleProp: styleProp.length > 2 ? styleProp.slice(1) : styleProp[1] as StyleProp | undefined,
  };
}

export function isElementDebugData(value: unknown): value is ElementDebugData {
  if (!value || typeof value !== 'object') return false;

  return (value as Partial<ElementDebugData>).$$elementDebug === true;
}

function insertElementMarkerRule(
  className: string,
  callsite: SheetCallsite,
) {
  if (typeof document === 'undefined') return;

  const rule: SheetRule = createElementMarkerRule(className, callsite);

  const sheet = getElementMarkerSheet(document);

  if (rule.key && sheet.inserted.has(rule.key)) return;
  if (rule.key) sheet.inserted.add(rule.key);

  sheet.classNames.add(className);

  sheet.rules.push({
    css: rule.css,
    callsite,
  });

  sheet.tag.textContent = getElementMarkerCss(sheet.rules);
}

function getElementMarkerSheet(document: Document) {
  const current = ELEMENT_MARKER_SHEET.sheet;
  if (current?.tag.ownerDocument === document && current.tag.parentNode) return current;

  const tag = createStyleTag(document, 'element-marker');
  const sheet: ElementMarkerSheet = {
    tag,
    rules: [],
    inserted: new Set(),
    classNames: new Set(),
  };

  ELEMENT_MARKER_SHEET.sheet = sheet;

  insertElementMarkerTag(document, tag);

  return sheet;
}

export function clearElementMarkers(documentOverride?: Document | null) {
  const sheet = ELEMENT_MARKER_SHEET.sheet;
  const document = documentOverride ?? sheet?.tag.ownerDocument ?? (
    typeof globalThis.document === 'undefined' ? null : globalThis.document
  );

  if (!sheet) {
    removeElementMarkerTags(document);
    return;
  }

  stripElementMarkerClasses(document, sheet.classNames);
  sheet.tag.parentNode?.removeChild(sheet.tag);
  sheet.rules.length = 0;
  sheet.inserted.clear();
  sheet.classNames.clear();
  ELEMENT_MARKER_SHEET.sheet = null;
}

function insertElementMarkerTag(
  document: Document,
  tag: HTMLStyleElement,
) {
  const head = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
  const firstSheet = getFirstCssSheetTag(head);

  head.insertBefore(tag, firstSheet);
}

function getFirstCssSheetTag(head: HTMLElement) {
  const nodes = head.childNodes;

  for (let i = 0, len = nodes.length; i < len; i++) {
    const node = nodes[i] as HTMLElement;

    if (typeof node.getAttribute !== 'function') continue;
    if (node.getAttribute('data-css-sheet')) return node;
  }

  return null;
}

function getElementMarkerCss(rules: SourcemapRule[]) {
  const css = rules.map((rule) => rule.css).join('\n');

  if (!DEV_CONFIG.isSourcemapEnabled) return css;

  return css + '\n' + createSourceMapComment(rules);
}

function removeElementMarkerTags(document: Document | null | undefined) {
  if (!document) return;

  const head = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
  const nodes = Array.from(head.childNodes);

  for (let i = 0, len = nodes.length; i < len; i++) {
    const node = nodes[i] as HTMLElement;

    if (typeof node.getAttribute !== 'function') continue;
    if (node.getAttribute('data-css-sheet') !== 'element-marker') continue;

    node.parentNode?.removeChild(node);
  }
}

function stripElementMarkerClasses(
  document: Document | null | undefined,
  classNames: ReadonlySet<string>,
) {
  if (!document || !classNames.size) return;
  if (typeof document.querySelectorAll !== 'function') return;

  const nodes = document.querySelectorAll('[class]');

  for (let i = 0, len = nodes.length; i < len; i++) {
    stripElementClassNames(nodes[i] as HTMLElement, classNames);
  }
}

function stripElementClassNames(
  element: HTMLElement,
  classNames: ReadonlySet<string>,
) {
  if (element.classList) {
    classNames.forEach((className) => element.classList.remove(className));
    return;
  }

  const value = element.getAttribute('class');
  if (!value) return;

  const next = value.split(/\s+/).filter((className) => !classNames.has(className)).join(' ');

  if (next) {
    element.setAttribute('class', next);
  } else {
    element.removeAttribute('class');
  }
}

function getElementCallsite(
  debug: ElementDebugData | undefined,
): SheetCallsite | null {
  if (debug) {
    return {
      filePath: debug.sourceUrl,
      sourceUrl: debug.sourceUrl,
      sourceContent: debug.code,
      line: debug.loc[0],
      column: debug.loc[1],
    };
  }

  return null;
}

function getElementCallsiteId(callsite: SheetCallsite) {
  return `${callsite.filePath}\n${callsite.line}:${callsite.column}`;
}
