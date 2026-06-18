import { LayerDefaultLayers } from '../../atomic/layer';
import { CSS_CONFIG } from '../../config/config/css';
import type { StyleSheet } from '../../sheet/types';
import type { StylePropItem } from '../core/cache/prop';
import type { StyleProp } from '../types';
import { walkStylePropItemsSheetRules, walkStylePropSheetRules } from './rules';
import { insertRuntimeThemeRule } from './theme';

export function insertStylePropRuntimeRules(
  sheet: StyleSheet,
  styleProp: StyleProp | undefined,
) {
  if (!styleProp) return;

  sheet.updateLayers(CSS_CONFIG.layers || LayerDefaultLayers);

  walkStylePropSheetRules(
    styleProp,
    (rule) => sheet.insert(rule),
    (theme) => insertRuntimeThemeRule(sheet, theme),
  );
}

export function insertStylePropRuntimeItems(
  sheet: StyleSheet,
  items: readonly StylePropItem[],
) {
  if (!items.length) return;

  sheet.updateLayers(CSS_CONFIG.layers || LayerDefaultLayers);

  walkStylePropItemsSheetRules(
    items,
    (rule) => sheet.insert(rule),
    (theme) => insertRuntimeThemeRule(sheet, theme),
  );
}
