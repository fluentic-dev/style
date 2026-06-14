import type { ThemeData } from '../../builder/data/data';
import { isThemeData } from '../../builder/data/is';
import type { SheetRule } from '../../sheet';
import { getStylePropItems, type StylePropItem, walkStyleProp } from '../core/cache/prop';
import type { StyleProp } from '../types';
import { createRuntimeSheetRule, type RuntimeSheetRule } from './rule';

export function walkStylePropSheetRules(
  styleProp: StyleProp,
  onRule: (rule: RuntimeSheetRule) => void,
  onTheme?: (theme: ThemeData) => void,
) {
  walkStyleProp(styleProp, (item) => {
    walkStylePropItemSheetRules(item, onRule, onTheme);
  });
}

export function walkStylePropItemsSheetRules(
  items: readonly StylePropItem[],
  onRule: (rule: RuntimeSheetRule) => void,
  onTheme?: (theme: ThemeData) => void,
) {
  for (let i = 0, len = items.length; i < len; i++) {
    walkStylePropItemSheetRules(items[i], onRule, onTheme);
  }
}

function walkStylePropItemSheetRules(
  item: StylePropItem,
  onRule: (rule: RuntimeSheetRule) => void,
  onTheme?: (theme: ThemeData) => void,
) {
  if (isThemeData(item)) {
    onTheme?.(item);
    return;
  }

  const items = getStylePropItems(item);

  for (let i = 0, len = items.length; i < len; i++) {
    const rule = createRuntimeSheetRule(items[i]);
    if (rule) onRule(rule);
  }
}

export function collectStylePropSheetRules(styleProp: StyleProp): SheetRule[] {
  return collectStylePropRules((onRule) => {
    walkStylePropSheetRules(styleProp, onRule);
  });
}

export function collectStylePropItemsSheetRules(
  items: readonly StylePropItem[],
): SheetRule[] {
  return collectStylePropRules((onRule) => {
    walkStylePropItemsSheetRules(items, onRule);
  });
}

function collectStylePropRules(
  walk: (onRule: (rule: RuntimeSheetRule) => void) => void,
) {
  const rules: SheetRule[] = [];
  const lookup = new Map<string, number>();

  walk((rule) => {
    if (!rule.key || !rule.dedupe) return;

    const payload: SheetRule = {
      key: rule.key,
      css: rule.css,
      callsite: rule.callsite || null,
      priority: rule.priority,
    };

    const index = lookup.get(rule.dedupe);

    if (index === undefined) {
      lookup.set(rule.dedupe, rules.push(payload) - 1);
    } else {
      rules[index] = payload;
    }
  });

  return rules;
}
