import { DEV_CONFIG } from '../../config/config/dev';

export function resolveDocument(documentOverride?: Document | null) {
  if (documentOverride !== undefined) return documentOverride;
  if (typeof document === 'undefined') return null;

  return document;
}

export function createStyleTag(
  document: Document,
  name: string,
  nonce = DEV_CONFIG.sheetStyleTagNonce,
) {
  const tag = document.createElement('style');

  tag.setAttribute('data-css-sheet', name);

  if (nonce) tag.setAttribute('nonce', nonce);

  return tag;
}

export function appendStyleTag(
  document: Document,
  tag: HTMLStyleElement,
) {
  const head = document.head || document.getElementsByTagName('head')[0] || document.documentElement;

  head.appendChild(tag);
}

export function insertStyleTagAfter(
  document: Document,
  tag: HTMLStyleElement,
  previous: HTMLStyleElement | null,
) {
  if (!previous || !previous.parentNode) {
    appendStyleTag(document, tag);
    return;
  }

  previous.parentNode.insertBefore(tag, previous.nextSibling);
}

export function insertStyleTagAtTop(
  document: Document,
  tag: HTMLStyleElement,
) {
  const head = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
  const first = getFirstCssSheetTag(head);

  if (first) {
    head.insertBefore(tag, first);
  } else {
    head.appendChild(tag);
  }
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
