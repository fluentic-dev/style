import { getTokenOverrideValue } from '../../../atomic/token';
import { CSS_CONFIG } from '../../../config/config/css';
import { getStyleTokenId, isStyleTokenOverrideData, type StyleTokenOverride } from '../../../style/token';
import { hasOwn } from '../../../utils/object';

export type StyleTokenValues = {
  ids: readonly string[];
  values: readonly unknown[];
  lookup: Record<string, unknown>;
};

export type MutableTokenValues = {
  ids: string[] | null;
  values: unknown[] | null;
  lookup: Record<string, unknown> | null;
  index: Record<string, number> | null;
};

export function createMutableTokenValues(base: StyleTokenValues | null): MutableTokenValues {
  return {
    ids: base ? base.ids.slice() : null,
    values: base ? base.values.slice() : null,
    lookup: base ? { ...base.lookup } : null,
    index: base ? createTokenIndexLookup(base.ids) : null,
  };
}

export function addTokenOverride(values: MutableTokenValues, item: unknown) {
  if (!isStyleTokenOverrideData(item)) return false;

  const id = getStyleTokenId(item);
  const value = getTokenOverrideValue(item, CSS_CONFIG.tokenNameFormat ?? null);

  addTokenValue(values, id, value);
  return true;
}

export function addTokenValue(
  values: MutableTokenValues,
  id: string,
  value: unknown,
) {
  if (!values.ids) values.ids = [];
  if (!values.values) values.values = [];
  if (!values.lookup) values.lookup = Object.create(null);
  if (!values.index) values.index = Object.create(null);

  const ids = values.ids!;
  const tokenValues = values.values!;
  const lookup = values.lookup!;
  const indexLookup = values.index!;
  const index = indexLookup[id];

  if (index === undefined) {
    indexLookup[id] = ids.push(id) - 1;
    tokenValues.push(value);
  } else {
    tokenValues[index] = value;
  }

  lookup[id] = value;
}

export function addTokenValues(
  values: MutableTokenValues,
  next: StyleTokenValues | null,
) {
  if (!next) return;

  for (let i = 0, len = next.ids.length; i < len; i++) {
    addTokenValue(values, next.ids[i], next.values[i]);
  }
}

export function addTokenOverrides(
  values: MutableTokenValues,
  overrides: readonly StyleTokenOverride[],
) {
  for (let i = 0, len = overrides.length; i < len; i++) {
    addTokenOverride(values, overrides[i]);
  }
}

export function finishTokenValues(
  base: StyleTokenValues | null,
  values: MutableTokenValues,
) {
  if (!values.ids || !values.values || !values.lookup) return null;
  if (isSameTokenValues(base, values.ids, values.values)) return base;

  return {
    ids: values.ids,
    values: values.values,
    lookup: values.lookup,
  };
}

export function mergeTokenValues(
  base: StyleTokenValues | null,
  next: StyleTokenValues | null,
): StyleTokenValues | null {
  if (!next) return base;
  if (!base) return next;

  const values = createMutableTokenValues(base);

  addTokenValues(values, next);

  return finishTokenValues(base, values);
}

export function mergeTokenOverrides(
  base: StyleTokenValues | null,
  overrides: readonly StyleTokenOverride[],
): StyleTokenValues | null {
  if (!overrides.length) return base;

  const values = createMutableTokenValues(base);

  addTokenOverrides(values, overrides);

  return finishTokenValues(base, values);
}

function createTokenIndexLookup(ids: readonly string[]) {
  const lookup: Record<string, number> = Object.create(null);

  for (let i = 0, len = ids.length; i < len; i++) {
    lookup[ids[i]] = i;
  }

  return lookup;
}

function isSameTokenValues(
  base: StyleTokenValues | null,
  ids: readonly string[],
  values: readonly unknown[],
) {
  if (!base || base.ids.length !== ids.length) return false;

  const baseLookup = base.lookup;

  for (let i = 0, len = ids.length; i < len; i++) {
    if (!hasOwn(baseLookup, ids[i])) return false;
    if (baseLookup[ids[i]] !== values[i]) return false;
  }

  return true;
}
