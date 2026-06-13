import { getLayerBlockCss, getLayerOrderCss } from '../atomic/layer';
import { RUNTIME_CONFIG } from '../config';
import { createSourceMapComment, getRuleCallsite, type SourcemapRule } from './sourcemap';
import type { SheetOptions, SheetRule, StyleSheet } from './types';
import {
  createNoopSheet,
  createStyleTag,
  createSheetLayerState,
  getSheetRulePriority,
  insertStyleTagAfter,
  normalizeRule,
  resolveDocument,
} from './utils';

type SourcemapTag = {
  tag: HTMLStyleElement;
  rules: SourcemapRule[];
  sourceMapNode: Text | null;
  count: number;
};

type QueuedRule = {
  css: string;
  rule: SheetRule | null;
};

const SOURCEMAP_TAGS: SourcemapTag[] = [];

export function getDevSourcemapTags() {
  return SOURCEMAP_TAGS;
}

export function createDevSheet(options: SheetOptions = {}): StyleSheet {
  const document = resolveDocument(options.document);

  if (!document) return createNoopSheet();

  const maxRules = Math.max(options.maxRules ?? RUNTIME_CONFIG.sheetMaxRules, 1);
  const sourcemap = options.sourcemap ?? RUNTIME_CONFIG.isSourcemapEnabled;
  const inserted = new Set<string>();
  const layerState = createSheetLayerState();
  const layerTag = createStyleTag(document, 'layers', options.nonce);
  const queued: QueuedRule[] = [];

  let layerText = '';
  let activeLayers: readonly string[] = RUNTIME_CONFIG.layers;
  let active: SourcemapTag | null = null;
  let lastTag: HTMLStyleElement = layerTag;

  insertStyleTagAfter(document, layerTag, null);

  return {
    updateLayers(layers) {
      activeLayers = layers;
      const next = getLayerOrderCss(layers, layerState.getNames());

      if (next === layerText) return;

      layerText = next;
      layerTag.textContent = next;
    },

    insert(rule) {
      const rawCss = normalizeRule(rule);
      const ruleKey = typeof rule === 'string' ? null : rule.key;

      if (ruleKey && inserted.has(ruleKey)) return;

      const priority = typeof rule === 'string' ? null : rule.priority;
      const layerName = layerState.getName(getSheetRulePriority(priority));
      const nextLayerText = getLayerOrderCss(activeLayers, layerState.getNames());

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

      const touched: SourcemapTag[] = [];
      let fragment: DocumentFragment | null = null;
      let fragmentTag: SourcemapTag | null = null;

      const flushFragment = () => {
        if (!fragment || !fragmentTag) return;

        if (
          fragmentTag.sourceMapNode &&
          fragmentTag.sourceMapNode.parentNode === fragmentTag.tag
        ) {
          fragmentTag.tag.insertBefore(fragment, fragmentTag.sourceMapNode);
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
          active = createDevTag(document, lastTag, sourcemap, options.nonce);
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
        updateSourceMap(touched[i]);
      }
    },
  };
}

function createDevTag(
  document: Document,
  previous: HTMLStyleElement,
  sourcemap: boolean,
  nonce?: string | null,
): SourcemapTag {
  const tag = createStyleTag(document, 'rules', nonce);
  const sourceMapNode = sourcemap ? document.createTextNode('') : null;

  if (sourceMapNode) tag.appendChild(sourceMapNode);

  insertStyleTagAfter(document, tag, previous);

  const item: SourcemapTag = {
    tag,
    rules: [],
    sourceMapNode,
    count: 0,
  };

  if (sourceMapNode) {
    SOURCEMAP_TAGS.push(item);
  }

  return item;
}

function insertDevRule(
  document: Document,
  item: SourcemapTag,
  fragment: DocumentFragment,
  css: string,
  rule: SheetRule | null,
) {
  const text = document.createTextNode(css + '\n');

  fragment.appendChild(text);

  item.rules.push({
    css,
    callsite: rule ? getRuleCallsite(rule.callsite, rule.debug) : null,
  });

  item.count++;
}

function updateSourceMap(item: SourcemapTag) {
  if (item.sourceMapNode) {
    if (item.sourceMapNode.parentNode !== item.tag) {
      item.tag.appendChild(item.sourceMapNode);
    }

    item.sourceMapNode.data = '\n' + createSourceMapComment(item.rules);
  }
}
