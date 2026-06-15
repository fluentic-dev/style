import { symbol } from '../utils/const';
import type { DebugData } from '../builder/data/debug';

export const TOKEN_ID: unique symbol = symbol('style:token');
export const TOKEN_OVERRIDE: unique symbol = symbol('style:token.override');
export const TOKEN_DEBUG: unique symbol = symbol('style:token.debug');

export type StyleTokenData<T = unknown> = {
  [TOKEN_ID]: string;
  [TOKEN_OVERRIDE]?: false;
  value: T;
  ref: StyleTokenData<T> | null;
};

export type StyleTokenOverride<T = unknown> = {
  [TOKEN_ID]: string;
  [TOKEN_OVERRIDE]: true;
  [TOKEN_DEBUG]?: DebugData | null;
  value: T;
  ref: StyleTokenData<T> | null;
};

export type StyleToken<T = unknown> = StyleTokenData<T> & {
  (value: T | StyleTokenData<T>, debug?: DebugData): StyleTokenOverride<T>;
};

let tokenIdCounter = 0;

export function resetStyleTokenIdCounter() {
  tokenIdCounter = 0;
}

export function createStyleToken<T>(value: T | StyleToken<T>, debugId?: string) {
  const token: StyleToken<T> = (value, debug) => {
    return createStyleTokenOverride(token, value, debug);
  };

  token[TOKEN_ID] = debugId || (tokenIdCounter++).toString();

  if (isStyleTokenData<T>(value)) {
    token.value = value.value;
    token.ref = value;
  } else {
    token.value = value;
    token.ref = null;
  }

  return token;
}

export function createStyleTokenOverride<T>(
  token: StyleTokenData<T>,
  value: T | StyleTokenData<T>,
  debug?: DebugData | null,
): StyleTokenOverride<T> {
  const override: StyleTokenOverride<T> = isStyleTokenData<T>(value)
    ? {
      [TOKEN_ID]: getStyleTokenId(token),
      [TOKEN_OVERRIDE]: true,
      value: value.value,
      ref: value,
    }
    : {
      [TOKEN_ID]: getStyleTokenId(token),
      [TOKEN_OVERRIDE]: true,
      value: value as T,
      ref: null,
    };

  if (debug) {
    Object.defineProperty(override, TOKEN_DEBUG, {
      configurable: true,
      enumerable: false,
      value: debug,
    });
  }

  return override;
}

export function getStyleTokenOverrideDebug(
  token: StyleTokenOverride,
) {
  return token[TOKEN_DEBUG] ?? null;
}

export function isStyleTokenData<T = unknown>(value: unknown): value is StyleToken<T> {
  return !!value &&
    typeof (value as StyleToken)[TOKEN_ID] === 'string' &&
    (value as StyleTokenOverride)[TOKEN_OVERRIDE] !== true;
}

export function isStyleTokenOverrideData<T = unknown>(value: unknown): value is StyleTokenOverride<T> {
  return !!value &&
    typeof (value as StyleTokenOverride)[TOKEN_ID] === 'string' &&
    (value as StyleTokenOverride)[TOKEN_OVERRIDE] === true;
}

export function getStyleTokenId<T>(token: StyleTokenData<T> | StyleTokenOverride<T>): string {
  return token[TOKEN_ID];
}
