import type { StyleToken } from './token';
import { createToken, type InferValue, type ValueBase } from './value';

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
  debugId?: string,
): TokenTuple<T>;
export function createTokens<T extends object>(
  values: T,
  debugId?: string,
): TokenRecord<T>;
export function createTokens(
  values: readonly ValueBase[] | Record<PropertyKey, unknown>,
  debugId?: string,
): any {
  const tokens: Record<PropertyKey, StyleToken> = {};

  if (Array.isArray(values)) {
    for (let i = 0, len = values.length; i < len; i++) {
      const value = values[i];
      tokens[value] = createToken(value, getChildDebugId(debugId, String(i)));
    }
  } else {
    assignTokenRecord(tokens, values as Record<PropertyKey, unknown>, debugId);
  }

  return tokens;
}

function assignTokenRecord(
  target: Record<PropertyKey, unknown>,
  values: Record<PropertyKey, unknown>,
  debugId: string | undefined,
) {
  for (let key in values) {
    const value = values[key];

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const child: Record<PropertyKey, unknown> = {};
      target[key] = child;
      assignTokenRecord(child, value as Record<PropertyKey, unknown>, getChildDebugId(debugId, key));
    } else {
      target[key] = createToken(value, getChildDebugId(debugId, key));
    }
  }
}

function getChildDebugId(
  debugId: string | undefined,
  child: string,
) {
  return debugId ? debugId + '--' + child : undefined;
}
