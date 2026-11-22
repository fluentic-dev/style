import { getLayerBlockCss, getLayerOrderCss } from '../../atomic/layer';
import { CSS_CONFIG, CSS_CONFIG_DEFAULT, isStyleLayerEnabled } from '../../config/config/css';
import { DEV_CONFIG } from '../../config/config/dev';
import { compareSheetRules } from '../ordering';
import type { SheetOptions, SheetRule, StyleSheet } from '../types';
import {
  createNoopSheet,
  createSheetLayerState,
  createStyleTag,
  getSheetLayerName,
  getSheetLayerNames,
  getSheetRuleLayerPriority,
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
  group: RuleGroup;
};

type RuleGroup = {
  rule: SheetRule;
  tags: DevRuleTag[];
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
  const groups: RuleGroup[] = [];
  const groupLookup = new Map<string, RuleGroup>();
  let hasSheetLayer = false;
  const namedLayers = new Set<string>();

  if (options.top) {
    insertStyleTagAtTop(document, layerTag);
  } else {
    insertStyleTagAfter(document, layerTag, null);
  }

  return {
    updateLayers(layers) {
      activeLayers = layers;
      const next = getLayerOrderCss(layers, rootLayer ?? getSheetLayerNames(layerState, hasSheetLayer, namedLayers));

      if (next === layerText) return;

      layerText = next;
      layerTag.textContent = next;
    },

    insert(rule) {
      const rawCss = normalizeRule(rule);
      const ruleKey = typeof rule === 'string' ? null : rule.key;

      if (ruleKey && inserted.has(ruleKey)) return;

      const priority = typeof rule === 'string'
        ? getSheetRuleLayerPriority(null, false)
        : getSheetRuleLayerPriority(rule.priority, rule.important);
      const ruleLayer = typeof rule === 'string' ? 'style' : rule.layer ?? 'style';
      if (ruleLayer === 'sheet') hasSheetLayer = true;
      if (typeof ruleLayer === 'object') namedLayers.add(ruleLayer.name);
      const layerName = rootLayer ?? (typeof ruleLayer === 'object'
        ? ruleLayer.name
        : ruleLayer === 'sheet'
        ? getSheetLayerName()
        : ruleLayer === false || !isStyleLayerEnabled()
        ? null
        : layerState.getName(priority));
      const nextLayerText = getLayerOrderCss(
        activeLayers,
        rootLayer ?? getSheetLayerNames(layerState, hasSheetLayer, namedLayers),
      );

      if (nextLayerText !== layerText) {
        layerText = nextLayerText;
        layerTag.textContent = nextLayerText;
      }

      const css = layerName ? getLayerBlockCss(layerName, rawCss) : rawCss;
      const key = typeof rule === 'string' ? css : ruleKey;

      if (key && inserted.has(key)) return;
      if (key) inserted.add(key);

      queued.push({
        css,
        rule: typeof rule === 'string' ? null : rule,
        group: getGroup(typeof rule === 'string' ? { css: rule } : rule),
      });
    },

    flush() {
      if (!queued.length) return;

      const touched = new Set<DevRuleTag>();
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
        const group = item.group;
        let active = group.tags[group.tags.length - 1];

        if (!active || active.count >= maxRules) {
          flushFragment();
          const index = groups.indexOf(group);
          let before: HTMLStyleElement | undefined;
          let previous: HTMLStyleElement = layerTag;
          for (let i = index + 1; i < groups.length; i++) {
            if (groups[i].tags.length) {
              before = groups[i].tags[0].tag;
              break;
            }
          }
          for (let i = index; i >= 0; i--) {
            const tags = groups[i].tags;
            if (tags.length) {
              previous = tags[tags.length - 1].tag;
              break;
            }
          }
          active = createDevTag(document, previous, {
            before,
            sourcemap,
            nonce: options.nonce,
            className: tagPrefix + 'rules',
            top: options.top,
          });
          group.tags.push(active);
        }

        if (fragmentTag !== active) {
          flushFragment();
          fragmentTag = active;
          fragment = document.createDocumentFragment();
        }

        insertDevRule(document, active, fragment!, item.css, item.rule);

        touched.add(active);
      }

      flushFragment();
      queued.length = 0;

      if (!sourcemap) return;

      for (const tag of touched) tag.updateSourceMap();
    },
  };

  function getGroup(rule: SheetRule) {
    // Layer-backed rules still need source ordering inside named/unlayered CSS.
    // Isolate each priority so late inserts never replay another priority's rules.
    const layer = rule.layer ?? 'style';
    const rank = layer === false || (layer === 'style' && !isStyleLayerEnabled())
      ? 2
      : layer === 'style' || (typeof layer === 'object' && layer.name === getStyleLayerName())
      ? 0
      : 1;
    const key = rank + ':' + getSheetRulePriority(rule.priority).join(',');
    const cached = groupLookup.get(key);
    if (cached) return cached;
    const group: RuleGroup = { rule, tags: [] };
    const index = groups.findIndex((existing) => compareSheetRules(rule, existing.rule) < 0);
    if (index < 0) groups.push(group);
    else groups.splice(index, 0, group);
    groupLookup.set(key, group);
    return group;
  }
}
