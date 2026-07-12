import type { DebugData } from '../builder/data/debug';
import { getStyleTokenId, getStyleTokenName, isStyleTokenData } from '../builder/token/data';
import { getStyleTokenNameFromId, normalizeStyleTokenName } from '../builder/token/name';
import { globalData } from '../utils/global';
import { symbol } from '../utils/symbol';
export {
  getStyleTokenId,
  getStyleTokenName,
  getStyleTokenVarName,
  isStyleTokenData,
  isStyleTokenOverrideData,
} from '../builder/token/data';
export { TOKEN_ID, TOKEN_NAME, TOKEN_OVERRIDE, TOKEN_VAR_NAME } from '../builder/token/symbols';
import { TOKEN_ID, TOKEN_NAME, TOKEN_OVERRIDE, TOKEN_VAR_NAME } from '../builder/token/symbols';

export const TOKEN_DEBUG: unique symbol = symbol('style:token.debug');

export type StyleTokenData<T = unknown> = {
  [TOKEN_ID]: string;
  [TOKEN_NAME]?: string | null;
  [TOKEN_VAR_NAME]?: string | null;
  [TOKEN_OVERRIDE]?: false;
  value: T;
  ref: StyleTokenData<T> | null;
};

export type StyleTokenOverride<T = unknown> = {
  [TOKEN_ID]: string;
  [TOKEN_OVERRIDE]: true;
  [TOKEN_DEBUG]?: DebugData | null;
  [TOKEN_NAME]?: string | null;
  [TOKEN_VAR_NAME]?: string | null;
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
  stableId?: string,
  debugName?: string | null,
) {
  const token: StyleToken<T> = (value, debug) => {
    return createStyleTokenOverride(token, value, debug);
  };

  token[TOKEN_ID] = stableId || String(idCounter.value++);
  token[TOKEN_NAME] = debugName === undefined ? getStyleTokenNameFromId(stableId) : normalizeStyleTokenName(debugName);

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
