import { RUNTIME_CONFIG } from '../../config';
import type { StyleSheet } from '../../sheet/types';
import type { CssPropItem } from '../core/cache/prop';
import type { CssProp } from '../types';
import { insertRuntimeThemeRule } from './theme';
import { walkCssPropItemsSheetRules, walkCssPropSheetRules } from './rules';

export function insertCssPropRuntimeRules(
  sheet: StyleSheet,
  css: CssProp | undefined,
) {
  if (!css) return;

  sheet.updateLayers(RUNTIME_CONFIG.layers);

  walkCssPropSheetRules(
    css,
    (rule) => sheet.insert(rule),
    (theme) => insertRuntimeThemeRule(sheet, theme),
  );
}

export function insertCssPropRuntimeItems(
  sheet: StyleSheet,
  items: readonly CssPropItem[],
) {
  if (!items.length) return;

  sheet.updateLayers(RUNTIME_CONFIG.layers);

  walkCssPropItemsSheetRules(
    items,
    (rule) => sheet.insert(rule),
    (theme) => insertRuntimeThemeRule(sheet, theme),
  );
}
