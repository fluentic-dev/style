import { type StyleTokenData, TOKEN_ID } from '../../style/token';

export type ExtractedTokenInput<T> = {
  id: string;
  value: T;
  ref?: StyleTokenData<T> | null;
};

export function createExtractedToken<T>(
  id: string,
  value: T,
  ref: StyleTokenData<T> | null = null,
): StyleTokenData<T> {
  return {
    [TOKEN_ID]: id,
    value: ref ? ref.value : value,
    ref,
  };
}
