import { RUNTIME_CONFIG } from '../../config';
import type { ScopeTargetData } from '../../builder/data';
import {
  createCssInstancePool,
  createCssInstanceTokenWrapper,
  getCssInstanceScopes,
  getCssInstanceStyles,
  getCssTokenData,
  isCssInstance,
  type CssInstance,
  type CssTokenData,
} from '../core';
import { getGlobalSheet, insertRuntimeRules } from '../sheet';
import type { Falsy, StyleItem } from '../types';

export type CombineStyleArg<T extends object> =
  | StyleItem
  | CssInstance<T>
  | Falsy
  | readonly CombineStyleArg<T>[];

export type CombinedStyle<T> =
  T extends (...args: any[]) => CssInstance<infer Styles>
    ? CssInstance<Styles>
    : T extends CssInstance<infer Styles>
      ? CssInstance<Styles>
      : never;

type CombineStyle = {
  <T extends object>(styles: T, ...args: CombineStyleArg<T>[]): CssInstance<T>;
  for<T extends object>(styles: T): (...args: CombineStyleArg<T>[]) => CssInstance<T>;
};

type NormalizedStyleItems = {
  inheritedScopes: ScopeTargetData[];
  items: StyleItem[];
  tokensData: CssTokenData | null;
};

let pool: ReturnType<typeof createCssInstancePool> | null = null;
let poolTTL = -1;

const insertedInstances = new WeakMap<object, WeakSet<CssInstance>>();

const combineStyleBase = <T extends object>(
  styles: T,
  ...args: CombineStyleArg<T>[]
): CssInstance<T> => {
  const normalized = normalizeStyleItems(styles, args);
  const result = getPool().get(
    styles,
    normalized.inheritedScopes,
    normalized.items,
    normalized.tokensData,
  );
  const instance = result.tokensData
    ? createCssInstanceTokenWrapper(result.instance, result.tokensData)
    : result.instance;

  insertCombinedStyles(styles, result.instance, instance);

  return instance;
};

const combineStyleFor = <T extends object>(styles: T) => {
  return (...args: CombineStyleArg<T>[]) => combineStyleBase(styles, ...args);
};

export const combineStyle = Object.assign(combineStyleBase, {
  for: combineStyleFor,
}) as CombineStyle;

export const combineStyles = combineStyle;
export const getCss = combineStyle;

function insertCombinedStyles<T extends object>(
  styles: T,
  cacheKey: CssInstance<T>,
  instance: CssInstance<T>,
) {
  if (RUNTIME_CONFIG.isCssExtracted) return;

  const sheet = getGlobalSheet();

  let sheetInstances = insertedInstances.get(sheet);

  if (!sheetInstances) {
    sheetInstances = new WeakSet();
    insertedInstances.set(sheet, sheetInstances);
  }

  if (sheetInstances.has(cacheKey)) return;

  sheetInstances.add(cacheKey);

  insertRuntimeRules(sheet, styles, instance);
  sheet.flush();
}

function getPool() {
  const ttl = RUNTIME_CONFIG.cssCacheTTL;

  if (!pool || poolTTL !== ttl) {
    pool = createCssInstancePool(ttl);
    poolTTL = ttl;
  }

  return pool;
}

function normalizeStyleItems<T extends object>(
  styles: T,
  args: readonly CombineStyleArg<T>[],
): NormalizedStyleItems {
  const result: NormalizedStyleItems = {
    inheritedScopes: [],
    items: [],
    tokensData: null,
  };

  for (let i = 0, len = args.length; i < len; i++) {
    collectStyleArg(styles, args[i], result);
  }

  return result;
}

function collectStyleArg<T extends object>(
  styles: T,
  arg: CombineStyleArg<T>,
  result: NormalizedStyleItems,
) {
  if (!arg) return;

  if (Array.isArray(arg)) {
    for (let i = 0, len = arg.length; i < len; i++) {
      collectStyleArg(styles, arg[i], result);
    }

    return;
  }

  if (isCssInstance<T>(arg)) {
    if (getCssInstanceStyles(arg) !== styles) {
      throw new TypeError(
        '[fluentic-style] combineStyle can only carry a CSS instance created from the same styles object.',
      );
    }

    const scopes = getCssInstanceScopes(arg);

    for (let i = 0, len = scopes.length; i < len; i++) {
      result.inheritedScopes.push(scopes[i]);
    }

    result.tokensData = mergeTokenData(result.tokensData, getCssTokenData(arg));
    return;
  }

  result.items.push(arg as StyleItem);
}

function mergeTokenData(
  base: CssTokenData | null,
  next: CssTokenData | null,
): CssTokenData | null {
  if (!next) return base;
  if (!base) return next;

  const ids = base.ids.slice();
  const values = base.values.slice();
  const lookup = { ...base.lookup };
  const indexLookup: Record<string, number> = Object.create(null);

  for (let i = 0, len = ids.length; i < len; i++) {
    indexLookup[ids[i]] = i;
  }

  for (let i = 0, len = next.ids.length; i < len; i++) {
    const id = next.ids[i];
    const value = next.values[i];
    const index = indexLookup[id];

    if (index === undefined) {
      indexLookup[id] = ids.push(id) - 1;
      values.push(value);
    } else {
      values[index] = value;
    }

    lookup[id] = value;
  }

  return { ids, values, lookup };
}
