import { BUILDER_STATE, BUILDER_TYPE_SCOPE, BUILDER_TYPE_SLOT } from '../../../builder/data/const';
import type { ScopeTargetData, SheetData, SlotData, StyleData } from '../../../builder/data/data';
import {
  getScopeTargetScope,
  getScopeTargetSlotId,
  getSlotId,
  isSelectorData,
  isSheetData,
  isSlotData,
  isStyleData,
} from '../../../builder/data/is';
import type { StateItem } from '../../../builder/data/state';
import { isStyleTokenOverrideData } from '../../../builder/token/data';
import { CSS_CONFIG } from '../../../config/config/css';
import { globalData } from '../../../utils/global';
import {
  type CombinedStyle,
  type CombinedStyleFieldGetter,
  createCombinedStyle,
  getCombinedStyleScopes,
  getCombinedStyleStyles,
  getCombinedStyleTokens,
  isCombinedStyle,
} from '../combinedStyle';
import {
  getResolvedStyleItemTokenValues,
  isResolvedStyleItem as isResolvedStyleItemMarked,
  markResolvedStyleItem,
  setResolvedStyleItemTokenValues,
} from './resolvedItem';
import { mergeTokenValues, type StyleTokenValues } from './tokenValues';

export type ResolvedStyleItem<Data = unknown> = {
  data: Data;
  items: StateItem[];
};

const directStyleItemCache = globalData(
  'runtime.directStyleItemCache',
  () => new WeakMap<StyleData | SheetData | SlotData, ResolvedStyleItem>(),
);

export function isResolvedStyleItem<T>(value: unknown): value is ResolvedStyleItem<T> {
  return isResolvedStyleItemMarked(value);
}

export function createResolvedStyleItem<Data extends StyleData | SheetData | SlotData>(
  data: Data,
  scopes: readonly ScopeTargetData[],
  tokens: StyleTokenValues | null = null,
): ResolvedStyleItem<Data> {
  return createStyleItem({
    data,
    items: resolveItems(data, scopes),
  }, tokens);
}

export function createResolvedStyleItemFromItems<Data>(
  item: ResolvedStyleItem<Data>,
  tokens: StyleTokenValues | null,
): ResolvedStyleItem<Data> {
  return createStyleItem({
    data: item.data,
    items: item.items,
  }, tokens);
}

export function getDirectStyleItem(item: StyleData | SheetData | SlotData) {
  let cached = directStyleItemCache.get(item);

  if (!cached) {
    cached = createResolvedStyleItem(item, []);
    directStyleItemCache.set(item, cached);
  }

  return cached;
}

export function getStyleTokenValues(value: CombinedStyle | ResolvedStyleItem) {
  if (isCombinedStyle(value)) return getCombinedStyleTokens(value);

  return getResolvedStyleItemTokenValues(value);
}

export function createCombinedStyleFacade<T extends object>(
  styles: T,
  scopes: readonly ScopeTargetData[],
): CombinedStyle<T> {
  return createCombinedStyle(
    {
      styles,
      scopes,
      tokens: null,
    },
    getStyleField,
  );
}

export function createCombinedStyleTokenWrapper<T extends object>(
  style: CombinedStyle<T>,
  tokens: StyleTokenValues,
): CombinedStyle<T> {
  return createCombinedStyle(
    {
      styles: getCombinedStyleStyles(style),
      scopes: getCombinedStyleScopes(style),
      tokens,
    },
    getTokenField(style),
  );
}

const getStyleField: CombinedStyleFieldGetter = (meta, prop) => {
  const value = (meta.styles as any)?.[prop] ?? null;

  if (isStyleData(value) || isSheetData(value) || isSlotData(value)) {
    return createResolvedStyleItem(value, meta.scopes);
  }

  if (isSelectorData(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    return createCombinedStyleFacade(value, meta.scopes);
  }

  return value;
};

function getTokenField(base: CombinedStyle): CombinedStyleFieldGetter {
  return (meta, prop) => {
    const value = (base as any)?.[prop] ?? null;

    if (isResolvedStyleItem(value)) {
      const tokens = mergeTokenValues(getStyleTokenValues(value), meta.tokens);

      return createStyleItem({
        data: value.data,
        items: value.items,
      }, tokens);
    }

    if (isCombinedStyle(value)) {
      return createCombinedStyleTokenWrapper(value as CombinedStyle<object>, meta.tokens!);
    }

    return value;
  };
}

function createStyleItem<Data>(
  item: ResolvedStyleItem<Data>,
  tokens: StyleTokenValues | null = null,
): ResolvedStyleItem<Data> {
  markResolvedStyleItem(item);
  if (tokens) setResolvedStyleItemTokenValues(item, tokens);
  return item;
}

function resolveItems(
  data: StyleData | SheetData | SlotData,
  scopes: readonly ScopeTargetData[],
) {
  const items: StateItem[] = [];

  const state = data[BUILDER_STATE];
  const stateItems = state?.items ?? [];
  const slotId = isSlotData(data) ? getSlotId(data) : null;

  for (let i = 0, len = stateItems.length; i < len; i++) {
    const item = stateItems[i];

    if (Array.isArray(item)) {
      items.push(item);
      continue;
    }

    if (isStyleTokenOverrideData(item)) {
      items.push(item);
      continue;
    }

    if (slotId && item.type !== BUILDER_TYPE_SLOT) continue;

    items.push(item);
  }

  if (!slotId || isSheetData(data)) return items;

  for (let i = 0, len = scopes.length; i < len; i++) {
    const boundScope = scopes[i];

    const scope = getScopeTargetScope(boundScope);
    if (!scope) continue;

    const scopeItems = scope[BUILDER_STATE]?.items;
    if (!scopeItems) continue;

    const targetSlotId = getScopeTargetSlotId(boundScope);

    for (let j = 0, len = scopeItems.length; j < len; j++) {
      const item = scopeItems[j];

      if (Array.isArray(item)) {
        if (item[1] === slotId) {
          items.push(item);
        }

        const hasParentSelector = isExtractedScopeParentMarker(item[4]) || isExtractedScopeParentMarker(item[5]);
        if (targetSlotId === slotId && hasParentSelector) {
          items.push(getScopeParentItem(String(item[3])));
        }

        continue;
      }

      if (isStyleTokenOverrideData(item)) continue;

      if (item.type !== BUILDER_TYPE_SCOPE) continue;

      if (item.slotId === slotId) items.push(item);

      if (item.parentSelector && targetSlotId === slotId) {
        items.push(getScopeParentItem(item.className));
      }
    }
  }

  return items;
}

function getScopeParentItem(className: string): StateItem {
  const parentClassName = formatScopeClassName(className);

  return [parentClassName, parentClassName];
}

function formatScopeClassName(className: string) {
  const format = CSS_CONFIG.scopeClassNameFormat;

  if (!format) return '-' + className;
  if (typeof format === 'function') return format({ className });

  return format.replace(/\[|\]/g, '').replace(/\(className\)/g, className);
}

function isExtractedScopeParentMarker(value: unknown) {
  return value === 1 || value === true;
}
