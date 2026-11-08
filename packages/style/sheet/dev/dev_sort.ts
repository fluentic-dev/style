import { compareLayerPriority, getLayerOrderCss, type LayerPriority } from '../../atomic/layer';
import { CSS_CONFIG, CSS_CONFIG_DEFAULT, isStyleLayerEnabled } from '../../config/config/css';
import { DEV_CONFIG } from '../../config/config/dev';
import type { SheetOptions, SheetRule, StyleSheet } from '../types';
import {
  createNoopSheet,
  createStyleTag,
  getSheetLayerName,
  getSheetRulePriority,
  getStyleLayerName,
  insertStyleTagAfter,
  insertStyleTagAtTop,
  normalizeRule,
  resolveDocument,
} from '../utils';
import { createDevTag, type DevRuleTag, insertDevRule } from './utils';

type QueuedRule = {
  css: string;
  rule: SheetRule | null;
  priority: LayerPriority;
  layer: 'style' | 'sheet' | false;
};

type SortGroup = {
  key: string;
  priority: LayerPriority;
  tags: DevRuleTag[];
  layer: 'style' | 'sheet' | false;
};

export function createDevSortSheet(options: SheetOptions = {}): StyleSheet {
  const document = resolveDocument(options.document);

  if (!document) return createNoopSheet();

  const maxRules = Math.max(options.maxRules ?? DEV_CONFIG.sheetMaxRules, 1);
  const sourcemap = options.sourcemap ?? DEV_CONFIG.isSourcemapEnabled;
  const inserted = new Set<string>();
  const queued: QueuedRule[] = [];
  const groups: SortGroup[] = [];
  const shouldLayer = isStyleLayerEnabled();
  const layerName = getStyleLayerName();
  const tagPrefix = options.tagName ? options.tagName + ' ' : '';
  let layerTag = shouldLayer ? createStyleTag(document, tagPrefix + 'layers', options.nonce) : null;
  let activeLayers: readonly string[] = CSS_CONFIG.layers ?? CSS_CONFIG_DEFAULT.layers ?? [];
  let layerText = '';
  let hasSheetLayer = false;

  if (layerTag) {
    if (options.top) {
      insertStyleTagAtTop(document, layerTag);
    } else {
      insertStyleTagAfter(document, layerTag, null);
    }
  }

  return {
    updateLayers(layers) {
      activeLayers = layers;
      updateLayerText();
    },

    insert(rule) {
      const css = normalizeRule(rule);
      const ruleKey = typeof rule === 'string' ? null : rule.key;

      if (ruleKey && inserted.has(ruleKey)) return;

      const key = typeof rule === 'string' ? css : ruleKey;

      if (key && inserted.has(key)) return;
      if (key) inserted.add(key);

      const requestedLayer = typeof rule === 'string' ? 'style' : rule.layer ?? 'style';
      const layer = requestedLayer === 'style' && !shouldLayer ? false : requestedLayer;
      if (layer === 'sheet') {
        hasSheetLayer = true;
        ensureLayerTag();
        updateLayerText();
      }

      queued.push({
        css,
        rule: typeof rule === 'string' ? null : rule,
        priority: getSheetRulePriority(
          typeof rule === 'string' ? null : rule.priority,
        ),
        layer,
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

      queued.sort((a, b) => compareLayerPriority(a.priority, b.priority));

      for (let i = 0, len = queued.length; i < len; i++) {
        const item = queued[i];
        const group = ensureGroup(groups, item.priority, item.layer);
        let active = group.tags[group.tags.length - 1] ?? null;

        if (!active || active.count >= maxRules) {
          flushFragment();
          active = createGroupTag(document, groups, group, {
            previous: layerTag,
            className: tagPrefix + 'rules ' + group.key,
            top: options.top,
            layerName: group.layer === 'style'
              ? layerName
              : group.layer === 'sheet'
              ? getSheetLayerName()
              : null,
            sourcemap,
            nonce: options.nonce,
          });
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

  function updateLayerText() {
    if (!layerTag) return;

    const names = [shouldLayer ? layerName : '', hasSheetLayer ? getSheetLayerName() : ''].filter(Boolean);
    const next = getLayerOrderCss(activeLayers, names);

    if (next === layerText) return;

    layerText = next;
    layerTag.textContent = next;
  }

  function ensureLayerTag() {
    if (layerTag) return;

    layerTag = createStyleTag(document!, tagPrefix + 'layers', options.nonce);
    if (options.top) {
      insertStyleTagAtTop(document!, layerTag);
    } else {
      insertStyleTagAfter(document!, layerTag, null);
    }
  }
}

function ensureGroup(
  groups: SortGroup[],
  priority: LayerPriority,
  layer: 'style' | 'sheet' | false,
) {
  const key = (layer === 'sheet' ? 'sheet-' : '') + getPriorityKey(priority);

  for (let i = 0, len = groups.length; i < len; i++) {
    const group = groups[i];
    const order = getLayerRank(layer) - getLayerRank(group.layer) || compareLayerPriority(priority, group.priority);

    if (order === 0 && layer === group.layer) return group;

    if (order < 0) {
      const next = { key, priority, tags: [], layer };
      groups.splice(i, 0, next);
      return next;
    }
  }

  const group = { key, priority, tags: [], layer };

  groups.push(group);

  return group;
}

function getLayerRank(layer: 'style' | 'sheet' | false) {
  return layer === 'style' ? 0 : layer === 'sheet' ? 1 : 2;
}

function createGroupTag(
  document: Document,
  groups: SortGroup[],
  group: SortGroup,
  options: {
    previous: HTMLStyleElement | null;
    className: string;
    top?: boolean;
    layerName: string | null;
    sourcemap: boolean;
    nonce?: string | null;
  },
) {
  const previous = getPreviousTag(groups, group, options.previous);
  const before = getNextTag(groups, group);
  const item = createDevTag(document, previous, {
    ...options,
    className: options.className,
    before: before?.tag ?? null,
    top: options.top,
    wrapper: options.layerName
      ? {
        before: '@layer ' + options.layerName + ' {\n',
        after: '}\n',
        sourceMapLineOffset: 1,
      }
      : undefined,
  });

  group.tags.push(item);

  return item;
}

function getPreviousTag(
  groups: SortGroup[],
  group: SortGroup,
  fallback: HTMLStyleElement | null,
) {
  const index = groups.indexOf(group);

  for (let i = index; i >= 0; i--) {
    const tags = groups[i].tags;
    const tag = tags[tags.length - 1];

    if (tag) return tag.tag;
  }

  return fallback;
}

function getNextTag(groups: SortGroup[], group: SortGroup) {
  const index = groups.indexOf(group);

  for (let i = index + 1, len = groups.length; i < len; i++) {
    const tag = groups[i].tags[0];

    if (tag) return tag;
  }

  return null;
}

function getPriorityKey(priority: LayerPriority) {
  return 'p-' + priority.join('-').replace(/^-/, 'n');
}
