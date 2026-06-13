import { RUNTIME_CONFIG } from '../../config';

export function resolveDocument(documentOverride?: Document | null) {
  if (documentOverride !== undefined) return documentOverride;
  if (typeof document === 'undefined') return null;

  return document;
}

export function createStyleTag(
  document: Document,
  name: string,
  nonce = RUNTIME_CONFIG.sheetStyleTagNonce,
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
