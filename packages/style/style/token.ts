import type { DebugData } from '../builder/data/debug';
import { globalData, symbol } from '../utils/global';

export const TOKEN_ID: unique symbol = symbol('style:token');
export const TOKEN_OVERRIDE: unique symbol = symbol('style:token.override');
export const TOKEN_DEBUG: unique symbol = symbol('style:token.debug');
export const TOKEN_NAME: unique symbol = symbol('style:token.name');

export type StyleTokenData<T = unknown> = {
  [TOKEN_ID]: string;
  [TOKEN_NAME]?: string | null;
  [TOKEN_OVERRIDE]?: false;
  value: T;
  ref: StyleTokenData<T> | null;
};

export type StyleTokenOverride<T = unknown> = {
  [TOKEN_ID]: string;
  [TOKEN_OVERRIDE]: true;
  [TOKEN_DEBUG]?: DebugData | null;
  [TOKEN_NAME]?: string | null;
  value: T;
  ref: StyleTokenData<T> | null;
};

export type StyleToken<T = unknown> = StyleTokenData<T> & {
  (value: T | StyleTokenData<T>, debug?: DebugData): StyleTokenOverride<T>;
};

const idCounter = globalData('style.token.idCounter', () => ({ value: 0 }));

export function resetStyleTokenIdCounter() {
  idCounter.value = 0;
}

export function createStyleToken<T>(
  value: T | StyleToken<T>,
  debugId?: string,
  debugName?: string | null,
) {
  const token: StyleToken<T> = (value, debug) => {
    return createStyleTokenOverride(token, value, debug);
  };

  token[TOKEN_ID] = debugId || String(idCounter.value++);
  token[TOKEN_NAME] = debugName === undefined ? getStyleTokenNameFromId(debugId) : normalizeStyleTokenName(debugName);

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
      [TOKEN_NAME]: getStyleTokenName(token),
      value: value.value,
      ref: value,
    }
    : {
      [TOKEN_ID]: getStyleTokenId(token),
      [TOKEN_OVERRIDE]: true,
      [TOKEN_NAME]: getStyleTokenName(token),
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

export function getStyleTokenName<T>(token: StyleTokenData<T> | StyleTokenOverride<T>): string | null {
  return token[TOKEN_NAME] ?? null;
}

export function getStyleTokenNameFromId(id: string | undefined): string | null {
  if (!id) return null;

  const parts = id.split('--');
  const first = normalizeStyleTokenName(parts[0]);

  if (!first) {
    return parts.length > 1 ? normalizeStyleTokenName(parts.slice(1).join('--')) : null;
  }

  return normalizeStyleTokenName([first, ...parts.slice(1)].join('--'));
}

export function getChildStyleTokenName(
  name: string | null | undefined,
  child: string | null | undefined,
) {
  const childName = normalizeStyleTokenName(child);
  if (!childName) return normalizeStyleTokenName(name);

  const parentName = normalizeStyleTokenName(name);
  return parentName ? parentName + '--' + childName : childName;
}

export function normalizeStyleTokenName(value: string | null | undefined): string | null {
  if (!value) return null;

  value = value.trim();
  if (!value) return null;
  if (/^\d+$/.test(value)) return null;
  if (isGeneratedTokenHash(value)) return null;

  value = stripGenericTokenPrefix(value);
  if (!value) return null;

  const stableSuffix = value.match(/^(.+)-[a-z0-9]{7}$/);
  if (stableSuffix?.[1] && isGeneratedTokenHash(value.slice(-7))) return normalizeStyleTokenName(stableSuffix[1]);

  return value;
}

function isGeneratedTokenHash(value: string) {
  return /^[a-z0-9]{7}$/.test(value) && /\d/.test(value);
}

function stripGenericTokenPrefix(value: string) {
  const parts = value.split('--');

  while (parts[0] === 'token' || parts[0] === 'tokens') {
    parts.shift();
  }

  return parts.join('--');
}
