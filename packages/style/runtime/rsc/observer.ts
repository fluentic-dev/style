import { LayerDefaultLayers } from '../../atomic/layer';
import { isDebugData } from '../../builder/data/debug';
import { CSS_CONFIG } from '../../config/config/css';
import { DEV_CONFIG } from '../../config/config/dev';
import { getRuntimeDocument, onRuntimeDocumentChange } from '../../config/document';
import type { SheetCallsite, SheetRule } from '../../sheet';
import {
  getElementMarkerClassNameFromRule,
  insertElementMarkerSheetRule,
  isElementMarkerRule,
} from '../core/elementMarker';
import { getGlobalSheet } from '../sheet';
import {
  ELEMENT_CSS_DATA_ATTR,
  GLOBAL_RULES_ATTR,
  GLOBAL_SEED_ATTR,
  PRECOLLECT_LINK_TAG_ATTR,
  SEED_STYLE_TAG_ATTR,
  SEED_STYLE_TAG_HREF,
} from './constants';
import type { RscStylePayloadRule } from './getClassName';

let observer: MutationObserver | null = null;
let observerDocument: Document | null = null;
let observerRequested = false;
let scheduled = false;
let flushId = 0;

const pending = new Set<Element>();
const inserted = new Set<string>();
const globalRevisions = new Map<string, string>();
const globalPayloads = new Set<Element>();

export function startRscDevObserver(root?: ParentNode) {
  observerRequested = true;
  const document = getRuntimeDocument();
  if (!document) return;
  if (observerDocument !== document) {
    stopRscDevObserver();
    observerRequested = true;
  }
  if (observer) return;
  const Observer = document.defaultView?.MutationObserver;
  if (!Observer) return;
  observerDocument = document;

  const targetRoot = root ?? document;

  observer = new Observer((mutations) => {
    let changed = false;

    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        const target = mutation.target;

        if (
          target.nodeType === 1 &&
          ((target as Element).hasAttribute(ELEMENT_CSS_DATA_ATTR) ||
            (target as Element).hasAttribute(GLOBAL_RULES_ATTR))
        ) {
          collectPending(target as Element);
          changed = true;
        }

        continue;
      }

      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) {
          const target = mutation.target;
          if (target.nodeType === 1 && (target as Element).hasAttribute(GLOBAL_RULES_ATTR)) {
            globalPayloads.add(target as Element);
            changed = true;
          }
          return;
        }

        if (collectPending(node as Element)) {
          changed = true;
        }
      });
    }

    if (changed) scheduleFlush();
  });

  observer.observe(document.documentElement, {
    childList: true,
    attributes: true,
    subtree: true,
    attributeFilter: [ELEMENT_CSS_DATA_ATTR, GLOBAL_RULES_ATTR],
  });

  collectPending(targetRoot);
  scheduleFlush();
}

export function stopRscDevObserver() {
  observerRequested = false;
  observer?.disconnect();
  observer = null;
  observerDocument = null;

  pending.clear();
  inserted.clear();
  globalRevisions.clear();
  globalPayloads.clear();
  scheduled = false;
}

onRuntimeDocumentChange(() => {
  const active = observerRequested;
  stopRscDevObserver();
  if (active) startRscDevObserver();
});

function collectPending(root: ParentNode | Element): boolean {
  const before = pending.size + globalPayloads.size;

  const collectElement = (element: Element) => {
    if (element.hasAttribute(GLOBAL_RULES_ATTR)) globalPayloads.add(element);
    if (!element.hasAttribute(ELEMENT_CSS_DATA_ATTR)) return;

    pending.add(element);
  };

  if (root.nodeType === 1) {
    collectElement(root as Element);
  }

  root.querySelectorAll?.(`[${ELEMENT_CSS_DATA_ATTR}], [${GLOBAL_RULES_ATTR}]`).forEach((element) => {
    collectElement(element);
  });

  return pending.size + globalPayloads.size !== before;
}

function scheduleFlush() {
  if (scheduled) return;

  scheduled = true;
  queueMicrotask(flush);
}

function flush() {
  const id = ++flushId;

  scheduled = false;

  if (!observerDocument || observerDocument !== getRuntimeDocument()) {
    pending.clear();
    return;
  }

  if (!pending.size && !globalPayloads.size) return;

  const sheet = getGlobalSheet();
  sheet.updateLayers(CSS_CONFIG.layers || LayerDefaultLayers);

  const adopted: Element[] = [];
  for (const element of globalPayloads) {
    const batches = parseGlobalRulePayload(element.textContent);
    if (!batches) continue;
    if (!sheet.replaceRules) continue;
    for (const batch of batches) {
      if (globalRevisions.get(batch.owner) === batch.revision) continue;
      sheet.replaceRules('rsc-global:' + batch.owner, batch.rules);
      globalRevisions.set(batch.owner, batch.revision);
    }
    adopted.push(element);
  }
  globalPayloads.clear();

  const elements = Array.from(pending);
  pending.clear();

  for (const element of elements) {
    const payload = parseRscStylePayload(element.getAttribute(ELEMENT_CSS_DATA_ATTR));

    for (const rule of payload) {
      if (!rule.key || !rule.css || inserted.has(rule.key)) continue;

      inserted.add(rule.key);

      if (isElementMarkerRule(rule)) {
        if (DEV_CONFIG.isElementClassNameEnabled) {
          insertElementMarkerSheetRule(rule);
        } else {
          removeElementMarkerClass(element, rule);
        }
        continue;
      }

      sheet.insert(rule);
    }

    element.removeAttribute(ELEMENT_CSS_DATA_ATTR);
  }

  sheet.flush();
  for (const payload of adopted) {
    const id = payload.getAttribute(GLOBAL_RULES_ATTR);
    observerDocument.querySelectorAll(`[${GLOBAL_SEED_ATTR}]`).forEach((seed) => {
      if (seed.getAttribute(GLOBAL_SEED_ATTR) === id) {
        seed.removeAttribute(GLOBAL_SEED_ATTR);
        seed.textContent = '';
      }
    });
    // React owns these nodes in Flight. Keep the empty shells for reconciliation.
    payload.removeAttribute(GLOBAL_RULES_ATTR);
    payload.textContent = '';
  }
  cleanupInitialStyle();

  void id;
}

function cleanupInitialStyle() {
  const document = getRuntimeDocument();
  if (!document) return;
  if (document.querySelector(`[${ELEMENT_CSS_DATA_ATTR}]`)) return;

  document.querySelectorAll(getRscDevInitialStyleSelector()).forEach(
    (element) => {
      element.remove();
    },
  );
}

export function getRscDevInitialStyleSelector() {
  const selectors = [
    `[${PRECOLLECT_LINK_TAG_ATTR}]`,
    `[${SEED_STYLE_TAG_ATTR}]`,
    `[data-href="${SEED_STYLE_TAG_HREF}"]`,
  ];

  return selectors.join(', ');
}

export function parseRscStylePayload(value: string | null): SheetRule[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return parsed.map(normalizePayloadItem).filter((item) => item !== null);
  } catch {
    return [];
  }
}

function normalizePayloadItem(value: unknown): SheetRule | null {
  if (!value || typeof value !== 'object') return null;

  const rule = value as RscStylePayloadRule;

  if (typeof rule.key !== 'string' || typeof rule.css !== 'string') return null;
  if (rule.importantNative !== undefined && typeof rule.importantNative !== 'boolean') return null;
  if (rule.sheet !== undefined && typeof rule.sheet !== 'boolean') return null;
  if (
    rule.globalSheet !== undefined &&
    (!rule.globalSheet || typeof rule.globalSheet.id !== 'string' || !Number.isFinite(rule.globalSheet.order))
  ) return null;
  if (rule.important !== undefined && typeof rule.important !== 'boolean') return null;
  if (
    rule.layer !== undefined && rule.layer !== false && rule.layer !== 'style' && rule.layer !== 'sheet' &&
    !(typeof rule.layer === 'object' && rule.layer !== null && typeof rule.layer.name === 'string')
  ) return null;
  if (rule.debug !== undefined && rule.debug !== null && !isDebugData(rule.debug)) return null;
  if (rule.debugField !== undefined && rule.debugField !== null && typeof rule.debugField !== 'string') return null;

  return {
    key: rule.key,
    css: rule.css,
    priority: rule.priority,
    important: rule.important,
    importantNative: rule.importantNative,
    sheet: rule.sheet,
    globalSheet: rule.globalSheet,
    layer: rule.layer,
    callsite: normalizePayloadCallsite(rule.callsite),
    debug: rule.debug,
    debugField: rule.debugField,
  };
}

function normalizePayloadCallsite(value: unknown): SheetCallsite | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const callsite = value as Partial<SheetCallsite>;

  if (typeof callsite.filePath !== 'string') return undefined;
  if (typeof callsite.sourceUrl !== 'string') return undefined;
  if (typeof callsite.line !== 'number') return undefined;
  if (typeof callsite.column !== 'number') return undefined;

  return {
    filePath: callsite.filePath,
    sourceUrl: callsite.sourceUrl,
    sourceContent: typeof callsite.sourceContent === 'string' ? callsite.sourceContent : undefined,
    line: callsite.line,
    column: callsite.column,
  };
}

function removeElementMarkerClass(element: Element, rule: SheetRule) {
  const className = getElementMarkerClassNameFromRule(rule);
  if (!className) return;

  if ('classList' in element && element.classList) {
    element.classList.remove(className);
    return;
  }

  const value = element.getAttribute('class');
  if (!value) return;

  const next = value.split(/\s+/).filter((item) => item !== className).join(' ');

  if (next) {
    element.setAttribute('class', next);
  } else {
    element.removeAttribute('class');
  }
}

export function parseGlobalRulePayload(
  value: string | null,
): Array<{ owner: string; revision: string; rules: SheetRule[]; }> | null {
  try {
    const batches: unknown = JSON.parse(value ?? '');
    if (!Array.isArray(batches)) return null;
    const result: Array<{ owner: string; revision: string; rules: SheetRule[]; }> = [];
    for (const batch of batches) {
      if (
        !batch || typeof batch.owner !== 'string' || typeof batch.revision !== 'string' || !Array.isArray(batch.rules)
      ) return null;
      const rules = batch.rules.map(normalizePayloadItem);
      if (rules.some((rule: SheetRule | null) => !rule)) return null;
      result.push({ owner: batch.owner, revision: batch.revision, rules });
    }
    return result;
  } catch {
    return null;
  }
}
