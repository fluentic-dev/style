import { CSS_CONFIG, CSS_CONFIG_DEFAULT } from '../../config/config/css';
import { DEV_CONFIG } from '../../config/config/dev';
import { globalData } from '../../utils/global';
import type { SheetOptions, SheetRule, StyleSheet } from '../types';
import { createDevLayerSheet } from './dev_layer';
import { createDevSortSheet } from './dev_sort';
import { pruneDevSourcemapTags } from './utils';

type DevPriorityMode = typeof DEV_CONFIG.stylePriorityMode;

type DevSheetState = {
  rebuild(): void;
};

const DEV_SHEETS = globalData<Set<DevSheetState>>(
  'sheet.dev.sheets',
  () => new Set(),
);

export { createDevLayerSheet, getDevSourcemapTags, refreshDevSourcemapTags } from './dev_layer';

export { createDevSortSheet } from './dev_sort';

export function createDevSheet(options: SheetOptions = {}): StyleSheet {
  let activeMode = DEV_CONFIG.stylePriorityMode;
  let active = createDevSheetForMode(activeMode, options);
  let activeLayers: readonly string[] = CSS_CONFIG.layers ?? CSS_CONFIG_DEFAULT.layers ?? [];
  const rules: Array<SheetRule | string> = [];
  const inserted = new Set<string>();
  const state: DevSheetState = {
    rebuild,
  };

  DEV_SHEETS.add(state);

  return {
    updateLayers(layers: readonly string[]) {
      activeLayers = layers;
      active.updateLayers(layers);
    },

    insert(rule: SheetRule | string) {
      const key = getStoredRuleKey(rule);

      if (key && inserted.has(key)) return;
      if (key) inserted.add(key);

      rules.push(rule);
      active.insert(rule);
    },

    flush() {
      ensureActiveMode();
      active.flush();
    },
  };

  function ensureActiveMode() {
    if (activeMode === DEV_CONFIG.stylePriorityMode) return;

    rebuild();
  }

  function rebuild() {
    activeMode = DEV_CONFIG.stylePriorityMode;
    removeDevSheetTags(options.document);
    active = createDevSheetForMode(activeMode, options);
    active.updateLayers(activeLayers);

    for (let i = 0, len = rules.length; i < len; i++) {
      active.insert(rules[i]);
    }

    active.flush();
  }
}

export function refreshDevStyleTags() {
  DEV_SHEETS.forEach((sheet) => sheet.rebuild());
}

function createDevSheetForMode(mode: DevPriorityMode, options: SheetOptions) {
  return mode === 'sort'
    ? createDevSortSheet(options)
    : createDevLayerSheet(options);
}

function getStoredRuleKey(rule: SheetRule | string) {
  return typeof rule === 'string' ? rule : rule.key ?? rule.css;
}

function removeDevSheetTags(documentOverride?: Document | null) {
  const document = documentOverride === undefined
    ? typeof globalThis.document === 'undefined'
      ? null
      : globalThis.document
    : documentOverride;

  if (!document) return;

  const head = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
  const nodes = Array.from(head.childNodes);

  for (let i = 0, len = nodes.length; i < len; i++) {
    const node = nodes[i] as HTMLElement;

    if (typeof node.getAttribute !== 'function') continue;
    if (!node.getAttribute('data-css-sheet')) continue;

    node.parentNode?.removeChild(node);
  }

  pruneDevSourcemapTags();
}
