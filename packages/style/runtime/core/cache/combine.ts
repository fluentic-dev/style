import { BUILDER_STATE, getScopeTargetScope, isScopeTargetData, type ScopeTargetData } from '../../../builder/data';
import type { Falsy, StyleItem } from '../../types';
import { type CombinedStyle, getCombinedStyleScopes, getCombinedStyleStyles, isCombinedStyle } from '../combinedStyle';
import { createCombinedStyleTokenWrapper, getStyleTokenValues } from './item';
import { getCombinedStylePool } from './pool';
import {
  addTokenOverride,
  createMutableTokenValues,
  finishTokenValues,
  mergeTokenValues,
  type StyleTokenValues,
} from './tokenValues';

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

export function getCombinedStyle<T extends object>(
  styles: T,
  args: readonly CombinedStyleArg<T>[],
): CombinedStyle<T> {
  const normalized = normalizeStyleItems(styles, args);
  const result = getCombinedStylePool().get(
    styles,
    normalized.inheritedScopes,
    normalized.items,
    normalized.tokens,
  );

  return result.tokensData
    ? createCombinedStyleTokenWrapper(result.style, result.tokensData)
    : result.style;
}

function normalizeStyleItems<T extends object>(
  styles: T,
  args: readonly CombinedStyleArg<T>[],
): NormalizedStyleItems {
  const result: NormalizedStyleItems = {
    inheritedScopes: [],
    items: [],
    tokens: null,
  };

  for (let i = 0, len = args.length; i < len; i++) {
    collectStyleArg(styles, args[i], result);
  }

  return result;
}

function collectStyleArg<T extends object>(
  styles: T,
  arg: CombinedStyleArg<T>,
  result: NormalizedStyleItems,
) {
  if (!arg) return;

  if (Array.isArray(arg)) {
    for (let i = 0, len = arg.length; i < len; i++) {
      collectStyleArg(styles, arg[i], result);
    }

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

  if (addTokenToResult(result, arg)) return;

  if (isScopeTargetData(arg)) {
    const scope = getScopeTargetScope(arg);
    const items = scope[BUILDER_STATE].items;

    for (let i = 0, len = items.length; i < len; i++) {
      addTokenToResult(result, items[i]);
    }
  }

  result.items.push(arg as StyleItem);
}

function addTokenToResult(
  result: NormalizedStyleItems,
  item: unknown,
) {
  const values = createMutableTokenValues(result.tokens);

  if (!addTokenOverride(values, item)) return false;

  result.tokens = finishTokenValues(result.tokens, values);
  return true;
}
