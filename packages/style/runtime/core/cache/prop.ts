import { isScopeData, isScopeTargetData, isSlotData, isSlotOverrideData, isStyleData, isThemeData, type ThemeData } from '../../../builder/data';
import type { StateItem } from '../../../builder/data/state';
import { RUNTIME_CONFIG } from '../../../config';
import { isStyleTokenOverrideData } from '../../../style/token';
import type { CssProp } from '../../types';
import {
  getDirectStyleItem,
  type ResolvedStyleItem,
  isResolvedStyleItem,
} from './item';
import { getCssPropCacheValue } from './propCache';
import { createCssPropResult, emptyCssPropResult, type ResolvedCssProp } from './result';
import { walkRecursiveItems } from './utils/walk';

export type CssPropItem = ResolvedStyleItem | ThemeData;

type CssPropWalkOptions = {
  onUnsupported?: (item: unknown) => void;
};

export type ResolvedCssPropRuntime = {
  items: CssPropItem[];
  result: ResolvedCssProp;
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
  const cache = getCssPropCacheValue<CssPropItem>(
    css,
    walkCssPropCachePath,
    () => warnUnsupportedCssPropItem(unsupportedItem),
  );

  const configVersion = RUNTIME_CONFIG.configVersion;

  if (cache?.data?.configVersion === configVersion) return cache.data;

  const items = collectCssPropItems(css);
  const result = createCssPropResult(items, getThemeClassName);
  const data = { configVersion, items, result };

  if (cache) cache.data = data;

  return data;

  function walkCssPropCachePath(
    css: CssProp,
    fn: (item: object) => void,
    onUnsupported: () => void,
  ) {
    walkRecursiveItems(css, (item) => {
      if (isCssPropCacheKey(item)) {
        fn(item);
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
    const cssItem = normalizeCssPropItem(item);

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

function collectCssPropItems(css: CssProp) {
  const items: CssPropItem[] = [];

  walkCssProp(css, (item) => {
    items.push(item);
  });

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

function normalizeCssPropItem(item: unknown): CssPropItem | null {
  if (isResolvedStyleItem(item) || isThemeData(item)) {
    return item;
  }

  if (isStyleData(item) || isSlotData(item)) {
    return getDirectStyleItem(item);
  }

  return null;
}

function isCssPropCacheKey(item: unknown): item is object {
  return isResolvedStyleItem(item) ||
    isThemeData(item) ||
    isStyleData(item) ||
    isSlotData(item);
}

function getThemeClassName(item: object) {
  return isThemeData(item) ? item.className : null;
}
