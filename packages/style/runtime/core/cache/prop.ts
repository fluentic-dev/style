import {
  isScopeData,
  isScopeTargetData,
  isSlotData,
  isSlotOverrideData,
  isStyleData,
  isThemeData,
  type ThemeData,
} from '../../../builder/data';
import type { StateItem } from '../../../builder/data/state';
import { getExtractedTokenBoundData, isExtractedTokenBoundData } from '../../../builder/extract/withTokens';
import { RUNTIME_CONFIG } from '../../../config';
import { isStyleTokenOverrideData } from '../../../style/token';
import type { CssProp } from '../../types';
import {
  createResolvedStyleItem,
  createResolvedStyleItemFromItems,
  getDirectStyleItem,
  getStyleTokenValues,
  isResolvedStyleItem,
  type ResolvedStyleItem,
} from './item';
import { getCssPropCacheValue } from './propCache';
import { createCssPropResult, emptyCssPropResult, type ResolvedCssProp } from './result';
import { mergeTokenOverrides, mergeTokenValues, type StyleTokenValues } from './tokenValues';
import { walkRecursiveItems } from './utils/walk';

export type CssPropItem = ResolvedStyleItem | ThemeData;

type CssPropWalkOptions = {
  onUnsupported?: (item: unknown) => void;
  stableTokenBound?: boolean;
};

export type ResolvedCssPropRuntime = {
  items: CssPropItem[];
  result: ResolvedCssProp;
};

type CssPropTokenBinding = {
  data: object;
  tokens: StyleTokenValues;
};

export function resolveCssProp(css: CssProp | undefined): ResolvedCssProp {
  return resolveCssPropRuntime(css)?.result ?? emptyCssPropResult;
}

export function resolveCssPropRuntime(css: CssProp | undefined): ResolvedCssPropRuntime | null {
  if (!css) return null;

  if (RUNTIME_CONFIG.runtimeCacheTTL === 0) {
    const items = collectCssPropItems(css);

    return {
      items,
      result: createCssPropResult(items, getThemeClassName),
    };
  }

  let unsupportedItem: unknown;
  const tokenBindings: CssPropTokenBinding[] = [];
  const cache = getCssPropCacheValue<CssPropItem>(
    css,
    walkCssPropCachePath,
    () => warnUnsupportedCssPropItem(unsupportedItem),
  );

  const configVersion = RUNTIME_CONFIG.configVersion;

  if (cache?.data?.configVersion === configVersion) {
    if (!tokenBindings.length) return cache.data;

    return {
      items: cache.data.items,
      result: createCssPropResult(
        applyTokenBindings(cache.data.items, tokenBindings),
        getThemeClassName,
      ),
    };
  }

  const items = collectCssPropItems(css, tokenBindings.length > 0);
  const result = createCssPropResult(items, getThemeClassName);
  const data = { configVersion, items, result };

  if (cache) cache.data = data;

  if (!tokenBindings.length) return data;

  return {
    items,
    result: createCssPropResult(
      applyTokenBindings(items, tokenBindings),
      getThemeClassName,
    ),
  };

  function walkCssPropCachePath(
    css: CssProp,
    fn: (item: object) => void,
    onUnsupported: () => void,
  ) {
    walkRecursiveItems(css, (item) => {
      const key = getCssPropCacheKey(item, tokenBindings);

      if (key) {
        fn(key);
      } else {
        unsupportedItem = item;
        onUnsupported();
      }
    });
  }
}

export function walkCssProp(
  css: CssProp,
  fn: (item: CssPropItem) => void,
  options?: CssPropWalkOptions,
) {
  walkRecursiveItems(css, (item) => {
    const cssItem = normalizeCssPropItem(item, options?.stableTokenBound ?? false);

    if (cssItem) {
      fn(cssItem);
    } else {
      options?.onUnsupported?.(item);
    }
  });
}

export function getCssPropItems(
  item: CssPropItem,
): StateItem[] {
  if (isResolvedStyleItem(item)) return item.items;
  return [];
}

function collectCssPropItems(
  css: CssProp,
  stableTokenBound = false,
) {
  const items: CssPropItem[] = [];

  walkCssProp(css, (item) => {
    items.push(item);
  }, { stableTokenBound });

  return items;
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

function normalizeCssPropItem(
  item: unknown,
  stableTokenBound: boolean,
): CssPropItem | null {
  if (RUNTIME_CONFIG.isHoistEnabled && isExtractedTokenBoundData(item)) {
    const bound = getExtractedTokenBoundData(item);
    if (stableTokenBound) return normalizeCssPropItem(bound.data, true);

    const tokens = mergeTokenOverrides(null, bound.tokens);

    if (isStyleData(bound.data) || isSlotData(bound.data)) {
      return createResolvedStyleItem(bound.data, [], tokens);
    }

    return normalizeCssPropItem(bound.data, false);
  }

  if (isResolvedStyleItem(item) || isThemeData(item)) {
    return item;
  }

  if (isStyleData(item) || isSlotData(item)) {
    return getDirectStyleItem(item);
  }

  return null;
}

function getCssPropCacheKey(
  item: unknown,
  tokenBindings: CssPropTokenBinding[],
): object | null {
  if (RUNTIME_CONFIG.isHoistEnabled && isExtractedTokenBoundData(item)) {
    const bound = getExtractedTokenBoundData(item);
    const key = getCssPropCacheKey(bound.data, tokenBindings);
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
  items: readonly CssPropItem[],
  bindings: readonly CssPropTokenBinding[],
): CssPropItem[] {
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
  bindings: readonly CssPropTokenBinding[],
) {
  let tokens = getStyleTokenValues(item);

  for (let i = 0, len = bindings.length; i < len; i++) {
    const binding = bindings[i];

    if (binding.data !== item.data && binding.data !== item) continue;

    tokens = mergeTokenValues(tokens, binding.tokens);
  }

  return tokens;
}
