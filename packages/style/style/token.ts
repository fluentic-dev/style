export const TOKEN_ID = Symbol('style:token');
export const TOKEN_OVERRIDE = Symbol('style:token-override');

export type StyleTokenData<T = unknown> = {
  [TOKEN_ID]: string;
  [TOKEN_OVERRIDE]?: false;
  value: T;
  ref: StyleTokenData<T> | null;
};

export type StyleTokenOverride<T = unknown> = {
  [TOKEN_ID]: string;
  [TOKEN_OVERRIDE]: true;
  value: T;
  ref: StyleTokenData<T> | null;
};

export type StyleToken<T = unknown> = StyleTokenData<T> & {
  (value: T | StyleTokenData<T>): StyleTokenOverride<T>;
};

let tokenIdCounter = 0;

export function createStyleToken<T>(value: T | StyleToken<T>, debugId?: string) {
  const token: StyleToken<T> = (value) => {
    return createStyleTokenOverride(token, value);
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
): StyleTokenOverride<T> {
  if (isStyleTokenData<T>(value)) {
    return {
      [TOKEN_ID]: getStyleTokenId(token),
      [TOKEN_OVERRIDE]: true,
      value: value.value,
      ref: value,
    };
  }

  return {
    [TOKEN_ID]: getStyleTokenId(token),
    [TOKEN_OVERRIDE]: true,
    value: value as T,
    ref: null,
  };
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
