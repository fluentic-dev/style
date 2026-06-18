import { LayerDefaultLayers } from '../../atomic/layer';
import { getThemeRuleCss } from '../../atomic/theme';
import { BUILDER_CALLSITE } from '../../builder/data/const';
import type { ThemeData } from '../../builder/data/data';
import { CSS_CONFIG } from '../../config/config/css';
import type { StyleSheet } from '../../sheet';

export function insertRuntimeTheme(
  sheet: StyleSheet,
  theme: ThemeData,
) {
  sheet.updateLayers(CSS_CONFIG.layers || LayerDefaultLayers);

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
    CSS_CONFIG.tokenNameFormat || null,
  );
}
