import { RUNTIME_CONFIG } from '../../config';
import type { SheetRule } from '../../sheet';
import { getGlobalSheet } from '../sheet';
import { ELEMENT_CSS_DATA_ATTR, PRECOLLECT_LINK_TAG_ATTR, SEED_STYLE_TAG_ATTR } from './constants';

let observer: MutationObserver | null = null;
let scheduled = false;
let flushId = 0;

const pending = new Set<Element>();
const inserted = new Set<string>();

export function startRscDevObserver(root?: ParentNode) {
  if (typeof document === 'undefined') return;
  if (observer) return;

  const targetRoot = root ?? document;

  observer = new MutationObserver((mutations) => {
    let changed = false;

    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        const target = mutation.target;

        if (
          target instanceof Element &&
          target.hasAttribute(ELEMENT_CSS_DATA_ATTR)
        ) {
          pending.add(target);
          changed = true;
        }

        continue;
      }

      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;

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
    attributeFilter: [ELEMENT_CSS_DATA_ATTR],
  });

  collectPending(targetRoot);
  scheduleFlush();
}

export function stopRscDevObserver() {
  observer?.disconnect();
  observer = null;

  pending.clear();
  scheduled = false;
}

function collectPending(root: ParentNode | Element): boolean {
  const before = pending.size;

  const collectElement = (element: Element) => {
    if (!element.hasAttribute(ELEMENT_CSS_DATA_ATTR)) return;

    pending.add(element);
  };

  if (root instanceof Element) {
    collectElement(root);
  }

  root.querySelectorAll?.(`[${ELEMENT_CSS_DATA_ATTR}]`).forEach((element) => {
    collectElement(element);
  });

  return pending.size !== before;
}

function scheduleFlush() {
  if (scheduled) return;

  scheduled = true;
  queueMicrotask(flush);
}

function flush() {
  const id = ++flushId;

  scheduled = false;

  if (!pending.size) return;

  const sheet = getGlobalSheet();
  sheet.updateLayers(RUNTIME_CONFIG.layers);

  const elements = Array.from(pending);
  pending.clear();

  for (const element of elements) {
    const payload = parsePayload(element.getAttribute(ELEMENT_CSS_DATA_ATTR));

    for (const rule of payload) {
      if (!rule.key || !rule.css || inserted.has(rule.key)) continue;

      inserted.add(rule.key);
      sheet.insert(rule);
    }

    element.removeAttribute(ELEMENT_CSS_DATA_ATTR);
  }

  sheet.flush();
  cleanupInitialStyle();

  void id;
}

function cleanupInitialStyle() {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`[${ELEMENT_CSS_DATA_ATTR}]`)) return;

  document.querySelectorAll(`[${PRECOLLECT_LINK_TAG_ATTR}], [${SEED_STYLE_TAG_ATTR}]`).forEach(
    (element) => {
      element.remove();
    },
  );
}

function parsePayload(value: string | null): SheetRule[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isPayloadItem);
  } catch {
    return [];
  }
}

function isPayloadItem(value: unknown): value is SheetRule {
  if (!value || typeof value !== 'object') return false;

  const rule = value as SheetRule;

  if (typeof rule.key !== 'string' || typeof rule.css !== 'string') return false;

  if (!rule.callsite) return true;

  return (
    typeof rule.callsite === 'object' &&
    typeof rule.callsite.filePath === 'string' &&
    (
      rule.callsite.sourceUrl === undefined ||
      typeof rule.callsite.sourceUrl === 'string'
    ) &&
    typeof rule.callsite.line === 'number' &&
    typeof rule.callsite.column === 'number'
  );
}
