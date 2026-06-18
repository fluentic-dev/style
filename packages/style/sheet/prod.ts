import { getLayerBlockCss, getLayerOrderCss } from '../atomic/layer';
import { CSS_CONFIG, CSS_CONFIG_DEFAULT } from '../config/config/css';
import type { SheetOptions, StyleSheet } from './types';
import {
  createNoopSheet,
  createSheetLayerState,
  createStyleTag,
  getSheetRulePriority,
  insertStyleTagAfter,
  normalizeRule,
  resolveDocument,
} from './utils';

export function createProdSheet(options: SheetOptions = {}): StyleSheet {
  const document = resolveDocument(options.document);

  if (!document) return createNoopSheet();

  const inserted = new Set<string>();
  const layerState = createSheetLayerState();

  let activeLayers: readonly string[] = CSS_CONFIG.layers ?? CSS_CONFIG_DEFAULT.layers ?? [];

  let layerText = '';
  let layerTag: HTMLStyleElement | null = null;
  let ruleTag: HTMLStyleElement | null = null;

  return {
    updateLayers(layers) {
      activeLayers = layers;

      const next = getLayerOrderCss(layers, layerState.getNames());
      if (next === layerText) return;

      layerText = next;
      layerTag = ensureLayerTag(document, layerTag, options.nonce);
      layerTag.textContent = next;
    },

    insert(rule) {
      const rawCss = normalizeRule(rule);
      const ruleKey = typeof rule === 'string' ? null : rule.key;

      if (ruleKey && inserted.has(ruleKey)) return;

      const priority = typeof rule === 'string' ? null : rule.priority;
      const layerName = layerState.getName(getSheetRulePriority(priority));

      const nextLayerText = getLayerOrderCss(
        activeLayers,
        layerState.getNames(),
      );

      if (nextLayerText !== layerText) {
        layerText = nextLayerText;
        layerTag = ensureLayerTag(document, layerTag, options.nonce);
        layerTag.textContent = nextLayerText;
      }

      const css = getLayerBlockCss(layerName, rawCss);
      const key = typeof rule === 'string' ? css : ruleKey;

      if (key && inserted.has(key)) return;
      if (key) inserted.add(key);

      const activeLayerTag = ensureLayerTag(document, layerTag, options.nonce);

      layerTag = activeLayerTag;

      if (!ruleTag) {
        ruleTag = createStyleTag(document, 'rules', options.nonce);
        insertStyleTagAfter(document, ruleTag, activeLayerTag);
      }

      insertRule(ruleTag, css);
    },

    flush() {},
  };
}

function ensureLayerTag(
  document: Document,
  tag: HTMLStyleElement | null,
  nonce?: string | null,
) {
  if (tag) return tag;

  const next = createStyleTag(document, 'layers', nonce);

  insertStyleTagAfter(document, next, null);

  return next;
}

function insertRule(tag: HTMLStyleElement, css: string) {
  const sheet = tag.sheet;

  if (sheet) {
    try {
      sheet.insertRule(css, sheet.cssRules.length);
      return;
    } catch {
      // Keep prod resilient. Invalid CSS should not break rendering.
    }
  }

  tag.appendChild(tag.ownerDocument.createTextNode(css));
}
