import { getStyleTokenId, type StyleTokenData, type StyleTokenOverride } from '../style/token';
import { hashString } from '../utils/hash';
import { getCssVar, getCssVarRawFallback } from './utils/css';

export function getTokenVarName(
  token: StyleTokenData | StyleTokenOverride,
  tokenVarPrefix: string,
) {
  return '--' + tokenVarPrefix + getStyleTokenId(token);
}

export function getTokenVar(
  token: StyleTokenData,
  tokenVarPrefix: string,
) {
  return getTokenVarFallback(token, tokenVarPrefix);
}

export function getTokenOverrideValue(
  token: StyleTokenOverride,
  tokenVarPrefix: string,
) {
  return token.ref
    ? getTokenVar(token.ref, tokenVarPrefix)
    : token.value;
}

export function getLocalVarName(
  filePath: string,
  line: number,
  column: number,
  tokenVarPrefix: string,
) {
  return '--' + tokenVarPrefix + hashString(filePath + '\n' + line + ':' + column);
}

function getTokenVarFallback(
  token: StyleTokenData,
  tokenVarPrefix: string,
): string {
  const varName = getTokenVarName(token, tokenVarPrefix);

  if (token.ref) {
    return getCssVarRawFallback(varName, getTokenVarFallback(token.ref, tokenVarPrefix));
  }

  return getCssVar(varName, String(token.value ?? ''));
}
