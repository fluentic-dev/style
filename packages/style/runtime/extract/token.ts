import { getCssVar, getCssVarRawFallback } from '../../atomic/utils/cssVar';
import { getStyleTokenId, getStyleTokenVarName, isStyleTokenData } from '../../builder/token/data';
import type { StyleTokenData, StyleTokenOverride } from '../../style/token';

export function getToken(value: unknown): unknown {
  if (isStyleTokenData(value)) {
    return getExtractedTokenVar(value);
  }

  return value;
}

export function getExtractedTokenVarName(
  token: StyleTokenData | StyleTokenOverride,
) {
  const varName = getStyleTokenVarName(token);
  if (varName) return varName;

  throw new Error(`Missing extracted token var name for token "${getStyleTokenId(token)}"`);
}

export function getExtractedTokenVar(token: StyleTokenData): string {
  return getExtractedTokenVarFallback(token);
}

export function getExtractedTokenOverrideValue(token: StyleTokenOverride) {
  return token.ref ? getExtractedTokenVar(token.ref) : token.value;
}

function getExtractedTokenVarFallback(token: StyleTokenData): string {
  const varName = getExtractedTokenVarName(token);

  if (token.ref) {
    return getCssVarRawFallback(
      varName,
      getExtractedTokenVarFallback(token.ref),
    );
  }

  return getCssVar(varName, String(token.value ?? ''));
}
