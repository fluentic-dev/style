import { RUNTIME_CONFIG } from '../../config';
import type { SheetCallsite, SheetRule } from '../../sheet';
import { createSourceMapComment, type SourcemapRule } from '../../sheet/sourcemap';
import { createStyleTag } from '../../sheet/utils';
import { globalData } from '../../utils/global';
import { hashString } from '../../utils/hash';
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

const ELEMENT_MARKER_SHEET = globalData<{
  sheet: ElementMarkerSheet | null;
}>(
  'runtime.elementMarkerSheet',
  () => ({ sheet: null }),
);

export function createElementMarkerClassName(
  debug: ElementDebugData | undefined,
) {
  if (!RUNTIME_CONFIG.isDev || !RUNTIME_CONFIG.debugElementClassName) return null;

  const callsite = getElementCallsite(debug);
  if (!callsite) return null;

  const label = sanitizeMarkerLabel(debug?.label) || getFileLabel(callsite.filePath);
  const hash = hashString(`${callsite.filePath}\n${callsite.line}:${callsite.column}`);
  const className = sanitizeMarkerClassName(
    `${RUNTIME_CONFIG.debugElementClassNamePrefix}${label}-${hash}`,
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

  const data = value as Partial<ElementDebugData>;

  return data.$$elementDebug === true &&
    Array.isArray(data.loc) &&
    typeof data.label === 'string' &&
    typeof data.sourceUrl === 'string';
}

function insertElementMarkerRule(
  className: string,
  callsite: SheetCallsite,
) {
  if (typeof document === 'undefined') return;

  const rule: SheetRule = {
    key: `element-marker:${className}`,
    css: `.${escapeCssIdent(className)}{--fluentic-element-marker:0}`,
    callsite,
  };
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

  if (!RUNTIME_CONFIG.isSourcemapEnabled) return css;

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

function getFileLabel(filePath: string) {
  const normalized = filePath.split(/[?#]/, 1)[0] || filePath;
  const fileName = normalized.split(/[\\/]/).pop() || 'element';
  const index = fileName.lastIndexOf('.');

  return sanitizeMarkerLabel(index > 0 ? fileName.slice(0, index) : fileName) || 'element';
}

function sanitizeMarkerLabel(value: string | undefined) {
  if (!value) return '';

  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^_a-zA-Z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function sanitizeMarkerClassName(value: string) {
  const normalized = value
    .replace(/[^_a-zA-Z0-9@-]+/g, '-')
    .replace(/^-+/, '');

  return /^[a-zA-Z_@-]/.test(normalized) ? normalized : `_${normalized}`;
}

function escapeCssIdent(value: string) {
  let escaped = '';

  for (let i = 0; i < value.length; i++) {
    const char = value[i];

    if (/[_a-zA-Z0-9-]/.test(char)) {
      escaped += char;
    } else {
      escaped += `\\${char}`;
    }
  }

  return escaped;
}
