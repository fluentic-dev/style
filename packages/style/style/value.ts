import type { DebugData } from '../builder/data/debug';
import { hashString } from '../utils/hash';
import { createStyleToken, type StyleToken, type StyleTokenOverride } from './token';

export type ValueBase = string | number;
export type InferValue<T extends ValueBase> = T extends string ? string : T extends number ? number : ValueBase;

export type StyleValueFn<T extends ValueBase, Value extends ValueBase> = {
  (value: T): StyleToken<Value>;
  (value: T, provide: Value | StyleToken<Value>): StyleTokenOverride<Value>;
  (value: T, provide: Value | StyleToken<Value>, debug: DebugData): StyleTokenOverride<Value>;
};

export function createToken<T>(value: T | StyleToken<T>, debugId?: string) {
  return createStyleToken(value, debugId);
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
    const [value, provide, debug] = args as [
      ValueBase,
      ValueBase | StyleToken<ValueBase>,
      DebugData | undefined,
    ];
    const token = tokens.get(value);

    if (!token) {
      throw new Error(`[Style.values] VALUE_NOT_FOUND: ${String(value)}`);
    }

    if (args.length === 2) {
      return token(provide);
    }

    if (args.length >= 3) {
      return token(provide, debug);
    }

    return token;
  } as StyleValueFn<ValueBase, ValueBase>;

  return fn;
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
