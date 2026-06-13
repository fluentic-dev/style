import { getScopeParentClassName } from '../../../atomic/scope';
import {
  BUILDER_STATE,
  BUILDER_TYPE_SCOPE,
  BUILDER_TYPE_SLOT,
  getScopeTargetScope,
  getScopeTargetSlotId,
  getSlotId,
  isSlotData,
  isStyleData,
  type ScopeTargetData,
  type SlotData,
  type StyleData,
} from '../../../builder/data';
import type { StateItem } from '../../../builder/data/state';
import { isStyleTokenOverrideData } from '../../../style/token';
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
import type { StyleTokenValues } from './tokenValues';

export type ResolvedStyleItem<Data = unknown> = {
  data: Data;
  items: StateItem[];
};

const directStyleItemCache = globalData(
  'runtime.directStyleItemCache',
  () => new WeakMap<StyleData | SlotData, ResolvedStyleItem>(),
);

const resolvedStyleItems = globalData(
  'runtime.resolvedStyleItems',
  () => new WeakSet<object>(),
);

const styleItemTokenValues = globalData(
  'runtime.styleItemTokenValues',
  () => new WeakMap<object, StyleTokenValues | null>(),
);

export function isResolvedStyleItem<T>(value: unknown): value is ResolvedStyleItem<T> {
  return !!value && typeof value === 'object' && resolvedStyleItems.has(value);
}

export function createResolvedStyleItem<Data extends StyleData | SlotData>(
  data: Data,
  scopes: readonly ScopeTargetData[],
): ResolvedStyleItem<Data> {
  return createStyleItem({
    data,
    items: resolveItems(data, scopes),
  });
}

export function getDirectStyleItem(item: StyleData | SlotData) {
  let cached = directStyleItemCache.get(item);

  if (!cached) {
    cached = createResolvedStyleItem(item, []);
    directStyleItemCache.set(item, cached);
  }

  return cached;
}

export function getStyleTokenValues(value: CombinedStyle | ResolvedStyleItem) {
  if (isCombinedStyle(value)) return getCombinedStyleTokens(value);

  return styleItemTokenValues.get(value) ?? null;
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

  if (isStyleData(value) || isSlotData(value)) {
    return createResolvedStyleItem(value, meta.scopes);
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
      return createStyleItem({
        data: value.data,
        items: value.items,
      }, meta.tokens);
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
  resolvedStyleItems.add(item);
  if (tokens) styleItemTokenValues.set(item, tokens);
  return item;
}

function resolveItems(
  data: StyleData | SlotData,
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

    if (isStyleTokenOverrideData(item)) continue;

    if (slotId && item.type !== BUILDER_TYPE_SLOT) continue;

    items.push(item);
  }

  if (!slotId) return items;

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

        if (targetSlotId === slotId && item[4] === true) {
          items.push(getScopeParentItem(item[3]));
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
  const parentClassName = getScopeParentClassName(className);

  return [parentClassName, parentClassName];
}
