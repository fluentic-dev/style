import {
  compareLayerPriority,
  createLayerPool,
  getCssLayerName,
  getCssLayerOrderNames,
  getCssLayerOrderRule,
  type LayerPriority,
  wrapCssInLayer,
} from '../atomic/layer';
import { RUNTIME_CONFIG } from '../config';
import type { StyleSheet } from './types';

const noopSheet: StyleSheet = {
  updateLayers() {},
  insert() {},
  flush() {},
};

export function getSheetDocument(documentOverride?: Document | null) {
  if (documentOverride !== undefined) return documentOverride;
  if (typeof document === 'undefined') return null;

  return document;
}

export function createNoopSheet() {
  return noopSheet;
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

export function getLayerText(layers: readonly string[]) {
  return getCssLayerOrderRule(layers, getStyleLayerName());
}

export function createSheetLayerState() {
  const pool = createLayerPool();
  const lookup = new Map<string, LayerPriority>();
  let hasBaseLayer = false;

  const add = (priority: LayerPriority | null | undefined) => {
    if (!priority) return false;

    const key = priority.join('|');
    if (lookup.has(key)) return false;

    lookup.set(key, priority);
    return true;
  };

  const getNames = () => Array.from(lookup.values())
    .sort(compareLayerPriority)
    .map((priority) => pool.getLayerName(getStyleLayerName(), priority));

  const getName = (priority: LayerPriority | null | undefined) => {
    if (!priority) {
      hasBaseLayer = true;
      return getStyleLayerName();
    }

    add(priority);
    return pool.getLayerName(getStyleLayerName(), priority);
  };

  const getOrderNames = () => {
    const names = getNames();
    return hasBaseLayer ? [getStyleLayerName()].concat(names) : names;
  };

  return { add, getName, getNames: getOrderNames };
}

export function getLayerTextForNames(
  layers: readonly string[],
  layerNames: readonly string[],
) {
  const names = layerNames.length
    ? getCssLayerOrderNames(layers, layerNames)
    : layers.filter((layer) => layer !== '$layer');

  return names.length ? '@layer ' + names.join(', ') + ';' : '';
}

export function normalizeRule(rule: string | { css: string; }) {
  return typeof rule === 'string' ? rule : rule.css;
}

export function getStyleLayerName() {
  return getCssLayerName(RUNTIME_CONFIG.layerNamespace);
}

export function wrapRuleWithLayer(css: string, layerName = getStyleLayerName()) {
  return wrapCssInLayer(css, layerName);
}
