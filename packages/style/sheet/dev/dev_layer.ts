import { getLayerBlockCss, getLayerOrderCss } from '../../atomic/layer';
import { CSS_CONFIG, CSS_CONFIG_DEFAULT } from '../../config/config/css';
import { DEV_CONFIG } from '../../config/config/dev';
import type { SheetOptions, SheetRule, StyleSheet } from '../types';
import {
  createNoopSheet,
  createSheetLayerState,
  createStyleTag,
  getSheetRulePriority,
  getStyleLayerName,
  insertStyleTagAfter,
  insertStyleTagAtTop,
  normalizeRule,
  resolveDocument,
} from '../utils';
import { createDevTag, type DevRuleTag, getDevSourcemapTags, insertDevRule, refreshDevSourcemapTags } from './utils';

type QueuedRule = {
  css: string;
  rule: SheetRule | null;
};

export { getDevSourcemapTags, refreshDevSourcemapTags };

export function createDevLayerSheet(options: SheetOptions = {}): StyleSheet {
  const document = resolveDocument(options.document);

  if (!document) return createNoopSheet();

  const maxRules = Math.max(options.maxRules ?? DEV_CONFIG.sheetMaxRules, 1);
  const sourcemap = options.sourcemap ?? DEV_CONFIG.isSourcemapEnabled;
  const inserted = new Set<string>();
  const layerState = createSheetLayerState();
  const tagPrefix = options.tagName ? options.tagName + ' ' : '';
  const rootLayer = tagPrefix === 'element-marker ' ? getStyleLayerName() : null;
  const layerTag = createStyleTag(document, tagPrefix + 'layers', options.nonce);
  const queued: QueuedRule[] = [];

  let layerText = '';
  let activeLayers: readonly string[] = CSS_CONFIG.layers ?? CSS_CONFIG_DEFAULT.layers ?? [];
  let active: DevRuleTag | null = null;
  let lastTag: HTMLStyleElement = layerTag;

  if (options.top) {
    insertStyleTagAtTop(document, layerTag);
  } else {
    insertStyleTagAfter(document, layerTag, null);
  }

  return {
    updateLayers(layers) {
      activeLayers = layers;
      const next = getLayerOrderCss(layers, rootLayer ?? layerState.getNames());

      if (next === layerText) return;

      layerText = next;
      layerTag.textContent = next;
    },

    insert(rule) {
      const rawCss = normalizeRule(rule);
      const ruleKey = typeof rule === 'string' ? null : rule.key;

      if (ruleKey && inserted.has(ruleKey)) return;

      const priority = typeof rule === 'string' ? null : rule.priority;
      const layerName = rootLayer ?? layerState.getName(getSheetRulePriority(priority));
      const nextLayerText = getLayerOrderCss(
        activeLayers,
        rootLayer ?? layerState.getNames(),
      );

      if (nextLayerText !== layerText) {
        layerText = nextLayerText;
        layerTag.textContent = nextLayerText;
      }

      const css = getLayerBlockCss(layerName, rawCss);
      const key = typeof rule === 'string' ? css : ruleKey;

      if (key && inserted.has(key)) return;
      if (key) inserted.add(key);

      queued.push({
        css,
        rule: typeof rule === 'string' ? null : rule,
      });
    },

    flush() {
      if (!queued.length) return;

      const touched: DevRuleTag[] = [];
      let fragment: DocumentFragment | null = null;
      let fragmentTag: DevRuleTag | null = null;

      const flushFragment = () => {
        if (!fragment || !fragmentTag) return;

        if (
          fragmentTag.insertBeforeNode &&
          fragmentTag.insertBeforeNode.parentNode === fragmentTag.tag
        ) {
          fragmentTag.tag.insertBefore(fragment, fragmentTag.insertBeforeNode);
        } else {
          fragmentTag.tag.appendChild(fragment);
        }

        fragment = null;
        fragmentTag = null;
      };

      for (let i = 0, len = queued.length; i < len; i++) {
        const item = queued[i];

        if (!active || active.count >= maxRules) {
          flushFragment();
          active = createDevTag(document, lastTag, {
            sourcemap,
            nonce: options.nonce,
            className: tagPrefix + 'rules',
            top: options.top,
          });
          lastTag = active.tag;
        }

        if (fragmentTag !== active) {
          flushFragment();
          fragmentTag = active;
          fragment = document.createDocumentFragment();
        }

        insertDevRule(document, active, fragment!, item.css, item.rule);

        if (touched[touched.length - 1] !== active) {
          touched.push(active);
        }
      }

      flushFragment();
      queued.length = 0;

      if (!sourcemap) return;

      for (let i = 0, len = touched.length; i < len; i++) {
        touched[i].updateSourceMap();
      }
    },
  };
}
