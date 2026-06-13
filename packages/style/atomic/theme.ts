import type { CssConfig } from '../config/types';
import type { StyleTokenOverride } from '../style/token';
import { hashString } from '../utils/hash';
import { getTokenOverrideValue, getTokenVarName } from './token';
import { escapeCssIdent, escapeCssValue, getIdentifierSafeHash } from './utils/css';

export type ThemeClassNameConfig = Pick<CssConfig, 'classNamePrefix' | 'themeNamePrefix'>;

export function createThemeClassName(
  id: string,
  config: ThemeClassNameConfig,
) {
  return config.classNamePrefix + config.themeNamePrefix +
    getIdentifierSafeHash(hashString(id));
}

export function getThemeRuleCss(
  className: string,
  tokens: readonly StyleTokenOverride[],
  tokenVarPrefix: string,
) {
  const declarations: string[] = [];

  for (let i = 0, len = tokens.length; i < len; i++) {
    declarations.push(getThemeDeclaration(tokens[i], tokenVarPrefix));
  }

  return '.' + escapeCssIdent(className) + '{' + declarations.join(';') + '}';
}

function getThemeDeclaration(
  token: StyleTokenOverride,
  tokenVarPrefix: string,
) {
  const name = getTokenVarName(token, tokenVarPrefix);
  const value = token.ref
    ? getTokenOverrideValue(token, tokenVarPrefix)
    : escapeCssValue(String(token.value ?? ''));

  return name + ':' + value;
}
