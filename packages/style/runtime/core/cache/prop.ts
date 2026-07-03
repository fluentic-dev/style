import type { ThemeData } from '../../../builder/data/data';
import {
  isScopeData,
  isScopeTargetData,
  isSlotData,
  isSlotOverrideData,
  isStyleData,
  isThemeData,
} from '../../../builder/data/is';
import type { StateItem } from '../../../builder/data/state';
import { getExtractedTokenBoundData, isExtractedTokenBoundData } from '../../../builder/extract/withTokens';
import { DEV_CONFIG } from '../../../config/config/dev';
import { RUNTIME_CONFIG } from '../../../config/config/runtime';
import { isStyleTokenOverrideData } from '../../../style/token';
import type { StyleProp } from '../../types';
import { isElementDebugData, splitElementMarkerStyleProp } from '../elementMarkerData';
import {
  createResolvedStyleItem,
  createResolvedStyleItemFromItems,
  getDirectStyleItem,
  getStyleTokenValues,
  isResolvedStyleItem,
  type ResolvedStyleItem,
} from './item';
import { getStylePropCacheValue } from './propCache';
import { createStylePropResult, emptyStylePropResult, type ResolvedStyleProp } from './result';
import { mergeTokenOverrides, mergeTokenValues, type StyleTokenValues } from './tokenValues';
import { walkRecursiveItems } from './utils/walk';

export type StylePropItem = ResolvedStyleItem | ThemeData;

type StylePropWalkOptions = {
  onUnsupported?: (item: unknown) => void;
  stableTokenBound?: boolean;
};

export type ResolvedStylePropRuntime = {
  items: StylePropItem[];
  result: ResolvedStyleProp;
};

type StylePropTokenBinding = {
  data: object;
  tokens: StyleTokenValues;
};

export function resolveStyleProp(styleProp: StyleProp | undefined): ResolvedStyleProp {
  return resolveStylePropRuntime(styleProp)?.result ?? emptyStylePropResult;
}

export function resolveStylePropRuntime(styleProp: StyleProp | undefined): ResolvedStylePropRuntime | null {
  if (!styleProp) return null;

  styleProp = splitElementMarkerStyleProp(styleProp).styleProp;
  if (!styleProp) return null;

  if (RUNTIME_CONFIG.runtimeCacheTTL === 0) {
    const items = collectStylePropItems(styleProp);

    return {
      items,
      result: createStylePropResult(items, getThemeClassName),
    };
  }

  let unsupportedItem: unknown;
  const tokenBindings: StylePropTokenBinding[] = [];
  const cache = getStylePropCacheValue<StylePropItem>(
    styleProp,
    walkStylePropCachePath,
    () => warnUnsupportedStylePropItem(unsupportedItem),
  );

  if (cache?.d) {
    if (!tokenBindings.length) {
      return {
        items: cache.d.i,
        result: cache.d.r,
      };
    }

    return {
      items: cache.d.i,
      result: createStylePropResult(
        applyTokenBindings(cache.d.i, tokenBindings),
        getThemeClassName,
      ),
    };
  }

  const items = collectStylePropItems(styleProp, tokenBindings.length > 0);
  const result = createStylePropResult(items, getThemeClassName);
  const data = { i: items, r: result };

  if (cache) cache.d = data;

  if (!tokenBindings.length) return { items: data.i, result: data.r };

  return {
    items,
    result: createStylePropResult(
      applyTokenBindings(items, tokenBindings),
      getThemeClassName,
    ),
  };

  function walkStylePropCachePath(
    styleProp: StyleProp,
    fn: (item: object) => void,
    onUnsupported: () => void,
  ) {
    walkRecursiveItems(styleProp, (item) => {
      if (isElementDebugData(item)) return;

      const key = getStylePropCacheKey(item, tokenBindings);

      if (key) {
        fn(key);
      } else {
        unsupportedItem = item;
        onUnsupported();
      }
    });
  }
}

export function walkStyleProp(
  styleProp: StyleProp,
  fn: (item: StylePropItem) => void,
  options?: StylePropWalkOptions,
) {
  walkRecursiveItems(styleProp, (item) => {
    if (isElementDebugData(item)) return;

    const styleItem = normalizeStylePropItem(item, options?.stableTokenBound ?? false);

    if (styleItem) {
      fn(styleItem);
    } else {
      options?.onUnsupported?.(item);
    }
  });
}

export function getStylePropItems(
  item: StylePropItem,
): StateItem[] {
  if (isResolvedStyleItem(item)) return item.items;
  return [];
}

function collectStylePropItems(
  styleProp: StyleProp,
  stableTokenBound = false,
) {
  const items: StylePropItem[] = [];

  walkStyleProp(styleProp, (item) => {
    items.push(item);
  }, { stableTokenBound });

  return items;
}

function warnUnsupportedStylePropItem(item: unknown) {
  if (!DEV_CONFIG.isDev) return;
  if (isElementDebugData(item)) return;

  if (
    isSlotOverrideData(item) ||
    isScopeData(item) ||
    isScopeTargetData(item) ||
    isStyleTokenOverrideData(item)
  ) {
    console.warn(
      '[fluentic-style] Unsupported style prop value. Pass themes, scopes, slot overrides, and token overrides to combineStyle before using style prop.',
      item,
    );
    return;
  }

  if (item) {
    console.warn(
      '[fluentic-style] Unsupported style prop value.',
      item,
    );
  }
}

function normalizeStylePropItem(
  item: unknown,
  stableTokenBound: boolean,
): StylePropItem | null {
  if (isElementDebugData(item)) return null;

  if (RUNTIME_CONFIG.isHoist && isExtractedTokenBoundData(item)) {
    const bound = getExtractedTokenBoundData(item);
    if (stableTokenBound) return normalizeStylePropItem(bound.data, true);

    const tokens = mergeTokenOverrides(null, bound.tokens);

    if (isStyleData(bound.data) || isSlotData(bound.data)) {
      return createResolvedStyleItem(bound.data, [], tokens);
    }

    return normalizeStylePropItem(bound.data, false);
  }

  if (isResolvedStyleItem(item) || isThemeData(item)) {
    return item;
  }

  if (isStyleData(item) || isSlotData(item)) {
    return getDirectStyleItem(item);
  }

  return null;
}

function getStylePropCacheKey(
  item: unknown,
  tokenBindings: StylePropTokenBinding[],
): object | null {
  if (RUNTIME_CONFIG.isHoist && isExtractedTokenBoundData(item)) {
    const bound = getExtractedTokenBoundData(item);
    const key = getStylePropCacheKey(bound.data, tokenBindings);
    const tokens = mergeTokenOverrides(null, bound.tokens);

    if (key && tokens) {
      tokenBindings.push({ data: key, tokens });
    }

    return key;
  }

  if (
    isResolvedStyleItem(item) ||
    isThemeData(item) ||
    isStyleData(item) ||
    isSlotData(item)
  ) {
    return item;
  }

  return null;
}

function getThemeClassName(item: object) {
  return isThemeData(item) ? item.className : null;
}

function applyTokenBindings(
  items: readonly StylePropItem[],
  bindings: readonly StylePropTokenBinding[],
): StylePropItem[] {
  if (!bindings.length) return items.slice();

  return items.map((item) => {
    if (!isResolvedStyleItem(item)) return item;

    const tokens = getBoundTokens(item, bindings);
    if (!tokens) return item;

    return createResolvedStyleItemFromItems(item, tokens);
  });
}

function getBoundTokens(
  item: ResolvedStyleItem,
  bindings: readonly StylePropTokenBinding[],
) {
  let tokens = getStyleTokenValues(item);

  for (let i = 0, len = bindings.length; i < len; i++) {
    const binding = bindings[i];

    if (binding.data !== item.data && binding.data !== item) continue;

    tokens = mergeTokenValues(tokens, binding.tokens);
  }

  return tokens;
}
