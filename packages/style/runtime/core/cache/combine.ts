import type { ScopeTargetData } from '../../../builder/data/data';
import { getExtractedTokenBoundData, isExtractedTokenBoundData } from '../../../builder/extract/withTokens';
import { RUNTIME_CONFIG } from '../../../config/config/runtime';
import type { Falsy, StyleItem } from '../../types';
import { type CombinedStyle, getCombinedStyleScopes, getCombinedStyleStyles, isCombinedStyle } from '../combinedStyle';
import { createCombinedStyleTokenWrapper, getStyleTokenValues } from './item';
import { type CombinedStylePool, createCombinedStylePool, getCachedTokenWrapper } from './pool';
import { mergeTokenOverrides, mergeTokenValues, type StyleTokenValues, type TokenValueResolver } from './tokenValues';

export type CombinedStyleArg<T extends object> =
  | Falsy
  | StyleItem
  | CombinedStyle<T>
  | readonly CombinedStyleArg<T>[];

type NormalizedStyleItems = {
  inheritedScopes: ScopeTargetData[];
  items: StyleItem[];
  tokens: StyleTokenValues | null;
};

export function createCombinedStyleGetter(
  resolver: TokenValueResolver,
) {
  let configuredPool: CombinedStylePool | null = null;
  let configuredPoolTTL = -1;

  return function getConfiguredCombinedStyle<T extends object>(
    styles: T,
    args: readonly CombinedStyleArg<T>[],
  ): CombinedStyle<T> {
    const ttl = RUNTIME_CONFIG.runtimeCacheTTL;

    if (
      !configuredPool ||
      configuredPoolTTL !== ttl
    ) {
      configuredPool = createCombinedStylePool(resolver, ttl);
      configuredPoolTTL = ttl;
    }

    const normalized = normalizeStyleItems(styles, args, resolver);
    const result = configuredPool.get(
      styles,
      normalized.inheritedScopes,
      normalized.items,
      normalized.tokens,
    );

    return result.tokens
      ? getCachedTokenWrapper(
        result.tokenCache,
        result.tokens,
        () => createCombinedStyleTokenWrapper(result.style, result.tokens!),
      )
      : result.style;
  };
}

function normalizeStyleItems<T extends object>(
  styles: T,
  args: readonly CombinedStyleArg<T>[],
  resolver: TokenValueResolver,
): NormalizedStyleItems {
  const result: NormalizedStyleItems = {
    inheritedScopes: [],
    items: [],
    tokens: null,
  };

  for (let i = 0, len = args.length; i < len; i++) {
    collectStyleArg(styles, args[i], result, resolver);
  }

  return result;
}

function collectStyleArg<T extends object>(
  styles: T,
  arg: CombinedStyleArg<T>,
  result: NormalizedStyleItems,
  resolver: TokenValueResolver,
) {
  if (!arg) return;

  if (Array.isArray(arg)) {
    for (let i = 0, len = arg.length; i < len; i++) {
      collectStyleArg(styles, arg[i], result, resolver);
    }

    return;
  }

  if (RUNTIME_CONFIG.isHoist && isExtractedTokenBoundData(arg)) {
    const bound = getExtractedTokenBoundData(arg);

    result.tokens = mergeTokenOverrides(result.tokens, bound.tokens, resolver);

    collectStyleArg(styles, bound.data as CombinedStyleArg<T>, result, resolver);
    return;
  }

  if (isCombinedStyle<T>(arg)) {
    if (getCombinedStyleStyles(arg) !== styles) {
      throw new TypeError(
        '[fluentic-style] combineStyle can only carry a combined style created from the same styles object.',
      );
    }

    const scopes = getCombinedStyleScopes(arg);

    for (let i = 0, len = scopes.length; i < len; i++) {
      result.inheritedScopes.push(scopes[i]);
    }

    result.tokens = mergeTokenValues(result.tokens, getStyleTokenValues(arg));
    return;
  }

  result.items.push(arg as StyleItem);
}
