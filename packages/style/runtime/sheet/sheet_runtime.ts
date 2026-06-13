import type { StateItem } from '../../builder/data/state';
import { RUNTIME_CONFIG } from '../../config';
import type { StyleSheet } from '../../sheet';
import { isCssItem } from '../core/data';
import { createRuntimeSheetRule } from './rule';

export function insertRuntimeRules(
  sheet: StyleSheet,
  styles: unknown,
  resolved: unknown,
) {
  if (!styles || typeof styles !== 'object') return;
  if (!resolved || typeof resolved !== 'object') return;

  sheet.updateLayers(RUNTIME_CONFIG.layers);

  for (const key of Object.keys(styles)) {
    const styleValue = (styles as Record<string, unknown>)[key];
    const resolvedValue = (resolved as Record<string, unknown>)[key];

    if (isCssItem(resolvedValue)) {
      insertItems(sheet, resolvedValue.items);
      continue;
    }

    if (styleValue && typeof styleValue === 'object') {
      insertRuntimeRules(sheet, styleValue, resolvedValue);
    }
  }
}

function insertItems(sheet: StyleSheet, items: StateItem[]) {
  for (let i = 0, len = items.length; i < len; i++) {
    const rule = createRuntimeSheetRule(items[i]);
    if (rule) sheet.insert(rule);
  }
}
