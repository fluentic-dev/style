import { type StyleToken, type StyleTokenData, TOKEN_ID, TOKEN_OVERRIDE } from '../../style/token';

export type ExtractedTokenInput = {
  id: string;
  value: unknown;
  ref?: StyleTokenData | null;
};

export function createExtractedToken(
  id: string,
  value: unknown,
  ref: StyleTokenData | null = null,
): StyleToken<unknown> {
  const token = ((value: unknown | StyleTokenData) => {
    return isExtractedTokenRef(value)
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
  }) as StyleToken<unknown>;

  token[TOKEN_ID] = id;
  token.value = ref ? ref.value : value;
  token.ref = ref;

  return token;
}

function isExtractedTokenRef(value: unknown): value is StyleTokenData {
  return !!value &&
    typeof (value as StyleTokenData)[TOKEN_ID] === 'string' &&
    (value as { [TOKEN_OVERRIDE]?: true; })[TOKEN_OVERRIDE] !== true;
}
