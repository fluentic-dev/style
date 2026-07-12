import { TOKEN_ID, TOKEN_NAME, TOKEN_OVERRIDE, TOKEN_VAR_NAME } from '../../builder/token/symbols';
import type { StyleToken, StyleTokenData, StyleTokenOverride } from '../../style/token';

export type ExtractedTokenInput = {
  id: string;
  value: unknown;
  ref?: StyleTokenData | null;
};

export function createExtractedToken(
  id: string,
  value: unknown,
  ref: StyleTokenData | null = null,
  name: string | null = null,
  varName: string | null = null,
): StyleToken<unknown> {
  const token = ((value: unknown | StyleTokenData) => {
    return createExtractedTokenOverride(token, value);
  }) as StyleToken<unknown>;

  token[TOKEN_ID] = id;
  token[TOKEN_NAME] = name;
  token[TOKEN_VAR_NAME] = varName;
  token.value = ref ? ref.value : value;
  token.ref = ref;

  return token;
}

function createExtractedTokenOverride(
  token: StyleToken,
  value: unknown | StyleTokenData,
): StyleTokenOverride {
  return isExtractedTokenRef(value)
    ? {
      [TOKEN_ID]: token[TOKEN_ID],
      [TOKEN_OVERRIDE]: true,
      [TOKEN_NAME]: token[TOKEN_NAME] ?? null,
      [TOKEN_VAR_NAME]: token[TOKEN_VAR_NAME] ?? null,
      value: value.value,
      ref: value,
    }
    : {
      [TOKEN_ID]: token[TOKEN_ID],
      [TOKEN_OVERRIDE]: true,
      [TOKEN_NAME]: token[TOKEN_NAME] ?? null,
      [TOKEN_VAR_NAME]: token[TOKEN_VAR_NAME] ?? null,
      value,
      ref: null,
    };
}

function isExtractedTokenRef(value: unknown): value is StyleTokenData {
  return !!value &&
    typeof (value as StyleTokenData)[TOKEN_ID] === 'string' &&
    (value as { [TOKEN_OVERRIDE]?: true; })[TOKEN_OVERRIDE] !== true;
}
