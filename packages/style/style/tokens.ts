import { getChildStyleTokenName } from '../builder/token/name';
import type { StyleToken } from './token';
import { createStyleToken } from './token';
import type { InferValue, ValueBase } from './value';

export type TokenTuple<T extends readonly ValueBase[]> = {
  [P in T[number]]: StyleToken<InferValue<P>>;
};

export type TokenRecord<T extends object> = {
  [P in keyof T]: T[P] extends readonly unknown[] ? StyleToken<T[P]>
    : T[P] extends object ? TokenRecord<T[P]>
    : T[P] extends ValueBase ? StyleToken<InferValue<T[P]>>
    : StyleToken<T[P]>;
};

export function createTokens<const T extends readonly ValueBase[]>(
  values: T,
): TokenTuple<T>;
export function createTokens<T extends object>(
  values: T,
): TokenRecord<T>;
export function createTokens(
  values: readonly ValueBase[] | Record<PropertyKey, unknown>,
  stableId?: string,
): any {
  const tokens: Record<PropertyKey, StyleToken> = {};

  if (Array.isArray(values)) {
    for (let i = 0, len = values.length; i < len; i++) {
      const value = values[i];
      tokens[value] = createStyleToken(
        value,
        getChildStableId(stableId, String(i)),
        getChildStyleTokenName(stableId, String(i)),
      );
    }
  } else {
    assignTokenRecord(tokens, values as Record<PropertyKey, unknown>, stableId, stableId ?? null);
  }

  return tokens;
}

function assignTokenRecord(
  target: Record<PropertyKey, unknown>,
  values: Record<PropertyKey, unknown>,
  stableId: string | undefined,
  debugName: string | null,
) {
  for (let key in values) {
    const value = values[key];
    const childName = getChildStyleTokenName(debugName, key);

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const child: Record<PropertyKey, unknown> = {};
      target[key] = child;
      assignTokenRecord(child, value as Record<PropertyKey, unknown>, getChildStableId(stableId, key), childName);
    } else {
      target[key] = createStyleToken(value, getChildStableId(stableId, key), childName);
    }
  }
}

function getChildStableId(
  stableId: string | undefined,
  child: string,
) {
  return stableId ? stableId + '--' + child : undefined;
}
