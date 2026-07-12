import type { StyleToken, StyleTokenData, StyleTokenOverride } from '../../style/token';
import { TOKEN_ID, TOKEN_NAME, TOKEN_OVERRIDE, TOKEN_VAR_NAME } from './symbols';

export type ExtractedStyleTokenVarName = {
  [TOKEN_VAR_NAME]?: string | null;
};

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

export function getStyleTokenVarName<T>(token: StyleTokenData<T> | StyleTokenOverride<T>): string | null {
  return (token as ExtractedStyleTokenVarName)[TOKEN_VAR_NAME] ?? null;
}
