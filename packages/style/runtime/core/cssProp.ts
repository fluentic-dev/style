import type { CSSProperties } from 'react';
import { getTokenVar, getTokenVarName } from '../../atomic/token';
import {
  BUILDER_STATE,
  BUILDER_TYPE_SCOPE,
  BUILDER_TYPE_SLOT,
  BUILDER_TYPE_SLOT_OVERRIDE,
  BUILDER_TYPE_STYLE,
  getSlotId,
  isScopeData,
  isScopeTargetData,
  isSlotData,
  isSlotOverrideData,
  isStyleData,
  isThemeData,
  ITEM_VALUE_TYPE_VARIABLE,
  type SlotData,
  type StyleData,
  type ThemeData,
} from '../../builder/data';
import type { StateItem } from '../../builder/data/state';
import { RUNTIME_CONFIG } from '../../config';
import { getStyleTokenId, isStyleTokenData, isStyleTokenOverrideData, type StyleTokenData } from '../../style/token';
import type { StyleSheet } from '../../sheet/types';
import type { CssProp, CssRuntimeItem } from '../types';
import { createRuntimeSheetRule } from '../sheet/rule';
import { insertRuntimeTheme } from '../sheet/theme_runtime';
import {
  createCssResolvedItem,
  type CssResolvedItem,
  type CssResolvedTheme,
  type CssTokenData,
  getCssTokenData,
  isCssItem,
  isCssTheme,
} from './data';

export type ResolvedCssProp = {
  className: string;
  style: CSSProperties | undefined;
};

type CacheItem = CssResolvedItem | CssResolvedTheme | ThemeData;

type CacheNode = {
  children: WeakMap<CacheItem, CacheNode>;
  result: ResolvedCssProp | null;
};

type CssPropWalkItem = CssRuntimeItem;

const root = createNode();
const directItemCache = new WeakMap<StyleData | SlotData, CssResolvedItem>();
const emptyResult: ResolvedCssProp = { className: '', style: undefined };

let runId = 0;

const dedupeRun: Record<string, number> = Object.create(null);
const dedupeIndex: Record<string, number> = Object.create(null);

export function resolveCssProp(css: CssProp | undefined): ResolvedCssProp {
  if (!css) return emptyResult;

  const node = getCacheNode(css);

  if (node?.result) return node.result;

  const result = resolveCssPropData(css);

  if (node) node.result = result;

  return result;
}

export function collectCssPropItems(css: CssProp | undefined): StateItem[] {
  if (!css) return [];

  const items: StateItem[] = [];
  const slotIds = collectSlotIds(css);

  walkCssProp(css, (item) => {
    items.push(...getCssItems(item, slotIds));
  });

  return items;
}

export function insertCssPropRuntimeRules(
  sheet: StyleSheet,
  css: CssProp | undefined,
) {
  if (!css) return;

  sheet.updateLayers(RUNTIME_CONFIG.layers);

  const stack: unknown[] = [css];

  while (stack.length > 0) {
    const item = stack.pop();

    if (!item) continue;

    if (Array.isArray(item)) {
      for (let i = item.length - 1; i >= 0; i--) {
        stack.push(item[i]);
      }

      continue;
    }

    if (isThemeData(item)) {
      insertRuntimeTheme(sheet, item);
      continue;
    }

    if (isStyleData(item) || isSlotData(item)) {
      insertItems(sheet, getDirectCssItem(item).items);
    }
  }
}

function getCacheNode(css: CssProp) {
  let node = root;
  let hasItem = false;
  let canCache = true;

  walkCssProp(css, (item) => {
    if (!isCacheItem(item)) {
      canCache = false;
      return;
    }

    hasItem = true;
    node = getChild(node, item);
  }, {
    onUnsupported: () => {
      canCache = false;
    },
  });

  return hasItem && canCache ? node : null;
}

function resolveCssPropData(css: CssProp) {
  runId++;

  const classNames: string[] = [];
  let style: CSSProperties | undefined;
  const slotIds = collectSlotIds(css);

  walkCssProp(css, (item) => {
    if (isThemeItem(item)) {
      classNames.push(getThemeClassName(item));
      return;
    }

    const items = getCssItems(item, slotIds);
    const tokensData = isCssItem(item) ? getCssTokenData(item) : null;

    for (let i = 0, len = items.length; i < len; i++) {
      style = addItem(classNames, style, items[i], tokensData);
    }
  }, {
    warnUnsupported: true,
  });

  if (!classNames.length) return emptyResult;

  return {
    className: classNames.join(' '),
    style,
  };
}

function walkCssProp(
  css: CssProp,
  fn: (item: CssPropWalkItem) => void,
  options?: {
    warnUnsupported?: boolean;
    onUnsupported?: () => void;
  },
) {
  const stack: unknown[] = [css];

  while (stack.length > 0) {
    const item = stack.pop();

    if (!item) continue;

    if (Array.isArray(item)) {
      for (let i = item.length - 1; i >= 0; i--) {
        stack.push(item[i]);
      }

      continue;
    }

    const cssItem = normalizeCssPropItem(item);

    if (cssItem) {
      fn(cssItem);
    } else {
      options?.onUnsupported?.();
      if (options?.warnUnsupported) warnUnsupportedCssPropItem(item);
    }
  }
}

function normalizeCssPropItem(item: unknown): CssPropWalkItem | null {
  if (isCssItem(item) || isCssTheme(item) || isThemeData(item)) {
    return item;
  }

  if (isStyleData(item) || isSlotData(item)) {
    return getDirectCssItem(item);
  }

  return null;
}

function getDirectCssItem(item: StyleData | SlotData) {
  let cached = directItemCache.get(item);

  if (!cached) {
    cached = createCssResolvedItem(item, []);
    directItemCache.set(item, cached);
  }

  return cached;
}

function warnUnsupportedCssPropItem(item: unknown) {
  if (!RUNTIME_CONFIG.isDev) return;

  if (
    isSlotOverrideData(item) ||
    isScopeData(item) ||
    isScopeTargetData(item) ||
    isStyleTokenOverrideData(item)
  ) {
    console.warn(
      '[fluentic-style] Unsupported css prop value. Pass themes, scopes, slot overrides, and token overrides to combineStyle before using css.',
      item,
    );
    return;
  }

  if (item) {
    console.warn(
      '[fluentic-style] Unsupported css prop value.',
      item,
    );
  }
}

function collectSlotIds(css: CssProp) {
  const slotIds: Record<string, 1> = Object.create(null);

  walkCssProp(css, (item) => {
    if (isCssItem(item) && isSlotData(item.data)) {
      slotIds[getSlotId(item.data)] = 1;
    }
  });

  return slotIds;
}

function getCssItems(
  item: CssPropWalkItem,
  slotIds: Record<string, 1>,
): StateItem[] {
  if (isCssItem(item)) return item.items;
  if (isThemeItem(item)) return [];

  const items = item[BUILDER_STATE]?.items ?? [];
  if (!isScopeData(item)) return items;

  const result: StateItem[] = [];
  for (let i = 0, len = items.length; i < len; i++) {
    const scopeItem = items[i];
    const slotId = getScopeItemSlotId(scopeItem);
    if (slotId && slotIds[slotId]) result.push(scopeItem);
  }

  return result;
}

function insertItems(sheet: StyleSheet, items: StateItem[]) {
  for (let i = 0, len = items.length; i < len; i++) {
    const rule = createRuntimeSheetRule(items[i]);
    if (rule) sheet.insert(rule);
  }
}

function getScopeItemSlotId(item: StateItem) {
  if (Array.isArray(item) && typeof item[0] === 'number' && item[0] === BUILDER_TYPE_SCOPE) {
    return item[1];
  }

  if (!Array.isArray(item) && item.type === BUILDER_TYPE_SCOPE) {
    return item.slotId;
  }

  return '';
}

function addItem(
  classNames: string[],
  style: CSSProperties | undefined,
  item: StateItem,
  tokensData: CssTokenData | null,
) {
  const dedupe = getItemDedupe(item);
  const className = getItemClassName(item);

  if (!dedupe || !className) return style;

  if (dedupeRun[dedupe] === runId) {
    classNames[dedupeIndex[dedupe]] = className;
    return addItemStyle(style, item, tokensData);
  }

  dedupeRun[dedupe] = runId;
  dedupeIndex[dedupe] = classNames.push(className) - 1;
  return addItemStyle(style, item, tokensData);
}

function addItemStyle(
  style: CSSProperties | undefined,
  item: StateItem,
  tokensData: CssTokenData | null,
) {
  const variableValue = getItemVariableValue(item, tokensData);
  if (!variableValue) return style;

  const next = style ?? {};
  (next as Record<string, unknown>)[variableValue[0]] = variableValue[1];
  return next;
}

function getItemVariableValue(
  item: StateItem,
  tokensData: CssTokenData | null,
): [string, unknown] | null {
  const value = getItemValue(item);

  if (Array.isArray(value) && value[0] === ITEM_VALUE_TYPE_VARIABLE) {
    return [value[1], resolveVariableValue(value[2], tokensData)];
  }

  if (!Array.isArray(item) && item.variable?.[0] === ITEM_VALUE_TYPE_VARIABLE) {
    return [item.variable[1], resolveVariableValue(item.variable[2], tokensData)];
  }

  if (!Array.isArray(item) && item.token) {
    if (!tokensData) return null;

    const id = getStyleTokenId(item.token);
    if (!hasOwn(tokensData.lookup, id)) return null;

    return [
      getTokenVarName(item.token, RUNTIME_CONFIG.tokenVarPrefix),
      tokensData.lookup[id],
    ];
  }

  return null;
}

function resolveVariableValue(
  value: unknown,
  tokensData: CssTokenData | null,
) {
  if (isStyleTokenData(value)) {
    return resolveTokenValue(value, tokensData);
  }

  return value;
}

function resolveTokenValue<T>(
  token: StyleTokenData<T>,
  tokensData: CssTokenData | null,
): T {
  if (tokensData) {
    const id = getStyleTokenId(token);
    if (hasOwn(tokensData.lookup, id)) return tokensData.lookup[id] as T;
  }

  return getTokenVar(token, RUNTIME_CONFIG.tokenVarPrefix) as T;
}

function isThemeItem(item: unknown): item is CssResolvedTheme | ThemeData {
  return isCssTheme(item) || isThemeData(item);
}

function isCacheItem(item: unknown): item is CacheItem {
  return isCssItem(item) || isCssTheme(item) || isThemeData(item);
}

function getThemeClassName(item: CssResolvedTheme | ThemeData) {
  return isCssTheme(item) ? item.className : item.className;
}

function hasOwn<T extends object>(
  target: T,
  key: PropertyKey,
) {
  return Object.prototype.hasOwnProperty.call(target, key);
}

function getItemDedupe(item: StateItem) {
  if (Array.isArray(item)) {
    if (typeof item[0] === 'number') {
      switch (item[0]) {
        case BUILDER_TYPE_STYLE:
          return item[1];
        case BUILDER_TYPE_SLOT:
        case BUILDER_TYPE_SLOT_OVERRIDE:
        case BUILDER_TYPE_SCOPE:
          return item[2];
      }
    } else if (typeof item[1] === 'string') {
      return item[1];
    }

    return '';
  }

  return item.dedupe;
}

function getItemClassName(item: StateItem) {
  if (Array.isArray(item)) {
    if (typeof item[0] === 'number') {
      switch (item[0]) {
        case BUILDER_TYPE_STYLE:
          return item[2];
        case BUILDER_TYPE_SLOT:
        case BUILDER_TYPE_SLOT_OVERRIDE:
        case BUILDER_TYPE_SCOPE:
          return item[3];
      }
    } else {
      return item[1];
    }

    return '';
  }

  return item.className;
}

function getItemValue(item: StateItem) {
  if (Array.isArray(item)) {
    if (typeof item[0] === 'number') {
      switch (item[0]) {
        case BUILDER_TYPE_STYLE:
          return item[3];
        case BUILDER_TYPE_SLOT:
        case BUILDER_TYPE_SLOT_OVERRIDE:
          return item[4];
      }
    } else {
      return item[2];
    }

    return undefined;
  }

  return undefined;
}

function getChild(node: CacheNode, item: CacheItem) {
  let child = node.children.get(item);

  if (!child) {
    child = createNode();
    node.children.set(item, child);
  }

  return child;
}

function createNode(): CacheNode {
  return {
    children: new WeakMap(),
    result: null,
  };
}
