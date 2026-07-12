import { CSS_CONFIG } from '../config/config/css';
import type { ThemeNameFormat, ThemeNameInfo, TokenNameFormat } from '../config/types';
import type { StyleTokenOverride } from '../style/token';
import { getTokenOverrideValue, getTokenVarName } from './token';
import { escapeCssIdent } from './utils/cssIdent';
import { escapeCssValue } from './utils/cssVar';
import { createNameFormatter } from './utils/format';
import { getIdentifierSafeHash } from './utils/hash';

export const THEME_NAME_FORMAT = 'theme[-(name)]-$hash';

export const formatThemeName = createNameFormatter<ThemeNameInfo>(['name']);

export function createThemeClassName(
  name: string | null,
  id: string,
  themeNameFormat: ThemeNameFormat | null,
) {
  return formatThemeName(
    themeNameFormat || THEME_NAME_FORMAT,
    getIdentifierSafeHash(id, CSS_CONFIG.hashLength),
    { name: normalizeThemeName(name) },
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

export function normalizeThemeName(value: string | null | undefined): string | null {
  if (!value) return null;

  value = value.trim();
  if (!value) return null;
  if (/^\d+$/.test(value)) return null;
  if (isGeneratedNameHash(value)) return null;

  const stableSuffix = value.match(/^(.+)-[a-z0-9]{7}$/);
  if (stableSuffix?.[1] && isGeneratedNameHash(value.slice(-7))) {
    return normalizeThemeName(stableSuffix[1]);
  }

  value = stripGenericThemePrefix(value);
  if (!value) return null;

  return value;
}

function stripGenericThemePrefix(value: string) {
  const parts = value.split('--');

  while (parts[0] === 'theme' || parts[0] === 'themes') {
    parts.shift();
  }

  value = parts.join('--');

  if (value.startsWith('theme-')) return value.slice('theme-'.length);
  if (value.startsWith('themes-')) return value.slice('themes-'.length);

  return value;
}

function isGeneratedNameHash(value: string) {
  return /^[a-z0-9]{7}$/.test(value) && /\d/.test(value);
}
