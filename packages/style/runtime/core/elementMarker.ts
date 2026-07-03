import { getElementClassName } from '../../atomic/element';
import { CSS_CONFIG } from '../../config/config/css';
import { DEV_CONFIG } from '../../config/config/dev';
import type { ElementClassNameFormat } from '../../config/types';
import type { SheetCallsite, SheetRule } from '../../sheet';
import { createDevSheet } from '../../sheet';
import { globalData } from '../../utils/global';
import { createElementMarkerRule } from '../sheet/element';
import type { ElementDebugData } from '../types';
export { type ElementMarkerStyleProp, isElementDebugData, splitElementMarkerStyleProp } from './elementMarkerData';

type ElementMarkerSheet = {
  document: Document;
  sheet: ReturnType<typeof createDevSheet>;
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

  const marker = createElementMarkerRuleFromDebug(debug);
  if (!marker) return null;

  insertElementMarkerSheetRule(marker.rule);

  return marker.className;
}

export function insertElementMarkerSheetRule(
  rule: SheetRule,
  documentOverride?: Document,
) {
  const document = documentOverride ?? (
    typeof globalThis.document === 'undefined' ? null : globalThis.document
  );
  if (!document) return;

  const className = getElementMarkerClassNameFromRule(rule);
  if (!className) return;

  const sheet = getElementMarkerSheet(document);

  sheet.classNames.add(className);
  sheet.sheet.insert(rule);
  sheet.sheet.flush();
}

export function createElementMarkerRuleFromDebug(
  debug: ElementDebugData | undefined,
) {
  const callsite = getElementCallsite(debug);
  if (!callsite) return null;

  const className = getElementClassName(
    debug?.label,
    getElementCallsiteId(callsite),
    CSS_CONFIG.elementClassNameFormat as ElementClassNameFormat | undefined || null,
  );

  return {
    className,
    rule: createElementMarkerRule(className, callsite),
  };
}

export function isElementMarkerRule(rule: SheetRule) {
  return typeof rule.key === 'string' && rule.key.startsWith('element-marker:');
}

export function getElementMarkerClassNameFromRule(rule: SheetRule) {
  if (!isElementMarkerRule(rule)) return null;

  return rule.key!.slice('element-marker:'.length) || null;
}

function getElementMarkerSheet(document: Document) {
  const current = ELEMENT_MARKER_SHEET.sheet;
  if (current?.document === document) return current;

  const sheet: ElementMarkerSheet = {
    document,
    sheet: createDevSheet({
      document,
      tagName: 'element-marker',
      top: true,
    }),
    classNames: new Set(),
  };

  ELEMENT_MARKER_SHEET.sheet = sheet;

  return sheet;
}

export function clearElementMarkers(documentOverride?: Document | null) {
  const sheet = ELEMENT_MARKER_SHEET.sheet;
  const document = documentOverride ?? sheet?.document ?? (
    typeof globalThis.document === 'undefined' ? null : globalThis.document
  );

  if (!sheet) {
    removeElementMarkerTags(document);
    return;
  }

  stripElementMarkerClasses(document, sheet.classNames);
  sheet.sheet.destroy?.();
  sheet.classNames.clear();
  ELEMENT_MARKER_SHEET.sheet = null;
}

function removeElementMarkerTags(document: Document | null | undefined) {
  if (!document) return;

  const head = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
  const nodes = Array.from(head.childNodes);

  for (let i = 0, len = nodes.length; i < len; i++) {
    const node = nodes[i] as HTMLElement;

    if (typeof node.getAttribute !== 'function') continue;
    const sheetName = node.getAttribute('data-css-sheet');
    if (sheetName !== 'element-marker' && !sheetName?.startsWith('element-marker ')) continue;

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
