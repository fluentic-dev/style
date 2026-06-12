import { getTokenOverrideValue, getTokenVarName } from '../../atomic/token';
import { escapeCssIdent, escapeCssValue } from '../../atomic/utils';
import { BUILDER_CALLSITE, type ThemeData } from '../../builder/data';
import { RUNTIME_CONFIG } from '../../config';
import type { StyleSheet } from '../../sheet';
import type { StyleTokenOverride } from '../../style/token';

export function insertRuntimeTheme(
  sheet: StyleSheet,
  theme: ThemeData,
) {
  sheet.updateLayers(RUNTIME_CONFIG.layers);

  sheet.insert({
    key: theme.className,
    css: buildThemeRule(theme),
    callsite: theme[BUILDER_CALLSITE] ?? null,
  });
}

export function buildThemeRule(theme: ThemeData) {
  const declarations: string[] = [];
  const tokens = theme.tokens;

  for (let i = 0, len = tokens.length; i < len; i++) {
    declarations.push(getThemeDeclaration(tokens[i]));
  }

  return '.' + escapeCssIdent(theme.className) + '{' + declarations.join(';') + '}';
}

function getThemeDeclaration(token: StyleTokenOverride) {
  const name = getTokenVarName(token, RUNTIME_CONFIG.tokenVarPrefix);
  const value = token.ref
    ? getTokenOverrideValue(token, RUNTIME_CONFIG.tokenVarPrefix)
    : escapeCssValue(String(token.value ?? ''));

  return name + ':' + value;
}
