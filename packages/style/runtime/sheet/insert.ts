import { RUNTIME_CONFIG } from '../../config';
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

  sheet.updateLayers(RUNTIME_CONFIG.layers);

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

  sheet.updateLayers(RUNTIME_CONFIG.layers);

  walkStylePropItemsSheetRules(
    items,
    (rule) => sheet.insert(rule),
    (theme) => insertRuntimeThemeRule(sheet, theme),
  );
}
