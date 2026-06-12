import { RUNTIME_CONFIG } from '../../config';
import type { DevCssRulePayload } from '../dev';
import { getGlobalSheet } from '../sheet';
import { CSS_DEV_ATTR, CSS_DEV_LINK_ATTR, CSS_DEV_STYLE_ATTR } from './constants';

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
          target.hasAttribute(CSS_DEV_ATTR)
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
    attributeFilter: [CSS_DEV_ATTR],
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
    if (!element.hasAttribute(CSS_DEV_ATTR)) return;

    pending.add(element);
  };

  if (root instanceof Element) {
    collectElement(root);
  }

  root.querySelectorAll?.(`[${CSS_DEV_ATTR}]`).forEach((element) => {
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
    const payload = parsePayload(element.getAttribute(CSS_DEV_ATTR));

    for (const [key, css, callsite, priority] of payload) {
      if (!key || !css || inserted.has(key)) continue;

      inserted.add(key);
      sheet.insert({ key, css, callsite, priority });
    }

    element.removeAttribute(CSS_DEV_ATTR);
  }

  sheet.flush();
  cleanupInitialStyle();

  void id;
}

function cleanupInitialStyle() {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`[${CSS_DEV_ATTR}]`)) return;

  document.querySelectorAll(`[${CSS_DEV_LINK_ATTR}], [${CSS_DEV_STYLE_ATTR}]`).forEach((element) => {
    element.remove();
  });
}

function parsePayload(value: string | null): DevCssRulePayload[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isPayloadItem);
  } catch {
    return [];
  }
}

function isPayloadItem(value: unknown): value is DevCssRulePayload {
  if (!Array.isArray(value)) return false;

  if (typeof value[0] !== 'string' || typeof value[1] !== 'string') return false;

  if (!value[2]) return true;

  return (
    typeof value[2] === 'object' &&
    value[2] !== null &&
    typeof value[2].filePath === 'string' &&
    (
      value[2].sourceUrl === undefined ||
      typeof value[2].sourceUrl === 'string'
    ) &&
    typeof value[2].line === 'number' &&
    typeof value[2].column === 'number'
  );
}
