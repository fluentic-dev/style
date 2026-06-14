import { createStyleTokenOverride, type StyleToken, type StyleTokenData, TOKEN_ID } from '../../style/token';

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
    return createStyleTokenOverride(token, value);
  }) as StyleToken<T>;

  token[TOKEN_ID] = id;
  token.value = ref ? ref.value : value;
  token.ref = ref;

  return token;
}
