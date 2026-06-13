import { getThemeRuleCss } from '../../atomic/theme';
import { BUILDER_CALLSITE, type ThemeData } from '../../builder/data';
import { RUNTIME_CONFIG } from '../../config';
import type { StyleSheet } from '../../sheet';

export function insertRuntimeTheme(
  sheet: StyleSheet,
  theme: ThemeData,
) {
  sheet.updateLayers(RUNTIME_CONFIG.layers);

  insertRuntimeThemeRule(sheet, theme);
}

export function insertRuntimeThemeRule(
  sheet: StyleSheet,
  theme: ThemeData,
) {
  sheet.insert({
    key: theme.className,
    css: createThemeRule(theme),
    callsite: theme[BUILDER_CALLSITE],
  });
}

export function createThemeRule(theme: ThemeData) {
  return getThemeRuleCss(
    theme.className,
    theme.tokens,
    RUNTIME_CONFIG.tokenVarPrefix,
  );
}
