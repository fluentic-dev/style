import { compareLayerPriority, type LayerPriority } from '../../atomic/layer';
import { RUNTIME_CONFIG } from '../../config';
import type { SheetOptions, SheetRule, StyleSheet } from '../types';
import {
  createNoopSheet,
  getSheetRulePriority,
  normalizeRule,
  resolveDocument,
} from '../utils';
import { createDevTag, insertDevRule, type DevRuleTag } from './utils';

type QueuedRule = {
  css: string;
  rule: SheetRule | null;
  priority: LayerPriority;
};

type SortGroup = {
  key: string;
  priority: LayerPriority;
  tags: DevRuleTag[];
};

export function createDevSortSheet(options: SheetOptions = {}): StyleSheet {
  const document = resolveDocument(options.document);

  if (!document) return createNoopSheet();

  const maxRules = Math.max(options.maxRules ?? RUNTIME_CONFIG.sheetMaxRules, 1);
  const sourcemap = options.sourcemap ?? RUNTIME_CONFIG.isSourcemapEnabled;
  const inserted = new Set<string>();
  const queued: QueuedRule[] = [];
  const groups: SortGroup[] = [];

  return {
    updateLayers() {},

    insert(rule) {
      const css = normalizeRule(rule);
      const ruleKey = typeof rule === 'string' ? null : rule.key;

      if (ruleKey && inserted.has(ruleKey)) return;

      const key = typeof rule === 'string' ? css : ruleKey;

      if (key && inserted.has(key)) return;
      if (key) inserted.add(key);

      queued.push({
        css,
        rule: typeof rule === 'string' ? null : rule,
        priority: getSheetRulePriority(
          typeof rule === 'string' ? null : rule.priority,
        ),
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

      queued.sort((a, b) => compareLayerPriority(a.priority, b.priority));

      for (let i = 0, len = queued.length; i < len; i++) {
        const item = queued[i];
        const group = ensureGroup(groups, item.priority);
        let active = group.tags[group.tags.length - 1] ?? null;

        if (!active || active.count >= maxRules) {
          flushFragment();
          active = createGroupTag(document, groups, group, {
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
}

function ensureGroup(
  groups: SortGroup[],
  priority: LayerPriority,
) {
  const key = getPriorityKey(priority);

  for (let i = 0, len = groups.length; i < len; i++) {
    const group = groups[i];
    const order = compareLayerPriority(priority, group.priority);

    if (order === 0) return group;

    if (order < 0) {
      const next = { key, priority, tags: [] };
      groups.splice(i, 0, next);
      return next;
    }
  }

  const group = { key, priority, tags: [] };

  groups.push(group);

  return group;
}

function createGroupTag(
  document: Document,
  groups: SortGroup[],
  group: SortGroup,
  options: {
    sourcemap: boolean;
    nonce?: string | null;
  },
) {
  const previous = getPreviousTag(groups, group);
  const before = getNextTag(groups, group);
  const item = createDevTag(document, previous, {
    ...options,
    className: 'rules ' + group.key,
    before: before?.tag ?? null,
  });

  group.tags.push(item);

  return item;
}

function getPreviousTag(groups: SortGroup[], group: SortGroup) {
  const index = groups.indexOf(group);

  for (let i = index; i >= 0; i--) {
    const tags = groups[i].tags;
    const tag = tags[tags.length - 1];

    if (tag) return tag.tag;
  }

  return null;
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
