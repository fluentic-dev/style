import type { TokenNameFormat, TokenNameInfo } from '../config/types';
import { getStyleTokenId, type StyleTokenData, type StyleTokenOverride } from '../style/token';
import { getCssVar, getCssVarRawFallback, getIdentifierSafeHash } from './utils/css';
import { createNameFormatter } from './utils/format';

export const TOKEN_NAME_FORMAT = 'token[-(name)]-$hash';

export const formatTokenName = createNameFormatter<TokenNameInfo>(['name']);

export function getTokenVarName(
  token: StyleTokenData | StyleTokenOverride,
  format: TokenNameFormat | null,
) {
  const id = getStyleTokenId(token);

  const name = formatTokenName(
    format || TOKEN_NAME_FORMAT,
    getIdentifierSafeHash(id),
    { name: id },
  );

  return '--' + name;
}

export function getTokenVar(
  token: StyleTokenData,
  format: TokenNameFormat | null,
) {
  return getTokenVarFallback(token, format);
}

export function getTokenOverrideValue(
  token: StyleTokenOverride,
  format: TokenNameFormat | null,
) {
  return token.ref ? getTokenVar(token.ref, format) : token.value;
}

function getTokenVarFallback(
  token: StyleTokenData,
  tokenNameFormat: TokenNameFormat | null,
): string {
  const varName = getTokenVarName(token, tokenNameFormat);

  if (token.ref) {
    return getCssVarRawFallback(
      varName,
      getTokenVarFallback(token.ref, tokenNameFormat),
    );
  }

  return getCssVar(varName, String(token.value ?? ''));
}
