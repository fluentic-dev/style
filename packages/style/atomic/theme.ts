import type { ThemeNameFormat, ThemeNameInfo, TokenNameFormat } from '../config/types';
import type { StyleTokenOverride } from '../style/token';
import { getTokenOverrideValue, getTokenVarName } from './token';
import { escapeCssIdent, escapeCssValue, getIdentifierSafeHash } from './utils/css';
import { createNameFormatter } from './utils/format';

export const THEME_NAME_FORMAT = 'theme[-(name)]-$hash';

export const formatThemeName = createNameFormatter<ThemeNameInfo>(['name']);

export function createThemeClassName(
  name: string | null,
  id: string,
  themeNameFormat: ThemeNameFormat | null,
) {
  return formatThemeName(
    themeNameFormat || THEME_NAME_FORMAT,
    getIdentifierSafeHash(id),
    { name },
  );
}

export function getThemeRuleCss(
  className: string,
  tokens: readonly StyleTokenOverride[],
  tokenNameFormat: TokenNameFormat | null,
) {
  const declarations: string[] = [];

  for (let i = 0, len = tokens.length; i < len; i++) {
    declarations.push(getThemeDeclaration(tokens[i], tokenNameFormat));
  }

  return '.' + escapeCssIdent(className) + '{' + declarations.join(';') + '}';
}

function getThemeDeclaration(
  token: StyleTokenOverride,
  tokenNameFormat: TokenNameFormat | null,
) {
  const name = getTokenVarName(token, tokenNameFormat);

  const value = token.ref
    ? getTokenOverrideValue(token, tokenNameFormat)
    : escapeCssValue(String(token.value ?? ''));

  return name + ':' + value;
}
