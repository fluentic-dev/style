import { hashString } from '../utils/hash';
import { createStyleToken, type StyleToken, type StyleTokenOverride } from './token';

export type ValueBase = string | number;
export type InferValue<T extends ValueBase> = T extends string ? string : T extends number ? number : ValueBase;

export type TokenTuple<T extends readonly ValueBase[]> = {
  [P in T[number]]: StyleToken<P>;
};

export type TokenRecord<T extends object> = {
  [P in keyof T]: T[P] extends object ? TokenRecord<T[P]> : StyleToken<T[P]>;
};

export type StyleValueFn<T extends ValueBase, Value extends ValueBase> = {
  (value: T): StyleToken<Value>;
  (value: T, provide: Value | StyleToken<Value>): StyleTokenOverride<Value>;
};

export function createToken<T>(value: T | StyleToken<T>, debugId?: string) {
  return createStyleToken(value, debugId);
}

export function createTokens<const T extends readonly ValueBase[]>(
  values: T,
  debugId?: string,
): TokenTuple<T>;
export function createTokens<const T extends object>(
  values: T,
  debugId?: string,
): TokenRecord<T>;
export function createTokens(
  values: readonly ValueBase[] | Record<PropertyKey, unknown>,
  debugId?: string,
) {
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

export function createValues<const T extends ValueBase>(
  values: readonly T[],
  debugId?: string,
): StyleValueFn<T, InferValue<T>>;
export function createValues<const T extends ValueBase>(
  type: NumberConstructor,
  values: readonly T[],
  debugId?: string,
): StyleValueFn<T, number>;
export function createValues(
  ...args: [NumberConstructor, readonly ValueBase[], string?] | [readonly ValueBase[], string?]
): StyleValueFn<any, any> {
  let values: readonly ValueBase[] = args[0] as readonly ValueBase[];
  let isNumber = false;
  let debugId = args[1] as string | undefined;

  if (args[0] === Number) {
    values = args[1] as readonly ValueBase[];
    debugId = args[2] as string | undefined;
    isNumber = true;
  }

  if (!values.length) {
    throw new Error('[Style.values] NO_VALUES');
  }

  const tokens = new Map<ValueBase, StyleToken<ValueBase>>();

  for (let value of values) {
    tokens.set(
      value,
      createToken(
        parseValue(value, isNumber),
        getChildDebugId(debugId, hashString(String(value))),
      ),
    );
  }

  const fn = function ValueFn(...args: unknown[]) {
    const [value, provide] = args as [ValueBase, ValueBase | StyleToken<ValueBase>];
    const token = tokens.get(value);

    if (!token) {
      throw new Error(`[Style.values] VALUE_NOT_FOUND: ${String(value)}`);
    }

    if (args.length === 2) {
      return token(provide);
    }

    return token;
  } as StyleValueFn<ValueBase, ValueBase>;

  return fn;
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

function parseValue(value: ValueBase, isNumber: boolean) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  value = String(value).split(/[;|]/)[0].trim();

  if (!isNumber) return value;

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`[Style.values] INVALID_NUMBER_VALUE: ${String(value)}`);
  }

  return number;
}
