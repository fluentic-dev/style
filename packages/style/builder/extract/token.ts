import { type StyleToken, type StyleTokenData, TOKEN_ID, TOKEN_OVERRIDE } from '../../style/token';

export type ExtractedTokenInput<T> = {
  id: string;
  value: T;
  ref?: StyleTokenData<T> | null;
};

export function createExtractedToken<T>(
  id: string,
  value: T,
  ref: StyleTokenData<T> | null = null,
): StyleToken<T> {
  const token = ((value: T | StyleTokenData<T>) => {
    return isExtractedTokenRef<T>(value)
      ? {
        [TOKEN_ID]: token[TOKEN_ID],
        [TOKEN_OVERRIDE]: true,
        value: value.value,
        ref: value,
      }
      : {
        [TOKEN_ID]: token[TOKEN_ID],
        [TOKEN_OVERRIDE]: true,
        value,
        ref: null,
      };
  }) as StyleToken<T>;

  token[TOKEN_ID] = id;
  token.value = ref ? ref.value : value;
  token.ref = ref;

  return token;
}

function isExtractedTokenRef<T>(value: unknown): value is StyleTokenData<T> {
  return !!value &&
    typeof (value as StyleTokenData)[TOKEN_ID] === 'string' &&
    (value as { [TOKEN_OVERRIDE]?: true; })[TOKEN_OVERRIDE] !== true;
}
